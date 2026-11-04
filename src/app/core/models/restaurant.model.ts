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
  cuisines?: string[];
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
  email?: string;
  hours?: string;
  weeklyHours?: DayHours[];
  menuHighlights?: MenuItem[];
  dietaryOptions?: string[];
  reviews?: RestaurantReview[];
  isActive?: boolean;
}

/**
 * Backend API Restaurant DTO contract
 * Returned by GET /api/restaurants
 */
export interface ApiRestaurantCuisineDto {
  cuisineId?: number;
  cuisineName?: string;
  name?: string;
  cuisine?: {
    id?: number;
    name?: string;
  };
}

export interface ApiRestaurantDto {
  id: number | string;
  name: string;
  address: string;
  city: string;
  description?: string;
  phone?: string;
  email?: string;
  coverImagePath?: string | null;
  isActive?: boolean;
  restaurantCuisines?: ApiRestaurantCuisineDto[];
  cuisines?: string[];
  cuisineNames?: string[];
  cuisine?: string;
  rating?: number;
  reviewCount?: number;
  priceRange?: string;
  badge?: string;
  featured?: boolean;
  availableSlots?: string[];
  highlights?: string[];
  dressCode?: string;
}

export const BACKEND_ORIGIN = 'https://localhost:7033';
export const DEFAULT_FALLBACK_RESTAURANT_IMAGE = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80';

