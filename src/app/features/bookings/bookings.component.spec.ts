import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { BookingsComponent } from './bookings.component';
import { BookingService } from '../../core/services/booking.service';
import { PaymentService } from '../../core/services/payment.service';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';
import { BookingDetails } from '../../core/models/booking.model';
import { PaymentRecord } from '../../core/models/payment.model';

describe('BookingsComponent Customer History & Cancellation', () => {
  let fixture: ComponentFixture<BookingsComponent>;
  let component: BookingsComponent;
  let httpTesting: HttpTestingController;
  let bookingService: BookingService;
  let authService: AuthService;

  const mockBookings: BookingDetails[] = [
    {
      bookingRef: 'DV-101',
      backendId: 101,
      restaurantId: '1',
      restaurantName: 'Bella Napoli',
      restaurantImage: 'napoli.jpg',
      restaurantCuisine: 'Italian',
      restaurantLocation: 'Rome',
      date: '2026-12-25',
      time: '07:00 PM – 09:00 PM',
      guests: 2,
      seatingArea: 'Table #4',
      customer: {
        fullName: 'Ishika Guest',
        email: 'ishika@test.com',
        phone: '9876543210'
      },
      createdAt: '2026-11-10T10:00:00Z',
      status: 'confirmed',
      isMockReservation: false
    },
    {
      bookingRef: 'DV-102',
      backendId: 102,
      restaurantId: '2',
      restaurantName: 'Kyoto Kura',
      restaurantImage: 'kyoto.jpg',
      restaurantCuisine: 'Japanese',
      restaurantLocation: 'Tokyo',
      date: '2026-10-15',
      time: '06:00 PM – 08:00 PM',
      guests: 4,
      seatingArea: 'Counter',
      customer: {
        fullName: 'Ishika Guest',
        email: 'ishika@test.com',
        phone: '9876543210'
      },
      createdAt: '2026-10-01T10:00:00Z',
      status: 'completed',
      isMockReservation: false
    },
    {
      bookingRef: 'DV-103',
      backendId: 103,
      restaurantId: '1',
      restaurantName: 'Bella Napoli',
      restaurantImage: 'napoli.jpg',
      restaurantCuisine: 'Italian',
      restaurantLocation: 'Rome',
      date: '2026-11-01',
      time: '08:00 PM – 10:00 PM',
      guests: 2,
      customer: {
        fullName: 'Ishika Guest',
        email: 'ishika@test.com',
        phone: '9876543210'
      },
      createdAt: '2026-10-25T10:00:00Z',
      status: 'cancelled',
      isMockReservation: false
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingsComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BookingsComponent);
    component = fixture.componentInstance;
    httpTesting = TestBed.inject(HttpTestingController);
    bookingService = TestBed.inject(BookingService);
    authService = TestBed.inject(AuthService);

    // Initial restaurants call by RestaurantService
    const restReq = httpTesting.expectOne(`${environment.apiUrl}/restaurants`);
    restReq.flush({ statusCode: 200, message: 'OK', data: [] });
  });

  afterEach(() => {
    httpTesting.verify();
    authService.clearCustomerSession();
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }
  });

  function loginCustomer(id = 88): void {
    authService.setCustomerSession({
      id,
      name: 'Ishika Guest',
      email: 'ishika@test.com',
      accessToken:
        'header.' +
        btoa(JSON.stringify({ role: 'Customer', exp: Math.floor(Date.now() / 1000) + 3600 })) +
        '.sig'
    });
  }

  it('should not query backend if customer is not authenticated', () => {
    authService.clearCustomerSession();
    fixture.detectChanges();

    expect(component.allBookings()).toEqual([]);
    expect(component.isLoading()).toBe(false);
    httpTesting.expectNone(r => r.url.includes('/bookings/customer/'));
  });

  it('should fetch real customer bookings using numeric ID and compute tabs', () => {
    loginCustomer(88);
    const getSpy = vi.spyOn(bookingService, 'getCustomerBookings').mockReturnValue(of(mockBookings));

    fixture.detectChanges();

    expect(getSpy).toHaveBeenCalledWith(88);
    expect(component.allBookings().length).toBe(3);
    expect(component.tabCounts()).toEqual({
      all: 3,
      upcoming: 1,
      completed: 1,
      cancelled: 1
    });

    component.setTab('upcoming');
    expect(component.filteredBookings().map(b => b.bookingRef)).toEqual(['DV-101']);

    component.setTab('completed');
    expect(component.filteredBookings().map(b => b.bookingRef)).toEqual(['DV-102']);

    component.setTab('cancelled');
    expect(component.filteredBookings().map(b => b.bookingRef)).toEqual(['DV-103']);
  });

  it('should handle API errors and allow retrying', () => {
    loginCustomer(88);
    const getSpy = vi
      .spyOn(bookingService, 'getCustomerBookings')
      .mockReturnValue(throwError(() => ({ status: 500, statusText: 'Internal Server Error' })));

    fixture.detectChanges();

    expect(component.isLoading()).toBe(false);
    expect(component.errorMessage()).toBeTruthy();

    // Retry
    getSpy.mockReturnValue(of([mockBookings[0]]));
    component.loadBookings();

    expect(component.errorMessage()).toBeNull();
    expect(component.allBookings().length).toBe(1);
  });

  it('should open and close booking details modal', () => {
    component.openDetails(mockBookings[0]);
    expect(component.selectedBooking()).toEqual(mockBookings[0]);

    component.closeDetails();
    expect(component.selectedBooking()).toBeNull();
  });

  it('should cancel booking via real API cancelBookingApi and refresh list', () => {
    loginCustomer(88);
    vi.spyOn(bookingService, 'getCustomerBookings').mockReturnValue(of(mockBookings));
    const cancelSpy = vi.spyOn(bookingService, 'cancelBookingApi').mockReturnValue(of(void 0));

    fixture.detectChanges();

    const target = mockBookings[0];
    component.openCancelModal(target);
    expect(component.bookingToCancel()).toEqual(target);

    component.confirmCancellation();

    expect(cancelSpy).toHaveBeenCalledWith(101);
    expect(component.bookingToCancel()).toBeNull();
    expect(component.isCancelling()).toBe(false);
  });

  it('should handle cancellation error gracefully without crashing', () => {
    loginCustomer(88);
    vi.spyOn(bookingService, 'getCustomerBookings').mockReturnValue(of(mockBookings));
    vi.spyOn(bookingService, 'cancelBookingApi').mockReturnValue(
      throwError(() => ({ status: 409, message: 'Conflict' }))
    );

    fixture.detectChanges();

    component.openCancelModal(mockBookings[0]);
    component.confirmCancellation();

    expect(component.isCancelling()).toBe(false);
    expect(component.toastMessage()).toBeTruthy();
  });

  describe('Edit / Reschedule Reservation Flow', () => {
    it('should show edit action only for eligible upcoming confirmed/pending bookings', () => {
      // mockBookings[0] is confirmed on 2026-12-25 (future) -> eligible
      expect(component.canEdit(mockBookings[0])).toBe(true);

      // mockBookings[1] is completed -> not eligible
      expect(component.canEdit(mockBookings[1])).toBe(false);

      // mockBookings[2] is cancelled -> not eligible
      expect(component.canEdit(mockBookings[2])).toBe(false);

      // Past confirmed booking -> not eligible
      const pastBooking: BookingDetails = {
        ...mockBookings[0],
        date: '2020-01-01'
      };
      expect(component.canEdit(pastBooking)).toBe(false);
    });

    it('should populate edit form with existing booking data when opened', () => {
      const b = mockBookings[0];
      component.openEditModal(b);

      expect(component.bookingToEdit()).toEqual(b);
      expect(component.editDate()).toBe('2026-12-25');
      expect(component.editStartTime()).toBe('19:00');
      expect(component.editEndTime()).toBe('21:00');
      expect(component.editGuests()).toBe(2);
      expect(component.editError()).toBeNull();
    });

    it('should validate date not in past, startTime < endTime, and guest range 1-20', () => {
      component.openEditModal(mockBookings[0]);

      // 1. Past date
      component.editDate.set('2020-01-01');
      component.confirmUpdate();
      expect(component.editError()).toContain('valid dining date');

      // 2. startTime >= endTime
      component.editDate.set('2026-12-25');
      component.editStartTime.set('21:00');
      component.editEndTime.set('19:00');
      component.confirmUpdate();
      expect(component.editError()).toContain('End time must be later than start time');

      // 3. Guest count < 1 or > 20
      component.editStartTime.set('18:00');
      component.editEndTime.set('20:00');
      component.editGuests.set(0);
      component.confirmUpdate();
      expect(component.editError()).toContain('Party size must be between 1 and 20');

      component.editGuests.set(25);
      component.confirmUpdate();
      expect(component.editError()).toContain('Party size must be between 1 and 20');
    });

    it('should pass correct numeric booking ID and exact PUT payload without restaurantTableId', () => {
      loginCustomer(88);
      vi.spyOn(bookingService, 'getCustomerBookings').mockReturnValue(of(mockBookings));
      const updateSpy = vi.spyOn(bookingService, 'updateBookingApi').mockReturnValue(of(void 0));
      const loadSpy = vi.spyOn(component, 'loadBookings');

      fixture.detectChanges();

      const b = mockBookings[0]; // backendId: 101
      component.openEditModal(b);
      component.editDate.set('2026-12-28');
      component.editStartTime.set('19:30');
      component.editEndTime.set('21:30');
      component.editGuests.set(4);
      component.editSpecialRequest.set('Anniversary table near window');

      component.confirmUpdate();

      expect(updateSpy).toHaveBeenCalledWith(101, {
        bookingDate: '2026-12-28T00:00:00',
        startTime: '19:30:00',
        endTime: '21:30:00',
        numberOfGuests: 4,
        specialRequest: 'Anniversary table near window'
      });

      // Verify no customerId, restaurantId, or restaurantTableId was passed
      const payloadPassed: any = updateSpy.mock.calls[0][1];
      expect(payloadPassed.restaurantTableId).toBeUndefined();
      expect(payloadPassed.customerId).toBeUndefined();
      expect(payloadPassed.restaurantId).toBeUndefined();

      expect(component.bookingToEdit()).toBeNull();
      expect(loadSpy).toHaveBeenCalled();
      expect(component.toastMessage()).toContain('was successfully updated');
    });

    it('should handle HTTP 409 conflict and HTTP 401 errors gracefully', () => {
      loginCustomer(88);
      const updateSpy = vi
        .spyOn(bookingService, 'updateBookingApi')
        .mockReturnValue(throwError(() => ({ status: 409, message: 'Conflict' })));

      component.openEditModal(mockBookings[0]);
      component.confirmUpdate();

      expect(component.isUpdating()).toBe(false);
      expect(component.editError()).toContain('conflicting state and cannot be modified');
      expect(component.bookingToEdit()).toBeTruthy(); // preserved

      // Test 401 session expired
      updateSpy.mockReturnValue(throwError(() => ({ status: 401, message: 'Unauthorized' })));
      component.confirmUpdate();

      expect(component.isUpdating()).toBe(false);
      expect(component.editError()).toContain('session has expired');
    });

    it('should prevent duplicate submissions while an update is in progress', () => {
      loginCustomer(88);
      const updateSpy = vi.spyOn(bookingService, 'updateBookingApi').mockReturnValue(of(void 0));

      component.openEditModal(mockBookings[0]);
      (component as any).isUpdating.set(true);

      component.confirmUpdate();

      expect(updateSpy).not.toHaveBeenCalled();
    });
  });

  describe('Pending Booking Recovery & Payment', () => {
    const pendingBooking: BookingDetails = {
      bookingRef: 'DV-104',
      backendId: 104,
      restaurantId: '1',
      restaurantName: 'Bella Napoli',
      restaurantImage: 'napoli.jpg',
      restaurantCuisine: 'Italian',
      restaurantLocation: 'Rome',
      date: '2026-12-25',
      time: '07:00 PM – 09:00 PM',
      guests: 2,
      seatingArea: 'Table #4',
      customer: {
        fullName: 'Ishika Guest',
        email: 'ishika@test.com',
        phone: '9876543210'
      },
      createdAt: '2026-11-10T10:00:00Z',
      status: 'pending',
      isMockReservation: false
    };

    it('should display Payment Pending badge and Complete Payment button for pending bookings', () => {
      loginCustomer(88);
      vi.spyOn(bookingService, 'getCustomerBookings').mockReturnValue(of([pendingBooking]));

      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.badge-pending');
      expect(badge).toBeTruthy();
      expect(badge.textContent).toContain('Payment Pending');

      const payBtn = fixture.nativeElement.querySelector('.complete-payment-btn');
      expect(payBtn).toBeTruthy();
      expect(payBtn.textContent).toContain('Complete Payment');
    });

    it('should navigate to payment page when Complete Payment is clicked and payment is pending', () => {
      loginCustomer(88);
      vi.spyOn(bookingService, 'getCustomerBookings').mockReturnValue(of([pendingBooking]));
      fixture.detectChanges();

      const paymentService = TestBed.inject(PaymentService);
      const router = TestBed.inject(Router);
      const navSpy = vi.spyOn(router, 'navigate');

      const mockPayment: PaymentRecord = {
        id: 701,
        bookingId: 104,
        amount: 200,
        paymentMethod: 'Demo',
        status: 'Pending',
        transactionId: null,
        createdAt: '2026-11-12T10:00:00Z',
        paidAt: null
      };
      vi.spyOn(paymentService, 'recoverOrInitiatePayment').mockReturnValue(of(mockPayment));

      component.onCompletePayment(pendingBooking);

      expect(paymentService.recoverOrInitiatePayment).toHaveBeenCalledWith(104);
      expect(component.isProcessingPaymentForId()).toBeNull();
      expect(navSpy).toHaveBeenCalledWith(['/booking/payment', 701]);
    });

    it('should refresh booking list if recoverOrInitiatePayment returns already Success payment', () => {
      loginCustomer(88);
      const getSpy = vi.spyOn(bookingService, 'getCustomerBookings').mockReturnValue(of([pendingBooking]));
      fixture.detectChanges();

      const paymentService = TestBed.inject(PaymentService);
      const router = TestBed.inject(Router);
      const navSpy = vi.spyOn(router, 'navigate');

      const mockPayment: PaymentRecord = {
        id: 701,
        bookingId: 104,
        amount: 200,
        paymentMethod: 'Demo',
        status: 'Success',
        transactionId: 'TXN-701',
        createdAt: '2026-11-12T10:00:00Z',
        paidAt: '2026-11-12T10:05:00Z'
      };
      vi.spyOn(paymentService, 'recoverOrInitiatePayment').mockReturnValue(of(mockPayment));

      component.onCompletePayment(pendingBooking);

      expect(component.toastMessage()).toContain('Payment verified successfully. Booking confirmed.');
      expect(getSpy).toHaveBeenCalledTimes(2); // Initial + reload
      expect(navSpy).not.toHaveBeenCalled();
    });

    it('should prevent duplicate Complete Payment clicks while processing', () => {
      const paymentService = TestBed.inject(PaymentService);
      const recSpy = vi.spyOn(paymentService, 'recoverOrInitiatePayment');

      component.isProcessingPaymentForId.set(104);
      component.onCompletePayment(pendingBooking);

      expect(recSpy).not.toHaveBeenCalled();
    });
  });
});

