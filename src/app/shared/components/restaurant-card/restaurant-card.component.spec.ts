import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import { RestaurantCardComponent } from './restaurant-card.component';
import { RestaurantService } from '../../../core/services/restaurant.service';
import { WishlistService } from '../../../core/services/wishlist.service';
import { AuthService } from '../../../core/services/auth.service';
import { AuthModalService } from '../../../core/services/auth-modal.service';
import { Restaurant } from '../../../core/models/restaurant.model';

describe('RestaurantCardComponent Fallback Image & Behavior', () => {
  let component: RestaurantCardComponent;
  let fixture: ComponentFixture<RestaurantCardComponent>;
  let wishlistService: {
    isSaved: ReturnType<typeof vi.fn>;
    isPending: ReturnType<typeof vi.fn>;
    addToWishlist: ReturnType<typeof vi.fn>;
    removeFromWishlist: ReturnType<typeof vi.fn>;
  };
  let authService: {
    isCustomerAuthenticated: ReturnType<typeof vi.fn>;
    isOwnerAuthenticated: ReturnType<typeof vi.fn>;
    isOwnerSessionExpired: ReturnType<typeof vi.fn>;
  };
  let authModalService: {
    open: ReturnType<typeof vi.fn>;
  };

  const mockRestaurant: Restaurant = {
    id: '101',
    name: 'Le Gabriel Paris',
    tagline: 'Haute gastronomy sanctuary',
    cuisine: 'French Haute',
    location: 'Paris, France',
    neighborhood: 'Champs-Élysées',
    address: '42 Avenue Gabriel',
    city: 'Paris',
    priceRange: '$$$$',
    rating: 4.96,
    reviewCount: 312,
    imageUrl: 'https://example.com/le-gabriel.jpg',
    badge: '3 Michelin Stars',
    featured: true,
    description: 'An intimate 3-Michelin-starred dining sanctuary.',
    availableSlots: ['6:30 PM', '7:30 PM', '8:30 PM'],
    highlights: ['Wine Cellar', 'Chef Counter']
  };

  beforeEach(async () => {
    wishlistService = {
      isSaved: vi.fn().mockReturnValue(false),
      isPending: vi.fn().mockReturnValue(false),
      addToWishlist: vi.fn().mockReturnValue(of({ message: 'Added' })),
      removeFromWishlist: vi.fn().mockReturnValue(of({ message: 'Removed' }))
    };

    authService = {
      isCustomerAuthenticated: vi.fn().mockReturnValue(false),
      isOwnerAuthenticated: vi.fn().mockReturnValue(false),
      isOwnerSessionExpired: vi.fn().mockReturnValue(false)
    };

    authModalService = {
      open: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [RestaurantCardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        RestaurantService,
        { provide: WishlistService, useValue: wishlistService },
        { provide: AuthService, useValue: authService },
        { provide: AuthModalService, useValue: authModalService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RestaurantCardComponent);
    component = fixture.componentInstance;
    component.restaurant = { ...mockRestaurant };
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should mark imgLoaded as true when image load event triggers', () => {
    expect(component.imgLoaded()).toBe(false);

    const imgEl: HTMLImageElement = fixture.nativeElement.querySelector('.card-img');
    imgEl.dispatchEvent(new Event('load'));
    fixture.detectChanges();

    expect(component.imgLoaded()).toBe(true);
    expect(imgEl.classList.contains('loaded')).toBe(true);
  });

  it('should handle broken image URL by triggering onImageError and applying img-fallback-hidden class', () => {
    expect(component.imgError()).toBe(false);

    const imgEl: HTMLImageElement = fixture.nativeElement.querySelector('.card-img');
    imgEl.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(component.imgError()).toBe(true);
    expect(imgEl.classList.contains('img-fallback-hidden')).toBe(true);
    const mediaContainer: HTMLElement = fixture.nativeElement.querySelector('.card-media');
    expect(mediaContainer.classList.contains('restaurant-fallback')).toBe(true);
  });

  it('should immediately apply fallback class when restaurant imageUrl is null or empty', () => {
    fixture.componentRef.setInput('restaurant', {
      ...mockRestaurant,
      imageUrl: ''
    });
    fixture.detectChanges();

    const mediaContainer: HTMLElement = fixture.nativeElement.querySelector('.card-media');
    const imgEl: HTMLImageElement = fixture.nativeElement.querySelector('.card-img');

    expect(mediaContainer.classList.contains('restaurant-fallback')).toBe(true);
    expect(imgEl.classList.contains('img-fallback-hidden')).toBe(true);
  });

  it('should emit viewDetails event when card is clicked', () => {
    let emittedRestaurant: Restaurant | null = null;
    component.viewDetails.subscribe((r: Restaurant) => {
      emittedRestaurant = r;
    });

    const cardEl: HTMLElement = fixture.nativeElement.querySelector('.restaurant-card');
    cardEl.click();

    expect(emittedRestaurant).toEqual(component.restaurant);
  });

  it('should emit reserveSlot event when slot button is clicked', () => {
    let emittedSlot: { restaurant: Restaurant; slot: string } | null = null;
    component.reserveSlot.subscribe(data => {
      emittedSlot = data;
    });

    component.onSlotClick('19:30', new MouseEvent('click'));
    expect(emittedSlot).toEqual({
      restaurant: component.restaurant,
      slot: '19:30'
    });
  });

  it('should trigger auth modal and NOT call wishlist API when guest clicks bookmark', () => {
    authService.isCustomerAuthenticated.mockReturnValue(false);

    const bookmarkBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.bookmark-btn');
    bookmarkBtn.click();

    expect(authModalService.open).toHaveBeenCalledWith('login');
    expect(wishlistService.addToWishlist).not.toHaveBeenCalled();
    expect(wishlistService.removeFromWishlist).not.toHaveBeenCalled();
  });

  it('should call addToWishlist when authenticated customer clicks unsaved bookmark', () => {
    authService.isCustomerAuthenticated.mockReturnValue(true);
    wishlistService.isSaved.mockReturnValue(false);
    fixture.detectChanges();

    const bookmarkBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.bookmark-btn');
    bookmarkBtn.click();

    expect(wishlistService.addToWishlist).toHaveBeenCalledWith('101');
  });

  it('should call removeFromWishlist when authenticated customer clicks already saved bookmark', () => {
    authService.isCustomerAuthenticated.mockReturnValue(true);
    wishlistService.isSaved.mockReturnValue(true);
    fixture.detectChanges();

    const bookmarkBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.bookmark-btn');
    bookmarkBtn.click();

    expect(wishlistService.removeFromWishlist).toHaveBeenCalledWith('101');
  });

  it('should not trigger API when bookmark mutation is pending', () => {
    authService.isCustomerAuthenticated.mockReturnValue(true);
    wishlistService.isPending.mockReturnValue(true);
    fixture.detectChanges();

    const bookmarkBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.bookmark-btn');
    bookmarkBtn.click();

    expect(wishlistService.addToWishlist).not.toHaveBeenCalled();
    expect(wishlistService.removeFromWishlist).not.toHaveBeenCalled();
  });
});
