
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  Printer, 
  Settings, 
  Smartphone,
  CheckCircle2,
  Stethoscope,
  ChevronDown,
  FileText,
  Copy,
  ListPlus,
  X,
  Search,
  ExternalLink,
  SortAsc,
  SortDesc,
  ArrowUpDown,
  Trash,
  Info,
  Filter
} from 'lucide-react';
import { ShortageItem, FontConfig, FontFamily } from './types';
import { GoogleGenAI } from "@google/genai";

const UNIT_OPTIONS = [
  { label: 'باكيت (Pkt)', value: 'باكيت' },
  { label: 'شريط (Strip)', value: 'شريط' },
  { label: 'كيس (Sachet)', value: 'كيس' },
  { label: 'أمبولة (Amp)', value: 'أمبولة' },
  { label: 'شراب (Syrup)', value: 'شراب' },
  { label: 'قطرة (Drops)', value: 'قطرة' },
  { label: 'بخاخ (Spray)', value: 'بخاخ' },
  { label: 'مرهم (Oint)', value: 'مرهم' },
  { label: 'أخرى', value: '' }
];

const App: React.FC = () => {
  const [items, setItems] = useState<ShortageItem[]>(() => {
    const saved = localStorage.getItem('pharmacy_shortages');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.items || [{ id: '1', name: '', quantity: '', unit: '', notes: '' }];
      } catch (e) { return [{ id: '1', name: '', quantity: '', unit: '', notes: '' }]; }
    }
    return [{ id: '1', name: '', quantity: '', unit: '', notes: '' }];
  });

  const [fontConfig, setFontConfig] = useState<FontConfig>(() => {
    const saved = localStorage.getItem('pharmacy_shortages');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.fontConfig || { size: 18, family: 'Cairo', color: '#000000', bold: false };
      } catch (e) { return { size: 18, family: 'Cairo', color: '#000000', bold: false }; }
    }
    return { size: 18, family: 'Cairo', color: '#000000', bold: false };
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof ShortageItem, direction: 'asc' | 'desc' } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [bulkText, setBulkText] = useState('');

  useEffect(() => {
    localStorage.setItem('pharmacy_shortages', JSON.stringify({ items, fontConfig }));
  }, [items, fontConfig]);

  const toEnglishDigits = (str: string) => {
    return str.replace(/[٠-٩]/g, (d) => (d.charCodeAt(0) - 1632).toString());
  };

  // Improved Smart Parser V2
  const smartParseLine = (line: string): Partial<ShortageItem> => {
    const units = ['شريط', 'باكيت', 'كيس', 'امبول', 'شراب', 'قطرة', 'تحاميل', 'مرهم', 'بخاخ', 'فيال', 'حبوب'];
    let name = line;
    let quantity = '';
    let unit = '';

    // Extract quantity (first multi-digit or single digit surrounded by spaces)
    const qtyMatch = line.match(/(\s|^)(\d+)(\s|$)/);
    if (qtyMatch) {
      quantity = qtyMatch[2];
      name = name.replace(qtyMatch[0], ' ').trim();
    }

    // Extract unit by checking keywords
    for (const u of units) {
      if (line.includes(u)) {
        unit = u;
        name = name.replace(u, '').trim();
        break;
      }
    }

    // Clean extra symbols and spaces
    name = name.replace(/[-+|_]/g, ' ').replace(/\s+/g, ' ').trim();
    return { name, quantity, unit };
  };

  const addItem = useCallback(() => {
    setItems(prev => [{ id: Date.now().toString(), name: '', quantity: '', unit: '', notes: '' }, ...prev]);
  }, []);

  const updateItem = (id: string, field: keyof ShortageItem, value: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const clearAll = () => {
    if (window.confirm('⚠️ هل تريد إفراغ القائمة بالكامل؟')) {
      setItems([{ id: Date.now().toString(), name: '', quantity: '', unit: '', notes: '' }]);
    }
  };

  const handleBulkAdd = () => {
    if (!bulkText.trim()) return;
    const lines = bulkText.split(/[\n,،]+/).map(l => l.trim()).filter(l => l !== '');
    
    const newItems: ShortageItem[] = lines.map((line, index) => {
      const parsed = smartParseLine(line);
      return {
        id: (Date.now() + index).toString(),
        name: parsed.name || line,
        quantity: parsed.quantity || '',
        unit: parsed.unit || '',
        notes: ''
      };
    });

    setItems(prev => {
      const filteredPrev = prev.filter(i => i.name.trim() !== '');
      return [...newItems, ...filteredPrev];
    });

    setBulkText('');
    setShowBulkAdd(false);
  };

  const handleSort = (key: keyof ShortageItem) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSortedItems = useMemo(() => {
    let result = [...items].filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.unit.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (sortConfig) {
      result.sort((a, b) => {
        const valA = (a[sortConfig.key] || '').toString();
        const valB = (b[sortConfig.key] || '').toString();
        
        // Handle numeric sort for quantity
        if (sortConfig.key === 'quantity') {
          const numA = parseInt(valA) || 0;
          const numB = parseInt(valB) || 0;
          return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
        }

        return sortConfig.direction === 'asc' 
          ? valA.localeCompare(valB, 'ar') 
          : valB.localeCompare(valA, 'ar');
      });
    }
    return result;
  }, [items, searchTerm, sortConfig]);

  const handleGoogleSearch = (name: string) => {
    if (!name) return;
    window.open(`https://www.google.com/search?q=${encodeURIComponent(name + ' دواء سعر ومواصفات')}`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const activeItems = items.filter(i => i.name.trim() !== '');
    if (activeItems.length === 0) {
      alert('القائمة فارغة!');
      return;
    }
    const text = `📦 *قائمة نواقص صيدلية الغيث*\n📅 تاريخ: ${new Date().toLocaleDateString('ar-EG')}\n\n` + 
      activeItems.map((item, index) => `${index + 1}. ${item.name} ← ${item.quantity || '1'} ${item.unit || ''}`).join('\n');
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-40">
      {/* Dynamic Header */}
      <header className="bg-emerald-900 text-white p-4 shadow-2xl sticky top-0 z-50 no-print transition-all">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-white p-2 rounded-xl text-emerald-900 shadow-inner group transition-transform hover:rotate-12">
              <Stethoscope size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight">صيدلية الغيث</h1>
              <p className="text-[10px] text-emerald-300 font-bold uppercase tracking-widest">Smart Stock Manager</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => { setShowBulkAdd(!showBulkAdd); setShowSettings(false); }}
              className={`p-2.5 rounded-xl transition-all ${showBulkAdd ? 'bg-emerald-500 shadow-lg' : 'bg-emerald-800 hover:bg-emerald-700'}`}
              title="إضافة سريعة"
            >
              <ListPlus size={20} />
            </button>
            <button 
              onClick={() => { setShowSettings(!showSettings); setShowBulkAdd(false); }}
              className={`p-2.5 rounded-xl transition-all ${showSettings ? 'bg-white text-emerald-900' : 'bg-emerald-800 hover:bg-emerald-700'}`}
              title="الإعدادات"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white border-b-4 border-emerald-500 p-6 no-print shadow-2xl animate-in slide-in-from-top duration-300 relative z-40">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 flex items-center gap-2"><ArrowUpDown size={14}/> نوع الخط</label>
              <select 
                value={fontConfig.family}
                onChange={(e) => setFontConfig({...fontConfig, family: e.target.value as FontFamily})}
                className="w-full border-2 p-3 rounded-2xl bg-slate-50 font-bold border-slate-100 outline-none focus:border-emerald-500"
              >
                <option value="Cairo">Cairo (عصري)</option>
                <option value="Amiri">Amiri (كلاسيكي)</option>
                <option value="Tajawal">Tajawal (بسيط)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500">حجم النص ({fontConfig.size}px)</label>
              <input 
                type="range" min="14" max="40" value={fontConfig.size}
                onChange={(e) => setFontConfig({...fontConfig, size: parseInt(e.target.value)})}
                className="w-full h-8 accent-emerald-600"
              />
            </div>
            <div className="flex gap-3 items-end">
              <button 
                onClick={() => setFontConfig({...fontConfig, bold: !fontConfig.bold})}
                className={`flex-1 py-3 border-2 rounded-2xl font-bold transition-all ${fontConfig.bold ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white border-slate-100'}`}
              >B (سميك)</button>
              <input 
                type="color" value={fontConfig.color}
                onChange={(e) => setFontConfig({...fontConfig, color: e.target.value})}
                className="w-20 h-12 border-2 border-slate-100 rounded-2xl cursor-pointer p-1"
              />
            </div>
          </div>
        </div>
      )}

      {/* Bulk Add Drawer */}
      {showBulkAdd && (
        <div className="bg-emerald-50 border-b-4 border-emerald-400 p-6 no-print shadow-2xl animate-in slide-in-from-top duration-300 relative z-40">
           <div className="max-w-5xl mx-auto space-y-4">
              <div className="flex justify-between items-center">
                 <h3 className="text-sm font-black text-emerald-900 flex items-center gap-2">
                   <Info size={18} className="text-emerald-500" />
                   اللصق الذكي (تعرف تلقائي على الاسم والعدد)
                 </h3>
                 <button onClick={() => setShowBulkAdd(false)} className="text-emerald-800 bg-emerald-100 p-1 rounded-full"><X size={20} /></button>
              </div>
              <textarea 
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder="أدخل المواد هنا، مثال:
باندول 5 شريط
أدول باكيت 10"
                className="w-full h-40 p-4 border-2 border-emerald-100 rounded-3xl bg-white font-bold text-sm outline-none focus:border-emerald-500 shadow-inner"
                dir="rtl"
              />
              <button 
                onClick={handleBulkAdd}
                className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-xl shadow-emerald-200 hover:bg-emerald-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Plus size={20} /> إضافة القائمة الذكية
              </button>
           </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto p-4 sm:p-6 printable-content">
        
        {/* Search & Sort HUD (No Print) */}
        <div className="mb-6 no-print space-y-4">
          <div className="relative group">
            <Search size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500 group-focus-within:scale-110 transition-transform" />
            <input 
              type="text"
              placeholder="بحث سريع في القائمة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-12 pl-6 py-4 rounded-3xl border-2 border-white shadow-lg outline-none focus:border-emerald-500 font-bold text-sm transition-all"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => handleSort('name')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[11px] font-black transition-all ${sortConfig?.key === 'name' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white text-slate-600 border border-slate-200'}`}
            >
              <SortAsc size={14} /> فرز حسب الاسم {sortConfig?.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
            </button>
            <button 
              onClick={() => handleSort('quantity')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[11px] font-black transition-all ${sortConfig?.key === 'quantity' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white text-slate-600 border border-slate-200'}`}
            >
              <ArrowUpDown size={14} /> فرز بالعدد
            </button>
            <button 
              onClick={() => handleSort('unit')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[11px] font-black transition-all ${sortConfig?.key === 'unit' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white text-slate-600 border border-slate-200'}`}
            >
              {/* Fix: Added missing Filter icon import */}
              <Filter size={14} /> النوع
            </button>
          </div>
        </div>

        {/* ITEMS TABLE/LIST */}
        <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden no-print">
          <div className="bg-emerald-50/50 p-5 border-b flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="bg-emerald-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold">
                {filteredAndSortedItems.length}
              </span>
              <span className="text-xs font-black text-emerald-900 uppercase">مادة مسجلة</span>
            </div>
            <button 
              onClick={clearAll} 
              className="text-[10px] font-black text-rose-600 flex items-center gap-2 bg-rose-50 px-3 py-2 rounded-xl hover:bg-rose-100 transition-colors"
            >
              <Trash2 size={14} /> إفراغ الكل
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredAndSortedItems.map((item, index) => (
              <div key={item.id} className="p-4 sm:p-6 flex flex-wrap md:flex-nowrap gap-4 items-center group hover:bg-emerald-50/10 transition-all animate-in fade-in duration-300">
                <div className="w-8 text-slate-200 font-black text-sm text-center group-hover:text-emerald-200 transition-colors">{index + 1}</div>
                
                <div className="flex-1 min-w-[180px] flex items-center gap-3">
                  <input 
                    type="text" 
                    placeholder="اسم المادة..." 
                    value={item.name}
                    onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                    style={{ 
                      fontFamily: fontConfig.family, fontSize: `${fontConfig.size}px`,
                      color: fontConfig.color, fontWeight: fontConfig.bold ? 'bold' : 'normal'
                    }}
                    className="w-full border-none focus:ring-0 bg-transparent py-1 placeholder:text-slate-200"
                  />
                  <button 
                    onClick={() => handleGoogleSearch(item.name)}
                    className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all md:opacity-0 group-hover:opacity-100"
                    title="بحث جوجل"
                  >
                    <ExternalLink size={16} />
                  </button>
                </div>
                
                <div className="w-40 relative">
                  <select 
                    value={item.unit}
                    onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                    className="w-full appearance-none border-2 border-slate-50 rounded-2xl px-4 py-3 bg-slate-50 text-[11px] font-black text-emerald-900 focus:border-emerald-500 focus:bg-white outline-none pr-8 transition-all"
                  >
                    <option value="" disabled>النوع</option>
                    {UNIT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400 pointer-events-none" />
                </div>

                <div className="w-24">
                  <input 
                    type="text" 
                    placeholder="0" 
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, 'quantity', toEnglishDigits(e.target.value))}
                    className="w-full border-2 border-emerald-50 rounded-2xl px-4 py-3 bg-emerald-50/30 text-center font-black text-emerald-700 outline-none focus:bg-white focus:border-emerald-400 transition-all"
                  />
                </div>

                <button 
                  onClick={() => removeItem(item.id)} 
                  className="text-slate-200 hover:text-rose-500 p-2 md:opacity-0 md:group-hover:opacity-100 transition-all"
                  aria-label="حذف"
                >
                  <Trash size={20} />
                </button>
              </div>
            ))}
            
            {filteredAndSortedItems.length === 0 && (
              <div className="p-20 text-center space-y-4">
                 <Search size={48} className="mx-auto text-slate-100" />
                 <p className="text-slate-400 font-bold italic">لا توجد مواد تطابق بحثك حالياً</p>
              </div>
            )}
          </div>

          <button 
            onClick={addItem}
            className="w-full p-8 text-emerald-600 bg-white border-t border-dashed border-emerald-100 flex justify-center items-center gap-4 hover:bg-emerald-50/50 transition-all active:scale-[0.99]"
          >
            <div className="bg-emerald-100 p-2 rounded-full"><Plus size={24} /></div>
            <span className="text-lg font-black">إضافة مادة جديدة يدوياً</span>
          </button>
        </div>

        {/* PRINT ONLY LAYOUT */}
        <div className="hidden print-only mt-8">
          <div className="text-center mb-8 border-b-4 border-emerald-900 pb-6">
             <h1 className="text-4xl font-black text-emerald-900 mb-2">صيدلية الغيث</h1>
             <p className="text-xl font-bold text-slate-600">قائمة النواقص الرسمية</p>
             <div className="flex justify-between mt-6 text-sm font-bold text-slate-500">
                <span>تاريخ: {new Date().toLocaleDateString('ar-EG')}</span>
                <span>العدد الإجمالي: {items.filter(i => i.name.trim() !== '').length} مادة</span>
             </div>
          </div>
          
          <table className="w-full border-collapse">
            <thead>
               <tr className="bg-emerald-900 text-white">
                  <th className="p-4 border border-emerald-900 w-12 text-center">#</th>
                  <th className="p-4 border border-emerald-900 text-right">المادة الدوائية</th>
                  <th className="p-4 border border-emerald-900 w-32 text-center">النوع</th>
                  <th className="p-4 border border-emerald-900 w-32 text-center">الكمية</th>
               </tr>
            </thead>
            <tbody>
               {items.filter(i => i.name.trim() !== '').map((item, index) => (
                  <tr key={item.id} className="border-b-2 border-slate-200">
                     <td className="p-4 border-l border-r border-slate-200 text-center font-bold">{index + 1}</td>
                     <td className="p-4 border-l border-r border-slate-200 text-right" style={{ 
                        fontFamily: fontConfig.family, fontSize: `${fontConfig.size}px`,
                        color: fontConfig.color, fontWeight: fontConfig.bold ? 'bold' : 'normal'
                     }}>{item.name}</td>
                     <td className="p-4 border-l border-r border-slate-200 text-center font-bold">{item.unit || '-'}</td>
                     <td className="p-4 border-l border-r border-slate-200 text-center text-2xl font-black">{item.quantity || '1'}</td>
                  </tr>
               ))}
            </tbody>
          </table>
          
          <div className="mt-20 text-center text-xs text-slate-400 font-bold border-t pt-4">
             تم إنشاء هذه القائمة بواسطة نظام مدير النواقص الذكي - صيدلية الغيث
          </div>
        </div>
      </main>

      {/* FIXED FLOATING ACTION HUD */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6 no-print z-50">
        <div className="bg-emerald-950/95 backdrop-blur-xl text-white shadow-[0_20px_50px_-10px_rgba(6,78,59,0.5)] rounded-[2.5rem] flex justify-between items-center p-3 border border-white/10">
          
          <button 
            onClick={handlePrint} 
            className="flex flex-col items-center gap-1.5 hover:bg-white/10 p-3 rounded-3xl transition-all flex-1 active:scale-90 group"
          >
            <Printer size={22} className="text-emerald-400 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-tight">طباعة</span>
          </button>
          
          <div className="w-px h-10 bg-white/10"></div>

          <button 
            onClick={handleShareWhatsApp} 
            className="flex flex-col items-center gap-1.5 hover:bg-white/10 p-3 rounded-3xl transition-all flex-1 active:scale-90 group"
          >
            <Smartphone size={22} className="text-emerald-500 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-tight">واتساب</span>
          </button>

          <div className="w-px h-10 bg-white/10"></div>

          <button 
            onClick={() => {
              const text = items.filter(i => i.name.trim() !== '').map((i, idx) => `${idx+1}. ${i.name} (${i.quantity} ${i.unit})`).join('\n');
              navigator.clipboard.writeText(text);
              alert('✅ تم نسخ القائمة بنجاح');
            }} 
            className="flex flex-col items-center gap-1.5 hover:bg-white/10 p-3 rounded-3xl transition-all flex-1 active:scale-90 group"
          >
            <Copy size={22} className="text-emerald-300 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-tight">نسخ</span>
          </button>

          <div className="w-px h-10 bg-white/10"></div>

          <button 
            onClick={handlePrint} 
            className="flex flex-col items-center gap-1.5 hover:bg-white/10 p-3 rounded-3xl transition-all flex-1 active:scale-90 group"
          >
            <FileText size={22} className="text-sky-400 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-tight">PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
