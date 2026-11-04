import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  Restaurant,
  ApiRestaurantDto,
  mapApiRestaurantToDomain,
  matchesRestaurantSearch,
  matchesRestaurantCuisine,
  DEFAULT_FALLBACK_RESTAURANT_IMAGE
} from '../models/restaurant.model';
import { Cuisine } from '../models/cuisine.model';
import { Testimonial } from '../models/testimonial.model';
import { SearchCriteria } from '../models/search-filter.model';
import { ApiResponse } from '../models/cuisine.model';
import { MOCK_RESTAURANTS } from '../data/mock-restaurants';
import { MOCK_CUISINES } from '../data/mock-cuisines';
import { MOCK_TESTIMONIALS } from '../data/mock-testimonials';

@Injectable({
  providedIn: 'root'
})
export class RestaurantService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  // Reactive signals for state management
  private readonly restaurantsSignal = signal<Restaurant[]>(MOCK_RESTAURANTS);
  private readonly cuisinesSignal = signal<Cuisine[]>(MOCK_CUISINES);
  private readonly testimonialsSignal = signal<Testimonial[]>(MOCK_TESTIMONIALS);

  // Real API state signals
  readonly isLoadingRestaurants = signal<boolean>(false);
  readonly restaurantLoadError = signal<string | null>(null);
  readonly isApiLoaded = signal<boolean>(false);

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
    const cuisine = this.selectedCuisineFilter();
    const search = this.activeSearchCriteria();

    if (category !== 'all') {
      if (category === 'michelin') {
        list = list.filter(r => r.badge?.toLowerCase().includes('michelin'));
      } else if (category === 'chef') {
        list = list.filter(r => r.badge?.toLowerCase().includes('chef'));
      } else if (category === 'trending') {
        list = list.filter(r => r.badge?.toLowerCase().includes('trending') || (r.rating || 0) >= 4.9);
      }
    }

    if (cuisine !== 'all') {
      list = list.filter(r => matchesRestaurantCuisine(r, cuisine));
    }

    if (search) {
      if (search.cuisine && search.cuisine.toLowerCase() !== 'all') {
        list = list.filter(r => matchesRestaurantCuisine(r, search.cuisine));
      }
      if (search.location && search.location.trim().length > 0) {
        list = list.filter(r => matchesRestaurantSearch(r, search.location));
      }
    }

    return list;
  });

  constructor() {
    this.loadLiveRestaurants();
  }

  /**
   * Fetch restaurants from ASP.NET Core backend API:
   * GET /api/restaurants
   */
  fetchRestaurants(): Observable<Restaurant[]> {
    this.isLoadingRestaurants.set(true);
    this.restaurantLoadError.set(null);

    return this.http.get<ApiResponse<ApiRestaurantDto[]> | ApiRestaurantDto[]>(
      `${this.apiUrl}/restaurants`
    ).pipe(
      map(res => {
        let rawList: ApiRestaurantDto[] = [];
        if (Array.isArray(res)) {
          rawList = res;
        } else if (res && Array.isArray(res.data)) {
          rawList = res.data;
        }

        // Filter only active restaurants
        const activeList = rawList.filter(dto => dto.isActive !== false);

        // Map to client domain models
        return activeList.map(dto => mapApiRestaurantToDomain(dto));
      }),
      tap(mapped => {
        this.isLoadingRestaurants.set(false);
        this.isApiLoaded.set(true);
        // Replace mock with live restaurants (even if empty, reflecting true backend state)
        this.restaurantsSignal.set(mapped);
        this.syncCuisinesWithRestaurants(mapped);
      }),
      catchError(err => {
        this.isLoadingRestaurants.set(false);
        this.restaurantLoadError.set('Unable to reach live restaurant service. Showing curated reserve catalog.');
        console.warn('[RestaurantService] Live API /api/restaurants unavailable, fallback active:', err);
        // Keep current fallback data so user is not blocked
        return of(this.restaurantsSignal());
      })
    );
  }

  /**
   * Synchronize cuisines list with live restaurant entities
   */
  private syncCuisinesWithRestaurants(restaurants: Restaurant[]): void {
    const merged = [...MOCK_CUISINES];
    const knownSlugs = new Set(merged.map(c => c.slug.toLowerCase()));
    const knownNames = new Set(merged.map(c => c.name.toLowerCase()));

    restaurants.forEach(r => {
      const list = Array.isArray(r.cuisines) && r.cuisines.length > 0
        ? r.cuisines
        : (r.cuisine ? r.cuisine.split(',').map(s => s.trim()) : []);

      list.forEach(cName => {
        if (!cName || cName.trim().length === 0) return;
        const name = cName.trim();
        const lower = name.toLowerCase();
        const slug = lower.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

        if (!knownNames.has(lower) && !knownSlugs.has(slug)) {
          knownNames.add(lower);
          knownSlugs.add(slug);
          merged.push({
            id: `cuisine-${slug}`,
            name,
            tagline: `Artisanal ${name} culinary artistry`,
            restaurantCount: 1,
            imageUrl: DEFAULT_FALLBACK_RESTAURANT_IMAGE,
            slug
          });
        }
      });
    });

    this.cuisinesSignal.set(merged);
  }

  /**
   * Helper to trigger live restaurant loading
   */
  loadLiveRestaurants(): void {
    this.fetchRestaurants().subscribe();
  }

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

  // Saved Wishlist State
  private readonly savedIdsSignal = signal<Set<string>>(this.loadInitialSavedIds());
  readonly savedIds = this.savedIdsSignal.asReadonly();

  private loadInitialSavedIds(): Set<string> {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('dinevia_saved_restaurants');
        if (stored) {
          return new Set<string>(JSON.parse(stored));
        }
      } catch (e) {
        console.warn('Could not read saved restaurants from localStorage', e);
      }
    }
    const initial = new Set<string>(['rest-1', 'rest-2']);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('dinevia_saved_restaurants', JSON.stringify(Array.from(initial)));
      } catch (e) {
        console.warn(e);
      }
    }
    return initial;
  }

  // Computed array of saved restaurants
  readonly savedRestaurants = computed(() => {
    const ids = this.savedIdsSignal();
    return this.restaurantsSignal().filter(r => ids.has(r.id));
  });

  isSaved(restaurantId: string): boolean {
    return this.savedIdsSignal().has(restaurantId);
  }

  toggleSaved(restaurantId: string): boolean {
    const current = new Set(this.savedIdsSignal());
    let state = false;
    if (current.has(restaurantId)) {
      current.delete(restaurantId);
      state = false;
    } else {
      current.add(restaurantId);
      state = true;
    }
    this.savedIdsSignal.set(current);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('dinevia_saved_restaurants', JSON.stringify(Array.from(current)));
      } catch (e) {
        console.warn('Could not write saved restaurants to localStorage', e);
      }
    }
    return state;
  }

  removeFromSaved(restaurantId: string): void {
    const current = new Set(this.savedIdsSignal());
    if (current.has(restaurantId)) {
      current.delete(restaurantId);
      this.savedIdsSignal.set(current);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('dinevia_saved_restaurants', JSON.stringify(Array.from(current)));
        } catch (e) {
          console.warn(e);
        }
      }
    }
  }

  /**
   * Find a specific restaurant by ID
   */
  getRestaurantById(id: string): Restaurant | undefined {
    // Check in active restaurants signal first
    const found = this.restaurantsSignal().find(r => r.id === id || String(r.id) === String(id));
    if (found) return found;

    // Check mock data for backward-compatibility with prerender and demo links
    return MOCK_RESTAURANTS.find(r => r.id === id || String(r.id) === String(id));
  }

  /**
   * Retrieve customer reviews for a given restaurant
   */
  getReviewsForRestaurant(restaurant: Restaurant) {
    if (restaurant.reviews && restaurant.reviews.length > 0) {
      return restaurant.reviews;
    }

    const matching = this.testimonialsSignal().filter(
      t => t.restaurantName.toLowerCase().includes(restaurant.name.toLowerCase()) ||
        restaurant.name.toLowerCase().includes(t.restaurantName.toLowerCase())
    );

    const reviews = matching.map(t => ({
      id: t.id,
      author: t.reviewerName,
      rating: t.rating,
      date: t.date,
      title: t.title,
      comment: t.reviewText,
      visitType: 'Verified Diner Reservation',
      verified: true
    }));

    if (reviews.length === 0) {
      reviews.push(
        {
          id: `rev-${restaurant.id}-1`,
          author: 'Harrison & Victoria Cole',
          rating: 5,
          date: 'April 2026',
          title: 'An exquisite gastronomic voyage from first bite to last',
          comment: `Every expectation was surpassed at ${restaurant.name}. The attentive staff, discreet table placement, and harmonic wine pairings made our celebration truly magical.`,
          visitType: 'Anniversary Dinner',
          verified: true
        },
        {
          id: `rev-${restaurant.id}-2`,
          author: 'Dr. Alistair Sterling',
          rating: 5,
          date: 'March 2026',
          title: 'Masterful execution and exemplary hospitality',
          comment: `The culinary depth in their tasting menu is second to none. Reserving through Dinevia ensured a seamless arrival with our party's dietary preferences already noted by the executive chef.`,
          visitType: 'Executive Dining',
          verified: true
        },
        {
          id: `rev-${restaurant.id}-3`,
          author: 'Camilla Dupont',
          rating: restaurant.rating >= 4.9 ? 5 : 4,
          date: 'February 2026',
          title: 'Memorable ambiance and exceptional flavors',
          comment: `The atmosphere alone is worth the reservation. Truly world-class ${restaurant.cuisine.toLowerCase()} dining in the heart of ${restaurant.neighborhood}.`,
          visitType: 'Weekend Tasting',
          verified: true
        }
      );
    }

    return reviews;
  }

  /**
   * Placeholder for future Table Reservation submission API
   */
  reserveTable(restaurantId: string, details: { date: string; time: string; guests: number; name?: string }) {
    console.info('[RestaurantService: Future API Integration] Reservation intent:', { restaurantId, details });
    return {
      success: true,
      bookingRef: `DV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      restaurant: this.getRestaurantById(restaurantId),
      details
    };
  }
}
