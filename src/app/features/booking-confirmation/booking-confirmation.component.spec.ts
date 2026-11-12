import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { BookingConfirmationComponent } from './booking-confirmation.component';
import { BookingService } from '../../core/services/booking.service';
import { PaymentService } from '../../core/services/payment.service';
import { environment } from '../../../environments/environment';
import { BookingDetails } from '../../core/models/booking.model';

describe('BookingConfirmationComponent Real vs Mock Booking Display & Status Verification', () => {
  let fixture: ComponentFixture<BookingConfirmationComponent>;
  let component: BookingConfirmationComponent;
  let httpTesting: HttpTestingController;
  let bookingService: BookingService;
  let paymentService: PaymentService;
  let router: Router;
  let queryParamMap$: BehaviorSubject<any>;

  const realBooking: BookingDetails = {
    bookingRef: 'DV-901',
    backendId: 901,
    restaurantId: '1',
    restaurantName: 'Bella Napoli',
    restaurantImage: 'napoli.jpg',
    restaurantCuisine: 'Italian',
    restaurantLocation: 'Rome',
    date: '2026-12-25',
    time: '07:00 PM – 09:00 PM',
    guests: 2,
    seatingArea: "Chef's Counter",
    customer: {
      fullName: 'Ishika Guest',
      email: 'ishika@test.com',
      phone: '9876543210'
    },
    createdAt: '2026-11-10T10:00:00Z',
    status: 'confirmed',
    isMockReservation: false
  };

  const mockBooking: BookingDetails = {
    ...realBooking,
    bookingRef: 'DV-123456',
    backendId: undefined,
    isMockReservation: true
  };

  beforeEach(async () => {
    queryParamMap$ = new BehaviorSubject(convertToParamMap({}));

    await TestBed.configureTestingModule({
      imports: [BookingConfirmationComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: queryParamMap$.asObservable()
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BookingConfirmationComponent);
    component = fixture.componentInstance;
    httpTesting = TestBed.inject(HttpTestingController);
    bookingService = TestBed.inject(BookingService);
    paymentService = TestBed.inject(PaymentService);
    router = TestBed.inject(Router);

    const initRestReq = httpTesting.expectOne(`${environment.apiUrl}/restaurants`);
    initRestReq.flush({ statusCode: 200, message: 'OK', data: [] });
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should verify with backend and render Confirmed status with payment details for real bookings', () => {
    (bookingService as any).activeBookingSignal.set(realBooking);
    fixture.detectChanges();

    const bookReq = httpTesting.expectOne(`${environment.apiUrl}/bookings/901`);
    bookReq.flush({
      statusCode: 200,
      message: 'OK',
      data: {
        id: 901,
        bookingDate: '2026-12-25T00:00:00',
        startTime: '19:00:00',
        endTime: '21:00:00',
        numberOfGuests: 2,
        status: 'Confirmed'
      }
    });

    const payHistReq = httpTesting.expectOne(`${environment.apiUrl}/payments/history`);
    payHistReq.flush({
      statusCode: 200,
      message: 'OK',
      data: [
        {
          id: 501,
          bookingId: 901,
          amount: 200,
          paymentMethod: 'Demo Payment Guarantee',
          status: 'Success',
          transactionId: 'TXN-901-OK',
          createdAt: '2026-11-10T10:00:00Z',
          paidAt: '2026-11-10T10:05:00Z'
        }
      ]
    });
    fixture.detectChanges();

    expect(component.isVerifying()).toBe(false);
    expect(component.booking()?.backendId).toBe(901);
    expect(component.booking()?.status).toBe('confirmed');
    expect(fixture.nativeElement.querySelector('.demo-mock-notice-banner')).toBeNull();

    const titleEl = fixture.nativeElement.querySelector('.confirm-hero-title');
    expect(titleEl?.textContent).toContain('Table Reservation Confirmed');
    expect(fixture.nativeElement.textContent).toContain('DV-901');
    expect(fixture.nativeElement.textContent).toContain('✓ Guaranteed Seating');

    // Payment details rendered
    const paymentAmountEl = fixture.nativeElement.querySelector('.payment-amount-highlight');
    expect(paymentAmountEl?.textContent).toContain('₹200');
    expect(fixture.nativeElement.textContent).toContain('TXN-901-OK');
  });

  it('should render Payment Guarantee Pending banner and CTA when backend returns Pending status', () => {
    queryParamMap$.next(convertToParamMap({ id: '902' }));
    fixture.detectChanges();

    const bookReq = httpTesting.expectOne(`${environment.apiUrl}/bookings/902`);
    bookReq.flush({
      statusCode: 200,
      message: 'OK',
      data: {
        id: 902,
        bookingDate: '2026-12-25T00:00:00',
        startTime: '19:00:00',
        endTime: '21:00:00',
        numberOfGuests: 2,
        status: 'Pending'
      }
    });

    const payHistReq = httpTesting.expectOne(`${environment.apiUrl}/payments/history`);
    payHistReq.flush({
      statusCode: 200,
      message: 'OK',
      data: [
        {
          id: 502,
          bookingId: 902,
          amount: 200,
          paymentMethod: 'Demo',
          status: 'Pending',
          transactionId: null,
          createdAt: '2026-11-10T10:00:00Z',
          paidAt: null
        }
      ]
    });
    fixture.detectChanges();

    expect(component.booking()?.status).toBe('pending');
    expect(fixture.nativeElement.querySelector('.confirm-hero-title')?.textContent).toContain(
      'Payment Guarantee Pending'
    );
    expect(fixture.nativeElement.textContent).toContain('Payment Guarantee Pending');
    expect(fixture.nativeElement.textContent).not.toContain('✓ Guaranteed Seating');

    // Complete Payment CTA button
    const ctaBtn = fixture.nativeElement.querySelector('.complete-payment-cta-btn');
    expect(ctaBtn).toBeTruthy();
    expect(ctaBtn.textContent).toContain('Complete Payment Guarantee');

    // Trigger onProceedToPayment
    const navSpy = vi.spyOn(router, 'navigate');
    ctaBtn.click();

    // recoverOrInitiatePayment checks history
    const recHistReq = httpTesting.expectOne(`${environment.apiUrl}/payments/history`);
    recHistReq.flush({
      statusCode: 200,
      message: 'OK',
      data: [
        {
          id: 502,
          bookingId: 902,
          amount: 200,
          paymentMethod: 'Demo',
          status: 'Pending',
          transactionId: null,
          createdAt: '2026-11-10T10:00:00Z',
          paidAt: null
        }
      ]
    });

    expect(navSpy).toHaveBeenCalledWith(['/booking/payment', 502]);
  });

  it('should render Table Reservation Cancelled when backend returns Cancelled status', () => {
    queryParamMap$.next(convertToParamMap({ id: '903' }));
    fixture.detectChanges();

    const bookReq = httpTesting.expectOne(`${environment.apiUrl}/bookings/903`);
    bookReq.flush({
      statusCode: 200,
      message: 'OK',
      data: {
        id: 903,
        bookingDate: '2026-12-25T00:00:00',
        startTime: '19:00:00',
        endTime: '21:00:00',
        numberOfGuests: 2,
        status: 'Cancelled'
      }
    });

    const payHistReq = httpTesting.expectOne(`${environment.apiUrl}/payments/history`);
    payHistReq.flush({ statusCode: 200, message: 'OK', data: [] });
    fixture.detectChanges();

    expect(component.booking()?.status).toBe('cancelled');
    expect(fixture.nativeElement.querySelector('.confirm-hero-title')?.textContent).toContain(
      'Table Reservation Cancelled'
    );
    expect(fixture.nativeElement.textContent).toContain('✕ Cancelled');
  });

  it('should render Reservation Completed when backend returns Completed status', () => {
    queryParamMap$.next(convertToParamMap({ id: '904' }));
    fixture.detectChanges();

    const bookReq = httpTesting.expectOne(`${environment.apiUrl}/bookings/904`);
    bookReq.flush({
      statusCode: 200,
      message: 'OK',
      data: {
        id: 904,
        bookingDate: '2026-10-25T00:00:00',
        startTime: '19:00:00',
        endTime: '21:00:00',
        numberOfGuests: 2,
        status: 'Completed'
      }
    });

    const payHistReq = httpTesting.expectOne(`${environment.apiUrl}/payments/history`);
    payHistReq.flush({ statusCode: 200, message: 'OK', data: [] });
    fixture.detectChanges();

    expect(component.booking()?.status).toBe('completed');
    expect(fixture.nativeElement.querySelector('.confirm-hero-title')?.textContent).toContain(
      'Reservation Completed'
    );
    expect(fixture.nativeElement.textContent).toContain('★ Completed');
  });

  it('should show demonstration reservation banner for mock bookings without calling backend', () => {
    (bookingService as any).activeBookingSignal.set(mockBooking);
    fixture.detectChanges();

    expect(component.booking()).toEqual(mockBooking);
    const demoBanner = fixture.nativeElement.querySelector('.demo-mock-notice-banner');
    expect(demoBanner).toBeTruthy();
    expect(demoBanner?.textContent).toContain('Demonstration Reservation:');
    httpTesting.expectNone(r => r.url.includes('/bookings/'));
  });

  it('should display no-booking-card when accessed with no active booking or ID', () => {
    (bookingService as any).activeBookingSignal.set(null);
    fixture.detectChanges();

    expect(component.noBookingFound()).toBe(true);
    const noBookingCard = fixture.nativeElement.querySelector('.no-booking-card');
    expect(noBookingCard).toBeTruthy();
    expect(noBookingCard?.textContent).toContain('No Active Table Reservation Found');
  });

  it('should display no-booking-card when backend verification returns 404', () => {
    queryParamMap$.next(convertToParamMap({ id: '9999' }));
    fixture.detectChanges();

    const bookReq = httpTesting.expectOne(`${environment.apiUrl}/bookings/9999`);
    bookReq.flush({ message: 'Booking not found' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    expect(component.noBookingFound()).toBe(true);
    expect(component.booking()).toBeNull();
    const noBookingCard = fixture.nativeElement.querySelector('.no-booking-card');
    expect(noBookingCard).toBeTruthy();
  });
});

