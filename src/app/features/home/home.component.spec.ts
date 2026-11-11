import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { HomeComponent } from './home.component';
import { environment } from '../../../environments/environment';
import { ApiRestaurantDto } from '../../core/models/restaurant.model';
import { ApiCuisine, ApiResponse } from '../../core/models/cuisine.model';

describe('HomeComponent Dynamic Cuisine Counts & Navigation', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let component: HomeComponent;
  let httpTesting: HttpTestingController;
  let router: Router;

  const mockRestaurantsResponse: ApiResponse<ApiRestaurantDto[]> = {
    statusCode: 200,
    message: 'Restaurants fetched successfully.',
    data: [
      {
        id: 1,
        name: 'Bella Roma',
        address: '10 Via Veneto',
        city: 'Rome',
        isActive: true,
        restaurantCuisines: [
          { cuisineId: 1, cuisine: { id: 1, name: 'Italian' } },
          { cuisineId: 2, cuisine: { id: 2, name: 'Italian Bistro' } }
        ]
      },
      {
        id: 2,
        name: 'Osteria Nuova',
        address: '22 Via Condotti',
        city: 'Milan',
        isActive: true,
        restaurantCuisines: [
          { cuisineId: 1, cuisine: { id: 1, name: 'Italian' } }
        ]
      },
      {
        id: 3,
        name: 'Sakura Kaiseki',
        address: '5 Ginza',
        city: 'Tokyo',
        isActive: true,
        restaurantCuisines: [
          { cuisineId: 3, cuisine: { id: 3, name: 'Japanese' } }
        ]
      }
    ]
  };

  const mockCuisinesResponse: ApiResponse<ApiCuisine[]> = {
    statusCode: 200,
    message: 'Cuisines fetched successfully.',
    data: [
      { id: 1, name: 'Italian', isActive: true },
      { id: 3, name: 'Japanese', isActive: true },
      { id: 4, name: 'Mexican', isActive: true },
      { id: 5, name: 'Hidden Inactive Cuisine', isActive: false }
    ]
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    httpTesting = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should show loading state before /api/cuisines responds and then render dynamic distinct restaurant counts instead of Tables', () => {
    // RestaurantService fetches /api/restaurants in constructor
    const restReq = httpTesting.expectOne(`${environment.apiUrl}/restaurants`);
    restReq.flush(mockRestaurantsResponse);

    fixture.detectChanges();

    // HomeComponent.ngOnInit requests /api/cuisines
    expect(component.isLoadingCuisines()).toBe(true);
    const cuisinesReq = httpTesting.expectOne(`${environment.apiUrl}/cuisines`);
    cuisinesReq.flush(mockCuisinesResponse);
    fixture.detectChanges();

    expect(component.isLoadingCuisines()).toBe(false);

    const activeCuisines = component.cuisines();
    expect(activeCuisines.some((c) => c.name === 'Hidden Inactive Cuisine')).toBe(false);

    // Multi-cuisine record ('Italian' + 'Italian Bistro') on restaurant #1 must NOT double-count
    const italian = activeCuisines.find((c) => c.slug === 'italian');
    const japanese = activeCuisines.find((c) => c.slug === 'japanese');
    const mexican = activeCuisines.find((c) => c.slug === 'mexican');

    expect(italian?.restaurantCount).toBe(2);
    expect(japanese?.restaurantCount).toBe(1);
    expect(mexican?.restaurantCount).toBe(0);

    const cuisinesGrid = fixture.nativeElement.querySelector('.cuisines-grid') as HTMLElement | null;
    expect(cuisinesGrid).toBeTruthy();
    const gridText = cuisinesGrid?.textContent || '';
    expect(gridText).toContain('2 Restaurants');
    expect(gridText).toContain('1 Restaurant');
    expect(gridText).toContain('0 Restaurants');
    expect(gridText.toLowerCase()).not.toContain('tables');
  });

  it('should render empty cuisine state when backend returns no active cuisines and no fallback cuisines match', () => {
    const restReq = httpTesting.expectOne(`${environment.apiUrl}/restaurants`);
    restReq.flush({ statusCode: 200, message: 'OK', data: [] });

    fixture.detectChanges();

    const cuisinesReq = httpTesting.expectOne(`${environment.apiUrl}/cuisines`);
    cuisinesReq.flush({ statusCode: 200, message: 'OK', data: [] });
    fixture.detectChanges();

    expect(component.cuisines().length).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('No cuisines');
  });

  it('should navigate to /explore?cuisine=<slug> when a cuisine card is selected', () => {
    const restReq = httpTesting.expectOne(`${environment.apiUrl}/restaurants`);
    restReq.flush(mockRestaurantsResponse);

    fixture.detectChanges();

    const cuisinesReq = httpTesting.expectOne(`${environment.apiUrl}/cuisines`);
    cuisinesReq.flush(mockCuisinesResponse);
    fixture.detectChanges();

    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.onSelectCuisine('italian');
    expect(navigateSpy).toHaveBeenCalledWith(['/explore'], {
      queryParams: { cuisine: 'italian' }
    });
  });

  it('should show error state instead of mock cuisines when /api/cuisines fails and retry cleanly', () => {
    const restReq = httpTesting.expectOne(`${environment.apiUrl}/restaurants`);
    restReq.flush(mockRestaurantsResponse);

    fixture.detectChanges();

    const cuisinesReq = httpTesting.expectOne(`${environment.apiUrl}/cuisines`);
    cuisinesReq.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
    fixture.detectChanges();

    expect(component.cuisines().length).toBe(0);
    expect(component.cuisinesLoadError()).toBeTruthy();
    const cuisinesSection = fixture.nativeElement.querySelector('.cuisines-section');
    expect(cuisinesSection?.querySelector('.restaurants-error-card')).toBeTruthy();

    component.retryCuisines();
    const retryReq = httpTesting.expectOne(`${environment.apiUrl}/cuisines`);
    retryReq.flush(mockCuisinesResponse);
    fixture.detectChanges();

    expect(component.cuisinesLoadError()).toBeNull();
    expect(component.cuisines().length).toBe(3);
  });

  it('should show restaurant error state without mock restaurants or simultaneous empty state when /api/restaurants fails', () => {
    const restReq = httpTesting.expectOne(`${environment.apiUrl}/restaurants`);
    restReq.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

    fixture.detectChanges();

    const cuisinesReq = httpTesting.expectOne(`${environment.apiUrl}/cuisines`);
    cuisinesReq.flush(mockCuisinesResponse);
    fixture.detectChanges();

    expect(component.restaurants().length).toBe(0);
    expect(component.loadError()).toBeTruthy();
    const featuredSection = fixture.nativeElement.querySelector('#featured-section');
    expect(featuredSection?.querySelector('.restaurants-error-card')).toBeTruthy();
    expect(featuredSection?.querySelector('.empty-state')).toBeNull();
  });

  it('should avoid duplicate API requests on re-initialization when state is already loaded', () => {
    const restReq = httpTesting.expectOne(`${environment.apiUrl}/restaurants`);
    restReq.flush(mockRestaurantsResponse);
    fixture.detectChanges();

    const cuisinesReq = httpTesting.expectOne(`${environment.apiUrl}/cuisines`);
    cuisinesReq.flush(mockCuisinesResponse);
    fixture.detectChanges();

    component.ngOnInit();
    httpTesting.expectNone(`${environment.apiUrl}/restaurants`);
    httpTesting.expectNone(`${environment.apiUrl}/cuisines`);
  });
});
