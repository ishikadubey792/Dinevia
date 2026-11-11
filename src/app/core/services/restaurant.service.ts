import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, tap, finalize, shareReplay } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  Restaurant,
  ApiRestaurantDto,
  mapApiRestaurantToDomain,
  matchesRestaurantSearch,
  matchesRestaurantCuisine,
  countDistinctRestaurantsForCuisine,
  toCuisineSlug,
  getCuisineVisualMetadata
} from '../models/restaurant.model';
import { Cuisine, ApiResponse } from '../models/cuisine.model';
import { Testimonial } from '../models/testimonial.model';
import { SearchCriteria } from '../models/search-filter.model';
import { CuisineService } from './cuisine.service';
import { MOCK_TESTIMONIALS } from '../data/mock-testimonials';

export interface RestaurantDetailResult {
  status: 'found' | 'not-found' | 'error';
  restaurant: Restaurant | null;
  errorMessage: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class RestaurantService {
  private readonly http = inject(HttpClient);
  private readonly cuisineService = inject(CuisineService);
  private readonly apiUrl = environment.apiUrl;

  // Reactive signals for state management (live API state only; never preloaded with mock restaurants)
  private readonly restaurantsSignal = signal<Restaurant[]>([]);
  private readonly testimonialsSignal = signal<Testimonial[]>(MOCK_TESTIMONIALS);
  private inFlightRestaurants$: Observable<Restaurant[]> | null = null;

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
  readonly cuisines = computed<Cuisine[]>(() => {
    const restaurants = this.restaurantsSignal();

    if (this.cuisineService.cuisinesLoadError()) {
      return [];
    }

    if (this.cuisineService.isCuisinesLoaded()) {
      const result: Cuisine[] = [];
      for (const apiCuisine of this.cuisineService.apiCuisines()) {
        if (!apiCuisine || apiCuisine.isActive === false || !apiCuisine.name?.trim()) {
          continue;
        }
        const name = apiCuisine.name.trim();
        const slug = toCuisineSlug(name);
        if (!slug) continue;
        const visual = getCuisineVisualMetadata(name, slug);
        result.push({
          id: `cuisine-${apiCuisine.id ?? slug}`,
          name,
          tagline: visual.tagline,
          imageUrl: visual.imageUrl,
          slug,
          restaurantCount: countDistinctRestaurantsForCuisine(restaurants, slug)
        });
      }
      return result;
    }

    if (!this.isApiLoaded()) {
      return [];
    }

    const derived: Cuisine[] = [];
    const seenSlugs = new Set<string>();
    for (const restaurant of restaurants) {
      const list = Array.isArray(restaurant.cuisines) && restaurant.cuisines.length > 0
        ? restaurant.cuisines
        : (restaurant.cuisine ? restaurant.cuisine.split(',').map(s => s.trim()) : []);

      for (const rawName of list) {
        const name = (rawName || '').trim();
        const slug = toCuisineSlug(name);
        if (!name || !slug || seenSlugs.has(slug)) {
          continue;
        }
        seenSlugs.add(slug);
        const visual = getCuisineVisualMetadata(name, slug);
        derived.push({
          id: `cuisine-${slug}`,
          name,
          tagline: visual.tagline,
          imageUrl: visual.imageUrl,
          slug,
          restaurantCount: countDistinctRestaurantsForCuisine(restaurants, slug)
        });
      }
    }
    return derived;
  });
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
   * Ensure live restaurants are loaded once, sharing in-flight or cached state across components.
   */
  ensureRestaurantsLoaded(): Observable<Restaurant[]> {
    if (this.isApiLoaded() || this.restaurantLoadError() !== null) {
      return of(this.restaurantsSignal());
    }
    if (this.inFlightRestaurants$) {
      return this.inFlightRestaurants$;
    }
    return this.fetchRestaurants();
  }

  /**
   * Fetch restaurants from ASP.NET Core backend API:
   * GET /api/restaurants
   */
  fetchRestaurants(): Observable<Restaurant[]> {
    this.isLoadingRestaurants.set(true);
    this.restaurantLoadError.set(null);

    const request$ = this.http.get<ApiResponse<ApiRestaurantDto[]> | ApiRestaurantDto[]>(
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
        const activeList = rawList.filter(dto => dto && dto.isActive !== false);

        // Map to client domain models
        return activeList.map(dto => mapApiRestaurantToDomain(dto));
      }),
      tap(mapped => {
        this.restaurantsSignal.set(mapped);
        this.isApiLoaded.set(true);
        this.isLoadingRestaurants.set(false);
        this.restaurantLoadError.set(null);
        this.inFlightRestaurants$ = null;
      }),
      catchError(() => {
        this.restaurantsSignal.set([]);
        this.isApiLoaded.set(false);
        this.isLoadingRestaurants.set(false);
        this.restaurantLoadError.set('Unable to load restaurants right now. Please try again.');
        this.inFlightRestaurants$ = null;
        return of([] as Restaurant[]);
      }),
      finalize(() => {
        if (this.inFlightRestaurants$ === request$) {
          this.inFlightRestaurants$ = null;
        }
      }),
      shareReplay(1)
    );

