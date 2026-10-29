export interface SearchCriteria {
  location: string;
  cuisine: string;
  date: string;
  time: string;
  guests: number;
}

export interface QuickFilter {
  id: string;
  label: string;
  active: boolean;
}
