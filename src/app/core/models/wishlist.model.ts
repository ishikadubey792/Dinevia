import { Restaurant } from './restaurant.model';

/**
 * Backend DTO returned by GET /api/wishlist.
 * Matches ASP.NET Core RestaurantBookingAPI.Models.Wishlist.
 */
export interface WishlistItemDto {
  id: number;
  userId: number;
  restaurantId: number;
  createdAt: string;
  user?: unknown;
  restaurant?: unknown;
}

/**
 * Standard backend response for POST and DELETE /api/wishlist/{restaurantId}.
 */
export interface WishlistActionResponse {
  message: string;
  statusCode?: number;
}

/**
 * Complete hydrated wishlist entry with full domain Restaurant details.
 */
export interface HydratedWishlistItem {
  wishlistId: number;
  restaurantId: number;
  addedAt: string;
  restaurant: Restaurant;
}
