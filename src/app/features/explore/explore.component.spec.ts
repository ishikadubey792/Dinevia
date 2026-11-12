import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { ExploreComponent } from './explore.component';
import { RestaurantService } from '../../core/services/restaurant.service';
import { CuisineService } from '../../core/services/cuisine.service';
import { environment } from '../../../environments/environment';
import { ApiCuisine, ApiResponse } from '../../core/models/cuisine.model';
import { ApiRestaurantDto } from '../../core/models/restaurant.model';

describe('ExploreComponent Search and Filters Integration', () => {
  let component: ExploreComponent;
  let fixture: ComponentFixture<ExploreComponent>;
  let httpTesting: HttpTestingController;

  const mockApiData: ApiResponse<ApiRestaurantDto[]> = {
    statusCode: 200,
    message: 'Success',
    data: [
      {
        id: 101,
        name: 'Le Chatelet Bistro',
        address: '42 Boulevard Saint-Germain',
        city: 'Paris',
        description: 'Atmospheric French brasserie with seasonal duck confit and rare burgundy cellars.',
        coverImagePath: '/uploads/chatelet.jpg',
        isActive: true,
        priceRange: '$$$$',
        rating: 4.95,
        reviewCount: 350,
        badge: 'Michelin Starred',
        restaurantCuisines: [
          { cuisineId: 1, cuisine: { id: 1, name: 'French Haute' } }
        ]
      },
      {
        id: 102,
        name: 'Trattoria Bella Napoli',
        address: 'Via Toledo 15',
        city: 'Naples',
        description: 'Authentic wood-fired Neapolitan sourdough pizza and coastal campanian wines.',
        coverImagePath: '/uploads/bella.jpg',
        isActive: true,
        priceRange: '$$',
        rating: 4.7,
        reviewCount: 180,
        badge: 'Neighborhood Gems',
        restaurantCuisines: [
          { cuisineId: 2, cuisine: { id: 2, name: 'Italian' } }
        ]
      },
      {
        id: 103,
        name: 'Sakura Omakase Lounge',
        address: 'Ginza 6-Chome',
        city: 'Tokyo',
        description: 'Intimate 8-seat Japanese sushi counter with direct daily Toyosu imports.',
        coverImagePath: '/uploads/sakura.jpg',
        isActive: true,
        priceRange: '$$$$',
        rating: 4.98,
        reviewCount: 520,
        featured: true,
        badge: "Chef's Counter",
        restaurantCuisines: [
          { cuisineId: 3, cuisine: { id: 3, name: 'Japanese' } }
        ]
      }
    ]
  };

  const mockCuisinesData: ApiResponse<ApiCuisine[]> = {
    statusCode: 200,
    message: 'Cuisines fetched successfully.',
    data: [
      { id: 1, name: 'French Haute', isActive: true },
      { id: 2, name: 'Italian', isActive: true },
      { id: 3, name: 'Japanese', isActive: true },
      { id: 99, name: 'Hidden Inactive', isActive: false }
    ]
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExploreComponent],
      providers: [
        RestaurantService,
        CuisineService,
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ExploreComponent);
    component = fixture.componentInstance;

    // Flush initial restaurant service request
    const req = httpTesting.expectOne(`${environment.apiUrl}/restaurants`);
    req.flush(mockApiData);

    fixture.detectChanges();

    // Flush initial cuisines API request from ngOnInit
    const cuisinesReq = httpTesting.expectOne(`${environment.apiUrl}/cuisines`);
    cuisinesReq.flush(mockCuisinesData);

    fixture.detectChanges();
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should initialize with all live active restaurants and compute available cities', () => {
    expect(component).toBeTruthy();
    expect(component.allRestaurants().length).toBe(3);
    expect(component.filteredRestaurants().length).toBe(3);

    const cities = component.availableCities();
    expect(cities).toContain('Naples');
    expect(cities).toContain('Paris');
    expect(cities).toContain('Tokyo');
  });

  it('should search by restaurant name', () => {
    component.onSearchChange('Chatelet');
    fixture.detectChanges();

    const results = component.filteredRestaurants();
    expect(results.length).toBe(1);
    expect(results[0].name).toBe('Le Chatelet Bistro');
  });

  it('should search by city', () => {
    component.onSearchChange('Naples');
    fixture.detectChanges();

    const results = component.filteredRestaurants();
    expect(results.length).toBe(1);
    expect(results[0].name).toBe('Trattoria Bella Napoli');
  });

  it('should search by address', () => {
    component.onSearchChange('Boulevard Saint-Germain');
    fixture.detectChanges();

    const results = component.filteredRestaurants();
    expect(results.length).toBe(1);
    expect(results[0].name).toBe('Le Chatelet Bistro');
  });

  it('should search by description keyword', () => {
    component.onSearchChange('duck confit');
    fixture.detectChanges();

    const results = component.filteredRestaurants();
    expect(results.length).toBe(1);
    expect(results[0].name).toBe('Le Chatelet Bistro');
  });

  it('should search by cuisine name and handle case-insensitivity and whitespace', () => {
    component.onSearchChange('   jApAnEsE   ');
    fixture.detectChanges();

    const results = component.filteredRestaurants();
    expect(results.length).toBe(1);
    expect(results[0].name).toBe('Sakura Omakase Lounge');
  });

  it('should restore full list when search is cleared', () => {
    component.onSearchChange('Chatelet');
    expect(component.filteredRestaurants().length).toBe(1);

    component.clearSearch();
    fixture.detectChanges();

    expect(component.searchQuery()).toBe('');
    expect(component.filteredRestaurants().length).toBe(3);
  });

  it('should filter by cuisine slug and toggle back to all', () => {
    component.setCuisine('italian');
    fixture.detectChanges();

    let results = component.filteredRestaurants();
    expect(results.length).toBe(1);
    expect(results[0].name).toBe('Trattoria Bella Napoli');

    // Clicking same cuisine toggles it off
    component.setCuisine('italian');
    fixture.detectChanges();

    results = component.filteredRestaurants();
    expect(results.length).toBe(3);
  });

  it('should default to case-insensitive alphabetical A-Z sorting without mutating source order and preserve A-Z order when filtering', () => {
    expect(component.sortBy()).toBe('name-asc');

    const sortedNames = component.filteredRestaurants().map((r) => r.name);
    const expectedSorted = [...sortedNames].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' })
    );
    expect(sortedNames).toEqual(expectedSorted);
    expect(sortedNames.length).toBeGreaterThan(1);

    component.setCuisine('italian');
    fixture.detectChanges();
    const italianNames = component.filteredRestaurants().map((r) => r.name);
    expect(italianNames).toEqual(
      [...italianNames].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    );

    component.setCuisine('all');
    component.toggleRating45();
    fixture.detectChanges();
    const highRatedNames = component.filteredRestaurants().map((r) => r.name);
    expect(highRatedNames).toEqual(
      [...highRatedNames].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    );

    component.resetAllFilters();
    fixture.detectChanges();
    expect(component.filteredRestaurants().map((r) => r.name)).toEqual(sortedNames);
  });

  it('should filter by Rating 4.5+ via toggleRating45() excluding unrated and lower-rated restaurants', () => {
    component.toggleRating45();
    fixture.detectChanges();

    const results = component.filteredRestaurants();
    expect(component.selectedRating()).toBe(4.5);
    expect(results.every((r) => r.rating >= 4.5)).toBe(true);

    component.toggleRating45();
    fixture.detectChanges();
    expect(component.selectedRating()).toBe(0);
  });

  it('should clear cuisine filter to restore all matching restaurants', () => {
    const initialCount = component.filteredRestaurants().length;
    component.setCuisine('italian');
    fixture.detectChanges();
    expect(component.filteredRestaurants().length).toBeLessThan(initialCount);

    component.setCuisine('all');
    fixture.detectChanges();
    expect(component.filteredRestaurants().length).toBe(initialCount);
  });

  it('should omit restaurant price UI/controls and postponed non-backend filters', () => {
    const text = (fixture.nativeElement.textContent || '').toLowerCase();
    expect(text).not.toContain('price tier');
    expect(text).not.toContain('pet friendly');
    expect(text).not.toContain('outdoor seating');
    expect(text).not.toContain('serves alcohol');
    expect(text).not.toContain('open now');
    expect(text).not.toContain('offers');
  });

  it('should filter by minimum rating', () => {
    component.setRating(4.9);
    fixture.detectChanges();

    const results = component.filteredRestaurants();
    // 4.95 (Chatelet) and 4.98 (Sakura)
    expect(results.length).toBe(2);
  });

  it('should filter by city dropdown', () => {
    component.setCity('Paris');
    fixture.detectChanges();

    const results = component.filteredRestaurants();
    expect(results.length).toBe(1);
    expect(results[0].name).toBe('Le Chatelet Bistro');
  });

  it('should filter by badge curation', () => {
    component.setBadge('chef');
    fixture.detectChanges();

    const results = component.filteredRestaurants();
    expect(results.length).toBe(1);
    expect(results[0].name).toBe('Sakura Omakase Lounge');
  });

  it('should combine multiple active filters and reset cleanly', () => {
    component.setCity('Tokyo');
    component.setCuisine('japanese');
    component.setRating(4.5);
    fixture.detectChanges();

    expect(component.activeFilterCount()).toBe(3);
    let results = component.filteredRestaurants();
    expect(results.length).toBe(1);
    expect(results[0].name).toBe('Sakura Omakase Lounge');

    // Reset all filters
    component.resetAllFilters();
    fixture.detectChanges();

    expect(component.activeFilterCount()).toBe(0);
    expect(component.filteredRestaurants().length).toBe(3);
  });

  it('should sort restaurants by name, rating, reviews, and price', () => {
    // Sort Name A to Z
    component.setSort('name-asc');
    fixture.detectChanges();
    let results = component.filteredRestaurants();
    expect(results[0].name).toBe('Le Chatelet Bistro');
    expect(results[2].name).toBe('Trattoria Bella Napoli');

    // Sort Rating Descending
    component.setSort('rating-desc');
    fixture.detectChanges();
    results = component.filteredRestaurants();
    expect(results[0].name).toBe('Sakura Omakase Lounge'); // 4.98
  });

  it('should display only active API cuisines with live restaurant counts and avoid duplicate API calls', () => {
    const names = component.allCuisines().map(c => c.name);
    expect(names).toEqual(['French Haute', 'Italian', 'Japanese']);
    expect(names).not.toContain('Hidden Inactive');
    expect(component.allCuisines().every(c => c.restaurantCount === 1)).toBe(true);

    // Calling ngOnInit again should reuse cached restaurant & cuisine state without duplicate HTTP requests
    component.ngOnInit();
    httpTesting.expectNone(`${environment.apiUrl}/restaurants`);
    httpTesting.expectNone(`${environment.apiUrl}/cuisines`);
  });

  it('should handle restaurant API failure cleanly without mock fallback and hide empty no-results state', () => {
    component.retryLoad();

    const restReq = httpTesting.expectOne(`${environment.apiUrl}/restaurants`);
    restReq.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

    const cuisinesReq = httpTesting.expectOne(`${environment.apiUrl}/cuisines`);
    cuisinesReq.flush(mockCuisinesData);

    fixture.detectChanges();

    expect(component.allRestaurants().length).toBe(0);
    expect(component.loadError()).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.restaurants-error-card')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.no-results-card')).toBeNull();
  });

  it('should handle cuisine API failure cleanly without substituting mock cuisines', () => {
    const cuisineService = TestBed.inject(CuisineService);
    cuisineService.loadCuisines(true).subscribe();

    const cuisinesReq = httpTesting.expectOne(`${environment.apiUrl}/cuisines`);
    cuisinesReq.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
    fixture.detectChanges();

    expect(component.allCuisines().length).toBe(0);
    expect(component.cuisinesLoadError()).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.cuisines-inline-error')).toBeTruthy();
  });

  it('should filter live API restaurants when receiving ?cuisine query param and restore all on reset', async () => {
    const router = TestBed.inject(Router);
    await router.navigate([], { queryParams: { cuisine: 'italian' } });
    fixture.detectChanges();

    expect(component.selectedCuisine()).toBe('italian');
    expect(component.filteredRestaurants().map(r => r.name)).toEqual(['Trattoria Bella Napoli']);

    component.resetAllFilters();
    fixture.detectChanges();

    expect(component.selectedCuisine()).toBe('all');
    expect(component.filteredRestaurants().length).toBe(3);
  });

  // ---- Phase 4A: Time Standardization & Real Booking Redirect Tests ----

  it('should initialize with default Start Time (18:30) and End Time (20:00) and today as date', () => {
    expect(component.selectedStartTime()).toBe('18:30');
    expect(component.selectedEndTime()).toBe('20:00');
    expect(component.selectedGuests()).toBe(2);
    expect(component.timeRangeError()).toBeNull();
  });

  it('should compute timeRangeError when End Time is earlier than or equal to Start Time', () => {
    component.setStartTime('20:00');
    component.setEndTime('19:00');
    fixture.detectChanges();

    expect(component.timeRangeError()).toBe('End time must be later than start time.');

    // Equal times
    component.setStartTime('19:00');
    component.setEndTime('19:00');
    fixture.detectChanges();

    expect(component.timeRangeError()).toBe('End time must be later than start time.');

    // Valid again
    component.setStartTime('18:00');
    component.setEndTime('19:30');
    fixture.detectChanges();

    expect(component.timeRangeError()).toBeNull();
  });

  it('should hydrate date, startTime, endTime, and guests from route query parameters', async () => {
    const router = TestBed.inject(Router);
    await router.navigate([], {
      queryParams: {
        date: '2026-11-25',
        startTime: '19:00',
        endTime: '21:00',
        guests: 4
      }
    });
    fixture.detectChanges();

    expect(component.bookingDate()).toBe('2026-11-25');
    expect(component.selectedStartTime()).toBe('19:00');
    expect(component.selectedEndTime()).toBe('21:00');
    expect(component.selectedGuests()).toBe(4);
  });

  it('should navigate to /book/:id with supported query params when onReserveSlot is called', () => {
    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const targetRestaurant = component.allRestaurants()[0];
    component.setDate('2026-12-01');
    component.setStartTime('19:00');
    component.setEndTime('21:00');
    component.setGuests(4);

    component.onReserveSlot({
      restaurant: targetRestaurant,
      slot: '7:00 PM'
    });

    expect(navSpy).toHaveBeenCalledWith(['/book', targetRestaurant.id], {
      queryParams: {
        date: '2026-12-01',
        startTime: '19:00',
        endTime: '21:00',
        guests: 4
      }
    });
  });

  it('should block navigation and display toast when onReserveSlot is called with an invalid time range', () => {
    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.setStartTime('21:00');
    component.setEndTime('19:00');
    fixture.detectChanges();
    navSpy.mockClear();

    const targetRestaurant = component.allRestaurants()[0];
    component.onReserveSlot({
      restaurant: targetRestaurant,
      slot: '9:00 PM'
    });

    expect(navSpy).not.toHaveBeenCalled();
    expect(component.toastMessage()).toContain('End time must be later than start time');
  });

  it('should restore default date and time values when resetAllFilters is called', () => {
    component.setDate('2026-12-15');
    component.setStartTime('17:00');
    component.setEndTime('18:30');
    component.setGuests(6);

    expect(component.activeFilterCount()).toBeGreaterThan(0);

    component.resetAllFilters();
    fixture.detectChanges();

    expect(component.bookingDate()).toBe(component.minDate());
    expect(component.selectedStartTime()).toBe('18:30');
    expect(component.selectedEndTime()).toBe('20:00');
    expect(component.selectedGuests()).toBe(2);
    expect(component.activeFilterCount()).toBe(0);
  });
});

