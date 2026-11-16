import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { OwnerBookingsComponent } from './owner-bookings.component';
import { OwnerBookingService } from '../../../core/services/owner-booking.service';
import { AdminDataService } from '../../../core/services/admin-data.service';
import { OwnerRestaurantBooking } from '../../../core/models/owner-booking.model';
import { OwnerRestaurant } from '../../../core/models/admin.model';

describe('OwnerBookingsComponent', () => {
  let fixture: ComponentFixture<OwnerBookingsComponent>;
  let component: OwnerBookingsComponent;
  let ownerBookingService: any;
  let adminDataService: any;

  const mockRestaurants: OwnerRestaurant[] = [
    {
      id: '1',
      name: 'Spice Symphony',
      address: '12 Connaught Place',
      city: 'New Delhi',
      description: 'Modern Indian fine dining',
      phone: '+91 11 2345 6789',
      email: 'spice@example.com',
      cuisines: ['North Indian', 'Mughlai'],
      coverImageUrl: 'https://example.com/cover1.jpg',
      status: 'active',
      createdAt: '2026-01-01'
    },
    {
      id: '2',
      name: 'Coastal Rasoi',
      address: '45 Indiranagar',
      city: 'Bengaluru',
      description: 'Coastal Karnataka & Mangalorean culinary experience',
      phone: '+91 80 9876 5432',
      email: 'coastal@example.com',
      cuisines: ['Coastal', 'South Indian'],
      coverImageUrl: 'https://example.com/cover2.jpg',
      status: 'active',
      createdAt: '2026-02-01'
    }
  ];

  const mockBookings: OwnerRestaurantBooking[] = [
    {
      bookingId: 101,
      restaurantId: 1,
      restaurantName: 'Spice Symphony',
      customerName: 'Aarav Mehta',
      customerEmail: 'aarav@example.com',
      customerPhone: '+91 98111 22233',
      bookingDate: '2026-11-20T00:00:00',
      startTime: '19:30:00',
      endTime: '21:30:00',
      numberOfGuests: 4,
      status: 'Pending',
      specialRequest: 'Anniversary celebration; quiet table please.',
      createdAt: '2026-11-15T12:00:00',
      restaurantTableId: 3,
      tableNumber: 7,
      paymentId: 301,
      paymentAmount: 2000,
      paymentStatus: 'Success',
      paymentMethod: 'UPI (Demo)',
      paidAt: '2026-11-15T12:05:00'
    },
    {
      bookingId: 102,
      restaurantId: 2,
      restaurantName: 'Coastal Rasoi',
      customerName: 'Ananya Sharma',
      customerEmail: 'ananya@example.co.in',
      customerPhone: '+91 98222 33344',
      bookingDate: '2026-11-21T00:00:00',
      startTime: '20:00:00',
      endTime: '22:00:00',
      numberOfGuests: 2,
      status: 'Confirmed',
      specialRequest: null,
      createdAt: '2026-11-15T13:00:00',
      restaurantTableId: null,
      tableNumber: null,
      paymentId: null,
      paymentAmount: null,
      paymentStatus: null,
      paymentMethod: null,
      paidAt: null
    },
    {
      bookingId: 103,
      restaurantId: 1,
      restaurantName: 'Spice Symphony',
      customerName: 'Rohan Gupta',
      customerEmail: 'rohan@example.org.in',
      customerPhone: '+91 98333 44455',
      bookingDate: '2026-11-10T00:00:00',
      startTime: '13:00:00',
      endTime: '15:00:00',
      numberOfGuests: 6,
      status: 'Completed',
      specialRequest: 'High chair needed for child',
      createdAt: '2026-11-05T09:00:00',
      restaurantTableId: 4,
      tableNumber: 10,
      paymentId: 290,
      paymentAmount: 4500,
      paymentStatus: 'Success',
      paymentMethod: 'Credit Card (Demo)',
      paidAt: '2026-11-05T09:10:00'
    },
    {
      bookingId: 104,
      restaurantId: 2,
      restaurantName: 'Coastal Rasoi',
      customerName: 'Deepa Varma',
      customerEmail: 'deepa@example.com',
      customerPhone: '+91 98444 55566',
      bookingDate: '2026-11-12T00:00:00',
      startTime: '19:00:00',
      endTime: '21:00:00',
      numberOfGuests: 2,
      status: 'Cancelled',
      specialRequest: null,
      createdAt: '2026-11-08T11:00:00',
      restaurantTableId: null,
      tableNumber: null,
      paymentId: null,
      paymentAmount: null,
      paymentStatus: null,
      paymentMethod: null,
      paidAt: null
    }
  ];

  beforeEach(async () => {
    const bookingSpy = {
      getBookings: vi.fn().mockReturnValue(of(mockBookings)),
      getBookingById: vi.fn().mockImplementation((id: number) => {
        const found = mockBookings.find(b => b.bookingId === id);
        return of(found || mockBookings[0]);
      }),
      confirmBooking: vi.fn().mockReturnValue(of({ id: 101, status: 'Confirmed' })),
      cancelBooking: vi.fn().mockReturnValue(of({ id: 101, status: 'Cancelled' }))
    };

    const adminSpy = {
      loadOwnerRestaurants: vi.fn().mockReturnValue(of(mockRestaurants)),
      ownerRestaurants: vi.fn().mockReturnValue(mockRestaurants)
    };

    await TestBed.configureTestingModule({
      imports: [OwnerBookingsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: OwnerBookingService, useValue: bookingSpy },
        { provide: AdminDataService, useValue: adminSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(OwnerBookingsComponent);
    component = fixture.componentInstance;
    ownerBookingService = TestBed.inject(OwnerBookingService);
    adminDataService = TestBed.inject(AdminDataService);
    fixture.detectChanges();
  });

  it('should create the component and load initial bookings and restaurants', () => {
    expect(component).toBeTruthy();
    expect(ownerBookingService.getBookings).toHaveBeenCalled();
    expect(component.bookings().length).toBe(4);
    expect(component.restaurants().length).toBe(2);
  });

  it('should compute status counts accurately', () => {
    expect(component.totalBookingsCount()).toBe(4);
    expect(component.pendingCount()).toBe(1);
    expect(component.confirmedCount()).toBe(1);
    expect(component.completedCount()).toBe(1);
    expect(component.cancelledCount()).toBe(1);
  });

  it('should filter by restaurantId when selected', () => {
    component.filterRestaurantId = 1;
    component.applyFilters();

    expect(ownerBookingService.getBookings).toHaveBeenCalledWith(
      expect.objectContaining({ restaurantId: 1 })
    );
  });

  it('should filter by status tab when clicked', () => {
    component.setStatusTab('Pending');

    expect(component.filterStatus).toBe('Pending');
    expect(ownerBookingService.getBookings).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'Pending' })
    );
  });

  it('should filter by date ranges when applied', () => {
    component.filterFromDate = '2026-11-01';
    component.filterToDate = '2026-11-30';
    component.applyFilters();

    expect(ownerBookingService.getBookings).toHaveBeenCalledWith(
      expect.objectContaining({
        fromDate: '2026-11-01',
        toDate: '2026-11-30'
      })
    );
  });

  it('should clear all filters and reload bookings when clearFilters is called', () => {
    component.filterRestaurantId = 1;
    component.filterStatus = 'Confirmed';
    component.filterBookingDate = '2026-11-20';
    component.filterFromDate = '2026-11-01';
    component.filterToDate = '2026-11-30';

    component.clearFilters();

    expect(component.filterRestaurantId).toBeNull();
    expect(component.filterStatus).toBe('all');
    expect(component.filterBookingDate).toBe('');
    expect(component.filterFromDate).toBe('');
    expect(component.filterToDate).toBe('');
    expect(ownerBookingService.getBookings).toHaveBeenCalledWith(
      expect.objectContaining({
        restaurantId: null,
        status: null,
        bookingDate: null,
        fromDate: null,
        toDate: null
      })
    );
  });

  it('should determine action eligibility accurately', () => {
    const pendingBooking = mockBookings[0];   // Pending
    const confirmedBooking = mockBookings[1]; // Confirmed
    const completedBooking = mockBookings[2]; // Completed
    const cancelledBooking = mockBookings[3]; // Cancelled

    // Confirm action: only for Pending
    expect(component.isConfirmEligible(pendingBooking)).toBe(true);
    expect(component.isConfirmEligible(confirmedBooking)).toBe(false);
    expect(component.isConfirmEligible(completedBooking)).toBe(false);
    expect(component.isConfirmEligible(cancelledBooking)).toBe(false);

    // Cancel action: only for Pending or Confirmed
    expect(component.isCancelEligible(pendingBooking)).toBe(true);
    expect(component.isCancelEligible(confirmedBooking)).toBe(true);
    expect(component.isCancelEligible(completedBooking)).toBe(false);
    expect(component.isCancelEligible(cancelledBooking)).toBe(false);
  });

  it('should open booking details modal when viewBookingDetails is called', () => {
    component.viewBookingDetails(101);
    fixture.detectChanges();

    expect(ownerBookingService.getBookingById).toHaveBeenCalledWith(101);
    expect(component.selectedBooking()).toBeTruthy();
    expect(component.selectedBooking()?.customerName).toBe('Aarav Mehta');

    const modal = fixture.nativeElement.querySelector('.admin-modal');
    expect(modal).toBeTruthy();
    expect(modal.textContent).toContain('Aarav Mehta');
    expect(modal.textContent).toContain('Spice Symphony');
  });

  it('should display demo payment notice in booking details modal', () => {
    component.viewBookingDetails(101);
    fixture.detectChanges();

    const modal = fixture.nativeElement.querySelector('.admin-modal');
    expect(modal.textContent).toContain('Demo Guarantee Notice');
    expect(modal.textContent).toContain('Payments are simulated in demo mode');
  });

  it('should prompt confirmation dialog before confirming reservation', () => {
    const pendingBooking = mockBookings[0];
    component.promptConfirm(pendingBooking);
    fixture.detectChanges();

    expect(component.actionConfirmation()).toEqual({
      action: 'confirm',
      booking: pendingBooking
    });

    const dialog = fixture.nativeElement.querySelector('.prompt-dialog');
    expect(dialog).toBeTruthy();
    expect(dialog.textContent).toContain('Confirm Reservation');
    expect(dialog.textContent).toContain('Aarav Mehta');
  });

  it('should prompt cancellation dialog before cancelling reservation', () => {
    const confirmedBooking = mockBookings[1];
    component.promptCancel(confirmedBooking);
    fixture.detectChanges();

    expect(component.actionConfirmation()).toEqual({
      action: 'cancel',
      booking: confirmedBooking
    });

    const dialog = fixture.nativeElement.querySelector('.prompt-dialog');
    expect(dialog).toBeTruthy();
    expect(dialog.textContent).toContain('Cancel Reservation');
    expect(dialog.textContent).toContain('Ananya Sharma');
  });

  it('should execute confirmBooking API and update state on confirmation', () => {
    const pendingBooking = mockBookings[0];
    component.promptConfirm(pendingBooking);
    component.executeAction();

    expect(ownerBookingService.confirmBooking).toHaveBeenCalledWith(101);
    expect(component.actionConfirmation()).toBeNull();
    expect(component.successToast()).toContain('confirmed successfully');
  });

  it('should execute cancelBooking API and update state on cancellation', () => {
    const confirmedBooking = mockBookings[1];
    component.promptCancel(confirmedBooking);
    component.executeAction();

    expect(ownerBookingService.cancelBooking).toHaveBeenCalledWith(102);
    expect(component.actionConfirmation()).toBeNull();
    expect(component.successToast()).toContain('cancelled');
  });

  it('should display empty state when no bookings exist', () => {
    component.bookings.set([]);
    fixture.detectChanges();

    const emptyCard = fixture.nativeElement.querySelector('.empty-state-card');
    expect(emptyCard).toBeTruthy();
    expect(emptyCard.textContent).toContain('No Reservations Found');
  });

  it('should display error banner with retry option on API failure', () => {
    ownerBookingService.getBookings.mockReturnValue(throwError(() => new Error('Network Connection Error')));
    component.loadBookings();
    fixture.detectChanges();

    expect(component.errorMessage()).toBeTruthy();
    const errorBanner = fixture.nativeElement.querySelector('.error-banner');
    expect(errorBanner).toBeTruthy();
    expect(errorBanner.textContent).toContain('Unable to Load Reservations');
  });
});
