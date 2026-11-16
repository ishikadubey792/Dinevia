import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AdminDashboardComponent } from './admin-dashboard.component';
import { OwnerDashboardService } from '../../../core/services/owner-dashboard.service';
import { AdminDataService } from '../../../core/services/admin-data.service';
import { AuthService } from '../../../core/services/auth.service';
import { OwnerDashboardMetrics } from '../../../core/models/owner-dashboard.model';
import { OwnerRestaurant } from '../../../core/models/admin.model';

describe('AdminDashboardComponent (Phase 5.7 Owner Dashboard)', () => {
  let fixture: ComponentFixture<AdminDashboardComponent>;
  let component: AdminDashboardComponent;
  let ownerDashboardService: any;
  let adminDataService: any;

  const mockMetrics: OwnerDashboardMetrics = {
    totalRestaurants: 2,
    totalBookings: 25,
    pendingBookings: 5,
    confirmedBookings: 12,
    cancelledBookings: 3,
    completedBookings: 5,
    upcomingBookings: 8,
    restaurantSummaries: [
      {
        restaurantId: 1,
        restaurantName: 'Spice Symphony',
        totalBookings: 15,
        pendingBookings: 3,
        confirmedBookings: 8,
        cancelledBookings: 2,
        completedBookings: 2
      },
      {
        restaurantId: 2,
        restaurantName: 'Coastal Rasoi',
        totalBookings: 10,
        pendingBookings: 2,
        confirmedBookings: 4,
        cancelledBookings: 1,
        completedBookings: 3
      }
    ],
    paymentSummaries: [
      { status: 'Success', count: 18, totalAmount: 45000 },
      { status: 'Pending', count: 4, totalAmount: 8500 },
      { status: 'Failed', count: 3, totalAmount: 6000 }
    ],
    totalSuccessfulPaymentAmount: 45000,
    paymentNote: 'Payments are recorded in demo mode and do not represent actual settled bank funds.'
  };

  const mockRestaurants: OwnerRestaurant[] = [
    {
      id: '1',
      name: 'Spice Symphony',
      address: 'Connaught Place',
      city: 'New Delhi',
      description: 'Fine dining',
      phone: '+91 11 2345 6789',
      email: 'spice@example.com',
      cuisines: ['North Indian'],
      coverImageUrl: 'https://example.com/cover1.jpg',
      status: 'active',
      createdAt: '2026-01-01'
    }
  ];

  beforeEach(async () => {
    const dashboardSpy = {
      getDashboard: vi.fn().mockReturnValue(of(mockMetrics))
    };

    const adminSpy = {
      loadOwnerRestaurants: vi.fn().mockReturnValue(of(mockRestaurants)),
      ownerRestaurants: vi.fn().mockReturnValue(mockRestaurants)
    };

    const authSpy = {
      currentUser: vi.fn().mockReturnValue({ fullName: 'Vikramaditya Singhania' }),
      currentOwner: vi.fn().mockReturnValue({ name: 'Vikramaditya Singhania', role: 'RestaurantOwner' })
    };

    await TestBed.configureTestingModule({
      imports: [AdminDashboardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: OwnerDashboardService, useValue: dashboardSpy },
        { provide: AdminDataService, useValue: adminSpy },
        { provide: AuthService, useValue: authSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminDashboardComponent);
    component = fixture.componentInstance;
    ownerDashboardService = TestBed.inject(OwnerDashboardService);
    adminDataService = TestBed.inject(AdminDataService);
    fixture.detectChanges();
  });

  it('should create and load dashboard metrics on init', () => {
    expect(component).toBeTruthy();
    expect(ownerDashboardService.getDashboard).toHaveBeenCalled();
    expect(component.metrics()).toEqual(mockMetrics);
  });

  it('should render owner greeting using session name', () => {
    const title = fixture.nativeElement.querySelector('.welcome-title');
    expect(title.textContent).toContain('Vikramaditya Singhania');
  });

  it('should render all 7 KPI summary cards with authentic API values', () => {
    const cards = fixture.nativeElement.querySelectorAll('.metric-card');
    expect(cards.length).toBe(7);

    const values = Array.from(cards).map((c: any) => c.querySelector('.card-val')?.textContent.trim());
    expect(values).toContain('2');   // Total Restaurants
    expect(values).toContain('25');  // Total Bookings
    expect(values).toContain('5');   // Pending Bookings
    expect(values).toContain('12');  // Confirmed Bookings
    expect(values).toContain('8');   // Upcoming Bookings
    expect(values).toContain('5');   // Completed Bookings
    expect(values).toContain('3');   // Cancelled Bookings
  });

  it('should render restaurant booking summaries in table', () => {
    const rows = fixture.nativeElement.querySelectorAll('.analytics-table tbody tr');
    expect(rows.length).toBe(2);

    const firstRowText = rows[0].textContent;
    expect(firstRowText).toContain('Spice Symphony');
    expect(firstRowText).toContain('15'); // Total
    expect(firstRowText).toContain('3');  // Pending
    expect(firstRowText).toContain('8');  // Confirmed
  });

  it('should render total successful payment revenue in INR format', () => {
    const revenueEl = fixture.nativeElement.querySelector('.revenue-amount');
    expect(revenueEl).toBeTruthy();
    // In en-IN currency formatting, 45000 is formatted as ₹45,000.00
    expect(revenueEl.textContent).toMatch(/₹\s*45,000/);
  });

  it('should render payment status breakdown with individual amounts', () => {
    const items = fixture.nativeElement.querySelectorAll('.breakdown-item');
    expect(items.length).toBe(3);

    const text = fixture.nativeElement.querySelector('.payment-breakdown-list').textContent;
    expect(text).toContain('Success');
    expect(text).toContain('Pending');
    expect(text).toContain('Failed');
  });

  it('should prominently display demo payment note provided by backend', () => {
    const noteEl = fixture.nativeElement.querySelector('.demo-payment-note');
    expect(noteEl).toBeTruthy();
    expect(noteEl.textContent).toContain('Demonstration Mode Notice');
    expect(noteEl.textContent).toContain('Payments are recorded in demo mode and do not represent actual settled bank funds.');
  });

  it('should filter dashboard metrics when filters are applied', () => {
    component.filterRestaurantId = 1;
    component.filterFromDate = '2026-11-01';
    component.filterToDate = '2026-11-30';
    component.applyFilters();

    expect(ownerDashboardService.getDashboard).toHaveBeenCalledWith(
      expect.objectContaining({
        restaurantId: 1,
        fromDate: '2026-11-01',
        toDate: '2026-11-30'
      })
    );
  });

  it('should reset filters and reload dashboard when resetFilters is clicked', () => {
    component.filterRestaurantId = 1;
    component.filterFromDate = '2026-11-01';
    component.filterToDate = '2026-11-30';

    component.resetFilters();

    expect(component.filterRestaurantId).toBeNull();
    expect(component.filterFromDate).toBe('');
    expect(component.filterToDate).toBe('');
    expect(ownerDashboardService.getDashboard).toHaveBeenCalledWith(
      expect.objectContaining({
        restaurantId: null,
        fromDate: null,
        toDate: null
      })
    );
  });

  it('should render zero data state callout when owner has 0 restaurants and 0 bookings', () => {
    const zeroMetrics: OwnerDashboardMetrics = {
      totalRestaurants: 0,
      totalBookings: 0,
      pendingBookings: 0,
      confirmedBookings: 0,
      cancelledBookings: 0,
      completedBookings: 0,
      upcomingBookings: 0,
      restaurantSummaries: [],
      paymentSummaries: [],
      totalSuccessfulPaymentAmount: 0,
      paymentNote: 'Payments are recorded in demo mode.'
    };

    component.metrics.set(zeroMetrics);
    fixture.detectChanges();

    expect(component.isZeroState()).toBe(true);
    const zeroCallout = fixture.nativeElement.querySelector('.empty-establishments-card');
    expect(zeroCallout).toBeTruthy();
    expect(zeroCallout.textContent).toContain('Welcome to Dinevia Owner Portal');
    expect(zeroCallout.textContent).toContain('Register Restaurant');
  });

  it('should display error banner and handle retry on API failure', () => {
    ownerDashboardService.getDashboard.mockReturnValue(throwError(() => new Error('Server Unavailable')));
    component.loadData();
    fixture.detectChanges();

    expect(component.loadError()).toBeTruthy();
    const errorBanner = fixture.nativeElement.querySelector('.error-banner');
    expect(errorBanner).toBeTruthy();
    expect(errorBanner.textContent).toContain('Unable to Load Dashboard Analytics');

    const retryBtn = fixture.nativeElement.querySelector('.retry-btn');
    expect(retryBtn).toBeTruthy();
    retryBtn.click();
    expect(ownerDashboardService.getDashboard).toHaveBeenCalled();
  });
});
