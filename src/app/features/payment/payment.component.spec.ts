import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { PaymentComponent } from './payment.component';
import { PaymentService } from '../../core/services/payment.service';
import { BookingService } from '../../core/services/booking.service';
import { environment } from '../../../environments/environment';
import { PaymentRecord } from '../../core/models/payment.model';
import { BookingDetails } from '../../core/models/booking.model';

describe('PaymentComponent Phase 4C.2 Mandatory Demo Payment UI', () => {
  let fixture: ComponentFixture<PaymentComponent>;
  let component: PaymentComponent;
  let httpTesting: HttpTestingController;
  let paymentService: PaymentService;
  let bookingService: BookingService;
  let router: Router;
  let route: ActivatedRoute;

  const apiUrl = environment.apiUrl;

  const mockPaymentPending: PaymentRecord = {
    id: 42,
    bookingId: 101,
    amount: 200,
    paymentMethod: 'Demo',
    status: 'Pending',
    transactionId: null,
    createdAt: '2026-11-12T10:00:00Z',
    paidAt: null
  };

  const mockBookingDetails: BookingDetails = {
    bookingRef: 'DV-101',
    backendId: 101,
    restaurantId: '1',
    restaurantName: "L'Aura Osteria",
    restaurantImage: 'https://images.unsplash.com/photo-1550966871?w=900',
    restaurantCuisine: 'Italian Contemporary',
    restaurantLocation: 'SoHo, Manhattan',
    date: '2026-12-25',
    time: '18:30 – 20:00',
    guests: 2,
    seatingArea: 'Main Dining Room',
    customer: {
      fullName: 'Ishika Patron',
      email: 'ishika@example.com',
      phone: '9876543210'
    },
    createdAt: '2026-11-12T09:59:00Z',
    status: 'pending',
    isMockReservation: false
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'booking/confirmation', component: PaymentComponent },
          { path: 'booking/payment/:paymentId', component: PaymentComponent },
          { path: 'bookings', component: PaymentComponent }
        ]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ paymentId: '42' })
            }
          }
        }
      ]
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
    paymentService = TestBed.inject(PaymentService);
    bookingService = TestBed.inject(BookingService);
    router = TestBed.inject(Router);
    route = TestBed.inject(ActivatedRoute);

    // Initial RestaurantService bootstrap request
    const initRestReq = httpTesting.expectOne(`${apiUrl}/restaurants`);
    initRestReq.flush({ statusCode: 200, message: 'OK', data: [] });

    fixture = TestBed.createComponent(PaymentComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    httpTesting.verify();
    sessionStorage.clear();
  });

  function setupInitializedPayment(record = mockPaymentPending, booking = mockBookingDetails) {
    bookingService.setActiveBooking(booking);
    paymentService.setActivePayment(record);
    fixture.detectChanges();

    const getReq = httpTesting.expectOne(`${apiUrl}/payments/${record.id}`);
    expect(getReq.request.method).toBe('GET');
    getReq.flush({
      statusCode: 200,
      message: 'Payment details fetched successfully.',
      data: record
    });
    fixture.detectChanges();
  }

  it('should initialize and load payment details from backend API via GET /api/payments/{paymentId}', () => {
    setupInitializedPayment();

    expect(component.isLoading()).toBe(false);
    expect(component.payment()).toEqual(mockPaymentPending);
    expect(component.amount()).toBe(200);
    expect(component.paymentStatus()).toBe('Pending');
    expect(component.bookingRef()).toBe('DV-101');

    const amountEl = fixture.nativeElement.querySelector('.total-amount');
    expect(amountEl.textContent).toContain('₹200');

    const statusEl = fixture.nativeElement.querySelector('.status-pill');
    expect(statusEl.textContent.trim()).toBe('Pending');
  });

  it('should prevent duplicate clicks while an API request is processing', () => {
    setupInitializedPayment();
    const processSpy = vi.spyOn(paymentService, 'processDemoPayment');

    component.isProcessing.set(true);
    fixture.detectChanges();

    const successBtn: HTMLButtonElement = fixture.nativeElement.querySelector('#simulate-success-btn');
    const failureBtn: HTMLButtonElement = fixture.nativeElement.querySelector('#simulate-failure-btn');

    expect(successBtn.disabled).toBe(true);
    expect(failureBtn.disabled).toBe(true);

    component.onSimulateSuccess();
    component.onSimulateFailure();

    expect(processSpy).not.toHaveBeenCalled();
  });

  it('should handle simulated success, update status to Success, and navigate to /booking/confirmation', () => {
    setupInitializedPayment();
    const navSpy = vi.spyOn(router, 'navigate');

    component.onSimulateSuccess();
    expect(component.isProcessing()).toBe(true);

    const successPayReq = httpTesting.expectOne(
      (r) => r.url === `${apiUrl}/payments/42/process-demo` && r.params.get('simulateSuccess') === 'true'
    );
    expect(successPayReq.request.method).toBe('POST');
    expect(successPayReq.request.body).toEqual({});

    const updatedPayment: PaymentRecord = {
      ...mockPaymentPending,
      status: 'Success',
      transactionId: 'DEMO-7788990011',
      paidAt: '2026-11-12T10:05:00Z'
    };

    successPayReq.flush({
      statusCode: 200,
      message: 'Demo payment succeeded.',
      data: updatedPayment
    });

    // Verification of booking confirmation status via GET /api/bookings/101
    const getBookingReq = httpTesting.expectOne(`${apiUrl}/bookings/101`);
    getBookingReq.flush({
      statusCode: 200,
      message: 'Booking fetched successfully.',
      data: {
        id: 101,
        restaurantTableId: 5,
        bookingDate: '2026-12-25T00:00:00',
        startTime: '18:30:00',
        endTime: '20:00:00',
        numberOfGuests: 2,
        status: 'Confirmed'
      }
    });
    fixture.detectChanges();

    expect(component.isProcessing()).toBe(false);
    expect(component.paymentStatus()).toBe('Success');
    expect(navSpy).toHaveBeenCalledWith(['/booking/confirmation']);
    expect(bookingService.activeBooking()?.status).toBe('confirmed');
  });

  it('should handle simulated failure, keep booking Pending, and allow retry with the SAME paymentId', () => {
    setupInitializedPayment();

    component.onSimulateFailure();
    expect(component.isProcessing()).toBe(true);

    const failPayReq = httpTesting.expectOne(
      (r) => r.url === `${apiUrl}/payments/42/process-demo` && r.params.get('simulateSuccess') === 'false'
    );
    expect(failPayReq.request.method).toBe('POST');

    const failedPayment: PaymentRecord = {
      ...mockPaymentPending,
      status: 'Failed',
      transactionId: null,
      paidAt: null
    };

    failPayReq.flush({
      statusCode: 200,
      message: 'Demo payment failed.',
      data: failedPayment
    });
    fixture.detectChanges();

    expect(component.isProcessing()).toBe(false);
    expect(component.paymentStatus()).toBe('Failed');
    expect(component.errorMessage()).toContain('Payment simulation declined');
    expect(component.payment()?.id).toBe(42); // SAME paymentId!

    // Verify retry calls processDemoPayment with SAME paymentId (42)
    component.onSimulateSuccess();
    const retryReq = httpTesting.expectOne(
      (r) => r.url === `${apiUrl}/payments/42/process-demo` && r.params.get('simulateSuccess') === 'true'
    );
    expect(retryReq.request.url).toBe(`${apiUrl}/payments/42/process-demo`);
    retryReq.flush({
      statusCode: 200,
      message: 'Demo payment succeeded.',
      data: { ...mockPaymentPending, status: 'Success', transactionId: 'DEMO-RETRY-SUCCESS' }
    });

    const getBookingReq = httpTesting.expectOne(`${apiUrl}/bookings/101`);
    getBookingReq.flush({ statusCode: 200, data: { id: 101, status: 'Confirmed' } });
    fixture.detectChanges();

    expect(component.paymentStatus()).toBe('Success');
  });

  it('should handle 404 payment not found cleanly', () => {
    fixture.detectChanges();

    const getReq = httpTesting.expectOne(`${apiUrl}/payments/42`);
    getReq.flush({ message: 'Payment not found.' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    expect(component.isLoading()).toBe(false);
    expect(component.payment()).toBeNull();
    expect(component.errorMessage()).toContain('Payment record was not found');
    expect(fixture.nativeElement.querySelector('.payment-error-card')).toBeTruthy();
  });

  it('should handle invalid non-numeric or negative payment IDs', () => {
    vi.spyOn(route.snapshot.paramMap, 'get').mockReturnValue('invalid-id');

    component.ngOnInit();
    fixture.detectChanges();

    expect(component.isLoading()).toBe(false);
    expect(component.errorMessage()).toContain('Invalid payment reference ID');
    httpTesting.expectNone(`${apiUrl}/payments/invalid-id`);
  });

  it('should safely handle page refresh and hydrate booking via GET /api/bookings/{id}', () => {
    // Empty initial active booking to simulate direct refresh
    bookingService.clearActiveBooking();
    fixture.detectChanges();

    const getPayReq = httpTesting.expectOne(`${apiUrl}/payments/42`);
    getPayReq.flush({
      statusCode: 200,
      message: 'Payment fetched.',
      data: mockPaymentPending
    });

    const getBookingReq = httpTesting.expectOne(`${apiUrl}/bookings/101`);
    getBookingReq.flush({
      statusCode: 200,
      message: 'Booking fetched.',
      data: {
        id: 101,
        restaurantTableId: 1,
        bookingDate: '2026-12-25T00:00:00',
        startTime: '18:30:00',
        endTime: '20:00:00',
        numberOfGuests: 2,
        status: 'Pending'
      }
    });
    fixture.detectChanges();

    expect(component.isLoading()).toBe(false);
    expect(component.payment()?.id).toBe(42);
    expect(component.booking()?.backendId).toBe(101);
  });
});
