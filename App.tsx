
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
  Filter,
  Trash
} from 'lucide-react';
import { ShortageItem, FontConfig, FontFamily } from './types';
import { GoogleGenAI } from "@google/genai";

const UNIT_OPTIONS = [
  { label: 'باكيت (Pkt)', value: 'Pkt' },
  { label: 'شريط (Strip)', value: 'Strip' },
  { label: 'كيس (Sachet)', value: 'Sachet' },
  { label: 'أمبولة (Amp)', value: 'Amp' },
  { label: 'شراب (Syrup)', value: 'Syrup' },
  { label: 'قطرة (Drops)', value: 'Drops' },
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
        return parsed.fontConfig || { size: 20, family: 'Cairo', color: '#000000', bold: false };
      } catch (e) { return { size: 20, family: 'Cairo', color: '#000000', bold: false }; }
    }
    return { size: 20, family: 'Cairo', color: '#000000', bold: false };
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof ShortageItem, direction: 'asc' | 'desc' } | null>(null);
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [bulkText, setBulkText] = useState('');

  useEffect(() => {
    localStorage.setItem('pharmacy_shortages', JSON.stringify({ items, fontConfig }));
  }, [items, fontConfig]);

  const toEnglishDigits = (str: string) => {
    return str.replace(/[٠-٩]/g, (d) => (d.charCodeAt(0) - 1632).toString());
  };

  // Smart Parser Logic
  const smartParseLine = (line: string): Partial<ShortageItem> => {
    const units = ['شريط', 'باكيت', 'كيس', 'امبول', 'شراب', 'قطرة', 'تحاميل', 'مرهم', 'بخاخ'];
    let name = line;
    let quantity = '';
    let unit = '';

    // Extract quantity (find the first number)
    const qtyMatch = line.match(/\d+/);
    if (qtyMatch) {
      quantity = qtyMatch[0];
      name = name.replace(quantity, '').trim();
    }

    // Extract unit
    for (const u of units) {
      if (line.includes(u)) {
        unit = u;
        name = name.replace(u, '').trim();
        break;
      }
    }

    // Final cleanup of name
    name = name.replace(/\s+/g, ' ').trim();

    return { name, quantity, unit };
  };

  const addItem = useCallback(() => {
    setItems(prev => [...prev, { id: Date.now().toString(), name: '', quantity: '', unit: '', notes: '' }]);
  }, []);

  const updateItem = (id: string, field: keyof ShortageItem, value: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const clearAll = () => {
    if (window.confirm('هل أنت متأكد من حذف القائمة بالكامل؟')) {
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

    if (items.length === 1 && items[0].name === '') {
      setItems(newItems);
    } else {
      setItems(prev => [...prev, ...newItems]);
    }

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

  // Filter and Sort Logic
  const filteredAndSortedItems = useMemo(() => {
    let result = [...items].filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.unit.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (sortConfig) {
      result.sort((a, b) => {
        const valA = (a[sortConfig.key] || '').toString();
        const valB = (b[sortConfig.key] || '').toString();
        return sortConfig.direction === 'asc' 
          ? valA.localeCompare(valB, 'ar') 
          : valB.localeCompare(valA, 'ar');
      });
    }
    return result;
  }, [items, searchTerm, sortConfig]);

  const handleGoogleSearch = (name: string) => {
    if (!name) return;
    window.open(`https://www.google.com/search?q=${encodeURIComponent(name + ' دواء')}`, '_blank');
  };

  const handlePrint = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setTimeout(() => window.print(), 150);
  };

  const handleShareWhatsApp = (e: React.MouseEvent) => {
    e.preventDefault();
    const activeItems = items.filter(i => i.name.trim() !== '');
    if (activeItems.length === 0) return;
    const text = `*نواقص صيدلية الغيث*\n\n` + 
      activeItems.map((item, index) => `${index + 1}. ${item.name} | العدد: ${item.quantity || '1'} ${item.unit || ''}`).join('\n');
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      {/* Header */}
      <header className="bg-emerald-900 text-white p-4 shadow-xl sticky top-0 z-50 no-print">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-white p-1.5 rounded-lg text-emerald-900 shadow-sm">
              <Stethoscope size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold">Al-Ghaith Pharmacy</h1>
              <p className="text-[10px] text-emerald-200 font-medium">نظام النواقص الذكي (V2.0)</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => { setShowSettings(!showSettings); setShowBulkAdd(false); }}
              className={`p-2 rounded-xl transition-all ${showSettings ? 'bg-white text-emerald-900' : 'bg-emerald-800 hover:bg-emerald-700'}`}
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white border-b p-4 no-print shadow-lg animate-in slide-in-from-top">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400">نوع الخط</label>
              <select 
                value={fontConfig.family}
                onChange={(e) => setFontConfig({...fontConfig, family: e.target.value as FontFamily})}
                className="w-full border-2 p-2 rounded-xl bg-slate-50 text-sm font-bold border-slate-100"
              >
                <option value="Cairo">Cairo (عصري)</option>
                <option value="Amiri">Amiri (كلاسيكي)</option>
                <option value="Tajawal">Tajawal (بسيط)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400">حجم الخط ({fontConfig.size}px)</label>
              <input 
                type="range" min="12" max="60" value={fontConfig.size}
                onChange={(e) => setFontConfig({...fontConfig, size: parseInt(e.target.value)})}
                className="w-full h-8 accent-emerald-600"
              />
            </div>
            <div className="flex gap-2 items-end">
              <button 
                onClick={() => setFontConfig({...fontConfig, bold: !fontConfig.bold})}
                className={`flex-1 p-2 border-2 rounded-xl font-bold ${fontConfig.bold ? 'bg-emerald-600 text-white' : 'bg-slate-50'}`}
              >B</button>
              <input 
                type="color" value={fontConfig.color}
                onChange={(e) => setFontConfig({...fontConfig, color: e.target.value})}
                className="w-16 h-10 border-2 rounded-xl cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* Bulk Add Panel */}
      {showBulkAdd && (
        <div className="bg-white border-b p-4 no-print shadow-xl relative z-40">
           <div className="max-w-5xl mx-auto space-y-3">
              <div className="flex justify-between items-center">
                 <h3 className="text-sm font-bold text-slate-700">لصق ذكي (مثال: Panadol 5 شريط)</h3>
                 <button onClick={() => setShowBulkAdd(false)} className="text-slate-400"><X size={20} /></button>
              </div>
              <textarea 
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder="الصق المواد هنا..."
                className="w-full h-32 p-4 border-2 border-slate-100 rounded-2xl bg-slate-50 font-bold text-sm outline-none focus:border-emerald-500"
              />
              <button 
                onClick={handleBulkAdd}
                className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700"
              >إضافة ذكية للقائمة</button>
           </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-5xl mx-auto p-4 printable-content">
        
        {/* Search & Sort UI (No Print) */}
        <div className="mb-4 no-print flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="ابحث في النواقص..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-3 rounded-2xl border-2 border-slate-100 outline-none focus:border-emerald-500 font-bold text-sm bg-white shadow-sm"
            />
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => handleSort('name')}
              className="flex items-center gap-2 px-4 py-3 bg-white border-2 border-slate-100 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              <SortAsc size={16} /> فرز بالاسم
            </button>
            <button 
              onClick={() => setShowBulkAdd(!showBulkAdd)}
              className="flex items-center gap-2 px-4 py-3 bg-emerald-100 text-emerald-800 rounded-2xl text-xs font-bold hover:bg-emerald-200"
            >
              <ListPlus size={16} /> إضافة جماعية
            </button>
          </div>
        </div>

        {/* PRINT HEADER */}
        <div className="hidden print-only text-center mb-6 border-b-2 border-slate-800 pb-4">
          <div className="flex justify-between items-end">
            <div className="text-right">
              <p className="font-bold text-xl">Al-Ghaith Pharmacy</p>
              <p className="text-sm">صيدلية الغيث</p>
            </div>
            <h2 className="text-2xl font-black underline">قائمة النواقص</h2>
            <div className="text-left text-[10px]">
              <p>تاريخ: {new Date().toLocaleDateString('ar-EG')}</p>
            </div>
          </div>
        </div>

        {/* Items List */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden no-print">
          <div className="bg-slate-50 p-4 border-b flex justify-between items-center">
            <span className="text-xs font-bold text-slate-500">تم العثور على ({filteredAndSortedItems.length}) مادة</span>
            <button onClick={clearAll} className="text-[10px] font-bold text-rose-500 flex items-center gap-1">
              <Trash size={12} /> مسح القائمة
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredAndSortedItems.map((item, index) => (
              <div key={item.id} className="p-3 sm:p-5 flex flex-wrap md:flex-nowrap gap-3 items-center group hover:bg-emerald-50/20">
                <div className="w-6 text-slate-300 font-bold text-sm text-center">{index + 1}</div>
                
                <div className="flex-1 min-w-[150px] flex items-center gap-2">
                  <input 
                    type="text" placeholder="اسم الدواء..." value={item.name}
                    onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                    style={{ 
                      fontFamily: fontConfig.family, fontSize: `${fontConfig.size}px`,
                      color: fontConfig.color, fontWeight: fontConfig.bold ? 'bold' : 'normal'
                    }}
                    className="w-full border-none focus:ring-0 bg-transparent py-1"
                  />
                  <button 
                    onClick={() => handleGoogleSearch(item.name)}
                    className="p-1.5 text-slate-300 hover:text-blue-500 transition-colors"
                    title="بحث في جوجل"
                  >
                    <ExternalLink size={14} />
                  </button>
                </div>
                
                <div className="w-32 relative">
                  <select 
                    value={item.unit}
                    onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                    className="w-full appearance-none border border-slate-200 rounded-lg px-2 py-2 bg-white text-[11px] font-bold text-slate-600 focus:border-emerald-500 outline-none pr-6"
                  >
                    <option value="" disabled>النوع</option>
                    {UNIT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>

                <div className="w-20">
                  <input 
                    type="text" placeholder="0" value={item.quantity}
                    onChange={(e) => updateItem(item.id, 'quantity', toEnglishDigits(e.target.value))}
                    className="w-full border border-emerald-100 rounded-lg px-2 py-2 bg-emerald-50/20 text-center font-bold text-emerald-800 outline-none"
                  />
                </div>

                <button onClick={() => removeItem(item.id)} className="text-slate-300 hover:text-rose-500 p-2 md:opacity-0 md:group-hover:opacity-100 transition-all">
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
            {filteredAndSortedItems.length === 0 && (
              <div className="p-10 text-center text-slate-400 italic">لا توجد مواد تطابق البحث</div>
            )}
          </div>

          <button 
            onClick={addItem}
            className="w-full p-6 text-emerald-600 bg-white border-t border-dashed border-slate-100 flex justify-center items-center gap-3 hover:bg-emerald-50/50"
          >
            <Plus size={20} className="bg-emerald-100 p-1 rounded-full" />
            <span className="text-sm font-bold">إضافة مادة يدوياً</span>
          </button>
        </div>

        {/* PRINT ONLY CONTENT */}
        <div className="hidden print-only mt-4">
          <table className="w-full border-collapse border-2 border-slate-800">
            <thead>
               <tr className="bg-slate-100 border-b-2 border-slate-800 text-right font-bold">
                  <th className="p-2 border-l border-slate-800 w-10 text-center">#</th>
                  <th className="p-2 border-l border-slate-800 text-right">اسم المادة / الدواء</th>
                  <th className="p-2 border-l border-slate-800 w-24 text-center">النوع</th>
                  <th className="p-2 w-24 text-center">العدد</th>
               </tr>
            </thead>
            <tbody>
               {items.filter(i => i.name.trim() !== '').map((item, index) => (
                  <tr key={item.id} className="border-b border-slate-400">
                     <td className="p-2 border-l border-slate-800 text-center">{index + 1}</td>
                     <td className="p-2 border-l border-slate-800 text-right" style={{ 
                        fontFamily: fontConfig.family, fontSize: `${fontConfig.size}px`,
                        color: fontConfig.color, fontWeight: fontConfig.bold ? 'bold' : 'normal'
                     }}>{item.name}</td>
                     <td className="p-2 border-l border-slate-800 text-center">{item.unit || '-'}</td>
                     <td className="p-2 text-center text-xl font-black">{item.quantity || '1'}</td>
                  </tr>
               ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Floating Action Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 no-print z-50">
        <div className="bg-emerald-900/95 backdrop-blur-md text-white shadow-2xl rounded-2xl flex justify-around items-center p-2 border border-emerald-500/20">
          <button onClick={handlePrint} className="flex flex-col items-center gap-1 hover:bg-emerald-800 p-2 rounded-xl transition-all flex-1 active:scale-95">
            <Printer size={20} className="text-emerald-300" />
            <span className="text-[9px] font-bold">طباعة A4</span>
          </button>
          <div className="w-px h-8 bg-emerald-700/50"></div>
          <button onClick={handleShareWhatsApp} className="flex flex-col items-center gap-1 hover:bg-emerald-800 p-2 rounded-xl transition-all flex-1 active:scale-95">
            <Smartphone size={20} className="text-emerald-400" />
            <span className="text-[9px] font-bold">واتساب</span>
          </button>
          <div className="w-px h-8 bg-emerald-700/50"></div>
          <button onClick={() => {
              const text = items.map(i => `${i.name} (${i.quantity} ${i.unit})`).join('\n');
              navigator.clipboard.writeText(text);
              alert('تم النسخ');
            }} className="flex flex-col items-center gap-1 hover:bg-emerald-800 p-2 rounded-xl transition-all flex-1 active:scale-95">
            <Copy size={20} className="text-emerald-200" />
            <span className="text-[9px] font-bold">نسخ النص</span>
          </button>
          <div className="w-px h-8 bg-emerald-700/50"></div>
          <button onClick={handlePrint} className="flex flex-col items-center gap-1 hover:bg-emerald-800 p-2 rounded-xl transition-all flex-1 active:scale-95">
            <FileText size={20} className="text-sky-300" />
            <span className="text-[9px] font-bold">حفظ PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
