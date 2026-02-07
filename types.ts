
export interface ShortageItem {
  id: string;
  name: string;
  quantity: string;
  unit: string; // Added unit field (e.g., باكيت, شريط, إمبولة)
  notes: string;
}

export type FontFamily = 'Cairo' | 'Amiri' | 'Tajawal' | 'Arial';

export interface FontConfig {
  size: number;
  family: FontFamily;
  color: string;
  bold: boolean;
}

export interface AppState {
  items: ShortageItem[];
  fontConfig: FontConfig;
  pharmacyName: string;
}
