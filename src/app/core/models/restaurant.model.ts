export interface TimeSlot {
  time: string;
  available: boolean;
  type?: 'indoor' | 'patio' | 'chef-counter' | 'private-room';
}

export interface MenuItem {
  name: string;
  description: string;
  price: string;
  category?: 'starter' | 'main' | 'dessert' | 'beverage';
  tag?: string;
  dietary?: string;
}

export interface DayHours {
  day: string;
  hours: string;
  isToday?: boolean;
}

export interface RestaurantReview {
  id: string;
  author: string;
  rating: number;
  date: string;
  title: string;
  comment: string;
  visitType?: string;
  verified: boolean;
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
  galleryImages?: string[];
  chefName?: string;
  phone?: string;
  address?: string;
  hours?: string;
  weeklyHours?: DayHours[];
  menuHighlights?: MenuItem[];
  dietaryOptions?: string[];
  reviews?: RestaurantReview[];
}
