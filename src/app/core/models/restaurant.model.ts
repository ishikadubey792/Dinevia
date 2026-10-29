export interface TimeSlot {
  time: string;
  available: boolean;
  type?: 'indoor' | 'patio' | 'chef-counter' | 'private-room';
}

export interface Restaurant {
  id: string;
  name: string;
  tagline: string;
  cuisine: string;
  location: string;
  neighborhood: string;
  city: string;
  rating: number;
  reviewCount: number;
  priceRange: '$$' | '$$$' | '$$$$';
  imageUrl: string;
  badge?: string; // e.g., 'Michelin Star', 'Chef's Table', 'Trending', 'Waterfront'
  featured: boolean;
  description: string;
  availableSlots: string[]; // e.g. ['6:00 PM', '7:30 PM', '8:45 PM']
  highlights: string[];
  dressCode?: string;
}