export function resolveCoverImageUrl(path?: string | null): string {
  if (!path || typeof path !== 'string' || path.trim().length === 0) {
    return DEFAULT_FALLBACK_RESTAURANT_IMAGE;
  }
  const trimmed = path.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${BACKEND_ORIGIN}${cleanPath}`;
}

export function mapApiRestaurantToDomain(dto: ApiRestaurantDto): Restaurant {
  const imageUrl = resolveCoverImageUrl(dto.coverImagePath);

  // Extract cuisine name(s)
  let cuisineList: string[] = [];
  if (Array.isArray(dto.restaurantCuisines) && dto.restaurantCuisines.length > 0) {
    cuisineList = dto.restaurantCuisines
      .map(rc => rc?.cuisine?.name || rc?.cuisineName || rc?.name || '')
      .map(n => n.trim())
      .filter(n => n.length > 0);
  } else if (Array.isArray(dto.cuisines) && dto.cuisines.length > 0) {
    cuisineList = dto.cuisines.map(c => c.trim()).filter(c => c.length > 0);
  } else if (Array.isArray(dto.cuisineNames) && dto.cuisineNames.length > 0) {
    cuisineList = dto.cuisineNames.map(c => c.trim()).filter(c => c.length > 0);
  } else if (typeof dto.cuisine === 'string' && dto.cuisine.trim().length > 0) {
    cuisineList = dto.cuisine.split(',').map(c => c.trim()).filter(c => c.length > 0);
  }

  const cuisineStr = cuisineList.length > 0 ? cuisineList.join(', ') : 'Fine Dining';
  if (cuisineList.length === 0) {
    cuisineList = ['Fine Dining'];
  }

  const desc = dto.description && dto.description.trim().length > 0
    ? dto.description.trim()
    : 'An intimate dining sanctuary offering artisanal seasonal gastronomy and world-class table service.';

  const tagline = desc.length > 70 ? `${desc.slice(0, 67)}...` : desc;

  const validPriceRange: '$$' | '$$$' | '$$$$' = 
    dto.priceRange === '$$' || dto.priceRange === '$$$$' ? dto.priceRange : '$$$';

  return {
    id: String(dto.id),
    name: dto.name,
    tagline,
    cuisine: cuisineStr,
    cuisines: cuisineList,
    location: dto.address ? `${dto.address}, ${dto.city}` : dto.city,
    neighborhood: dto.city,
    city: dto.city,
    rating: dto.rating !== undefined && dto.rating > 0 ? dto.rating : 4.9,
    reviewCount: dto.reviewCount !== undefined && dto.reviewCount > 0 ? dto.reviewCount : 12,
    priceRange: validPriceRange,
    imageUrl,
    badge: dto.badge || 'New Sanctuary',
    featured: dto.featured !== undefined ? dto.featured : true,
    description: desc,
    availableSlots: dto.availableSlots && dto.availableSlots.length > 0 
      ? dto.availableSlots 
      : ['5:30 PM', '7:00 PM', '8:30 PM', '9:45 PM'],
    highlights: dto.highlights && dto.highlights.length > 0 
      ? dto.highlights 
      : ["Chef's Seasonal Tasting Menu", 'Sommelier Pairing Selection', 'Private Table Pacing'],
    dressCode: dto.dressCode || 'Smart Casual & Formal Elegant',
    galleryImages: [imageUrl, DEFAULT_FALLBACK_RESTAURANT_IMAGE],
    phone: dto.phone,
    address: dto.address,
    email: dto.email,
    isActive: dto.isActive !== false
  };
}

/**
 * Case-insensitive, partial keyword search matcher across live & mock restaurant entities.
 * Evaluates:
 * - Restaurant name
 * - City
 * - Address
 * - Description
 * - Cuisine names (both combined string and individual cuisines list)
 * - Supporting context (neighborhood, location, tagline, highlights)
 */
export function matchesRestaurantSearch(restaurant: Restaurant, query: string): boolean {
  if (!query || typeof query !== 'string') return true;
  const q = query.trim().toLowerCase();
  if (q.length === 0) return true;

  // 1. Restaurant Name
  if (restaurant.name && restaurant.name.toLowerCase().includes(q)) return true;

  // 2. City
  if (restaurant.city && restaurant.city.toLowerCase().includes(q)) return true;

  // 3. Address
  if (restaurant.address && restaurant.address.toLowerCase().includes(q)) return true;

  // 4. Description
  if (restaurant.description && restaurant.description.toLowerCase().includes(q)) return true;

  // 5. Cuisine Names (both combined string and individual cuisines array)
  if (restaurant.cuisine && restaurant.cuisine.toLowerCase().includes(q)) return true;
  if (Array.isArray(restaurant.cuisines) && restaurant.cuisines.some(c => typeof c === 'string' && c.toLowerCase().includes(q))) {
    return true;
  }

  // 6. Additional rich context
  if (restaurant.neighborhood && restaurant.neighborhood.toLowerCase().includes(q)) return true;
  if (restaurant.location && restaurant.location.toLowerCase().includes(q)) return true;
  if (restaurant.tagline && restaurant.tagline.toLowerCase().includes(q)) return true;
  if (Array.isArray(restaurant.highlights) && restaurant.highlights.some(h => typeof h === 'string' && h.toLowerCase().includes(q))) {
    return true;
  }

  return false;
}

/**
 * Robust cuisine filter matcher supporting both single/multiple cuisines
 * and slugified identifiers (e.g. 'french-haute', 'italian', 'french').
 */
export function matchesRestaurantCuisine(restaurant: Restaurant, selectedCuisine: string): boolean {
  if (!selectedCuisine || typeof selectedCuisine !== 'string') return true;
  const selected = selectedCuisine.trim().toLowerCase();
  if (selected === 'all' || selected.length === 0) return true;

  const selectedNoDash = selected.replace(/-/g, ' ');

  const singleMatches = (cuisineName: string): boolean => {
    if (!cuisineName) return false;
    const cLower = cuisineName.trim().toLowerCase();
    const cSlug = cLower.replace(/\s+/g, '-');
    const cClean = cLower.replace(/[^a-z0-9]/g, '');
    const selClean = selected.replace(/[^a-z0-9]/g, '');

    // Exact match or slug match
    if (cLower === selected || cLower === selectedNoDash || cSlug === selected) return true;

    // Substring / partial match (e.g. 'french' matches 'French Haute')
    if (cLower.includes(selected) || cLower.includes(selectedNoDash)) return true;
    if (selected.includes(cSlug) || selectedNoDash.includes(cLower)) return true;

    // Alphanumeric clean match
    if (selClean.length > 0 && (cClean.includes(selClean) || selClean.includes(cClean))) return true;

    return false;
  };

  // Check cuisines array
  if (Array.isArray(restaurant.cuisines) && restaurant.cuisines.length > 0) {
    if (restaurant.cuisines.some(c => singleMatches(c))) return true;
  }

  // Check combined or single cuisine string
  if (restaurant.cuisine) {
    const parts = restaurant.cuisine.split(',').map(p => p.trim());
    if (parts.some(p => singleMatches(p))) return true;
    if (singleMatches(restaurant.cuisine)) return true;
  }

  return false;
}
