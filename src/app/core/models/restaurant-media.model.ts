import { BACKEND_ORIGIN, DEFAULT_FALLBACK_RESTAURANT_IMAGE } from './restaurant.model';

/**
 * Direct response DTO contract for ASP.NET Core RestaurantImage entity
 * Returned by GET and POST /api/restaurants/{restaurantId}/images
 */
export interface RestaurantImageDto {
  id: number;
  restaurantId: number;
  imagePath: string;
  createdAt: string;
}

/**
 * UI-extended gallery image item with resolved absolute URL and primary status
 */
export interface GalleryImageItem extends RestaurantImageDto {
  fullUrl: string;
  isPrimary: boolean;
}

/**
 * API response for DELETE and PUT primary operations
 */
export interface GalleryActionResponse {
  message: string;
}

/**
 * Direct response DTO contract for ASP.NET Core MenuImage entity
 * Returned by GET and POST /api/restaurants/{restaurantId}/menu-images
 */
export interface MenuImageDto {
  id: number;
  restaurantId: number;
  imagePath: string;
  displayOrder: number;
  createdAt: string;
}

/**
 * UI-extended menu image item with resolved absolute URL and page display label
 */
export interface MenuImageItem extends MenuImageDto {
  fullUrl: string;
  pageLabel: string;
}

/**
 * API response for Menu DELETE operations
 */
export interface MenuActionResponse {
  message: string;
}

/**
 * Resolves a backend gallery image path to a full accessible absolute URL
 */
export function resolveGalleryImageUrl(path?: string | null): string {
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

/**
 * Resolves a backend menu image path to a full accessible absolute URL
 */
export function resolveMenuImageUrl(path?: string | null): string {
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
