
export interface RecordEntry {
  id: string;
  timestamp: number;
  note?: string;
  mood?: string;
}

export type ViewType = 'calendar' | 'stats' | 'settings';

export interface DayData {
  date: string; // YYYY-MM-DD
  records: RecordEntry[];
}
