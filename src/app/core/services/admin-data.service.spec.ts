import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminDataService } from './admin-data.service';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/cuisine.model';
import { ApiRestaurantDto } from '../models/restaurant.model';

describe('AdminDataService - Real Owner Restaurant API Integration', () => {
  let service: AdminDataService;
  let httpMock: HttpTestingController;

  const mockApiResponse: ApiResponse<ApiRestaurantDto[]> = {
    statusCode: 200,
    message: 'Owner restaurants retrieved successfully.',
    data: [
      {
        id: 42,
        name: 'Le Gabriel Paris',
        address: '42 Avenue Gabriel',
        city: 'Paris',
        description: 'An intimate 3-Michelin-starred dining sanctuary.',
        phone: '+33 1 58 36 60 50',
        email: 'reservations@legabriel.fr',
        coverImagePath: '/uploads/restaurants/legabriel.jpg',
        isActive: true,
        restaurantCuisines: [
          {
            cuisineId: 1,
            cuisine: { id: 1, name: 'French Haute' }
          },
          {
            cuisineId: 2,
            cuisine: { id: 2, name: 'Contemporary' }
          }
        ]
      },
      {
        id: 43,
        name: 'L\'Arpège Heritage',
        address: '84 Rue de Varenne',
        city: 'Paris',
        description: 'Pioneering biodynamic gastronomy.',
        phone: '+33 1 47 05 09 06',
        email: 'contact@arpege-paris.fr',
        coverImagePath: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c',
        isActive: true,
        cuisines: ['French Haute', 'Biodynamic']
      }
    ]
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AdminDataService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(AdminDataService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created and start with empty restaurants and zero count', () => {
    expect(service).toBeTruthy();
    expect(service.ownerRestaurants().length).toBe(0);
    expect(service.isLoadingRestaurants()).toBe(false);
    expect(service.restaurantLoadError()).toBeNull();
    expect(service.isLoaded()).toBe(false);

    const cards = service.statCards;
    expect(cards[0].title).toBe('My Restaurants');
    expect(cards[0].value).toBe('0');
    expect(cards[0].change).toBe('No Establishments');
    expect(cards[1].title).toBe('Total Bookings');
    expect(cards[1].value).toBe('N/A');
    expect(cards[2].title).toBe("Today's Guests / Covers");
    expect(cards[2].value).toBe('N/A');
    expect(cards[3].title).toBe('Average Rating');
    expect(cards[3].value).toBe('N/A');
  });

  it('should call GET /api/restaurants/my-restaurants without sending owner ID', () => {
    service.loadOwnerRestaurants().subscribe(restaurants => {
      expect(restaurants.length).toBe(2);
      expect(service.ownerRestaurants().length).toBe(2);
      expect(service.isLoaded()).toBe(true);
      expect(service.isLoadingRestaurants()).toBe(false);
      expect(service.restaurantLoadError()).toBeNull();

      // Check mapping
      const first = restaurants[0];
      expect(first.id).toBe('42');
      expect(first.name).toBe('Le Gabriel Paris');
      expect(first.city).toBe('Paris');
      expect(first.cuisines).toEqual(['French Haute', 'Contemporary']);
      expect(first.coverImageUrl).toContain('/uploads/restaurants/legabriel.jpg');
      expect(first.status).toBe('active');

      const second = restaurants[1];
      expect(second.id).toBe('43');
      expect(second.cuisines).toEqual(['French Haute', 'Biodynamic']);

      // Check stat card reflection
      const cards = service.statCards;
      expect(cards[0].value).toBe('2');
      expect(cards[0].change).toBe('All Active');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/restaurants/my-restaurants`);
    expect(req.request.method).toBe('GET');
    // Ensure no owner ID parameter is sent in URL
    expect(req.request.params.keys().length).toBe(0);
    expect(req.request.urlWithParams).toBe(`${environment.apiUrl}/restaurants/my-restaurants`);

    req.flush(mockApiResponse);
  });

  it('should handle API errors gracefully and update error signal', () => {
    service.loadOwnerRestaurants().subscribe({
      next: () => expect.unreachable('Should have failed with error'),
      error: err => {
        expect(err.status).toBe(500);
        expect(service.isLoadingRestaurants()).toBe(false);
        expect(service.restaurantLoadError()).toBe('Internal Server Error');
        expect(service.ownerRestaurants().length).toBe(0);
      }
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/restaurants/my-restaurants`);
    req.flush('Database error', { status: 500, statusText: 'Internal Server Error' });
  });

  it('should support adding, updating, and deleting restaurants', () => {
    const created = service.addRestaurant({
      name: 'New Bistro',
      address: '10 Rue de la Paix',
      city: 'Paris',
      description: 'Charming bistro.',
      phone: '+33 1 00 00 00 00',
      email: 'bistro@paris.fr',
      cuisines: ['French'],
      coverImageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4',
      status: 'active'
    });

    expect(service.ownerRestaurants().length).toBe(1);
    expect(created.name).toBe('New Bistro');

    service.updateRestaurant(created.id, { name: 'Renamed Bistro' });
    expect(service.ownerRestaurants()[0].name).toBe('Renamed Bistro');

    service.deleteRestaurant(created.id);
    expect(service.ownerRestaurants().length).toBe(0);
  });

  it('should return empty array for recent bookings and weekly/monthly trends', () => {
    expect(service.recentBookings()).toEqual([]);
    expect(service.weeklyBookingTrends).toEqual([]);
    expect(service.monthlyBookingTrends).toEqual([]);
  });
});

