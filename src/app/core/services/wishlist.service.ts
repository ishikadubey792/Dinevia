import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, finalize, forkJoin, map, of, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { WishlistItemDto, WishlistActionResponse } from '../models/wishlist.model';
import { Restaurant } from '../models/restaurant.model';
import { ApiResponse } from '../models/cuisine.model';
import { AuthService } from './auth.service';
import { RestaurantService } from './restaurant.service';
import { AuthModalService } from './auth-modal.service';

@Injectable({
  providedIn: 'root'
})
export class WishlistService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly restaurantService = inject(RestaurantService);
  private readonly authModalService = inject(AuthModalService);
  private readonly apiUrl = environment.apiUrl;

  // ── Reactive Signals State (Single Source of Truth) ──
  private readonly savedIdsSignal = signal<Set<number>>(new Set());
  private readonly pendingIdsSignal = signal<Set<number>>(new Set());
  private readonly extraRestaurantsSignal = signal<Map<number, Restaurant>>(new Map());

  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  // ── Public Readonly Accessors ──
  readonly savedIds = this.savedIdsSignal.asReadonly();
  readonly wishlistCount = computed<number>(() => this.savedIdsSignal().size);

  /**
   * Computed array of complete Restaurant domain models matching saved IDs.
   * Hydrates from the global restaurant cache first, then from any individually fetched restaurants.
   */
  readonly savedRestaurants = computed<Restaurant[]>(() => {
    const ids = this.savedIdsSignal();
    if (ids.size === 0) {
      return [];
    }

    const mainList = this.restaurantService.restaurants();
    const extraMap = this.extraRestaurantsSignal();

    const result: Restaurant[] = [];
    for (const id of ids) {
      const match = mainList.find(r => Number(r.id) === id) ?? extraMap.get(id);
      if (match) {
        result.push(match);
      }
    }
    return result;
  });

  // Track the authenticated customer ID whose wishlist is currently loaded
  private loadedCustomerId: number | null = null;
  private inFlightLoad$: Observable<WishlistItemDto[]> | null = null;

  constructor() {
    // Synchronize wishlist lifecycle with customer authentication state
    effect(() => {
      const session = this.authService.currentCustomerSession();
      const isAuth = this.authService.isCustomerAuthenticated();
      const customerId = session?.user?.id ? Number(session.user.id) : null;

      untracked(() => {
        if (isAuth && customerId && Number.isFinite(customerId)) {
          // If customer account changed or freshly logged in, load their wishlist
          if (this.loadedCustomerId !== customerId) {
            this.loadedCustomerId = customerId;
            this.loadWishlist().subscribe({ error: () => {} });
          }
        } else {
          // Unauthenticated or logged out: clear memory state
          this.loadedCustomerId = null;
          this.clearWishlist();
        }
      });
    });
  }

  /**
   * Check if a restaurant is currently in the customer's wishlist.
   * Accepts numeric or string IDs for seamless component compatibility.
   */
  isSaved(restaurantId: number | string): boolean {
    const idNum = Number(restaurantId);
    return Number.isFinite(idNum) ? this.savedIdsSignal().has(idNum) : false;
  }

  /**
   * Check if a wishlist mutation (add or remove) is currently in flight for this restaurant.
   */
  isPending(restaurantId: number | string): boolean {
    const idNum = Number(restaurantId);
    return Number.isFinite(idNum) ? this.pendingIdsSignal().has(idNum) : false;
  }

  /**
   * Fetch logged-in customer's wishlist from GET /api/wishlist.
   * Hydrates restaurant details using the restaurant service cache and fallback fetcher.
   */
  loadWishlist(): Observable<WishlistItemDto[]> {
    if (!this.authService.isCustomerAuthenticated()) {
      this.clearWishlist();
      return of([]);
    }

    if (this.inFlightLoad$) {
      return this.inFlightLoad$;
    }

    this.isLoading.set(true);
    this.error.set(null);

    const load$ = forkJoin({
      wishlistResponse: this.http.get<WishlistItemDto[] | ApiResponse<WishlistItemDto[]>>(
        `${this.apiUrl}/wishlist`
      ),
      allRestaurants: this.restaurantService.ensureRestaurantsLoaded()
    }).pipe(
      map(({ wishlistResponse, allRestaurants }) => {
        let items: WishlistItemDto[] = [];
        if (Array.isArray(wishlistResponse)) {
          items = wishlistResponse;
        } else if (wishlistResponse && Array.isArray(wishlistResponse.data)) {
          items = wishlistResponse.data;
        }

        // Extract valid numeric restaurant IDs
        const ids = new Set<number>();
        const missingIds: number[] = [];

        for (const item of items) {
          const numId = Number(item.restaurantId);
          if (Number.isFinite(numId) && numId > 0) {
            ids.add(numId);
            const foundInCache = allRestaurants.some(r => Number(r.id) === numId);
            if (!foundInCache && !this.extraRestaurantsSignal().has(numId)) {
              missingIds.push(numId);
            }
          }
        }

        // Update saved IDs signal
        this.savedIdsSignal.set(ids);

        // Hydrate any missing restaurant records individually
        if (missingIds.length > 0) {
          this.hydrateMissingRestaurants(missingIds);
        }

        return items;
      }),
      tap({
        next: () => {
          this.isLoading.set(false);
          this.error.set(null);
        },
        error: (err: unknown) => {
          this.isLoading.set(false);
          const message = this.extractErrorMessage(err, 'Unable to load your saved restaurants.');
          this.error.set(message);
        }
      }),
      finalize(() => {
        this.inFlightLoad$ = null;
      })
    );

    this.inFlightLoad$ = load$;
    return load$;
  }

  /**
   * Add a restaurant to the customer's wishlist:
   * POST /api/wishlist/{restaurantId}
   *
   * Reconciles 409 Conflict as already saved.
   */
  addToWishlist(restaurantId: number | string): Observable<WishlistActionResponse> {
    if (!this.authService.isCustomerAuthenticated()) {
      this.authModalService.open('login');
      return throwError(() => new Error('Customer authentication required to save restaurants.'));
    }

    if (this.authService.isOwnerAuthenticated() && !this.authService.isOwnerSessionExpired()) {
      return throwError(() => new Error('Wishlist is only available for Customer accounts.'));
    }

    const idNum = Number(restaurantId);
    if (!Number.isFinite(idNum) || idNum <= 0) {
      return throwError(() => new Error('Invalid restaurant ID.'));
    }

    if (this.isPending(idNum)) {
      return of({ message: 'Request in progress' });
    }

    this.addPendingId(idNum);

    return this.http
      .post<WishlistActionResponse | ApiResponse<WishlistActionResponse>>(
        `${this.apiUrl}/wishlist/${idNum}`,
        {}
      )
      .pipe(
        map(res => {
          const message = (res && 'message' in res ? res.message : null) || 'Restaurant added to wishlist successfully.';
          return { message };
        }),
        tap(() => {
          const next = new Set(this.savedIdsSignal());
          next.add(idNum);
          this.savedIdsSignal.set(next);

          // Ensure restaurant is hydrated if not present in cache
          if (!this.restaurantService.restaurants().some(r => Number(r.id) === idNum)) {
            this.hydrateMissingRestaurants([idNum]);
          }
        }),
        catchError((err: HttpErrorResponse) => {
          // Reconcile 409 Conflict: already added on backend
          if (err.status === 409) {
            const next = new Set(this.savedIdsSignal());
            next.add(idNum);
            this.savedIdsSignal.set(next);
            return of({ message: 'Restaurant is already in your wishlist.' });
          }
          return throwError(() => err);
        }),
        finalize(() => {
          this.removePendingId(idNum);
        })
      );
  }

  /**
   * Remove a restaurant from the customer's wishlist:
   * DELETE /api/wishlist/{restaurantId}
   *
   * Reconciles 404 Not Found as already removed.
   */
  removeFromWishlist(restaurantId: number | string): Observable<WishlistActionResponse> {
    if (!this.authService.isCustomerAuthenticated()) {
      this.authModalService.open('login');
      return throwError(() => new Error('Customer authentication required to modify wishlist.'));
    }

    const idNum = Number(restaurantId);
    if (!Number.isFinite(idNum) || idNum <= 0) {
      return throwError(() => new Error('Invalid restaurant ID.'));
    }

    if (this.isPending(idNum)) {
      return of({ message: 'Request in progress' });
    }

    this.addPendingId(idNum);

    return this.http
      .delete<WishlistActionResponse | ApiResponse<WishlistActionResponse>>(
        `${this.apiUrl}/wishlist/${idNum}`
      )
      .pipe(
        map(res => {
          const message = (res && 'message' in res ? res.message : null) || 'Restaurant removed from wishlist successfully.';
          return { message };
        }),
        tap(() => {
          const next = new Set(this.savedIdsSignal());
          next.delete(idNum);
          this.savedIdsSignal.set(next);
        }),
        catchError((err: HttpErrorResponse) => {
          // Reconcile 404 Not Found: already removed on backend
          if (err.status === 404) {
            const next = new Set(this.savedIdsSignal());
            next.delete(idNum);
            this.savedIdsSignal.set(next);
            return of({ message: 'Restaurant was not in your wishlist.' });
          }
          return throwError(() => err);
        }),
        finalize(() => {
          this.removePendingId(idNum);
        })
      );
  }

  /**
   * Reset in-memory wishlist state (e.g. on customer logout or session expiration).
   */
  clearWishlist(): void {
    this.savedIdsSignal.set(new Set());
    this.pendingIdsSignal.set(new Set());
    this.extraRestaurantsSignal.set(new Map());
    this.isLoading.set(false);
    this.error.set(null);
    this.inFlightLoad$ = null;
  }

  // ── Private Helpers ──

  private addPendingId(id: number): void {
    const next = new Set(this.pendingIdsSignal());
    next.add(id);
    this.pendingIdsSignal.set(next);
  }

  private removePendingId(id: number): void {
    const next = new Set(this.pendingIdsSignal());
    next.delete(id);
    this.pendingIdsSignal.set(next);
  }

  /**
   * Fetch any missing restaurant details individually and store them in the extra cache.
   */
  private hydrateMissingRestaurants(missingIds: number[]): void {
    for (const id of missingIds) {
      this.restaurantService.fetchRestaurantById(String(id)).subscribe({
        next: (result) => {
          if (result.status === 'found' && result.restaurant) {
            const current = new Map(this.extraRestaurantsSignal());
            current.set(id, result.restaurant);
            this.extraRestaurantsSignal.set(current);
          }
        },
        error: () => {
          // Gracefully omit unavailable/deleted restaurants
        }
      });
    }
  }

  private extractErrorMessage(err: unknown, fallback: string): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 0) {
        return 'Network error. Please check your internet connection.';
      }
      if (err.error && typeof err.error === 'object' && 'message' in err.error && typeof err.error.message === 'string') {
        return err.error.message;
      }
    }
    return fallback;
  }
}
