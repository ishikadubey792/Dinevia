import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { RestaurantService } from './restaurant.service';
import {
  ApiRestaurantDto,
  resolveCoverImageUrl,
  mapApiRestaurantToDomain,
  matchesRestaurantSearch,
  matchesRestaurantCuisine,
  hasActualRating,
  meetsMinimumRating,
  countDistinctRestaurantsForCuisine,
  sortRestaurantsAlphabetically,
  BACKEND_ORIGIN,
  DEFAULT_FALLBACK_RESTAURANT_IMAGE
} from '../models/restaurant.model';
import { ApiResponse } from '../models/cuisine.model';
import { environment } from '../../../environments/environment';

describe('RestaurantService Live API Integration', () => {
  let service: RestaurantService;
  let httpTesting: HttpTestingController;

  const mockApiRestaurants: ApiResponse<ApiRestaurantDto[]> = {
    statusCode: 200,
    message: 'Restaurants fetched successfully.',
    data: [
      {
        id: 1,
        name: 'Maison Laurent Paris',
        address: '18 Rue Royale',
        city: 'Paris',
        description: 'An intimate dining sanctuary pairing French terroir gastronomy with master cellar vintages.',
        phone: '+33 1 42 68 88 00',
        email: 'contact@maisonlaurent.fr',
        coverImagePath: '/uploads/restaurants/1_cover.jpg',
        isActive: true,
        restaurantCuisines: [
          {
            cuisineId: 1,
            cuisine: { id: 1, name: 'French Haute' }
          }
        ]
      },
      {
        id: 2,
        name: 'Osteria Della Luna',
        address: 'Via Montenapoleone 8',
        city: 'Milan',
        description: 'Artisanal handmade pasta and Northern Italian cellar heritage.',
        phone: '+39 02 7600 1234',
        email: 'prenotazioni@osteriadellaluna.it',
        coverImagePath: 'https://images.unsplash.com/photo-custom?w=900',
        isActive: true,
        restaurantCuisines: [
          {
            cuisineId: 3,
            cuisine: { id: 3, name: 'Italian' }
          }
        ]
      },
      {
        id: 3,
        name: 'Inactive Bistro',
        address: 'Closed Street',
        city: 'Lyon',
        isActive: false
      }
    ]
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        RestaurantService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(RestaurantService);
    httpTesting = TestBed.inject(HttpTestingController);

    // Handle initial constructor fetch request
    const initReq = httpTesting.expectOne(`${environment.apiUrl}/restaurants`);
    expect(initReq.request.method).toBe('GET');
    initReq.flush(mockApiRestaurants);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created and load live active restaurants', () => {
    expect(service).toBeTruthy();
    expect(service.isApiLoaded()).toBe(true);

    const list = service.restaurants();
    // Inactive restaurant with id 3 should be filtered out
    expect(list.length).toBe(2);
    expect(list[0].id).toBe('1');
    expect(list[0].name).toBe('Maison Laurent Paris');
    expect(list[0].city).toBe('Paris');
    expect(list[0].cuisine).toBe('French Haute');
    expect(list[1].name).toBe('Osteria Della Luna');
  });

  it('should map relative CoverImagePath correctly using https://localhost:7033 origin', () => {
    const list = service.restaurants();
    // Relative path /uploads/restaurants/1_cover.jpg must be resolved to https://localhost:7033/uploads/restaurants/1_cover.jpg
    expect(list[0].imageUrl).toBe(`${BACKEND_ORIGIN}/uploads/restaurants/1_cover.jpg`);

    // Absolute URLs should remain untouched
    expect(list[1].imageUrl).toBe('https://images.unsplash.com/photo-custom?w=900');
  });

  it('should use fallback image when coverImagePath is empty, null or undefined', () => {
    expect(resolveCoverImageUrl(null)).toBe(DEFAULT_FALLBACK_RESTAURANT_IMAGE);
    expect(resolveCoverImageUrl('')).toBe(DEFAULT_FALLBACK_RESTAURANT_IMAGE);
    expect(resolveCoverImageUrl('   ')).toBe(DEFAULT_FALLBACK_RESTAURANT_IMAGE);
    expect(resolveCoverImageUrl(undefined)).toBe(DEFAULT_FALLBACK_RESTAURANT_IMAGE);
  });

  it('should handle empty restaurant response ([] and data: [])', () => {
    service.fetchRestaurants().subscribe((result) => {
      expect(result.length).toBe(0);
      expect(service.restaurants().length).toBe(0);
    });

    const req = httpTesting.expectOne(`${environment.apiUrl}/restaurants`);
    req.flush({ statusCode: 200, message: 'No restaurants', data: [] });
  });

  it('should handle API error cleanly without mock fallback and set error signal', () => {
    service.fetchRestaurants().subscribe((result) => {
      expect(result).toEqual([]);
    });

    const req = httpTesting.expectOne(`${environment.apiUrl}/restaurants`);
    req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

    expect(service.isLoadingRestaurants()).toBe(false);
    expect(service.isApiLoaded()).toBe(false);
    expect(service.restaurantLoadError()).toBeTruthy();
    expect(service.restaurants().length).toBe(0);
    expect(service.cuisines().length).toBe(0);
  });

  it('should NOT fall back to mock restaurants in getRestaurantById or generate fake reviews', () => {
    expect(service.getRestaurantById('rest-1')).toBeUndefined();
    const liveRest = service.restaurants()[0];
    expect(service.getReviewsForRestaurant(liveRest)).toEqual([]);
  });

  it('should reuse loaded state in ensureRestaurantsLoaded without duplicate HTTP calls', () => {
    service.ensureRestaurantsLoaded().subscribe((list) => {
      expect(list.length).toBe(2);
    });
    httpTesting.expectNone(`${environment.apiUrl}/restaurants`);
  });

  it('should find restaurant by numeric or string ID', () => {
    const found = service.getRestaurantById('1');
    expect(found).toBeTruthy();
    expect(found?.name).toBe('Maison Laurent Paris');

    const notFound = service.getRestaurantById('non-existent-999');
    expect(notFound).toBeUndefined();
  });

  it('should filter restaurants by cuisine and category', () => {
    // Filter by Italian cuisine
    service.setCuisineFilter('Italian');
    const filtered = service.filteredRestaurants();
    expect(filtered.length).toBe(1);
    expect(filtered[0].name).toBe('Osteria Della Luna');

    // Reset
    service.resetFilters();
    expect(service.filteredRestaurants().length).toBe(2);
  });

  it('should search restaurants by location and criteria', () => {
    service.searchRestaurants({
      location: 'Milan',
      cuisine: 'all',
      date: '2026-11-05',
      time: '7:30 PM',
      guests: 2
    });

    const filtered = service.filteredRestaurants();
    expect(filtered.length).toBe(1);
    expect(filtered[0].city).toBe('Milan');

    service.resetFilters();
  });

  it('should search restaurants by address, name, city and description', () => {
    // Search by address
    service.searchRestaurants({
      location: '18 Rue Royale',
      cuisine: 'all',
      date: '2026-11-05',
      time: '7:30 PM',
      guests: 2
    });
    let filtered = service.filteredRestaurants();
    expect(filtered.length).toBe(1);
    expect(filtered[0].name).toBe('Maison Laurent Paris');

    // Search by description keyword
    service.searchRestaurants({
      location: 'terroir gastronomy',
      cuisine: 'all',
      date: '2026-11-05',
      time: '7:30 PM',
      guests: 2
    });
    filtered = service.filteredRestaurants();
    expect(filtered.length).toBe(1);
    expect(filtered[0].name).toBe('Maison Laurent Paris');

    // Search case-insensitive with whitespace
    service.searchRestaurants({
      location: '   pArIs   ',
      cuisine: 'all',
      date: '2026-11-05',
      time: '7:30 PM',
      guests: 2
    });
    filtered = service.filteredRestaurants();
    expect(filtered.length).toBe(1);
    expect(filtered[0].name).toBe('Maison Laurent Paris');

    service.resetFilters();
    expect(service.filteredRestaurants().length).toBe(2);
  });

  it('should filter by slugified cuisine and support multiple active filters', () => {
    // Filter by slug 'french-haute' matching 'French Haute'
    service.setCuisineFilter('french-haute');
    let filtered = service.filteredRestaurants();
    expect(filtered.length).toBe(1);
    expect(filtered[0].name).toBe('Maison Laurent Paris');

    // Add search criteria on top of cuisine filter (both active)
    service.searchRestaurants({
      location: 'Rue Royale',
      cuisine: 'all',
      date: '2026-11-05',
      time: '7:30 PM',
      guests: 2
    });
    filtered = service.filteredRestaurants();
    expect(filtered.length).toBe(1);
    expect(filtered[0].name).toBe('Maison Laurent Paris');

    // Conflicting criteria: Italian cuisine + Paris address -> 0 results
    service.setCuisineFilter('Italian');
    filtered = service.filteredRestaurants();
    expect(filtered.length).toBe(0);

    // Resetting filters restores all live active restaurants
    service.resetFilters();
    expect(service.filteredRestaurants().length).toBe(2);
  });

  it('should synchronize live discovered cuisines into cuisines signal', () => {
    const cuisines = service.cuisines();
    // 'French Haute' should be added dynamically to the cuisines signal
    const frenchHaute = cuisines.find(c => c.slug === 'french-haute' || c.name.toLowerCase() === 'french haute');
    expect(frenchHaute).toBeTruthy();
    expect(frenchHaute?.name).toBe('French Haute');
  });

  it('matchesRestaurantSearch should test name, city, address, description, cuisine and context', () => {
    const liveRest = service.restaurants()[0]; // Maison Laurent Paris

    // Name partial & case-insensitive
    expect(matchesRestaurantSearch(liveRest, 'laurent')).toBe(true);
    expect(matchesRestaurantSearch(liveRest, 'LAURENT')).toBe(true);

    // City
    expect(matchesRestaurantSearch(liveRest, 'paris')).toBe(true);
    expect(matchesRestaurantSearch(liveRest, '   PARIS   ')).toBe(true);

    // Address
    expect(matchesRestaurantSearch(liveRest, 'Royale')).toBe(true);

    // Description
    expect(matchesRestaurantSearch(liveRest, 'terroir')).toBe(true);

    // Cuisine
    expect(matchesRestaurantSearch(liveRest, 'haute')).toBe(true);

    // Non-matching
    expect(matchesRestaurantSearch(liveRest, 'Tokyo')).toBe(false);

    // Empty/whitespace query returns true
    expect(matchesRestaurantSearch(liveRest, '')).toBe(true);
    expect(matchesRestaurantSearch(liveRest, '   ')).toBe(true);
  });

  it('matchesRestaurantCuisine should test single, multiple, and slugified cuisines', () => {
    const liveRest = service.restaurants()[0]; // cuisine: 'French Haute', cuisines: ['French Haute']

    expect(matchesRestaurantCuisine(liveRest, 'all')).toBe(true);
    expect(matchesRestaurantCuisine(liveRest, 'French Haute')).toBe(true);
    expect(matchesRestaurantCuisine(liveRest, 'french-haute')).toBe(true);
    expect(matchesRestaurantCuisine(liveRest, 'french')).toBe(true);
    expect(matchesRestaurantCuisine(liveRest, 'haute')).toBe(true);
    expect(matchesRestaurantCuisine(liveRest, 'japanese')).toBe(false);
  });

  it('should toggle and query saved wishlist status', () => {
    expect(service.isSaved('1')).toBe(false);

    const isNowSaved = service.toggleSaved('1');
    expect(isNowSaved).toBe(true);
    expect(service.isSaved('1')).toBe(true);

    service.removeFromSaved('1');
    expect(service.isSaved('1')).toBe(false);
  });

  it('should map missing or zero dto.rating and dto.reviewCount to 0 instead of 4.9 / 12 fallback', () => {
    const unratedDto: ApiRestaurantDto = {
      id: 99,
      name: 'Unrated Kitchen',
      address: '10 Elm St',
      city: 'Austin',
      isActive: true
    };
    const zeroRatedDto: ApiRestaurantDto = {
      id: 100,
      name: 'Zero Rated Kitchen',
      address: '12 Elm St',
      city: 'Austin',
      rating: 0,
      reviewCount: 0,
      isActive: true
    };
    const ratedDto: ApiRestaurantDto = {
      id: 101,
      name: 'Rated Kitchen',
      address: '14 Elm St',
      city: 'Austin',
      rating: 4.6,
      reviewCount: 18,
      isActive: true
    };

    const unrated = mapApiRestaurantToDomain(unratedDto);
    const zeroRated = mapApiRestaurantToDomain(zeroRatedDto);
    const rated = mapApiRestaurantToDomain(ratedDto);

    expect(unrated.rating).toBe(0);
    expect(unrated.reviewCount).toBe(0);
    expect(hasActualRating(unrated.rating)).toBe(false);
    expect(meetsMinimumRating(unrated, 4.5)).toBe(false);

    expect(zeroRated.rating).toBe(0);
    expect(zeroRated.reviewCount).toBe(0);
    expect(hasActualRating(zeroRated.rating)).toBe(false);

    expect(rated.rating).toBe(4.6);
    expect(rated.reviewCount).toBe(18);
    expect(hasActualRating(rated.rating)).toBe(true);
    expect(meetsMinimumRating(rated, 4.5)).toBe(true);
  });

  it('should compute distinct cuisine restaurant counts without double-counting multi-cuisine records and reset to 0 on empty response', () => {
    service.fetchRestaurants().subscribe();
    const req = httpTesting.expectOne(`${environment.apiUrl}/restaurants`);
    req.flush({
      statusCode: 200,
      message: 'OK',
      data: [
        {
          id: 10,
          name: 'Roma Bistro',
          address: '1 Via Roma',
          city: 'Rome',
          isActive: true,
          restaurantCuisines: [
            { cuisineId: 1, cuisine: { id: 1, name: 'Italian' } },
            { cuisineId: 2, cuisine: { id: 2, name: 'Italian Woodfired' } }
          ]
        },
        {
          id: 11,
          name: 'Trattoria Verde',
          address: '2 Via Roma',
          city: 'Rome',
          isActive: true,
          restaurantCuisines: [
            { cuisineId: 1, cuisine: { id: 1, name: 'Italian' } }
          ]
        }
      ]
    });

    const list = service.restaurants();
    expect(countDistinctRestaurantsForCuisine(list, 'italian')).toBe(2);

    const italianCuisine = service.cuisines().find((c) => c.slug === 'italian');
    expect(italianCuisine?.restaurantCount).toBe(2);

    const sorted = sortRestaurantsAlphabetically(list);
    expect(sorted.map((r) => r.name)).toEqual(['Roma Bistro', 'Trattoria Verde']);

    service.fetchRestaurants().subscribe();
    const emptyReq = httpTesting.expectOne(`${environment.apiUrl}/restaurants`);
    emptyReq.flush({ statusCode: 200, message: 'Empty', data: [] });

    expect(service.restaurants().length).toBe(0);
    expect(service.cuisines().every((c) => c.restaurantCount === 0)).toBe(true);
  });

  it('should map GET /api/restaurants/{id} scalar DTO accurately without fake slots or assumed navigation properties', () => {
    service.fetchRestaurantById('1').subscribe((result) => {
      expect(result.status).toBe('found');
      expect(result.errorMessage).toBeNull();
      expect(result.restaurant).toBeTruthy();

      const rest = result.restaurant!;
      expect(rest.id).toBe('1');
      expect(rest.name).toBe('Maison Laurent Paris');
      expect(rest.address).toBe('18 Rue Royale');
      expect(rest.city).toBe('Paris');
      expect(rest.phone).toBe('+33 1 42 68 88 00');
      expect(rest.email).toBe('contact@maisonlaurent.fr');
      expect(rest.imageUrl).toBe(`${BACKEND_ORIGIN}/uploads/restaurants/1_cover.jpg`);
      expect(rest.availableSlots).toEqual([]);
      expect(rest.highlights).toEqual([]);
      // Cuisine enriched cleanly from Phase 1 loaded list when detail response omits restaurantCuisines
      expect(rest.cuisine).toBe('French Haute');
    });

    const detailReq = httpTesting.expectOne(`${environment.apiUrl}/restaurants/1`);
    expect(detailReq.request.method).toBe('GET');
    detailReq.flush({
      statusCode: 200,
      message: 'Restaurant fetched successfully.',
      data: {
        id: 1,
        ownerUserId: 10,
        name: 'Maison Laurent Paris',
        address: '18 Rue Royale',
        phone: '+33 1 42 68 88 00',
        email: 'contact@maisonlaurent.fr',
        isActive: true,
        city: 'Paris',
        description: 'Authentic seasonal French cuisine.',
        coverImagePath: '/uploads/restaurants/1_cover.jpg'
      }
    });
  });

  it('should classify 404 or inactive restaurant in fetchRestaurantById as not-found and 500 as error', () => {
    service.fetchRestaurantById('999').subscribe((res) => {
      expect(res.status).toBe('not-found');
      expect(res.restaurant).toBeNull();
      expect(res.errorMessage).toBeNull();
    });
    httpTesting
      .expectOne(`${environment.apiUrl}/restaurants/999`)
      .flush({ statusCode: 404, message: 'Restaurant not found.' }, { status: 404, statusText: 'Not Found' });

    service.fetchRestaurantById('3').subscribe((res) => {
      expect(res.status).toBe('not-found');
      expect(res.restaurant).toBeNull();
    });
    httpTesting.expectOne(`${environment.apiUrl}/restaurants/3`).flush({
      statusCode: 200,
      message: 'OK',
      data: {
        id: 3,
        name: 'Closed Venue',
        address: '1 Elm St',
        city: 'Paris',
        isActive: false
      }
    });

    service.fetchRestaurantById('1').subscribe((res) => {
      expect(res.status).toBe('error');
      expect(res.restaurant).toBeNull();
      expect(res.errorMessage).toBeTruthy();
    });
    httpTesting
      .expectOne(`${environment.apiUrl}/restaurants/1`)
      .flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
  });
});

