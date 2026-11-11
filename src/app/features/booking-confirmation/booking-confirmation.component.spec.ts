import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { BookingConfirmationComponent } from './booking-confirmation.component';
import { BookingService } from '../../core/services/booking.service';
import { environment } from '../../../environments/environment';
import { BookingDetails } from '../../core/models/booking.model';

describe('BookingConfirmationComponent Real vs Mock Booking Display', () => {
  let fixture: ComponentFixture<BookingConfirmationComponent>;
  let component: BookingConfirmationComponent;
  let httpTesting: HttpTestingController;
  let bookingService: BookingService;
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

    const initRestReq = httpTesting.expectOne(`${environment.apiUrl}/restaurants`);
    initRestReq.flush({ statusCode: 200, message: 'OK', data: [] });
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should hide demonstration reservation banner for real bookings', () => {
    (bookingService as any).activeBookingSignal.set(realBooking);
    fixture.detectChanges();

    expect(component.booking()).toEqual(realBooking);
    const demoBanner = fixture.nativeElement.querySelector('.demo-mock-notice-banner');
    expect(demoBanner).toBeNull();

    const titleEl = fixture.nativeElement.querySelector('.confirm-hero-title');
    expect(titleEl?.textContent).toContain('Table Reservation Confirmed');
    expect(fixture.nativeElement.textContent).toContain('DV-901');
  });

  it('should show demonstration reservation banner for mock bookings', () => {
    (bookingService as any).activeBookingSignal.set(mockBooking);
    fixture.detectChanges();

    expect(component.booking()).toEqual(mockBooking);
    const demoBanner = fixture.nativeElement.querySelector('.demo-mock-notice-banner');
    expect(demoBanner).toBeTruthy();
    expect(demoBanner?.textContent).toContain('Demonstration Reservation:');
  });

  it('should display no-booking-card when accessed with no active booking', () => {
    (bookingService as any).activeBookingSignal.set(null);
    fixture.detectChanges();

    expect(component.noBookingFound()).toBe(true);
    const noBookingCard = fixture.nativeElement.querySelector('.no-booking-card');
    expect(noBookingCard).toBeTruthy();
    expect(noBookingCard?.textContent).toContain('No Active Table Reservation Found');
  });
});

