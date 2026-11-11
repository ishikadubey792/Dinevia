import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, ParamMap, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { RestaurantDetailComponent } from './restaurant-detail.component';
import { BookingService } from '../../core/services/booking.service';
import { environment } from '../../../environments/environment';
import { ApiRestaurantDto } from '../../core/models/restaurant.model';
import { ApiResponse } from '../../core/models/cuisine.model';
import { ApiRestaurantTableDto } from '../../core/models/booking.model';

describe('RestaurantDetailComponent Phase 2 Details & Real Availability', () => {
  let fixture: ComponentFixture<RestaurantDetailComponent>;
  let component: RestaurantDetailComponent;
  let httpTesting: HttpTestingController;
  let bookingService: BookingService;
  let paramMap$: BehaviorSubject<ParamMap>;

  const mockRestaurantsListResponse: ApiResponse<ApiRestaurantDto[]> = {
    statusCode: 200,
    message: 'Restaurants fetched successfully.',
    data: [
      {
        id: 1,
        name: 'Osteria Alba',
        address: '8 Via Torino',
        city: 'Milan',
        priceRange: '$$$$',
        rating: 0,
        reviewCount: 0,
        isActive: true,
        restaurantCuisines: [{ cuisineId: 1, cuisine: { id: 1, name: 'Italian' } }]
      }
    ]
  };

  const mockDetailResponse: ApiResponse<ApiRestaurantDto> = {
    statusCode: 200,
    message: 'Restaurant fetched successfully.',
    data: {
      id: 1,
      ownerUserId: 7,
      name: 'Osteria Alba',
      address: '8 Via Torino',
      city: 'Milan',
      phone: '+39 02 123456',
      email: 'info@osteriaalba.it',
      description: 'Seasonal Piedmontese cellar and wood-fired dining.',
      coverImagePath: '/uploads/alba.jpg',
      isActive: true
    }
  };

  const mockTablesResponse: ApiResponse<ApiRestaurantTableDto[]> = {
    statusCode: 200,
    message: 'Available tables fetched successfully.',
    data: [
      { id: 10, restaurantId: 1, tableNumber: 4, capacity: 4, status: 'Available' },
      { id: 11, restaurantId: 1, tableNumber: 2, capacity: 6, status: 'Reserved' },
      { id: 12, restaurantId: 2, tableNumber: 9, capacity: 6, status: 'Available' },
      { id: 13, restaurantId: 1, tableNumber: 1, capacity: 2, status: 'Available' }
    ]
  };

  beforeEach(async () => {
    paramMap$ = new BehaviorSubject<ParamMap>(convertToParamMap({ id: '1' }));

    await TestBed.configureTestingModule({
      imports: [RestaurantDetailComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: paramMap$.asObservable()
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RestaurantDetailComponent);
    component = fixture.componentInstance;
    httpTesting = TestBed.inject(HttpTestingController);
    bookingService = TestBed.inject(BookingService);

    // Flush Phase 1 restaurant list & Phase 2 GET /api/restaurants/1
    const restListReq = httpTesting.expectOne(`${environment.apiUrl}/restaurants`);
    restListReq.flush(mockRestaurantsListResponse);

    fixture.detectChanges();

    const detailReq = httpTesting.expectOne(`${environment.apiUrl}/restaurants/1`);
    expect(detailReq.request.method).toBe('GET');
    detailReq.flush(mockDetailResponse);

    // Initial availability request triggered upon restaurant resolution
    const availReq = httpTesting.expectOne(
      r => r.url === `${environment.apiUrl}/bookings/availability`
    );
    expect(availReq.request.params.has('RestaurantId')).toBe(false);
    expect(availReq.request.params.get('StartTime')).toBe('18:30:00');
    expect(availReq.request.params.get('EndTime')).toBe('20:00:00');
    expect(availReq.request.params.get('NumberOfGuests')).toBe('2');
    availReq.flush(mockTablesResponse);

    fixture.detectChanges();
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should load GET /api/restaurants/{id}, enrich Phase 1 cuisine, and filter available tables by restaurant, status and capacity', () => {
    const rest = component.restaurant()!;
    expect(rest.name).toBe('Osteria Alba');
    expect(rest.cuisine).toBe('Italian');
    expect(rest.phone).toBe('+39 02 123456');
    expect(rest.email).toBe('info@osteriaalba.it');
    expect(rest.availableSlots).toEqual([]);

    // Default guests = 2 -> Tables #1 (id 13, cap 2) and #4 (id 10, cap 4); excludes Reserved & other restaurant
    expect(component.availableTables().map(t => t.id)).toEqual([13, 10]);

    const pageText = fixture.nativeElement.textContent || '';
    expect(pageText).toContain('Table #1 (2 seats)');
    expect(pageText).toContain('Table #4 (4 seats)');
    expect(pageText).not.toContain('Table #2');
    expect(pageText).not.toContain('Table #9');
  });

  it('should refresh availability on date/time/guests changes, prevent duplicate calls, and ignore stale responses', () => {
    // 1. Same inputs should not re-fetch
    component.requestAvailabilityRefresh(false);
    httpTesting.expectNone(r => r.url === `${environment.apiUrl}/bookings/availability`);

    // 2. Rapid changes: change guests to 4, then before response arrives change endTime to 21:00
    component.onPartySizeChange(4);
    const staleReq = httpTesting.expectOne(
      r =>
        r.url === `${environment.apiUrl}/bookings/availability` &&
        r.params.get('NumberOfGuests') === '4' &&
        r.params.get('EndTime') === '20:00:00'
    );

    component.onEndTimeChange('21:00');
    expect(staleReq.cancelled).toBe(true);

    const latestReq = httpTesting.expectOne(
      r =>
        r.url === `${environment.apiUrl}/bookings/availability` &&
        r.params.get('NumberOfGuests') === '4' &&
        r.params.get('EndTime') === '21:00:00'
    );

    latestReq.flush({
      statusCode: 200,
      message: 'OK',
      data: [
        { id: 10, restaurantId: 1, tableNumber: 4, capacity: 4, status: 'Available' },
        { id: 13, restaurantId: 1, tableNumber: 1, capacity: 2, status: 'Available' }
      ]
    });

    // Only Table #4 satisfies guests=4
    expect(component.availableTables().map(t => t.id)).toEqual([10]);
  });

  it('should keep reservation submission disabled in Phase 2 and never call createBooking or POST /api/bookings', () => {
    const createSpy = vi.spyOn(bookingService, 'createBooking');
    const firstTable = component.availableTables()[0];
    component.selectTable(firstTable);
    fixture.detectChanges();

    expect(component.selectedTableId()).toBe(firstTable.id);
    component.submitBooking();
    fixture.detectChanges();

    expect(createSpy).not.toHaveBeenCalled();
    httpTesting.expectNone(
      r => r.url === `${environment.apiUrl}/bookings` && r.method === 'POST'
    );

    const submitBtn: HTMLButtonElement | null = fixture.nativeElement.querySelector('.reserve-submit-btn');
    expect(submitBtn?.disabled).toBe(true);
  });

  it('should expose 404 not-found and retryable error states for GET /api/restaurants/{id}', () => {
    paramMap$.next(convertToParamMap({ id: '999' }));
    const notFoundReq = httpTesting.expectOne(`${environment.apiUrl}/restaurants/999`);
    notFoundReq.flush({ statusCode: 404, message: 'Not found.' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    expect(component.isNotFound()).toBe(true);
    expect(fixture.nativeElement.querySelector('.not-found-card')).toBeTruthy();

    paramMap$.next(convertToParamMap({ id: '5' }));
    const failReq = httpTesting.expectOne(`${environment.apiUrl}/restaurants/5`);
    failReq.flush('Error', { status: 500, statusText: 'Internal Server Error' });
    fixture.detectChanges();

    expect(component.loadError()).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.restaurants-error-card')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.not-found-card')).toBeNull();

    component.retryLoad();
    const retryDetailReq = httpTesting.expectOne(`${environment.apiUrl}/restaurants/5`);
    retryDetailReq.flush({
      statusCode: 200,
      message: 'OK',
      data: { id: 5, name: 'Recovered Bistro', address: '1 Rue Neuve', city: 'Lyon', isActive: true }
    });
    const retryAvailReq = httpTesting.expectOne(
      r => r.url === `${environment.apiUrl}/bookings/availability`
    );
    retryAvailReq.flush({ statusCode: 200, message: 'OK', data: [] });
    fixture.detectChanges();

    expect(component.restaurant()?.name).toBe('Recovered Bistro');
    expect(component.loadError()).toBeNull();
  });

  it('should omit fake menu pairings, fake weekly schedule, fake highlights and price tier badges when not returned by API', () => {
    paramMap$.next(convertToParamMap({ id: '7' }));
    httpTesting.expectOne(`${environment.apiUrl}/restaurants/7`).flush({
      statusCode: 200,
      message: 'OK',
      data: {
        id: 7,
        name: 'Atelier Blanc',
        address: '10 Rue Saint-Honoré',
        city: 'Paris',
        priceRange: '$$$$',
        isActive: true
      }
    } as ApiResponse<ApiRestaurantDto>);

    httpTesting.expectOne(r => r.url === `${environment.apiUrl}/bookings/availability`).flush({
      statusCode: 200,
      message: 'OK',
      data: []
    });
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent || '';
    expect(text).toContain('Atelier Blanc');
    expect(text).not.toContain('$$$$');
    expect(text).not.toContain('Grand Cru Sommelier Pairing');
    expect(text).not.toContain('Sommelier Pairing Selection');
    expect(fixture.nativeElement.querySelector('#hoursSection')).toBeNull();
    expect(fixture.nativeElement.querySelector('#menuSection')).toBeNull();
  });
});
