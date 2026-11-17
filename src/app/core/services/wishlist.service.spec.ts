import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { WishlistService } from './wishlist.service';
import { AuthService } from './auth.service';
import { RestaurantService } from './restaurant.service';
import { AuthModalService } from './auth-modal.service';
import { environment } from '../../../environments/environment';
import { WishlistItemDto } from '../models/wishlist.model';
import { Restaurant } from '../models/restaurant.model';

describe('WishlistService Backend API Integration & Architecture', () => {
  let service: WishlistService;
  let httpTesting: HttpTestingController;

  const mockCustomerSessionSig = signal<{
    user: { id: string; email: string; fullName: string };
    accessToken: string;
    role: string;
  } | null>(null);

  const mockCustomerAuthSig = signal<boolean>(false);
  const mockOwnerAuthSig = signal<boolean>(false);

  const mockRestaurant: Restaurant = {
    id: '1',
    name: 'L\'Aura Osteria',
    tagline: 'Authentic culinary artistry',
    cuisine: 'Italian',
    location: 'SoHo, Manhattan',
    neighborhood: 'SoHo',
    city: 'Manhattan',
    priceRange: '$$$$',
    rating: 4.9,
    reviewCount: 245,
    imageUrl: 'https://example.com/rest1.jpg',
    featured: true,
    description: 'Premier Italian dining',
    highlights: ['Wine Cellar'],
    availableSlots: ['18:00', '19:30', '21:00']
  };

  const mockRestaurant2: Restaurant = {
    id: '2',
    name: 'Maison Blanche',
    tagline: 'Modern Parisian fine dining',
    cuisine: 'French Contemporary',
    location: 'Upper East Side, Manhattan',
    neighborhood: 'Upper East Side',
    city: 'Manhattan',
    priceRange: '$$$$',
    rating: 4.8,
    reviewCount: 180,
    imageUrl: 'https://example.com/rest2.jpg',
    featured: true,
    description: 'Elegant French gastronomy',
    highlights: ['Sommelier Pairings'],
    availableSlots: ['18:30', '20:00']
  };

  const mockRestaurantsListSig = signal<Restaurant[]>([mockRestaurant]);

  const mockAuthService = {
    currentCustomerSession: mockCustomerSessionSig.asReadonly(),
    isCustomerAuthenticated: mockCustomerAuthSig.asReadonly(),
    isOwnerAuthenticated: mockOwnerAuthSig.asReadonly(),
    isOwnerSessionExpired: vi.fn().mockReturnValue(false)
  };

  const mockRestaurantService = {
    restaurants: mockRestaurantsListSig.asReadonly(),
    ensureRestaurantsLoaded: vi.fn().mockReturnValue(of([mockRestaurant])),
    fetchRestaurantById: vi.fn().mockReturnValue(of({ status: 'found', restaurant: mockRestaurant2 }))
  };

  const mockAuthModalService = {
    open: vi.fn()
  };

  beforeEach(() => {
    mockCustomerSessionSig.set(null);
    mockCustomerAuthSig.set(false);
    mockOwnerAuthSig.set(false);
    mockRestaurantsListSig.set([mockRestaurant]);
    mockAuthModalService.open.mockClear();
    mockRestaurantService.ensureRestaurantsLoaded.mockClear();
    mockRestaurantService.fetchRestaurantById.mockClear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        WishlistService,
        { provide: AuthService, useValue: mockAuthService },
        { provide: RestaurantService, useValue: mockRestaurantService },
        { provide: AuthModalService, useValue: mockAuthModalService }
      ]
    });

    service = TestBed.inject(WishlistService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created and start with clean empty state for guests', () => {
    expect(service).toBeTruthy();
    expect(service.savedIds().size).toBe(0);
    expect(service.savedRestaurants().length).toBe(0);
    expect(service.wishlistCount()).toBe(0);
    expect(service.isLoading()).toBe(false);
    expect(service.error()).toBeNull();
  });

  describe('Guest and Role Restrictions', () => {
    it('should NOT call GET /api/wishlist if user is not authenticated as Customer', () => {
      let result: WishlistItemDto[] | undefined;
      service.loadWishlist().subscribe(items => {
        result = items;
      });

      expect(result).toEqual([]);
      httpTesting.expectNone(`${environment.apiUrl}/wishlist`);
    });

    it('should open AuthModal and NOT call POST /api/wishlist when guest attempts to add a restaurant', () => {
      let caughtError: Error | undefined;
      service.addToWishlist(1).subscribe({
        error: err => (caughtError = err)
      });

      expect(mockAuthModalService.open).toHaveBeenCalledWith('login');
      expect(caughtError).toBeTruthy();
      httpTesting.expectNone(`${environment.apiUrl}/wishlist/1`);
    });

    it('should open AuthModal and NOT call DELETE /api/wishlist when guest attempts to remove a restaurant', () => {
      let caughtError: Error | undefined;
      service.removeFromWishlist(1).subscribe({
        error: err => (caughtError = err)
      });

      expect(mockAuthModalService.open).toHaveBeenCalledWith('login');
      expect(caughtError).toBeTruthy();
      httpTesting.expectNone(`${environment.apiUrl}/wishlist/1`);
    });

    it('should reject owner accounts from using customer wishlist APIs', () => {
      mockOwnerAuthSig.set(true);
      mockCustomerAuthSig.set(false);

      let caughtError: Error | undefined;
      service.addToWishlist(1).subscribe({
        error: err => (caughtError = err)
      });

      expect(caughtError).toBeTruthy();
      expect(caughtError?.message).toContain('Customer authentication required');
      httpTesting.expectNone(`${environment.apiUrl}/wishlist/1`);
    });
  });

  describe('Authenticated Customer Wishlist Operations', () => {
    beforeEach(() => {
      mockCustomerSessionSig.set({
        user: { id: '1001', email: 'alexander@example.com', fullName: 'Alexander Wright' },
        accessToken: 'valid-customer-jwt',
        role: 'Customer'
      });
      mockCustomerAuthSig.set(true);
    });

    it('should fetch wishlist from GET /api/wishlist and hydrate restaurant details', () => {
      const mockBackendItems: WishlistItemDto[] = [
        { id: 10, userId: 1001, restaurantId: 1, createdAt: '2026-11-17T10:00:00Z' },
        { id: 11, userId: 1001, restaurantId: 2, createdAt: '2026-11-17T11:00:00Z' }
      ];

      service.loadWishlist().subscribe(items => {
        expect(items).toEqual(mockBackendItems);
      });

      const req = httpTesting.expectOne(`${environment.apiUrl}/wishlist`);
      expect(req.request.method).toBe('GET');
      req.flush(mockBackendItems);

      expect(service.savedIds().has(1)).toBe(true);
      expect(service.savedIds().has(2)).toBe(true);
      expect(service.wishlistCount()).toBe(2);
      expect(service.isSaved(1)).toBe(true);
      expect(service.isSaved('1')).toBe(true);
      expect(service.isSaved(2)).toBe(true);
      expect(service.isSaved(999)).toBe(false);

      // Hydration check: restaurant 2 was not in initial cache, so fetchRestaurantById was called
      expect(mockRestaurantService.fetchRestaurantById).toHaveBeenCalledWith('2');
    });

    it('should call POST /api/wishlist/{restaurantId} and update reactive state on add', () => {
      service.addToWishlist(1).subscribe(res => {
        expect(res.message).toBe('Restaurant added to wishlist successfully.');
      });

      const req = httpTesting.expectOne(`${environment.apiUrl}/wishlist/1`);
      expect(req.request.method).toBe('POST');
      req.flush({ message: 'Restaurant added to wishlist successfully.' });

      expect(service.savedIds().has(1)).toBe(true);
      expect(service.isSaved(1)).toBe(true);
      expect(service.wishlistCount()).toBe(1);
      expect(service.savedRestaurants().length).toBe(1);
      expect(service.savedRestaurants()[0].name).toBe("L'Aura Osteria");
    });

    it('should call DELETE /api/wishlist/{restaurantId} and update reactive state on remove', () => {
      // First add to state
      service.addToWishlist(1).subscribe();
      const addReq = httpTesting.expectOne(`${environment.apiUrl}/wishlist/1`);
      addReq.flush({ message: 'Added' });
      expect(service.isSaved(1)).toBe(true);

      // Now remove
      service.removeFromWishlist(1).subscribe(res => {
        expect(res.message).toBe('Restaurant removed from wishlist successfully.');
      });

      const delReq = httpTesting.expectOne(`${environment.apiUrl}/wishlist/1`);
      expect(delReq.request.method).toBe('DELETE');
      delReq.flush({ message: 'Restaurant removed from wishlist successfully.' });

      expect(service.savedIds().has(1)).toBe(false);
      expect(service.isSaved(1)).toBe(false);
      expect(service.wishlistCount()).toBe(0);
      expect(service.savedRestaurants().length).toBe(0);
    });

    it('should reconcile 409 Conflict gracefully by keeping restaurant as saved', () => {
      service.addToWishlist(1).subscribe(res => {
        expect(res.message).toBe('Restaurant is already in your wishlist.');
      });

      const req = httpTesting.expectOne(`${environment.apiUrl}/wishlist/1`);
      req.flush({ message: 'Duplicate' }, { status: 409, statusText: 'Conflict' });

      expect(service.isSaved(1)).toBe(true);
    });

    it('should reconcile 404 Not Found on remove gracefully by removing from saved set', () => {
      service.removeFromWishlist(1).subscribe(res => {
        expect(res.message).toBe('Restaurant was not in your wishlist.');
      });

      const req = httpTesting.expectOne(`${environment.apiUrl}/wishlist/1`);
      req.flush({ message: 'Not found' }, { status: 404, statusText: 'Not Found' });

      expect(service.isSaved(1)).toBe(false);
    });

    it('should handle API error gracefully on loadWishlist', () => {
      service.loadWishlist().subscribe({
        error: () => {}
      });

      const req = httpTesting.expectOne(`${environment.apiUrl}/wishlist`);
      req.flush({ message: 'Database connection failed' }, { status: 500, statusText: 'Internal Server Error' });

      expect(service.isLoading()).toBe(false);
      expect(service.error()).toBe('Database connection failed');
    });

    it('should clear wishlist state when clearWishlist is called', () => {
      service.addToWishlist(1).subscribe();
      const addReq = httpTesting.expectOne(`${environment.apiUrl}/wishlist/1`);
      addReq.flush({ message: 'Added' });
      expect(service.wishlistCount()).toBe(1);

      service.clearWishlist();

      expect(service.savedIds().size).toBe(0);
      expect(service.wishlistCount()).toBe(0);
      expect(service.savedRestaurants().length).toBe(0);
    });
  });
});
