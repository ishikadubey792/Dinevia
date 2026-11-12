import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { BookingService } from '../../core/services/booking.service';
import { PaymentService } from '../../core/services/payment.service';
import { AuthService } from '../../core/services/auth.service';
import { ownerAuthInterceptor } from '../../core/interceptors/owner-auth.interceptor';
import { environment } from '../../../environments/environment';
import { BookingComponent } from '../booking/booking.component';
import { PaymentComponent } from './payment.component';
import { BookingConfirmationComponent } from '../booking-confirmation/booking-confirmation.component';
import { BookingsComponent } from '../bookings/bookings.component';
import { PaymentHistoryComponent } from '../payment-history/payment-history.component';
import { CreateBookingRequest } from '../../core/models/booking.model';

describe('Phase 4C End-to-End User Journey Integration Tests', () => {
  let httpTesting: HttpTestingController;
  let bookingService: BookingService;
  let paymentService: PaymentService;
  let authService: AuthService;
  let router: Router;

  const apiUrl = environment.apiUrl;

  function createTestJwt(payload: Record<string, any>): string {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const body = btoa(JSON.stringify(payload))
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    return `${header}.${body}.mock-signature`;
  }

  const customerToken = createTestJwt({
    nameid: '88',
    unique_name: 'Ishika Patron',
    email: 'ishika@example.com',
    role: 'Customer',
    exp: Math.floor(Date.now() / 1000) + 3600
  });

  beforeEach(() => {
    sessionStorage.clear();

    TestBed.configureTestingModule({
      imports: [
        BookingComponent,
        PaymentComponent,
        BookingConfirmationComponent,
        BookingsComponent,
        PaymentHistoryComponent
      ],
      providers: [
        BookingService,
        PaymentService,
        AuthService,
        provideRouter([
          { path: 'booking/payment/:paymentId', component: PaymentComponent },
          { path: 'booking/confirmation', component: BookingConfirmationComponent },
          { path: 'payments', component: PaymentHistoryComponent }
        ]),
        provideHttpClient(withInterceptors([ownerAuthInterceptor])),
        provideHttpClientTesting()
      ]
    });

    httpTesting = TestBed.inject(HttpTestingController);
    bookingService = TestBed.inject(BookingService);
    paymentService = TestBed.inject(PaymentService);
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);

    authService.setCustomerSession({
      id: 88,
      name: 'Ishika Patron',
      email: 'ishika@example.com',
      accessToken: customerToken,
      tokenType: 'Bearer',
      expiresIn: 3600
    });

    const initRestReq = httpTesting.expectOne(`${apiUrl}/restaurants`);
    initRestReq.flush({ statusCode: 200, message: 'OK', data: [] });
  });

  afterEach(() => {
    httpTesting.verify();
    sessionStorage.clear();
  });

  it('Scenarios 1-8: Booking Created as Pending -> Payment Initiated -> Failure -> Same ID Retry -> Success -> Confirmed', () => {
    // 1. Customer creates a booking
    const payload: CreateBookingRequest = {
      restaurantTableId: 5,
      bookingDate: '2026-12-25T00:00:00',
      startTime: '19:00:00',
      endTime: '21:00:00',
      numberOfGuests: 2,
      specialRequest: 'Anniversary celebration'
    };

    let createdBookingResult: any;
    bookingService.createBooking(payload, {
      restaurantId: '1',
      restaurantName: 'Bella Napoli',
      restaurantImage: 'napoli.jpg',
      restaurantCuisine: 'Italian',
      restaurantLocation: 'Rome',
      seatingArea: "Chef's Table",
      customer: {
        fullName: 'Ishika Patron',
        email: 'ishika@example.com',
        phone: '9876543210'
      }
    }).subscribe(b => createdBookingResult = b);

    const createReq = httpTesting.expectOne(`${apiUrl}/bookings`);
    expect(createReq.request.method).toBe('POST');
    expect(createReq.request.headers.get('Authorization')).toBe(`Bearer ${customerToken}`);

    // 2. Booking is created as Pending
    createReq.flush({
      statusCode: 200,
      message: 'Booking created successfully.',
      data: {
        id: 777,
        restaurantTableId: 5,
        bookingDate: '2026-12-25T00:00:00',
        startTime: '19:00:00',
        endTime: '21:00:00',
        numberOfGuests: 2,
        status: 'Pending'
      }
    });

    expect(createdBookingResult.backendId).toBe(777);
    expect(createdBookingResult.status).toBe('pending');

    // 3. Payment is initiated for booking 777
    let initiatedPaymentResult: any;
    paymentService.recoverOrInitiatePayment(777).subscribe(p => initiatedPaymentResult = p);

    // Checks history first
    const histCheckReq = httpTesting.expectOne(`${apiUrl}/payments/history`);
    expect(histCheckReq.request.headers.get('Authorization')).toBe(`Bearer ${customerToken}`);
    histCheckReq.flush({ statusCode: 200, message: 'OK', data: [] });

    // Initiates new payment
    const initReq = httpTesting.expectOne(`${apiUrl}/payments/initiate/777`);
    expect(initReq.request.method).toBe('POST');
    expect(initReq.request.body).toEqual({});
    expect(initReq.request.headers.get('Authorization')).toBe(`Bearer ${customerToken}`);

    initReq.flush({
      statusCode: 200,
      message: 'Payment initiated successfully.',
      data: {
        id: 301,
        bookingId: 777,
        amount: 200,
        paymentMethod: 'Demo Payment Guarantee',
        status: 'Pending',
        transactionId: null,
        createdAt: '2026-11-12T10:00:00Z',
        paidAt: null
      }
    });

    expect(initiatedPaymentResult.id).toBe(301);
    expect(initiatedPaymentResult.status).toBe('Pending');
    expect(paymentService.activePayment()?.id).toBe(301);

    // 4 & 5. Customer simulates payment failure; booking remains Pending
    let failedPaymentResult: any;
    paymentService.processDemoPayment(301, false).subscribe(p => failedPaymentResult = p);

    const failReq = httpTesting.expectOne(r => r.url === `${apiUrl}/payments/301/process-demo`);
    expect(failReq.request.params.get('simulateSuccess')).toBe('false');
    expect(failReq.request.headers.get('Authorization')).toBe(`Bearer ${customerToken}`);

    failReq.flush({
      statusCode: 200,
      message: 'Demo payment simulated as failed.',
      data: {
        id: 301,
        bookingId: 777,
        amount: 200,
        paymentMethod: 'Demo Payment Guarantee',
        status: 'Failed',
        transactionId: null,
        createdAt: '2026-11-12T10:00:00Z',
        paidAt: null
      }
    });

    expect(failedPaymentResult.status).toBe('Failed');
    expect(failedPaymentResult.id).toBe(301);

    // 6, 7 & 8. Customer retries using the SAME paymentId (301) -> succeeds -> booking Confirmed
    let successPaymentResult: any;
    paymentService.processDemoPayment(301, true).subscribe(p => successPaymentResult = p);

    const successReq = httpTesting.expectOne(r => r.url === `${apiUrl}/payments/301/process-demo`);
    expect(successReq.request.params.get('simulateSuccess')).toBe('true');

    successReq.flush({
      statusCode: 200,
      message: 'Demo payment simulated successfully.',
      data: {
        id: 301,
        bookingId: 777,
        amount: 200,
        paymentMethod: 'Demo Payment Guarantee',
        status: 'Success',
        transactionId: 'TXN-777-DEMO',
        createdAt: '2026-11-12T10:00:00Z',
        paidAt: '2026-11-12T10:06:00Z'
      }
    });

    expect(successPaymentResult.id).toBe(301);
    expect(successPaymentResult.status).toBe('Success');
    expect(successPaymentResult.transactionId).toBe('TXN-777-DEMO');
    expect(successPaymentResult.paidAt).toBe('2026-11-12T10:06:00Z');
  });

  it('Scenarios 9-11: Confirmation Page & Payment History Display Actual Backend State and Survive Refresh', () => {
    // 9. Confirmation page loads and verifies booking status from backend
    const fixture = TestBed.createComponent(BookingConfirmationComponent);
    const component = fixture.componentInstance;

    // Simulate query param ?id=777
    (component as any).verifyAndLoadBooking(777, null);
    fixture.detectChanges();

    const bookReq = httpTesting.expectOne(`${apiUrl}/bookings/777`);
    expect(bookReq.request.headers.get('Authorization')).toBe(`Bearer ${customerToken}`);
    bookReq.flush({
      statusCode: 200,
      message: 'OK',
      data: {
        id: 777,
        bookingDate: '2026-12-25T00:00:00',
        startTime: '19:00:00',
        endTime: '21:00:00',
        numberOfGuests: 2,
        status: 'Confirmed'
      }
    });

    const payHistReq = httpTesting.expectOne(`${apiUrl}/payments/history`);
    payHistReq.flush({
      statusCode: 200,
      message: 'OK',
      data: [
        {
          id: 301,
          bookingId: 777,
          amount: 200,
          paymentMethod: 'Demo Payment Guarantee',
          status: 'Success',
          transactionId: 'TXN-777-DEMO',
          createdAt: '2026-11-12T10:00:00Z',
          paidAt: '2026-11-12T10:06:00Z'
        }
      ]
    });
    fixture.detectChanges();

    expect(component.booking()?.status).toBe('confirmed');
    expect(fixture.nativeElement.textContent).toContain('Table Reservation Confirmed');
    expect(fixture.nativeElement.textContent).toContain('✓ Guaranteed Seating');
    expect(fixture.nativeElement.textContent).toContain('₹200');
    expect(fixture.nativeElement.textContent).toContain('TXN-777-DEMO');

    // 10. Payment History page shows the successful payment
    const histFixture = TestBed.createComponent(PaymentHistoryComponent);
    const histComponent = histFixture.componentInstance;
    histFixture.detectChanges();

    const histReq2 = httpTesting.expectOne(`${apiUrl}/payments/history`);
    histReq2.flush({
      statusCode: 200,
      message: 'OK',
      data: [
        {
          id: 301,
          bookingId: 777,
          amount: 200,
          paymentMethod: 'Demo Payment Guarantee',
          status: 'Success',
          transactionId: 'TXN-777-DEMO',
          createdAt: '2026-11-12T10:00:00Z',
          paidAt: '2026-11-12T10:06:00Z'
        }
      ]
    });
    histFixture.detectChanges();

    expect(histComponent.payments().length).toBe(1);
    expect(histComponent.totalPaidAmount()).toBe(200);
    expect(histFixture.nativeElement.textContent).toContain('Payment #301');
    expect(histFixture.nativeElement.textContent).toContain('DV-777');
    expect(histFixture.nativeElement.textContent).toContain('TXN-777-DEMO');

    // 11. Refreshing payment history and confirmation preserves backend state
    sessionStorage.clear();
    histComponent.loadPaymentHistory();
    const refreshHistReq = httpTesting.expectOne(`${apiUrl}/payments/history`);
    refreshHistReq.flush({
      statusCode: 200,
      message: 'OK',
      data: [
        {
          id: 301,
          bookingId: 777,
          amount: 200,
          paymentMethod: 'Demo Payment Guarantee',
          status: 'Success',
          transactionId: 'TXN-777-DEMO',
          createdAt: '2026-11-12T10:00:00Z',
          paidAt: '2026-11-12T10:06:00Z'
        }
      ]
    });
    histFixture.detectChanges();
    expect(histComponent.payments().length).toBe(1);
  });

  it('Scenario 12: Customer Cannot Access Another Customers Payment Record', () => {
    let errorReceived: any;
    paymentService.getPayment(9999).subscribe({
      next: () => expect.unreachable('Should have failed on accessing unauthorized payment'),
      error: (err) => errorReceived = err
    });

    const getReq = httpTesting.expectOne(`${apiUrl}/payments/9999`);
    expect(getReq.request.headers.get('Authorization')).toBe(`Bearer ${customerToken}`);

    // Backend responds 404 or 403 when record does not belong to the authenticated customer
    getReq.flush(
      { message: 'Payment record not found or belongs to another user.' },
      { status: 404, statusText: 'Not Found' }
    );

    expect(errorReceived.status).toBe(404);
  });

  it('Scenario 13: Customer Cancellation Follows Existing Backend Rules Without Automated Refund', () => {
    let cancelCompleted = false;
    bookingService.cancelBookingApi(777).subscribe(() => cancelCompleted = true);

    const cancelReq = httpTesting.expectOne(`${apiUrl}/bookings/777/cancel`);
    expect(cancelReq.request.method).toBe('POST');
    expect(cancelReq.request.headers.get('Authorization')).toBe(`Bearer ${customerToken}`);
    cancelReq.flush({ statusCode: 200, message: 'Booking cancelled successfully.' });

    expect(cancelCompleted).toBe(true);

    // In Payment History, payment record remains in history as recorded by backend (no automated refund)
    let history: any;
    paymentService.getPaymentHistory().subscribe(data => history = data);

    const histReq = httpTesting.expectOne(`${apiUrl}/payments/history`);
    histReq.flush({
      statusCode: 200,
      message: 'OK',
      data: [
        {
          id: 301,
          bookingId: 777,
          amount: 200,
          paymentMethod: 'Demo Payment Guarantee',
          status: 'Success',
          transactionId: 'TXN-777-DEMO',
          createdAt: '2026-11-12T10:00:00Z',
          paidAt: '2026-11-12T10:06:00Z'
        }
      ]
    });

    expect(history.length).toBe(1);
    expect(history[0].status).toBe('Success');
  });

  it('Additional Scenario: Payment Initiation Failure Preserves Booking ID and Enables Safe Retry Without Duplicate Creation', () => {
    const bookingFixture = TestBed.createComponent(BookingComponent);
    const bookingComp = bookingFixture.componentInstance;

    // Simulate created booking with pending status
    bookingComp.createdBookingId.set(888);
    bookingComp.pendingBooking.set({
      bookingRef: 'DV-888',
      backendId: 888,
      restaurantId: '1',
      restaurantName: 'Bella Napoli',
      restaurantImage: 'napoli.jpg',
      restaurantCuisine: 'Italian',
      restaurantLocation: 'Rome',
      date: '2026-12-25',
      time: '19:00:00',
      guests: 2,
      customer: { fullName: 'Ishika Patron', email: 'ishika@example.com', phone: '9876543210' },
      createdAt: '2026-11-12T10:00:00Z',
      status: 'pending',
      isMockReservation: false
    });
    bookingFixture.detectChanges();

    // Calling onSubmit() must NOT call POST /api/bookings again
    bookingComp.onSubmit();
    httpTesting.expectNone(`${apiUrl}/bookings`);

    // It instead checks payment history and attempts payment recovery
    const histReq = httpTesting.expectOne(`${apiUrl}/payments/history`);
    histReq.flush({
      statusCode: 200,
      message: 'OK',
      data: [
        {
          id: 401,
          bookingId: 888,
          amount: 200,
          paymentMethod: 'Demo Payment Guarantee',
          status: 'Pending',
          transactionId: null,
          createdAt: '2026-11-12T10:00:00Z',
          paidAt: null
        }
      ]
    });

    expect(bookingComp.createdBookingId()).toBe(888);
    expect(paymentService.activePayment()?.id).toBe(401);
  });
});
