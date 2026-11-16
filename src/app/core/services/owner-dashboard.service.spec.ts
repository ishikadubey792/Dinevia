import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { OwnerDashboardService } from './owner-dashboard.service';
import { environment } from '../../../environments/environment';
import { OwnerDashboardMetrics, OwnerDashboardFilters } from '../models/owner-dashboard.model';

describe('OwnerDashboardService', () => {
  let service: OwnerDashboardService;
  let httpMock: HttpTestingController;
  const apiUrl = environment.apiUrl;

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

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        OwnerDashboardService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(OwnerDashboardService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should query GET /api/owner/dashboard without params when no filters passed', () => {
    service.getDashboard().subscribe((data) => {
      expect(data.totalRestaurants).toBe(2);
      expect(data.totalBookings).toBe(25);
      expect(data.totalSuccessfulPaymentAmount).toBe(45000);
      expect(data.restaurantSummaries.length).toBe(2);
      expect(data.paymentSummaries.length).toBe(3);
    });

    const req = httpMock.expectOne(`${apiUrl}/owner/dashboard`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys().length).toBe(0);

    req.flush({
      statusCode: 200,
      message: 'Owner dashboard metrics fetched successfully.',
      data: mockMetrics
    });
  });

  it('should append supported query parameters when filters are provided', () => {
    const filters: OwnerDashboardFilters = {
      restaurantId: 1,
      fromDate: '2026-11-01',
      toDate: '2026-11-30'
    };

    service.getDashboard(filters).subscribe((data) => {
      expect(data.totalRestaurants).toBe(2);
    });

    const req = httpMock.expectOne((r) => r.url === `${apiUrl}/owner/dashboard`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('restaurantId')).toBe('1');
    expect(req.request.params.get('fromDate')).toBe('2026-11-01');
    expect(req.request.params.get('toDate')).toBe('2026-11-30');

    req.flush({
      statusCode: 200,
      message: 'Owner dashboard metrics fetched successfully.',
      data: mockMetrics
    });
  });
});
