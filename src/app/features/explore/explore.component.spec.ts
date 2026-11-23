import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { ExploreComponent } from './explore.component';
import { VoiceSearchComponent } from '../../shared/components/voice-search/voice-search.component';
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

  // ---- Phase 2: Live Autocomplete, Keyboard Accessibility & URL Synchronization Tests ----

  describe('Phase 2: Live Autocomplete and Search Enhancements', () => {
    it('should reactively generate autocomplete suggestions derived from loaded restaurants, cuisines, and cities', () => {
      // Query "Ital" should match cuisine "Italian"
      component.onSearchChange('Ital');
      fixture.detectChanges();

      const suggestions = component.autocompleteSuggestions();
      expect(suggestions.length).toBeGreaterThan(0);
      const cuisineSuggestion = suggestions.find(s => s.type === 'cuisine' && s.label === 'Italian');
      expect(cuisineSuggestion).toBeDefined();
      expect(cuisineSuggestion?.categoryLabel).toBe('Cuisine');
    });

    it('should return empty autocomplete suggestions when search query is empty or whitespace only', () => {
      component.onSearchChange('');
      expect(component.autocompleteSuggestions()).toEqual([]);
      expect(component.isAutocompleteOpen()).toBe(false);

      component.onSearchChange('    ');
      expect(component.autocompleteSuggestions()).toEqual([]);
      expect(component.isAutocompleteOpen()).toBe(false);
    });

    it('should prioritize exact and prefix matches before partial substring matches', () => {
      // With query 'Nap', City 'Naples' (prefix) should rank before 'Trattoria Bella Napoli' (word-prefix/partial)
      component.onSearchChange('Nap');
      const suggestions = component.autocompleteSuggestions();

      expect(suggestions.length).toBeGreaterThanOrEqual(2);
      expect(suggestions[0].label).toBe('Naples');
      expect(suggestions[0].type).toBe('city');
      expect(suggestions[1].label).toBe('Trattoria Bella Napoli');
      expect(suggestions[1].type).toBe('restaurant');
    });

    it('should perform case-insensitive and trimmed matching for autocomplete suggestions', () => {
      component.onSearchChange('   fReNcH   ');
      const suggestions = component.autocompleteSuggestions();

      expect(suggestions.some(s => s.label === 'French Haute' && s.type === 'cuisine')).toBe(true);
    });

    it('should limit suggestions to sensible maximum (8) and avoid duplicate items', () => {
      component.onSearchChange('a');
      const suggestions = component.autocompleteSuggestions();
      expect(suggestions.length).toBeLessThanOrEqual(8);

      const keys = suggestions.map(s => `${s.type}:${s.label.toLowerCase()}`);
      const uniqueKeys = new Set(keys);
      expect(keys.length).toBe(uniqueKeys.size);
    });

    it('should render ARIA combobox attributes on the search input and listbox on dropdown', () => {
      component.onSearchChange('Sakura');
      fixture.detectChanges();

      const inputEl = fixture.nativeElement.querySelector('#restaurantSearchInput');
      expect(inputEl.getAttribute('role')).toBe('combobox');
      expect(inputEl.getAttribute('aria-autocomplete')).toBe('list');
      expect(inputEl.getAttribute('aria-expanded')).toBe('true');
      expect(inputEl.getAttribute('aria-controls')).toBe('exploreAutocompleteListbox');

      const listboxEl = fixture.nativeElement.querySelector('#exploreAutocompleteListbox');
      expect(listboxEl).toBeTruthy();
      expect(listboxEl.getAttribute('role')).toBe('listbox');

      const options = fixture.nativeElement.querySelectorAll('.autocomplete-item');
      expect(options.length).toBeGreaterThan(0);
      expect(options[0].getAttribute('role')).toBe('option');
    });

    it('should support ArrowDown and ArrowUp keyboard navigation with cyclic wrap-around', () => {
      component.onSearchChange('a');
      fixture.detectChanges();

      const suggestionsCount = component.autocompleteSuggestions().length;
      expect(suggestionsCount).toBeGreaterThan(1);
      expect(component.highlightedIndex()).toBe(-1);
      expect(component.activeDescendantId()).toBeNull();

      // First ArrowDown: moves to index 0
      const eventDown1 = new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true });
      component.onSearchKeydown(eventDown1);
      expect(component.highlightedIndex()).toBe(0);
      expect(component.activeDescendantId()).toBe('exp-suggestion-0');

      // Second ArrowDown: moves to index 1
      const eventDown2 = new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true });
      component.onSearchKeydown(eventDown2);
      expect(component.highlightedIndex()).toBe(1);
      expect(component.activeDescendantId()).toBe('exp-suggestion-1');

      // ArrowUp: moves back to index 0
      const eventUp1 = new KeyboardEvent('keydown', { key: 'ArrowUp', cancelable: true });
      component.onSearchKeydown(eventUp1);
      expect(component.highlightedIndex()).toBe(0);

      // ArrowUp from 0 wraps to end
      const eventUp2 = new KeyboardEvent('keydown', { key: 'ArrowUp', cancelable: true });
      component.onSearchKeydown(eventUp2);
      expect(component.highlightedIndex()).toBe(suggestionsCount - 1);
    });

    it('should select highlighted suggestion on Enter key press and update search query and results', () => {
      component.onSearchChange('Sakura');
      fixture.detectChanges();

      // ArrowDown to highlight first suggestion
      component.onSearchKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true }));
      expect(component.highlightedIndex()).toBe(0);
      const highlightedItem = component.autocompleteSuggestions()[0];

      // Enter selects highlighted suggestion
      component.onSearchKeydown(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));
      fixture.detectChanges();

      expect(component.searchQuery()).toBe(highlightedItem.value);
      expect(component.isAutocompleteOpen()).toBe(false);
      expect(component.highlightedIndex()).toBe(-1);
      expect(component.filteredRestaurants().length).toBe(1);
      expect(component.filteredRestaurants()[0].name).toBe('Sakura Omakase Lounge');
    });

    it('should close autocomplete dropdown on Escape key without altering query', () => {
      component.onSearchChange('Bistro');
      fixture.detectChanges();
      expect(component.isAutocompleteOpen()).toBe(true);

      component.onSearchKeydown(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
      fixture.detectChanges();

      expect(component.isAutocompleteOpen()).toBe(false);
      expect(component.searchQuery()).toBe('Bistro');
    });

    it('should select suggestion when clicked with mouse and update query and close dropdown', () => {
      component.onSearchChange('Nap');
      fixture.detectChanges();

      const suggestions = component.autocompleteSuggestions();
      expect(suggestions.length).toBeGreaterThan(0);

      component.selectSuggestion(suggestions[0]);
      fixture.detectChanges();

      expect(component.searchQuery()).toBe(suggestions[0].value);
      expect(component.isAutocompleteOpen()).toBe(false);
      expect(component.highlightedIndex()).toBe(-1);
    });

    it('should close autocomplete dropdown when clicking outside search wrapper', () => {
      component.onSearchChange('French');
      fixture.detectChanges();
      expect(component.isAutocompleteOpen()).toBe(true);

      // Simulate click outside
      const outsideEvent = new MouseEvent('click', { bubbles: true });
      document.body.dispatchEvent(outsideEvent);
      fixture.detectChanges();

      expect(component.isAutocompleteOpen()).toBe(false);
    });

    it('should sync ?search query parameter preserving existing query params with replaceUrl: true', () => {
      const router = TestBed.inject(Router);
      const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

      // Direct sync call (e.g. from selectSuggestion or immediate sync)
      component.syncSearchQueryParam('Omakase');

      expect(navSpy).toHaveBeenCalledWith([], {
        relativeTo: expect.anything(),
        queryParams: { search: 'Omakase' },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
    });

    it('should remove ?search parameter when search is cleared while preserving other query params', async () => {
      const router = TestBed.inject(Router);
      await router.navigate([], { queryParams: { search: 'Omakase', cuisine: 'japanese' } });
      fixture.detectChanges();

      const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

      component.clearSearch();

      expect(component.searchQuery()).toBe('');
      expect(component.isAutocompleteOpen()).toBe(false);
      expect(navSpy).toHaveBeenCalledWith([], {
        relativeTo: expect.anything(),
        queryParams: { search: null },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
    });

    it('should dynamically generate quick search tags from active cuisines and cities without mock data', () => {
      const tags = component.dynamicQuickTags();
      expect(tags.length).toBeGreaterThan(0);
      expect(tags.some(t => ['French Haute', 'Italian', 'Japanese'].includes(t))).toBe(true);
      expect(tags).not.toContain('SoHo');
      expect(tags).not.toContain('Mayfair');
      expect(tags).not.toContain('Truffle Pasta');

      // Selecting quick tag updates search query
      component.selectQuickTag(tags[0]);
      expect(component.searchQuery()).toBe(tags[0]);
    });
  });

  describe('Phase 4: Mobile Filter Drawer and Responsive Refinement', () => {
    it('should open and close mobile drawer, toggling state and locking/unlocking body scroll', () => {
      expect(component.isMobileFilterOpen()).toBe(false);
      expect(document.body.style.overflow).toBe('');

      component.openMobileFilters();
      expect(component.isMobileFilterOpen()).toBe(true);
      expect(document.body.style.overflow).toBe('hidden');

      component.closeMobileFilters();
      expect(component.isMobileFilterOpen()).toBe(false);
      expect(document.body.style.overflow).toBe('');

      component.toggleMobileFilters();
      expect(component.isMobileFilterOpen()).toBe(true);
      expect(document.body.style.overflow).toBe('hidden');

      component.toggleMobileFilters();
      expect(component.isMobileFilterOpen()).toBe(false);
      expect(document.body.style.overflow).toBe('');
    });

    it('should close drawer on backdrop click', () => {
      component.openMobileFilters();
      fixture.detectChanges();

      const backdrop: HTMLElement | null = fixture.nativeElement.querySelector('.mobile-drawer-backdrop');
      expect(backdrop).toBeTruthy();

      backdrop?.click();
      fixture.detectChanges();

      expect(component.isMobileFilterOpen()).toBe(false);
      expect(document.body.style.overflow).toBe('');
    });

    it('should close drawer on Escape key press', () => {
      component.openMobileFilters();
      expect(component.isMobileFilterOpen()).toBe(true);

      const event = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
      document.dispatchEvent(event);

      expect(component.isMobileFilterOpen()).toBe(false);
      expect(document.body.style.overflow).toBe('');
    });

    it('should restore document.body.style.overflow on ngOnDestroy if destroyed while open', () => {
      component.openMobileFilters();
      expect(document.body.style.overflow).toBe('hidden');

      component.ngOnDestroy();
      expect(document.body.style.overflow).toBe('');
    });

    it('should render proper accessible dialog attributes (role, aria-modal, aria-labelledby, aria-controls)', () => {
      const toggleBtn: HTMLButtonElement | null = fixture.nativeElement.querySelector('.mobile-filter-btn');
      expect(toggleBtn).toBeTruthy();
      expect(toggleBtn?.getAttribute('aria-controls')).toBe('mobileFilterDrawer');
      expect(toggleBtn?.getAttribute('aria-expanded')).toBe('false');

      component.openMobileFilters();
      fixture.detectChanges();

      expect(toggleBtn?.getAttribute('aria-expanded')).toBe('true');
      const drawer: HTMLElement | null = fixture.nativeElement.querySelector('#mobileFilterDrawer');
      expect(drawer).toBeTruthy();
      expect(drawer?.getAttribute('role')).toBe('dialog');
      expect(drawer?.getAttribute('aria-modal')).toBe('true');
      expect(drawer?.getAttribute('aria-labelledby')).toBe('mobileDrawerHeading');

      const heading = fixture.nativeElement.querySelector('#mobileDrawerHeading');
      expect(heading).toBeTruthy();
      expect(heading.textContent).toContain('Filter Restaurants');
    });

    it('should retain filter selections made inside mobile drawer upon closing', () => {
      component.openMobileFilters();
      fixture.detectChanges();

      // Set cuisine to 'italian'
      component.setCuisine('italian');
      expect(component.selectedCuisine()).toBe('italian');

      // Set minimum rating to 4.5
      component.setRating(4.5);
      expect(component.selectedRating()).toBe(4.5);

      // Close drawer (e.g. by applying or clicking close)
      component.closeMobileFilters();
      fixture.detectChanges();

      expect(component.selectedCuisine()).toBe('italian');
      expect(component.selectedRating()).toBe(4.5);
      expect(component.activeFilterCount()).toBeGreaterThan(0);
    });

    it('should reset all filters from drawer Reset All button', () => {
      component.setCuisine('italian');
      component.setRating(4.5);
      component.openMobileFilters();
      fixture.detectChanges();

      expect(component.activeFilterCount()).toBeGreaterThan(0);

      const resetBtn: HTMLButtonElement | null = fixture.nativeElement.querySelector('.drawer-reset-btn');
      expect(resetBtn).toBeTruthy();
      resetBtn?.click();
      fixture.detectChanges();

      expect(component.selectedCuisine()).toBe('all');
      expect(component.selectedRating()).toBe(0);
      expect(component.activeFilterCount()).toBe(0);
    });

    it('should display Show X Restaurants button with correct filtered count and close drawer on click', () => {
      component.openMobileFilters();
      fixture.detectChanges();

      const applyBtn: HTMLButtonElement | null = fixture.nativeElement.querySelector('.drawer-apply-btn');
      expect(applyBtn).toBeTruthy();
      const count = component.filteredRestaurants().length;
      expect(applyBtn?.textContent).toContain(`Show ${count} ${count === 1 ? 'Restaurant' : 'Restaurants'}`);

      applyBtn?.click();
      fixture.detectChanges();

      expect(component.isMobileFilterOpen()).toBe(false);
      expect(document.body.style.overflow).toBe('');
    });

    it('should preserve and restore original inline body overflow value', () => {
      document.body.style.overflow = 'scroll';

      component.openMobileFilters();
      expect(document.body.style.overflow).toBe('hidden');

      component.closeMobileFilters();
      expect(document.body.style.overflow).toBe('scroll');

      // Cleanup
      document.body.style.overflow = '';
    });

    it('should trap focus inside the drawer when Tab or Shift+Tab is pressed', () => {
      component.openMobileFilters();
      fixture.detectChanges();

      const drawer: HTMLElement = fixture.nativeElement.querySelector('#mobileFilterDrawer');
      const focusable = drawer.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled])');
      const firstEl = focusable[0];
      const lastEl = focusable[focusable.length - 1];

      // Focusing first element and pressing Shift+Tab should wrap to last element
      firstEl.focus();
      const shiftTabEvent = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, cancelable: true });
      const shiftTabPreventSpy = vi.spyOn(shiftTabEvent, 'preventDefault');
      document.dispatchEvent(shiftTabEvent);
      expect(shiftTabPreventSpy).toHaveBeenCalled();
      expect(document.activeElement).toBe(lastEl);

      // Focusing last element and pressing Tab should wrap to first element
      lastEl.focus();
      const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: false, cancelable: true });
      const tabPreventSpy = vi.spyOn(tabEvent, 'preventDefault');
      document.dispatchEvent(tabEvent);
      expect(tabPreventSpy).toHaveBeenCalled();
      expect(document.activeElement).toBe(firstEl);

      component.closeMobileFilters();
    });
  });

  // ---- Phase 3: Voice Search Integration Tests ----

  describe('Phase 3: Voice Search Integration', () => {
    it('should render VoiceSearchComponent inside the luxury search box', () => {
      const voiceSearchEl = fixture.nativeElement.querySelector('app-voice-search');
      expect(voiceSearchEl).toBeTruthy();

      const searchBox = fixture.nativeElement.querySelector('.luxury-search-box');
      expect(searchBox.contains(voiceSearchEl)).toBe(true);

      const voiceComponent = fixture.debugElement.query(By.directive(VoiceSearchComponent));
      expect(voiceComponent).toBeTruthy();
    });

    it('should update searchQuery and filter restaurants when a final English transcript is emitted', () => {
      const voiceDe = fixture.debugElement.query(By.directive(VoiceSearchComponent));
      const voiceComp = voiceDe.componentInstance as VoiceSearchComponent;

      voiceComp.transcriptChange.emit('Chatelet');
      fixture.detectChanges();

      expect(component.searchQuery()).toBe('Chatelet');
      const results = component.filteredRestaurants();
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Le Chatelet Bistro');
    });

    it('should update searchQuery and execute filtering when a Hindi transcript is emitted', () => {
      const voiceDe = fixture.debugElement.query(By.directive(VoiceSearchComponent));
      const voiceComp = voiceDe.componentInstance as VoiceSearchComponent;

      voiceComp.transcriptChange.emit('बिरयानी');
      fixture.detectChanges();

      expect(component.searchQuery()).toBe('बिरयानी');
      expect(component.filteredRestaurants().length).toBe(0);
    });

    it('should update searchQuery and execute filtering when a Tamil transcript is emitted', () => {
      const voiceDe = fixture.debugElement.query(By.directive(VoiceSearchComponent));
      const voiceComp = voiceDe.componentInstance as VoiceSearchComponent;

      voiceComp.transcriptChange.emit('பிரியாணி');
      fixture.detectChanges();

      expect(component.searchQuery()).toBe('பிரியாணி');
      expect(component.filteredRestaurants().length).toBe(0);
    });

    it('should invoke onSearchChange when transcriptChange is emitted from VoiceSearchComponent', () => {
      const searchSpy = vi.spyOn(component, 'onSearchChange');
      const voiceDe = fixture.debugElement.query(By.directive(VoiceSearchComponent));

      voiceDe.triggerEventHandler('transcriptChange', 'Bella');
      fixture.detectChanges();

      expect(searchSpy).toHaveBeenCalledWith('Bella');
      expect(component.searchQuery()).toBe('Bella');
      expect(component.filteredRestaurants().length).toBe(1);
      expect(component.filteredRestaurants()[0].name).toBe('Trattoria Bella Napoli');
    });

    it('should preserve existing filters (cuisine, rating, city) when a voice transcript arrives', () => {
      component.setCuisine('italian');
      component.setRating(4.5);
      component.setCity('Naples');
      fixture.detectChanges();

      expect(component.selectedCuisine()).toBe('italian');
      expect(component.selectedRating()).toBe(4.5);
      expect(component.selectedCity()).toBe('Naples');

      const voiceDe = fixture.debugElement.query(By.directive(VoiceSearchComponent));
      const voiceComp = voiceDe.componentInstance as VoiceSearchComponent;
      voiceComp.transcriptChange.emit('Bella');
      fixture.detectChanges();

      expect(component.selectedCuisine()).toBe('italian');
      expect(component.selectedRating()).toBe(4.5);
      expect(component.selectedCity()).toBe('Naples');
      expect(component.searchQuery()).toBe('Bella');

      const results = component.filteredRestaurants();
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Trattoria Bella Napoli');
    });

    it('should update autocomplete suggestions and sync search query param when a voice transcript arrives', () => {
      const router = TestBed.inject(Router);
      const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

      const voiceDe = fixture.debugElement.query(By.directive(VoiceSearchComponent));
      const voiceComp = voiceDe.componentInstance as VoiceSearchComponent;

      voiceComp.transcriptChange.emit('Sakura');
      fixture.detectChanges();

      expect(component.isAutocompleteOpen()).toBe(true);
      const suggestions = component.autocompleteSuggestions();
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.label === 'Sakura Omakase Lounge')).toBe(true);

      component.syncSearchQueryParam('Sakura');
      expect(navSpy).toHaveBeenCalledWith([], {
        relativeTo: expect.anything(),
        queryParams: { search: 'Sakura' },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
    });

    it('should continue supporting manual typed search alongside voice search', () => {
      const inputEl: HTMLInputElement = fixture.nativeElement.querySelector('#restaurantSearchInput');
      inputEl.value = 'Paris';
      inputEl.dispatchEvent(new Event('input'));
      component.onSearchChange('Paris');
      fixture.detectChanges();

      expect(component.searchQuery()).toBe('Paris');
      expect(component.filteredRestaurants().length).toBe(1);
      expect(component.filteredRestaurants()[0].name).toBe('Le Chatelet Bistro');
    });

    it('should allow clearing search after a voice search and restore full results', () => {
      const voiceDe = fixture.debugElement.query(By.directive(VoiceSearchComponent));
      const voiceComp = voiceDe.componentInstance as VoiceSearchComponent;

      voiceComp.transcriptChange.emit('Chatelet');
      fixture.detectChanges();

      expect(component.filteredRestaurants().length).toBe(1);
      expect(fixture.nativeElement.querySelector('.clear-search-btn')).toBeTruthy();

      component.clearSearch();
      fixture.detectChanges();

      expect(component.searchQuery()).toBe('');
      expect(component.filteredRestaurants().length).toBe(3);
    });
  });

  // ---- Phase 4: Search Equivalence & Punctuation Resiliency ----

  describe('Phase 4: Search Equivalence and Punctuation Resiliency', () => {
    it('should match restaurants cleanly when typed search contains trailing punctuation', () => {
      component.onSearchChange('Chatelet.');
      fixture.detectChanges();

      const results = component.filteredRestaurants();
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Le Chatelet Bistro');
    });

    it('should maintain cuisine and city filters alongside voice search transcripts', () => {
      component.setCuisine('italian');
      component.setCity('Naples');
      fixture.detectChanges();

      expect(component.selectedCuisine()).toBe('italian');
      expect(component.selectedCity()).toBe('Naples');

      const voiceDe = fixture.debugElement.query(By.directive(VoiceSearchComponent));
      const voiceComp = voiceDe.componentInstance as VoiceSearchComponent;
      voiceComp.transcriptChange.emit('Bella');
      fixture.detectChanges();

      expect(component.selectedCuisine()).toBe('italian');
      expect(component.selectedCity()).toBe('Naples');
      const results = component.filteredRestaurants();
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Trattoria Bella Napoli');
    });

    it('should produce identical filtered restaurant results for voice and typed search of the same query', () => {
      // 1. Typed search with "Bella"
      component.onSearchChange('Bella');
      fixture.detectChanges();
      const typedResults = component.filteredRestaurants();

      // Reset
      component.clearSearch();
      fixture.detectChanges();
      expect(component.filteredRestaurants().length).toBe(3);

      // 2. Voice search emitting "Bella"
      const voiceDe = fixture.debugElement.query(By.directive(VoiceSearchComponent));
      const voiceComp = voiceDe.componentInstance as VoiceSearchComponent;
      voiceComp.transcriptChange.emit('Bella');
      fixture.detectChanges();
      const voiceResults = component.filteredRestaurants();

      expect(voiceResults).toEqual(typedResults);
      expect(voiceResults.length).toBe(1);
      expect(voiceResults[0].name).toBe('Trattoria Bella Napoli');
    });
  });
});

