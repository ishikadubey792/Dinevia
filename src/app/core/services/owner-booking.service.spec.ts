import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { OwnerBookingService } from './owner-booking.service';
import { environment } from '../../../environments/environment';
import { OwnerRestaurantBooking, OwnerBookingFilters } from '../models/owner-booking.model';

describe('OwnerBookingService', () => {
  let service: OwnerBookingService;
  let httpMock: HttpTestingController;
  const apiUrl = environment.apiUrl;

  const mockBookings: OwnerRestaurantBooking[] = [
    {
      bookingId: 101,
      restaurantId: 1,
      restaurantName: 'Saffron & Spice',
      customerName: 'Aditya Sharma',
      customerEmail: 'aditya@example.com',
      customerPhone: '+91 98765 43210',
      bookingDate: '2026-11-20T00:00:00',
      startTime: '19:30:00',
      endTime: '21:30:00',
      numberOfGuests: 4,
      status: 'Pending',
      specialRequest: 'Window seating preferred',
      createdAt: '2026-11-15T10:00:00',
      restaurantTableId: 5,
      tableNumber: 12,
      paymentId: 501,
      paymentAmount: 2500,
      paymentStatus: 'Success',
      paymentMethod: 'UPI (Demo)',
      paidAt: '2026-11-15T10:05:00'
    },
    {
      bookingId: 102,
      restaurantId: 2,
      restaurantName: 'The Royal Haveli',
      customerName: 'Priya Patel',
      customerEmail: 'priya@example.co.in',
      customerPhone: '+91 98765 12345',
      bookingDate: '2026-11-21T00:00:00',
      startTime: '20:00:00',
      endTime: '22:00:00',
      numberOfGuests: 2,
      status: 'Confirmed',
      specialRequest: null,
      createdAt: '2026-11-15T11:00:00',
      restaurantTableId: null,
      tableNumber: null,
      paymentId: null,
      paymentAmount: null,
      paymentStatus: null,
      paymentMethod: null,
      paidAt: null
    }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        OwnerBookingService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(OwnerBookingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getBookings', () => {
    it('should query GET /api/bookings/my-restaurant-bookings without query params when no filters passed', () => {
      service.getBookings().subscribe((data) => {
        expect(data.length).toBe(2);
        expect(data[0].bookingId).toBe(101);
      });

      const req = httpMock.expectOne(`${apiUrl}/bookings/my-restaurant-bookings`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.keys().length).toBe(0);

      req.flush({
        statusCode: 200,
        message: 'Success',
        data: mockBookings
      });
    });

    it('should apply all supported filters as query parameters', () => {
      const filters: OwnerBookingFilters = {
        restaurantId: 1,
        status: 'Pending',
        bookingDate: '2026-11-20',
        fromDate: '2026-11-01',
        toDate: '2026-11-30'
      };

      service.getBookings(filters).subscribe((data) => {
        expect(data.length).toBe(1);
      });

      const req = httpMock.expectOne((r) => r.url === `${apiUrl}/bookings/my-restaurant-bookings`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('restaurantId')).toBe('1');
      expect(req.request.params.get('status')).toBe('Pending');
      expect(req.request.params.get('bookingDate')).toBe('2026-11-20');
      expect(req.request.params.get('fromDate')).toBe('2026-11-01');
      expect(req.request.params.get('toDate')).toBe('2026-11-30');

      req.flush({
        statusCode: 200,
        message: 'Success',
        data: [mockBookings[0]]
      });
    });

    it('should not include "all" status in query params', () => {
      const filters: OwnerBookingFilters = {
        status: 'all'
      };

      service.getBookings(filters).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/bookings/my-restaurant-bookings`);
      expect(req.request.params.has('status')).toBe(false);

      req.flush({
        statusCode: 200,
        message: 'Success',
        data: []
      });
    });
  });

  describe('getBookingById', () => {
    it('should query GET /api/bookings/my-restaurant-bookings/{id}', () => {
      service.getBookingById(101).subscribe((data) => {
        expect(data.bookingId).toBe(101);
        expect(data.customerName).toBe('Aditya Sharma');
      });

      const req = httpMock.expectOne(`${apiUrl}/bookings/my-restaurant-bookings/101`);
      expect(req.request.method).toBe('GET');

      req.flush({
        statusCode: 200,
        message: 'Success',
        data: mockBookings[0]
      });
    });
  });

  describe('confirmBooking', () => {
    it('should send POST to /api/bookings/{id}/confirm with empty body', () => {
      service.confirmBooking(101).subscribe((res) => {
        expect(res.id).toBe(101);
        expect(res.status).toBe('Confirmed');
      });

      const req = httpMock.expectOne(`${apiUrl}/bookings/101/confirm`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});

      req.flush({
        statusCode: 200,
        message: 'Booking confirmed successfully.',
        data: { id: 101, status: 'Confirmed' }
      });
    });
  });

  describe('cancelBooking', () => {
    it('should send POST to /api/bookings/{id}/owner-cancel with empty body', () => {
      service.cancelBooking(101).subscribe((res) => {
        expect(res.id).toBe(101);
        expect(res.status).toBe('Cancelled');
      });

      const req = httpMock.expectOne(`${apiUrl}/bookings/101/owner-cancel`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});

      req.flush({
        statusCode: 200,
        message: 'Booking cancelled successfully.',
        data: { id: 101, status: 'Cancelled' }
      });
    });
  });
});
