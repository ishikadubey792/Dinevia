import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WishlistComponent } from './wishlist.component';
import { WishlistService } from '../../core/services/wishlist.service';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { Restaurant } from '../../core/models/restaurant.model';

describe('WishlistComponent', () => {
  let component: WishlistComponent;
  let fixture: ComponentFixture<WishlistComponent>;
  let router: Router;

  const mockRestaurant: Restaurant = {
    id: '1',
    name: 'The French Laundry',
    tagline: 'Perfection in every plate',
    cuisine: 'French Contemporary',
    cuisines: ['French Contemporary'],
    location: 'Yountville, Napa Valley',
    neighborhood: 'Yountville',
    city: 'Napa Valley',
    address: '6640 Washington St',
    rating: 4.9,
    reviewCount: 320,
    priceRange: '$$$$',
    imageUrl: 'https://images.unsplash.com/photo-1',
    featured: true,
    description: 'Iconic fine dining',
    highlights: ['Michelin 3-Star'],
    phone: '+1 707-944-2380',
    availableSlots: ['17:30', '20:00'],
    dietaryOptions: ['Vegetarian Option'],
    dressCode: 'Formal'
  };

  const mockWishlistService = {
    savedRestaurants: signal<Restaurant[]>([mockRestaurant]),
    isLoading: signal<boolean>(false),
    error: signal<string | null>(null),
    loadWishlist: vi.fn().mockReturnValue(of([])),
    removeFromWishlist: vi.fn().mockReturnValue(of({ message: 'Removed' })),
    isSaved: vi.fn().mockReturnValue(true),
    isPending: vi.fn().mockReturnValue(false)
  };

  beforeEach(async () => {
    mockWishlistService.savedRestaurants.set([mockRestaurant]);
    mockWishlistService.isLoading.set(false);
    mockWishlistService.error.set(null);
    mockWishlistService.loadWishlist.mockClear();
    mockWishlistService.removeFromWishlist.mockClear();

    await TestBed.configureTestingModule({
      imports: [WishlistComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: WishlistService, useValue: mockWishlistService }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(WishlistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the wishlist component and call loadWishlist on init', () => {
    expect(component).toBeTruthy();
    expect(mockWishlistService.loadWishlist).toHaveBeenCalled();
  });

  it('should render saved restaurant card via reusable RestaurantCardComponent', () => {
    const cardEl = fixture.nativeElement.querySelector('app-restaurant-card');
    expect(cardEl).toBeTruthy();
  });

  it('should navigate to restaurant details on goToDetails', () => {
    component.goToDetails(mockRestaurant);
    expect(router.navigate).toHaveBeenCalledWith(['/restaurants', '1']);
  });

  it('should navigate to booking on goToBooking', () => {
    component.goToBooking(mockRestaurant);
    expect(router.navigate).toHaveBeenCalledWith(['/book', '1']);
  });

  it('should display empty state when saved wishlist is empty and not loading', () => {
    mockWishlistService.savedRestaurants.set([]);
    mockWishlistService.isLoading.set(false);
    mockWishlistService.error.set(null);
    fixture.detectChanges();

    const emptyState = fixture.nativeElement.querySelector('app-empty-state');
    expect(emptyState).toBeTruthy();
  });

  it('should display loading spinner when wishlist is loading and saved list is empty', () => {
    mockWishlistService.savedRestaurants.set([]);
    mockWishlistService.isLoading.set(true);
    fixture.detectChanges();

    const spinner = fixture.nativeElement.querySelector('app-loading-spinner');
    expect(spinner).toBeTruthy();
  });

  it('should display error alert when an error occurs while loading', () => {
    mockWishlistService.error.set('Failed to connect to backend server');
    mockWishlistService.savedRestaurants.set([]);
    fixture.detectChanges();

    const errorAlert = fixture.nativeElement.querySelector('app-error-alert');
    expect(errorAlert).toBeTruthy();
  });

  it('should call removeFromWishlist when removeRestaurant is triggered', () => {
    const event = new MouseEvent('click');
    vi.spyOn(event, 'stopPropagation');
    vi.spyOn(event, 'preventDefault');

    component.removeRestaurant(mockRestaurant, event);

    expect(mockWishlistService.removeFromWishlist).toHaveBeenCalledWith('1');
    expect(event.stopPropagation).toHaveBeenCalled();
    expect(event.preventDefault).toHaveBeenCalled();
  });
});
