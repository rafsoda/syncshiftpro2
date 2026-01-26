
export type ShiftType = 'morning' | 'evening' | 'all-day' | 'none';

export interface AvailabilityEntry {
  id: string;
  workerName: string;
  date: string; // ISO string format (YYYY-MM-DD)
  shiftType: ShiftType;
  timestamp: number;
}

export interface Worker {
  name: string;
}

export interface DailySummary {
  date: string;
  morning: string[];
  evening: string[];
  allDay: string[];
}
