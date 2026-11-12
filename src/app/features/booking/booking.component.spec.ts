import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, ParamMap, convertToParamMap, provideRouter, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { BookingComponent } from './booking.component';
import { BookingService } from '../../core/services/booking.service';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';
import { ApiRestaurantDto } from '../../core/models/restaurant.model';
import { ApiResponse } from '../../core/models/cuisine.model';
import { ApiRestaurantTableDto } from '../../core/models/booking.model';

describe('BookingComponent Phase 2 Details, Direct Refresh & Real Availability', () => {
  let fixture: ComponentFixture<BookingComponent>;
  let component: BookingComponent;
  let httpTesting: HttpTestingController;
  let bookingService: BookingService;
  let paramMap$: BehaviorSubject<ParamMap>;
  let queryParamMap$: BehaviorSubject<ParamMap>;

  const mockRestaurantsListResponse: ApiResponse<ApiRestaurantDto[]> = {
    statusCode: 200,
    message: 'Restaurants fetched successfully.',
    data: [
      {
        id: 1,
        name: 'Trattoria Bella Napoli',
        address: '44 Via Napoli',
        city: 'Rome',
        priceRange: '$$$',
        rating: 4.8,
        reviewCount: 40,
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
      ownerUserId: 3,
      name: 'Trattoria Bella Napoli',
      address: '44 Via Napoli',
      city: 'Rome',
      phone: '+39 06 555010',
      email: 'ciao@bellanapoli.it',
      description: 'Wood-fired Neapolitan kitchen.',
      coverImagePath: '/uploads/napoli.jpg',
      isActive: true
    }
  };

  const mockAvailabilityResponse: ApiResponse<ApiRestaurantTableDto[]> = {
    statusCode: 200,
    message: 'Available tables fetched successfully.',
    data: [
      { id: 1, restaurantId: 1, tableNumber: 3, capacity: 4, status: 'Available' },
      { id: 2, restaurantId: 1, tableNumber: 4, capacity: 2, status: 'Available' },
      { id: 3, restaurantId: 1, tableNumber: 5, capacity: 6, status: 'Occupied' },
      { id: 4, restaurantId: 9, tableNumber: 7, capacity: 6, status: 'Available' }
    ]
  };

  beforeEach(async () => {
    paramMap$ = new BehaviorSubject<ParamMap>(convertToParamMap({ id: '1' }));
    queryParamMap$ = new BehaviorSubject<ParamMap>(convertToParamMap({}));

    await TestBed.configureTestingModule({
      imports: [BookingComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: paramMap$.asObservable(),
            queryParamMap: queryParamMap$.asObservable()
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BookingComponent);
    component = fixture.componentInstance;
    httpTesting = TestBed.inject(HttpTestingController);
    bookingService = TestBed.inject(BookingService);
  });

  afterEach(() => {
    httpTesting.verify();
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }
  });

  function flushInitialLoad(
    availResponse: ApiResponse<ApiRestaurantTableDto[]> = mockAvailabilityResponse
  ): void {
    // Notice BEFORE GET /api/restaurants/{id} completes, component shows loading (NOT Not Found!)
    fixture.detectChanges();
    expect(component.isLoadingRestaurant()).toBe(true);
    expect(component.isNotFound()).toBe(false);

    // Direct refresh resilience: even if GET /api/restaurants is delayed or empty, /api/restaurants/1 loads detail cleanly
    const listReq = httpTesting.expectOne(`${environment.apiUrl}/restaurants`);
    listReq.flush(mockRestaurantsListResponse);

    const detailReq = httpTesting.expectOne(`${environment.apiUrl}/restaurants/1`);
    detailReq.flush(mockDetailResponse);

    const availReq = httpTesting.expectOne(
      r => r.url === `${environment.apiUrl}/bookings/availability`
    );
    availReq.flush(availResponse);

    fixture.detectChanges();
  }

  it('should await GET /api/restaurants/{id} on direct /book/:id refresh without premature Not Found and omit price tier badge', () => {
    fixture.detectChanges();
    expect(component.isLoadingRestaurant()).toBe(true);
    expect(fixture.nativeElement.querySelector('.restaurants-loading-stage')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.restaurant-not-found-card')).toBeNull();

    // Flush detail BEFORE list arrives (simulating slow/independent Phase 1 load)
    const detailReq = httpTesting.expectOne(`${environment.apiUrl}/restaurants/1`);
    detailReq.flush(mockDetailResponse);

    const availReq = httpTesting.expectOne(
      r => r.url === `${environment.apiUrl}/bookings/availability`
    );
    availReq.flush(mockAvailabilityResponse);

    const listReq = httpTesting.expectOne(`${environment.apiUrl}/restaurants`);
    listReq.flush(mockRestaurantsListResponse);

    fixture.detectChanges();

    const summaryText = fixture.nativeElement.textContent || '';
    expect(component.isLoadingRestaurant()).toBe(false);
    expect(component.isNotFound()).toBe(false);
    expect(summaryText).toContain('Trattoria Bella Napoli');
    expect(summaryText).toContain('Italian');
    expect(summaryText).not.toContain('$$$');
  });

  it('should hydrate query params into single availability request with exact BookingDate, StartTime, EndTime, NumberOfGuests and NO RestaurantId', () => {
    queryParamMap$.next(
      convertToParamMap({
        date: '2026-12-20',
        startTime: '19:00',
        endTime: '21:00',
        guests: '4'
      })
    );

    fixture.detectChanges();
    httpTesting.expectOne(`${environment.apiUrl}/restaurants`).flush(mockRestaurantsListResponse);
    httpTesting.expectOne(`${environment.apiUrl}/restaurants/1`).flush(mockDetailResponse);

    const availReq = httpTesting.expectOne(
      r => r.url === `${environment.apiUrl}/bookings/availability`
    );
    expect(availReq.request.params.get('BookingDate')).toBe('2026-12-20T00:00:00');
    expect(availReq.request.params.get('StartTime')).toBe('19:00:00');
    expect(availReq.request.params.get('EndTime')).toBe('21:00:00');
    expect(availReq.request.params.get('NumberOfGuests')).toBe('4');
    expect(availReq.request.params.has('RestaurantId')).toBe(false);

    availReq.flush(mockAvailabilityResponse);
    fixture.detectChanges();

    // For guests=4: only Table #3 (id=1, cap=4, status=Available) passes client filtering
    expect(component.availableTables().map(t => t.id)).toEqual([1]);
  });

  it('should refresh availability on date, startTime, endTime and guests changes and cancel stale responses', () => {
    flushInitialLoad();

    // Change date
    component.bookingForm.patchValue({ date: '2026-12-22' });
    const req1 = httpTesting.expectOne(
      r =>
        r.url === `${environment.apiUrl}/bookings/availability` &&
        r.params.get('BookingDate') === '2026-12-22T00:00:00'
    );

    // Rapidly change startTime & guests before req1 responds -> cancels stale request
    component.bookingForm.patchValue({ startTime: '19:30' });
    expect(req1.cancelled).toBe(true);

    const req2 = httpTesting.expectOne(
      r =>
        r.url === `${environment.apiUrl}/bookings/availability` &&
        r.params.get('StartTime') === '19:30:00'
    );
    component.bookingForm.patchValue({ guests: 4 });
    expect(req2.cancelled).toBe(true);

    const req3 = httpTesting.expectOne(
      r =>
        r.url === `${environment.apiUrl}/bookings/availability` &&
        r.params.get('StartTime') === '19:30:00' &&
        r.params.get('NumberOfGuests') === '4'
    );
    req3.flush({
      statusCode: 200,
      message: 'OK',
      data: [
        { id: 1, restaurantId: 1, tableNumber: 3, capacity: 4, status: 'Available' },
        { id: 2, restaurantId: 1, tableNumber: 4, capacity: 2, status: 'Available' }
      ]
    });

    expect(component.availableTables().map(t => t.id)).toEqual([1]);
  });

  it('should handle empty availability, validation errors (endTime <= startTime), and API retry cleanly', () => {
    flushInitialLoad({ statusCode: 200, message: 'OK', data: [] });

    expect(component.availableTables()).toEqual([]);
    const pageText = fixture.nativeElement.textContent || '';
    expect(pageText).toContain('No available tables found');
    // Ensure 13 fake slots are NOT shown
    expect(pageText).not.toContain('Few Tables Left');
    expect(pageText).not.toContain('Prime Dinner Service');

    // Invalid time window cancels availability without calling backend
    component.bookingForm.patchValue({ startTime: '20:30', endTime: '19:00' });
    fixture.detectChanges();
    httpTesting.expectNone(r => r.url === `${environment.apiUrl}/bookings/availability`);
    expect(component.availabilityValidationError()).toContain('End time must be later than start time');

    // Valid window with API 500 error -> exposes retryAvailability
    component.bookingForm.patchValue({ startTime: '18:00', endTime: '20:00' });
    const errReq = httpTesting.expectOne(
      r => r.url === `${environment.apiUrl}/bookings/availability`
    );
    errReq.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
    fixture.detectChanges();

    expect(component.availabilityError()).toBeTruthy();
    component.retryAvailability();

    const retryReq = httpTesting.expectOne(
      r => r.url === `${environment.apiUrl}/bookings/availability`
    );
    retryReq.flush(mockAvailabilityResponse);
    fixture.detectChanges();

    expect(component.availabilityError()).toBeNull();
    expect(component.availableTables().length).toBeGreaterThan(0);
  });

  it('should block submission when customer is not authenticated', () => {
    flushInitialLoad();
    const createSpy = vi.spyOn(bookingService, 'createBooking');

    const tbl = component.availableTables()[0];
    component.selectTable(tbl);
    fixture.detectChanges();

    component.bookingForm.patchValue({
      fullName: 'Ishika Guest',
      email: 'ishika@example.com',
      phone: '9876543210',
      agreeTerms: true
    });
    component.onSubmit();
    fixture.detectChanges();

    expect(createSpy).not.toHaveBeenCalled();
    expect(component.submissionError()).toContain('Please log in with your customer account');
  });

  it('should block submission when no table is selected', () => {
    flushInitialLoad();
    const authService = TestBed.inject(AuthService);
    authService.setCustomerSession({
      id: 55,
      name: 'Ishika Guest',
      email: 'ishika@example.com',
      accessToken:
        'header.' +
        btoa(JSON.stringify({ role: 'Customer', exp: Math.floor(Date.now() / 1000) + 3600 })) +
        '.sig'
    });

    component.bookingForm.patchValue({
      fullName: 'Ishika Guest',
      email: 'ishika@example.com',
      phone: '9876543210',
      agreeTerms: true
    });
    component.onSubmit();
    fixture.detectChanges();

    expect(component.submissionError()).toContain('Please select an available table');
  });

  it('should successfully submit real booking via POST /api/bookings and navigate to confirmation', () => {
    flushInitialLoad();
    const authService = TestBed.inject(AuthService);
    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigate');

    authService.setCustomerSession({
      id: 55,
      name: 'Ishika Guest',
      email: 'ishika@example.com',
      accessToken:
        'header.' +
        btoa(JSON.stringify({ role: 'Customer', exp: Math.floor(Date.now() / 1000) + 3600 })) +
        '.sig'
    });

    const tbl = component.availableTables()[0];
    component.selectTable(tbl);
    fixture.detectChanges();

    const curDate = component.bookingForm.get('date')?.value;
    component.bookingForm.patchValue({
      fullName: 'Ishika Guest',
      email: 'ishika@example.com',
      phone: '9876543210',
      specialRequests: 'Quiet corner table',
      agreeTerms: true
    });
    component.onSubmit();
    fixture.detectChanges();

    const bookReq = httpTesting.expectOne(`${environment.apiUrl}/bookings`);
    expect(bookReq.request.method).toBe('POST');
    expect(bookReq.request.body).toEqual({
      restaurantTableId: tbl.id,
      bookingDate: `${curDate}T00:00:00`,
      startTime: '18:30:00',
      endTime: '20:00:00',
      numberOfGuests: 2,
      specialRequest: 'Quiet corner table'
    });

    bookReq.flush({
      statusCode: 200,
      message: 'Booking created successfully.',
      data: {
        id: 1042,
        restaurantTableId: tbl.id,
        bookingDate: `${curDate}T00:00:00`,
        startTime: '18:30:00',
        endTime: '20:00:00',
        numberOfGuests: 2,
        status: 'Pending'
      }
    });

    // Phase 4C.2: Booking creation must be followed immediately by recoverOrInitiatePayment
    const histReq = httpTesting.expectOne(`${environment.apiUrl}/payments/history`);
    histReq.flush({ statusCode: 200, message: 'OK', data: [] });

    const payReq = httpTesting.expectOne(`${environment.apiUrl}/payments/initiate/1042`);
    expect(payReq.request.method).toBe('POST');
    expect(payReq.request.body).toEqual({});

    payReq.flush({
      statusCode: 200,
      message: 'Payment initiated successfully.',
      data: {
        id: 301,
        bookingId: 1042,
        amount: 200,
        paymentMethod: 'Demo',
        status: 'Pending',
        transactionId: null,
        createdAt: '2026-11-12T12:00:00Z',
        paidAt: null
      }
    });
    fixture.detectChanges();

    expect(component.isSubmitting()).toBe(false);
    expect(component.submissionError()).toBeNull();
    expect(navSpy).toHaveBeenCalledWith(['/booking/payment', 301]);
    expect(bookingService.activeBooking()?.bookingRef).toBe('DV-1042');
    expect(bookingService.activeBooking()?.isMockReservation).toBe(false);
  });

  it('should preserve createdBookingId when payment initiation fails and prevent duplicate booking', () => {
    flushInitialLoad();
    const authService = TestBed.inject(AuthService);
    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigate');

    authService.setCustomerSession({
      id: 55,
      name: 'Ishika Guest',
      email: 'ishika@example.com',
      accessToken:
        'header.' +
        btoa(JSON.stringify({ role: 'Customer', exp: Math.floor(Date.now() / 1000) + 3600 })) +
        '.sig'
    });

    const tbl = component.availableTables()[0];
    component.selectTable(tbl);
    fixture.detectChanges();

    component.bookingForm.patchValue({
      fullName: 'Ishika Guest',
      email: 'ishika@example.com',
      phone: '9876543210',
      agreeTerms: true
    });
    component.onSubmit();
    fixture.detectChanges();

    const bookReq = httpTesting.expectOne(`${environment.apiUrl}/bookings`);
    bookReq.flush({
      statusCode: 200,
      message: 'Booking created successfully.',
      data: {
        id: 1045,
        status: 'Pending'
      }
    });

    // recoverOrInitiatePayment checks history first
    const histReq1 = httpTesting.expectOne(`${environment.apiUrl}/payments/history`);
    histReq1.flush({ statusCode: 200, message: 'OK', data: [] });

    // Initiation fails
    const payReq = httpTesting.expectOne(`${environment.apiUrl}/payments/initiate/1045`);
    payReq.flush(
      { message: 'Unable to initiate deposit guarantee' },
      { status: 500, statusText: 'Server Error' }
    );

    // Fallback re-query history
    const histReq2 = httpTesting.expectOne(`${environment.apiUrl}/payments/history`);
    histReq2.flush({ statusCode: 200, message: 'OK', data: [] });

    fixture.detectChanges();

    expect(component.isSubmitting()).toBe(false);
    expect(component.createdBookingId()).toBe(1045);
    expect(component.submissionError()).toContain('Your reservation was saved as Pending');
    expect(navSpy).not.toHaveBeenCalledWith(['/booking/payment', expect.anything()]);

    // UI shows recovery card
    const recoveryCard = fixture.nativeElement.querySelector('.booking-recovery-card');
    expect(recoveryCard).toBeTruthy();
    expect(recoveryCard.textContent).toContain('DV-1045');

    // Duplicate submission guard: calling onSubmit() must NOT call /api/bookings again!
    component.onSubmit();
    httpTesting.expectNone(`${environment.apiUrl}/bookings`);

    // It instead triggers retry of payment
    const retryHistReq = httpTesting.expectOne(`${environment.apiUrl}/payments/history`);
    retryHistReq.flush({
      statusCode: 200,
      message: 'OK',
      data: [
        {
          id: 405,
          bookingId: 1045,
          amount: 200,
          paymentMethod: 'Demo',
          status: 'Pending',
          transactionId: null,
          createdAt: '2026-11-12T12:00:00Z',
          paidAt: null
        }
      ]
    });
    fixture.detectChanges();

    expect(navSpy).toHaveBeenCalledWith(['/booking/payment', 405]);
  });

  it('should handle 409 conflict and 400 error cleanly on booking submission', () => {
    flushInitialLoad();
    const authService = TestBed.inject(AuthService);

    authService.setCustomerSession({
      id: 55,
      name: 'Ishika Guest',
      email: 'ishika@example.com',
      accessToken:
        'header.' +
        btoa(JSON.stringify({ role: 'Customer', exp: Math.floor(Date.now() / 1000) + 3600 })) +
        '.sig'
    });

    const tbl = component.availableTables()[0];
    component.selectTable(tbl);
    fixture.detectChanges();

    component.bookingForm.patchValue({
      fullName: 'Ishika Guest',
      email: 'ishika@example.com',
      phone: '9876543210',
      agreeTerms: true
    });
    component.onSubmit();

    const bookReq = httpTesting.expectOne(`${environment.apiUrl}/bookings`);
    bookReq.flush({ message: 'Table already booked' }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();

    expect(component.isSubmitting()).toBe(false);
    expect(component.submissionError()).toContain('This table is no longer available');
  });

  it('should handle 404 not-found and 500 error with retryRestaurantLoad on /book/:id', () => {
    fixture.detectChanges();
    httpTesting.expectOne(`${environment.apiUrl}/restaurants`).flush(mockRestaurantsListResponse);

    httpTesting
      .expectOne(`${environment.apiUrl}/restaurants/1`)
      .flush({ statusCode: 404, message: 'Not found' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    expect(component.isLoadingRestaurant()).toBe(false);
    expect(component.isNotFound()).toBe(true);
    expect(fixture.nativeElement.querySelector('.restaurant-not-found-card')).toBeTruthy();

    paramMap$.next(convertToParamMap({ id: '2' }));
    httpTesting
      .expectOne(`${environment.apiUrl}/restaurants/2`)
      .flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
    fixture.detectChanges();

    expect(component.isNotFound()).toBe(false);
    expect(component.restaurantLoadError()).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.restaurants-error-card')).toBeTruthy();

    component.retryRestaurantLoad();
    httpTesting.expectOne(`${environment.apiUrl}/restaurants/2`).flush({
      statusCode: 200,
      message: 'OK',
      data: {
        id: 2,
        name: 'Osteria Recuperata',
        address: '10 Via Roma',
        city: 'Milan',
        isActive: true
      }
    });
    httpTesting.expectOne(r => r.url === `${environment.apiUrl}/bookings/availability`).flush({
      statusCode: 200,
      message: 'OK',
      data: []
    });
    fixture.detectChanges();

    expect(component.restaurantLoadError()).toBeNull();
    expect(component.restaurant()?.name).toBe('Osteria Recuperata');
  });

  it('should hydrate both startTime and endTime from query params and query availability with HH:mm:ss', () => {
    queryParamMap$.next(
      convertToParamMap({
        date: '2026-12-25',
        startTime: '19:30',
        endTime: '21:30',
        guests: '4'
      })
    );

    fixture.detectChanges();
    httpTesting.expectOne(`${environment.apiUrl}/restaurants`).flush(mockRestaurantsListResponse);
    httpTesting.expectOne(`${environment.apiUrl}/restaurants/1`).flush(mockDetailResponse);

    const availReq = httpTesting.expectOne(r => r.url === `${environment.apiUrl}/bookings/availability`);
    expect(availReq.request.params.get('StartTime')).toBe('19:30:00');
    expect(availReq.request.params.get('EndTime')).toBe('21:30:00');
    expect(availReq.request.params.get('BookingDate')).toBe('2026-12-25T00:00:00');
    expect(availReq.request.params.get('NumberOfGuests')).toBe('4');

    availReq.flush(mockAvailabilityResponse);
    fixture.detectChanges();

    expect(component.bookingForm.get('startTime')?.value).toBe('19:30');
    expect(component.bookingForm.get('endTime')?.value).toBe('21:30');
    expect(component.bookingForm.get('date')?.value).toBe('2026-12-25');
    expect(component.bookingForm.get('guests')?.value).toBe(4);
    expect(component.availableTables().length).toBe(1); // Capacity >= 4
  });
});
