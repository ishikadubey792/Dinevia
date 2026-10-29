import { Injectable, signal, computed } from '@angular/core';
import { Restaurant } from '../models/restaurant.model';
import { Cuisine } from '../models/cuisine.model';
import { Testimonial } from '../models/testimonial.model';
import { SearchCriteria } from '../models/search-filter.model';
import { MOCK_RESTAURANTS } from '../data/mock-restaurants';
import { MOCK_CUISINES } from '../data/mock-cuisines';
import { MOCK_TESTIMONIALS } from '../data/mock-testimonials';

@Injectable({
  providedIn: 'root'
})
export class RestaurantService {
  // Reactive signals for state management
  private readonly restaurantsSignal = signal<Restaurant[]>(MOCK_RESTAURANTS);
  private readonly cuisinesSignal = signal<Cuisine[]>(MOCK_CUISINES);
  private readonly testimonialsSignal = signal<Testimonial[]>(MOCK_TESTIMONIALS);
  
  // Selected filter states
  private readonly selectedCuisineFilter = signal<string>('all');
  private readonly selectedCategoryFilter = signal<string>('all');
  private readonly activeSearchCriteria = signal<SearchCriteria | null>(null);

  // Readonly public accessors
  readonly restaurants = this.restaurantsSignal.asReadonly();
  readonly cuisines = this.cuisinesSignal.asReadonly();
  readonly testimonials = this.testimonialsSignal.asReadonly();
  readonly selectedCategory = this.selectedCategoryFilter.asReadonly();
  readonly selectedCuisine = this.selectedCuisineFilter.asReadonly();

  // Computed filtered restaurant list
  readonly filteredRestaurants = computed(() => {
    let list = this.restaurantsSignal();
    const category = this.selectedCategoryFilter().toLowerCase();
    const cuisine = this.selectedCuisineFilter().toLowerCase();
    const search = this.activeSearchCriteria();

    if (category !== 'all') {
      if (category === 'michelin') {
        list = list.filter(r => r.badge?.toLowerCase().includes('michelin'));
      } else if (category === 'chef') {
        list = list.filter(r => r.badge?.toLowerCase().includes('chef'));
      } else if (category === 'trending') {
        list = list.filter(r => r.badge?.toLowerCase().includes('trending') || r.rating >= 4.9);
      }
    }

    if (cuisine !== 'all') {
      list = list.filter(r => r.cuisine.toLowerCase() === cuisine);
    }

    if (search) {
      if (search.cuisine && search.cuisine.toLowerCase() !== 'all') {
        list = list.filter(r => r.cuisine.toLowerCase() === search.cuisine.toLowerCase());
      }
      if (search.location && search.location.trim().length > 0) {
        const query = search.location.toLowerCase();
        list = list.filter(r => 
          r.city.toLowerCase().includes(query) || 
          r.neighborhood.toLowerCase().includes(query) ||
          r.location.toLowerCase().includes(query)
        );
      }
    }

    return list;
  });

  /**
   * Filter by cuisine category
   */
  setCuisineFilter(cuisineSlug: string): void {
    this.selectedCuisineFilter.set(cuisineSlug);
  }

  /**
   * Filter by tab category
   */
  setCategoryFilter(category: string): void {
    this.selectedCategoryFilter.set(category);
  }

  /**
   * Apply criteria from the search panel
   * Clean integration point for future API calls (e.g. GET /api/restaurants?search=...)
   */
  searchRestaurants(criteria: SearchCriteria): void {
    this.activeSearchCriteria.set(criteria);
  }

  /**
   * Clear active filters
   */
  resetFilters(): void {
    this.selectedCuisineFilter.set('all');
    this.selectedCategoryFilter.set('all');
    this.activeSearchCriteria.set(null);
  }

  /**
   * Placeholder for future Table Reservation submission API
   */
  reserveTable(restaurantId: string, details: { date: string; time: string; guests: number; name?: string }) {
    console.info('[RestaurantService: Future API Integration] Reservation intent:', { restaurantId, details });
    return {
      success: true,
      bookingRef: `DV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      restaurant: this.restaurantsSignal().find(r => r.id === restaurantId),
      details
    };
  }
}
