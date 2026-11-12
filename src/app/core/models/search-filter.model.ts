export interface SearchCriteria {
  location: string;
  cuisine: string;
  date: string;
  guests: number;
  startTime?: string; // e.g. "18:30" or "6:30 PM"
  endTime?: string;   // e.g. "20:00" or "8:00 PM"
  /** Backwards compatibility for legacy consumers */
  time?: string;
}

export interface QuickFilter {
  id: string;
  label: string;
  active: boolean;
}
