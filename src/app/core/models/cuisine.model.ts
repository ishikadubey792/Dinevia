/**
 * Customer-facing mock cuisine model
 */
export interface Cuisine {
  id: string;
  name: string;
  tagline: string;
  restaurantCount: number;
  imageUrl: string;
  iconName?: string;
  slug: string;
}

/**
 * Backend API Cuisine Entity contract
 * Returned by GET /api/cuisines
 */
export interface ApiCuisine {
  id: number;
  name: string;
  isActive: boolean;
}

/**
 * Standard API Response envelope matching ASP.NET Core response:
 * {
 *   "statusCode": 200,
 *   "message": "Cuisines fetched successfully.",
 *   "data": [...]
 * }
 */
export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
}

export type CuisinesApiResponse = ApiResponse<ApiCuisine[]>;