    if (this.isLoadingRestaurants()) {
      this.inFlightRestaurants$ = request$;
    }

    return request$;
  }

  /**
   * Helper to trigger live restaurant loading (pass forceRefresh = true to retry/reload)
   */
  loadLiveRestaurants(forceRefresh = false): void {
    if (forceRefresh) {
      this.fetchRestaurants().subscribe();
    } else {
      this.ensureRestaurantsLoaded().subscribe();
    }
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
   * Fetch single restaurant details by ID from ASP.NET Core backend API:
   * GET /api/restaurants/{id}
   */
  fetchRestaurantById(id: string): Observable<RestaurantDetailResult> {
    const cleanId = (id || '').trim();
    if (!cleanId) {
      return of({ status: 'not-found', restaurant: null, errorMessage: null });
    }

    return this.http
      .get<ApiResponse<ApiRestaurantDto> | ApiRestaurantDto>(
        `${this.apiUrl}/restaurants/${encodeURIComponent(cleanId)}`
      )
      .pipe(
        map((res): RestaurantDetailResult => {
          let dto: ApiRestaurantDto | null = null;
          let statusCode: number | undefined;

          if (res && typeof res === 'object' && 'data' in res) {
            statusCode = typeof res.statusCode === 'number' ? res.statusCode : undefined;
            dto = res.data ?? null;
          } else if (res && typeof res === 'object' && 'id' in res) {
            dto = res as ApiRestaurantDto;
          }

          if (statusCode === 404 || !dto || dto.isActive === false) {
            return { status: 'not-found', restaurant: null, errorMessage: null };
          }

          const mapped = mapApiRestaurantToDomain(dto);
          return {
            status: 'found',
            restaurant: this.enrichFromLoadedList(mapped),
            errorMessage: null
          };
        }),
        catchError((err: unknown) => {
          if (err instanceof HttpErrorResponse && err.status === 404) {
            return of<RestaurantDetailResult>({
              status: 'not-found',
              restaurant: null,
              errorMessage: null
            });
          }

          return of<RestaurantDetailResult>({
            status: 'error',
            restaurant: null,
            errorMessage: 'Unable to load restaurant details right now. Please try again.'
          });
        })
      );
  }

  /**
   * Supplement missing detail fields (such as cuisines omitted by GetRestaurantById)
   * using already-loaded Phase 1 restaurant list metadata without inventing data.
   */
  enrichFromLoadedList(detail: Restaurant): Restaurant {
    const listMatch = this.getRestaurantById(detail.id);
    if (!listMatch) {
      return detail;
    }

    const hasDetailCuisine =
      Array.isArray(detail.cuisines) &&
      detail.cuisines.some(c => typeof c === 'string' && c.trim().length > 0);

    if (hasDetailCuisine || !listMatch.cuisine) {
      return detail;
    }

    return {
      ...detail,
      cuisine: listMatch.cuisine,
      cuisines: listMatch.cuisines
    };
  }

  /**
   * Find a specific restaurant by ID from live loaded restaurants
   */
  getRestaurantById(id: string): Restaurant | undefined {
    return this.restaurantsSignal().find(r => r.id === id || String(r.id) === String(id));
  }

  /**
   * Retrieve customer reviews for a given restaurant
   */
  getReviewsForRestaurant(restaurant: Restaurant) {
    if (restaurant.reviews && restaurant.reviews.length > 0) {
      return restaurant.reviews;
    }

    return [];
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
