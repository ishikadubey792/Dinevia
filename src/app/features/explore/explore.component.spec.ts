import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ExploreComponent } from './explore.component';
import { RestaurantService } from '../../core/services/restaurant.service';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../core/models/cuisine.model';
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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExploreComponent],
      providers: [
        RestaurantService,
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

  it('should filter by price tier', () => {
    component.setPrice('$$');
    fixture.detectChanges();

    const results = component.filteredRestaurants();
    expect(results.length).toBe(1);
    expect(results[0].name).toBe('Trattoria Bella Napoli');
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
    component.setPrice('$$$$');
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
});

