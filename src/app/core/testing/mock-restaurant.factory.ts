import { OwnerRestaurant } from '../models/admin.model';
import { ApiRestaurantDto, Restaurant } from '../models/restaurant.model';

/**
 * Factory for creating mock OwnerRestaurant models with safe defaults (including isActive: true).
 */
export function createMockOwnerRestaurant(overrides: Partial<OwnerRestaurant> = {}): OwnerRestaurant {
  return {
    id: '1',
    name: 'Spice Symphony',
    address: '12 Connaught Place',
    city: 'New Delhi',
    description: 'Modern Indian fine dining',
    phone: '+91 11 2345 6789',
    email: 'spice@example.com',
    cuisines: ['North Indian', 'Mughlai'],
    coverImageUrl: 'https://example.com/cover1.jpg',
    isActive: true,
    status: 'active',
    createdAt: '2026-01-01',
    ...overrides
  };
}

/**
 * Creates standard array of mock OwnerRestaurants used across owner portal tests.
 */
export function createMockOwnerRestaurants(): OwnerRestaurant[] {
  return [
    createMockOwnerRestaurant({
      id: '1',
      name: 'Spice Symphony',
      address: '12 Connaught Place',
      city: 'New Delhi',
      description: 'Modern Indian fine dining',
      phone: '+91 11 2345 6789',
      email: 'spice@example.com',
      cuisines: ['North Indian', 'Mughlai'],
      coverImageUrl: 'https://example.com/cover1.jpg',
      isActive: true,
      status: 'active',
      createdAt: '2026-01-01'
    }),
    createMockOwnerRestaurant({
      id: '2',
      name: 'Coastal Rasoi',
      address: '45 Indiranagar',
      city: 'Bengaluru',
      description: 'Coastal Karnataka & Mangalorean culinary experience',
      phone: '+91 80 9876 5432',
      email: 'coastal@example.com',
      cuisines: ['Coastal', 'South Indian'],
      coverImageUrl: 'https://example.com/cover2.jpg',
      isActive: true,
      status: 'active',
      createdAt: '2026-02-01'
    })
  ];
}

/**
 * Factory for creating mock ApiRestaurantDto objects.
 */
export function createMockApiRestaurantDto(overrides: Partial<ApiRestaurantDto> = {}): ApiRestaurantDto {
  return {
    id: 1,
    name: 'Maison Laurent Paris',
    address: '18 Rue Royale',
    city: 'Paris',
    description: 'An intimate dining sanctuary pairing French terroir gastronomy with master cellar vintages.',
    phone: '+33 1 42 68 88 00',
    email: 'contact@maisonlaurent.fr',
    coverImagePath: '/uploads/restaurants/1_cover.jpg',
    isActive: true,
    priceRange: '$$$$',
    rating: 4.95,
    reviewCount: 350,
    badge: 'Michelin Starred',
    featured: true,
    latitude: 48.8584,
    longitude: 2.2945,
    restaurantCuisines: [
      {
        cuisineId: 1,
        cuisine: { id: 1, name: 'French Haute' }
      }
    ],
    ...overrides
  };
}

/**
 * Factory for creating domain Restaurant objects.
 */
export function createMockRestaurant(overrides: Partial<Restaurant> = {}): Restaurant {
  return {
    id: '1',
    name: 'Maison Laurent Paris',
    tagline: 'Terroir gastronomy sanctuary',
    cuisine: 'French Haute',
    location: 'Paris, France',
    neighborhood: '1st Arrondissement',
    address: '18 Rue Royale',
    city: 'Paris',
    priceRange: '$$$$',
    rating: 4.95,
    reviewCount: 350,
    imageUrl: '/uploads/restaurants/1_cover.jpg',
    badge: 'Michelin Starred',
    featured: true,
    description: 'An intimate dining sanctuary pairing French terroir gastronomy with master cellar vintages.',
    availableSlots: ['18:30', '19:30', '20:30'],
    highlights: ['Wine Cellar', 'Chef Counter'],
    isActive: true,
    latitude: 48.8584,
    longitude: 2.2945,
    ...overrides
  };
}
