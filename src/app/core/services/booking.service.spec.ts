import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BookingService } from './booking.service';
import {
  ApiRestaurantTableDto,
  filterAvailableTables,
  formatBookingDateParam,
  formatTimeSpanParam,
  prepareAvailabilityRequest
} from '../models/booking.model';
import { environment } from '../../../environments/environment';

describe('BookingService Real Availability API & Filtering', () => {
  let service: BookingService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BookingService, provideHttpClient(), provideHttpClientTesting()]
    });

    service = TestBed.inject(BookingService);
    httpTesting = TestBed.inject(HttpTestingController);

    // Constructor triggers RestaurantService -> GET /api/restaurants
    const initRestReq = httpTesting.expectOne(`${environment.apiUrl}/restaurants`);
    initRestReq.flush({ statusCode: 200, message: 'OK', data: [] });
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should format BookingDate and TimeSpan parameters cleanly without sending RestaurantId', () => {
    expect(formatBookingDateParam('2026-11-15')).toBe('2026-11-15T00:00:00');
    expect(formatBookingDateParam('2026-11-15T14:20:00')).toBe('2026-11-15T00:00:00');
    expect(formatTimeSpanParam('18:30')).toBe('18:30:00');
    expect(formatTimeSpanParam('6:30 PM')).toBe('18:30:00');
    expect(formatTimeSpanParam('12:00 AM')).toBe('00:00:00');

    const invalidRange = prepareAvailabilityRequest('1', {
      bookingDate: '2026-11-15',
      startTime: '20:00',
      endTime: '18:30',
      numberOfGuests: 2
    });
    expect(invalidRange.valid).toBe(false);

    service
      .getAvailableTablesForRestaurant('1', {
        bookingDate: '2026-11-15',
        startTime: '18:30',
        endTime: '20:00',
        numberOfGuests: 2
      })
      .subscribe();

    const req = httpTesting.expectOne(r => r.url === `${environment.apiUrl}/bookings/availability`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('BookingDate')).toBe('2026-11-15T00:00:00');
    expect(req.request.params.get('StartTime')).toBe('18:30:00');
    expect(req.request.params.get('EndTime')).toBe('20:00:00');
    expect(req.request.params.get('NumberOfGuests')).toBe('2');
    expect(req.request.params.has('RestaurantId')).toBe(false);
    expect(req.request.params.has('restaurantId')).toBe(false);

    req.flush({ statusCode: 200, message: 'Available tables fetched successfully.', data: [] });
  });

  it('should filter tables by restaurantId, status === Available, capacity >= guests, and active restaurant flag', () => {
    const rawTables: ApiRestaurantTableDto[] = [
      { id: 101, restaurantId: 1, tableNumber: 5, capacity: 4, status: 'Available' },
      { id: 102, restaurantId: 1, tableNumber: 2, capacity: 6, status: 'Available' },
      { id: 103, restaurantId: 1, tableNumber: 3, capacity: 4, status: 'Reserved' },
      { id: 104, restaurantId: 1, tableNumber: 4, capacity: 4, status: 'Unavailable' },
      { id: 105, restaurantId: 1, tableNumber: 1, capacity: 2, status: 'Available' },
      { id: 201, restaurantId: 2, tableNumber: 8, capacity: 6, status: 'Available' },
      { id: 301, restaurantId: 12, tableNumber: 9, capacity: 8, status: 'Available' }
    ];

    const filtered = filterAvailableTables(rawTables, '1', 4, true);
    expect(filtered.map(t => t.id)).toEqual([102, 101]);
    expect(filtered.every(t => t.restaurantId === 1)).toBe(true);
    expect(filtered.every(t => t.status === 'Available')).toBe(true);
    expect(filtered.every(t => t.capacity >= 4)).toBe(true);

    // Inactive restaurant yields zero tables even if backend SP returns tables
    expect(filterAvailableTables(rawTables, '1', 2, false)).toEqual([]);
  });

  it('should return filtered available tables through getAvailableTablesForRestaurant and propagate errors', () => {
    let observedTables: ApiRestaurantTableDto[] = [];
    service
      .getAvailableTablesForRestaurant('1', {
        bookingDate: '2026-11-15',
        startTime: '18:30',
        endTime: '20:00',
        numberOfGuests: 4
      })
      .subscribe(tables => {
        observedTables = tables;
      });

    const req = httpTesting.expectOne(r => r.url === `${environment.apiUrl}/bookings/availability`);
    req.flush({
      statusCode: 200,
      message: 'Available tables fetched successfully.',
      data: [
        { id: 11, restaurantId: 1, tableNumber: 4, capacity: 4, status: 'Available' },
        { id: 12, restaurantId: 1, tableNumber: 1, capacity: 2, status: 'Available' },
        { id: 13, restaurantId: 1, tableNumber: 6, capacity: 6, status: 'Maintenance' },
        { id: 14, restaurantId: 99, tableNumber: 2, capacity: 6, status: 'Available' }
      ]
    });

    expect(observedTables.map(t => t.id)).toEqual([11]);

    let failed = false;
    service
      .getAvailableTablesForRestaurant('1', {
        bookingDate: '2026-11-15',
        startTime: '18:30',
        endTime: '20:00',
        numberOfGuests: 2
      })
      .subscribe({
        error: () => {
          failed = true;
        }
      });

    httpTesting
      .expectOne(r => r.url === `${environment.apiUrl}/bookings/availability`)
      .flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

    expect(failed).toBe(true);
  });

  describe('Phase 3 Real API Booking Integration', () => {
    it('should POST /api/bookings and map result to BookingDetails with backendId and activeBookingSignal', () => {
      let result: any = null;
      service
        .createBooking(
          {
            restaurantTableId: 4,
            bookingDate: '2026-12-25T00:00:00',
            startTime: '19:00:00',
            endTime: '21:00:00',
            numberOfGuests: 2,
            specialRequest: 'Anniversary'
          },
          {
            restaurantId: '1',
            restaurantName: 'Bella Napoli',
            restaurantImage: 'napoli.jpg',
            restaurantCuisine: 'Italian',
            restaurantLocation: 'Rome',
            seatingArea: "Chef's Table",
            customer: {
              fullName: 'Ishika',
              email: 'ishika@test.com',
              phone: '9876543210'
            }
          }
        )
        .subscribe(res => {
          result = res;
        });

      const req = httpTesting.expectOne(`${environment.apiUrl}/bookings`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.restaurantTableId).toBe(4);
      expect(req.request.body.numberOfGuests).toBe(2);
      expect(req.request.body.bookingDate).toBe('2026-12-25T00:00:00');

      req.flush({
        statusCode: 200,
        message: 'Created',
        data: {
          id: 501,
          restaurantTableId: 4,
          bookingDate: '2026-12-25T00:00:00',
          startTime: '19:00:00',
          endTime: '21:00:00',
          numberOfGuests: 2,
          status: 'Confirmed'
        }
      });

      expect(result).toBeTruthy();
      expect(result.backendId).toBe(501);
      expect(result.bookingRef).toBe('DV-501');
      expect(result.status).toBe('confirmed');
      expect(result.isMockReservation).toBe(false);
      expect(service.activeBooking()?.bookingRef).toBe('DV-501');
    });

    it('should GET /api/bookings/customer/{customerId} and map records with status normalization', () => {
      let records: any[] = [];
      service.getCustomerBookings(42).subscribe(res => {
        records = res;
      });

      const req = httpTesting.expectOne(`${environment.apiUrl}/bookings/customer/42`);
      expect(req.request.method).toBe('GET');

      req.flush({
        statusCode: 200,
        message: 'OK',
        data: [
          {
            id: 101,
            restaurantTableId: 2,
            bookingDate: '2026-12-20T00:00:00',
            startTime: '18:00:00',
            endTime: '20:00:00',
            numberOfGuests: 4,
            status: 'Confirmed',
            restaurantTable: {
              id: 2,
              restaurantId: 1,
              tableNumber: 5,
              capacity: 4
            }
          },
          {
            id: 102,
            restaurantTableId: 3,
            bookingDate: '2026-11-01T00:00:00',
            startTime: '12:00:00',
            endTime: '14:00:00',
            numberOfGuests: 2,
            status: 'Canceled'
          }
        ]
      });

      expect(records.length).toBe(2);
      expect(records[0].backendId).toBe(101);
      expect(records[0].status).toBe('confirmed');
      expect(records[0].seatingArea).toBe('Table #5');
      expect(records[1].status).toBe('cancelled');
    });

    it('should cancel booking via POST /api/bookings/{id}/cancel with empty body', () => {
      let completed = false;
      service.cancelBookingApi(101).subscribe(() => {
        completed = true;
      });

      const req = httpTesting.expectOne(`${environment.apiUrl}/bookings/101/cancel`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});

      req.flush(null, { status: 200, statusText: 'OK' });
      expect(completed).toBe(true);
    });

    it('should update booking via PUT /api/bookings/{id} without restaurantTableId', () => {
      let completed = false;
      service
        .updateBookingApi(101, {
          bookingDate: '2026-12-26T00:00:00',
          startTime: '19:30:00',
          endTime: '21:30:00',
          numberOfGuests: 3,
          specialRequest: 'Updated special request'
        })
        .subscribe(() => {
          completed = true;
        });

      const req = httpTesting.expectOne(`${environment.apiUrl}/bookings/101`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body.bookingDate).toBe('2026-12-26T00:00:00');
      expect(req.request.body.restaurantTableId).toBeUndefined();

      req.flush(null, { status: 200, statusText: 'OK' });
      expect(completed).toBe(true);
    });

    it('should fetch single booking via GET /api/bookings/{id} and set active booking', () => {
      let result: any;
      service.getBookingByIdApi(105).subscribe(res => {
        result = res;
      });

      const req = httpTesting.expectOne(`${environment.apiUrl}/bookings/105`);
      expect(req.request.method).toBe('GET');

      req.flush({
        statusCode: 200,
        message: 'Booking fetched successfully.',
        data: {
          id: 105,
          restaurantTableId: 2,
          bookingDate: '2026-12-25T00:00:00',
          startTime: '18:30:00',
          endTime: '20:00:00',
          numberOfGuests: 2,
          status: 'Confirmed'
        }
      });

      expect(result.backendId).toBe(105);
      expect(result.status).toBe('confirmed');
      expect(service.activeBooking()?.backendId).toBe(105);

      service.updateBookingStatus(105, 'completed');
      expect(service.activeBooking()?.status).toBe('completed');
    });
  });
});

