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
  ownerUserId?: number | null;
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

  const cuisineStr = cuisineList.length > 0 ? cuisineList.join(', ') : '';

  const desc = dto.description && dto.description.trim().length > 0
    ? dto.description.trim()
    : '';

  const tagline = desc.length > 70 ? `${desc.slice(0, 67)}...` : desc;

  const validPriceRange: '$$' | '$$$' | '$$$$' = 
    dto.priceRange === '$$' || dto.priceRange === '$$$$' ? dto.priceRange : '$$$';

  const actualRating =
    typeof dto.rating === 'number' && Number.isFinite(dto.rating) && dto.rating > 0
      ? dto.rating
      : 0;
  const actualReviewCount =
    typeof dto.reviewCount === 'number' && Number.isFinite(dto.reviewCount) && dto.reviewCount > 0
      ? dto.reviewCount
      : 0;

  return {
    id: String(dto.id),
    name: dto.name,
    tagline,
    cuisine: cuisineStr,
    cuisines: cuisineList,
    location: dto.address ? `${dto.address}, ${dto.city}` : dto.city,
    neighborhood: dto.city,
    city: dto.city,
    rating: actualRating,
    reviewCount: actualReviewCount,
    priceRange: validPriceRange,
    imageUrl,
    badge: dto.badge,
    featured: dto.featured !== undefined ? dto.featured : true,
    description: desc,
    availableSlots: Array.isArray(dto.availableSlots) && dto.availableSlots.length > 0
      ? dto.availableSlots
      : [],
    highlights: Array.isArray(dto.highlights) && dto.highlights.length > 0
      ? dto.highlights
      : [],
    dressCode: dto.dressCode,
    galleryImages: [imageUrl],
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

/**
 * Checks whether a restaurant has an actual user rating (excludes missing, NaN, or zero values).
 */
export function hasActualRating(rating?: number | null): boolean {
  return typeof rating === 'number' && Number.isFinite(rating) && rating > 0;
}

/**
 * Checks whether a restaurant meets a minimum actual rating threshold.
 * Missing or zero ratings are treated as unrated and never match positive thresholds.
 */
export function meetsMinimumRating(restaurant: Pick<Restaurant, 'rating'>, minRating: number): boolean {
  if (!Number.isFinite(minRating) || minRating <= 0) return true;
  return hasActualRating(restaurant.rating) && restaurant.rating >= minRating;
}

/**
 * Normalizes a cuisine display name into a consistent URL slug.
 */
export function toCuisineSlug(name: string): string {
  return (name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

/**
 * Counts distinct restaurant records matching a given cuisine identifier or slug.
 */
export function countDistinctRestaurantsForCuisine(
  restaurants: readonly Restaurant[],
  cuisineIdentifier: string
): number {
  const distinctIds = new Set<string>();
  for (const restaurant of restaurants) {
    if (matchesRestaurantCuisine(restaurant, cuisineIdentifier)) {
      distinctIds.add(String(restaurant.id));
    }
  }
  return distinctIds.size;
}

/**
 * Returns a new array of restaurants sorted alphabetically (case-insensitive) without mutating the source array.
 */
export function sortRestaurantsAlphabetically<T extends Pick<Restaurant, 'name'>>(
  restaurants: readonly T[],
  direction: 'asc' | 'desc' = 'asc'
): T[] {
  const factor = direction === 'desc' ? -1 : 1;
  return [...restaurants].sort((a, b) =>
    factor * (a.name || '').trim().localeCompare((b.name || '').trim(), undefined, { sensitivity: 'base' })
  );
}

const CUISINE_VISUAL_DEFAULTS: Record<string, { tagline: string; imageUrl: string }> = {
  italian: {
    tagline: 'Handmade pasta, wild truffles & wood-fired heritage',
    imageUrl: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=700&q=80'
  },
  japanese: {
    tagline: 'Artisanal omakase, binchotan skewers & prized wagyu',
    imageUrl: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=700&q=80'
  },
  indian: {
    tagline: 'Royal Awadhi curries, saffron dum biryani & tandoor smoke',
    imageUrl: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=700&q=80'
  },
  mexican: {
    tagline: 'Ancestral heirloom moles & artisanal agave cocktail pairings',
    imageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=700&q=80'
  },
  continental: {
    tagline: 'Hearth-grilled cuts, Parisian brasserie & timeless classics',
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=700&q=80'
  },
  chinese: {
    tagline: 'Delicate dim sum mastery, Sichuan spices & lacquered duck',
    imageUrl: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=700&q=80'
  },
  french: {
    tagline: 'Haute gastronomy, velvety reductions & grand cru cellar pairings',
    imageUrl: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=700&q=80'
  },
  mediterranean: {
    tagline: 'Aegean seafood, cold-pressed olives & wood-fired flatbreads',
    imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=700&q=80'
  }
};

/**
 * Provides optional imagery and tagline metadata for known cuisine slugs without creating mock cuisine rows.
 */
export function getCuisineVisualMetadata(name: string, slug: string): { tagline: string; imageUrl: string } {
  const normalizedSlug = (slug || '').trim().toLowerCase();
  const exact = CUISINE_VISUAL_DEFAULTS[normalizedSlug];
  if (exact) {
    return exact;
  }

  for (const [key, visual] of Object.entries(CUISINE_VISUAL_DEFAULTS)) {
    if (normalizedSlug.length > 0 && normalizedSlug.includes(key)) {
      return visual;
    }
  }

  return {
    tagline: `Artisanal ${name} culinary artistry`,
    imageUrl: DEFAULT_FALLBACK_RESTAURANT_IMAGE
  };
}
