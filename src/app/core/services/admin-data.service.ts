import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/cuisine.model';
import { ApiRestaurantDto, resolveCoverImageUrl } from '../models/restaurant.model';
import {
  AdminStatCard,
  AdminBookingItem,
  AdminRestaurantItem,
  OwnerRestaurant,
  AdminNotification,
  BookingTrendPoint,
  BookingStatusSummary
} from '../models/admin.model';

@Injectable({
  providedIn: 'root'
})
export class AdminDataService {
  private readonly http = inject(HttpClient);

  // Mobile sidebar visibility state
  readonly isSidebarOpen = signal<boolean>(false);

  // Loading, error, and loaded state for authenticated owner's restaurants
  readonly isLoadingRestaurants = signal<boolean>(false);
  readonly restaurantLoadError = signal<string | null>(null);
  readonly isLoaded = signal<boolean>(false);

  // Active notifications signal
  private readonly notificationsSignal = signal<AdminNotification[]>([
    {
      id: 'notif-1',
      title: 'VIP Reservation Request',
      message: 'Lady Eleanor Vance requested the Chef\'s Salon at Le Gabriel for 6 guests.',
      timestamp: '12 mins ago',
      type: 'vip',
      read: false
    },
    {
      id: 'notif-2',
      title: 'New 5-Star Critical Review',
      message: 'Gastronomy Chronicle verified review published for L\'Arpège by Marcus Sterling.',
      timestamp: '45 mins ago',
      type: 'review',
      read: false
    },
    {
      id: 'notif-3',
      title: 'Capacity Alert: 98% Booked',
      message: 'Osteria Francescana reached near-maximum seating capacity for Friday dinner service.',
      timestamp: '2 hours ago',
      type: 'alert',
      read: false
    },
    {
      id: 'notif-4',
      title: 'Private Cellar Reservation',
      message: 'Confirmed booking #DIN-8924 for 10 guests at Mirazur with Sommelier Pairing.',
      timestamp: '3 hours ago',
      type: 'booking',
      read: true
    }
  ]);

  readonly notifications = this.notificationsSignal.asReadonly();
  readonly unreadNotificationsCount = computed(() =>
    this.notifications().filter(n => !n.read).length
  );

  // Owner Restaurants Portfolio (Populated from GET /api/restaurants/my-restaurants)
  private readonly ownerRestaurantsSignal = signal<OwnerRestaurant[]>([]);
  readonly ownerRestaurants = this.ownerRestaurantsSignal.asReadonly();

  // Owner Dashboard KPI Cards (Authentic live & pending metrics)
  get statCards(): AdminStatCard[] {
    const restaurantCount = this.ownerRestaurants().length;
    return [
      {
        title: 'My Restaurants',
        value: `${restaurantCount}`,
        change: restaurantCount > 0 ? 'All Active' : 'No Establishments',
        isPositive: restaurantCount > 0,
        subtitle: 'Your Listed Sanctuaries',
        badge: 'Live on Dinevia',
        icon: 'restaurant'
      },
      {
        title: 'Total Bookings',
        value: 'N/A',
        change: 'Not Connected',
        isPositive: false,
        subtitle: 'Booking management pending',
        badge: 'Pending API',
        icon: 'booking'
      },
      {
        title: "Today's Guests / Covers",
        value: 'N/A',
        change: 'Not Connected',
        isPositive: false,
        subtitle: 'Cover analytics pending',
        badge: 'Pending API',
        icon: 'guests'
      },
      {
        title: 'Average Rating',
        value: 'N/A',
        change: 'Not Tracked',
        isPositive: false,
        subtitle: 'Review system not in DB',
        badge: 'N/A',
        icon: 'rating'
      }
    ];
  }

  // Today's Pulse Metrics placeholder
  readonly todaysPulse = {
    bookingsToday: 0,
    coversToday: 0,
    seatedNow: 0,
    pendingArrival: 0,
    avgRatingToday: 0,
    peakServiceWindow: 'N/A'
  };

  // Recent Bookings Log (Mock data removed; real booking API integration pending)
  private readonly recentBookingsSignal = signal<AdminBookingItem[]>([]);
  readonly recentBookings = this.recentBookingsSignal.asReadonly();

  // Recent Restaurant Additions
  readonly recentRestaurants: AdminRestaurantItem[] = [];

  // Booking Trends (Placeholder awaiting live booking analytics)
  readonly weeklyBookingTrends: BookingTrendPoint[] = [];
  readonly monthlyBookingTrends: BookingTrendPoint[] = [];

  // Booking Status Breakdown
  readonly statusSummaries: BookingStatusSummary[] = [];

  /**
   * Fetches only authenticated owner's restaurants from ASP.NET Core API:
   * GET /api/restaurants/my-restaurants
   * Authenticated via JWT ownerAuthInterceptor (owner ID is extracted server-side).
   */
  loadOwnerRestaurants(): Observable<OwnerRestaurant[]> {
    this.isLoadingRestaurants.set(true);
    this.restaurantLoadError.set(null);

    return this.http
      .get<ApiResponse<ApiRestaurantDto[]>>(`${environment.apiUrl}/restaurants/my-restaurants`)
      .pipe(
        map(response => {
          const dtoList = Array.isArray(response?.data) ? response.data : [];
          const mappedList = dtoList.map(dto => this.mapApiToOwnerRestaurant(dto));
          this.ownerRestaurantsSignal.set(mappedList);
          this.isLoaded.set(true);
          this.isLoadingRestaurants.set(false);
          return mappedList;
        }),
        catchError(err => {
          this.isLoadingRestaurants.set(false);
          const errorMsg =
            err?.error?.message ||
            err?.statusText ||
            'Failed to load your restaurants. Please try again.';
          this.restaurantLoadError.set(errorMsg);
          return throwError(() => err);
        })
      );
  }

  /**
   * Maps backend ApiRestaurantDto to domain OwnerRestaurant
   */
  mapApiToOwnerRestaurant(dto: ApiRestaurantDto): OwnerRestaurant {
    let cuisines: string[] = [];
    if (Array.isArray(dto.restaurantCuisines) && dto.restaurantCuisines.length > 0) {
      cuisines = dto.restaurantCuisines
        .map(rc => rc?.cuisine?.name || rc?.cuisineName || rc?.name || '')
        .map(n => n.trim())
        .filter(n => n.length > 0);
    } else if (Array.isArray(dto.cuisines) && dto.cuisines.length > 0) {
      cuisines = dto.cuisines.map(c => c.trim()).filter(c => c.length > 0);
    } else if (Array.isArray(dto.cuisineNames) && dto.cuisineNames.length > 0) {
      cuisines = dto.cuisineNames.map(c => c.trim()).filter(c => c.length > 0);
    } else if (typeof dto.cuisine === 'string' && dto.cuisine.trim().length > 0) {
      cuisines = dto.cuisine.split(',').map(c => c.trim()).filter(c => c.length > 0);
    }
    if (cuisines.length === 0) {
      cuisines = ['Fine Dining'];
    }

    const coverImageUrl = resolveCoverImageUrl(dto.coverImagePath);

    return {
      id: String(dto.id),
      name: dto.name,
      address: dto.address || '',
      city: dto.city || '',
      description: dto.description || '',
      phone: dto.phone || '',
      email: dto.email || '',
      cuisines,
      coverImageUrl,
      galleryImages: [coverImageUrl],
      rating: dto.rating,
      reviewCount: dto.reviewCount,
      status: dto.isActive === false ? 'draft' : 'active',
      createdAt: new Date().toISOString().split('T')[0]
    };
  }

  addRestaurant(data: Omit<OwnerRestaurant, 'id' | 'createdAt'>): OwnerRestaurant {
    const newRestaurant: OwnerRestaurant = {
      ...data,
      id: `owner-rest-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0]
    };
    this.ownerRestaurantsSignal.update(list => [newRestaurant, ...list]);
    return newRestaurant;
  }

  updateRestaurant(id: string, updates: Partial<OwnerRestaurant>): void {
    this.ownerRestaurantsSignal.update(list =>
      list.map(r => (r.id === id ? { ...r, ...updates } : r))
    );
  }

  deleteRestaurant(id: string): void {
    this.ownerRestaurantsSignal.update(list => list.filter(r => r.id !== id));
  }

  setOwnerRestaurants(restaurants: OwnerRestaurant[]): void {
    this.ownerRestaurantsSignal.set(restaurants);
    this.isLoaded.set(true);
  }

  toggleSidebar(): void {
    this.isSidebarOpen.update(open => !open);
  }

  closeSidebar(): void {
    this.isSidebarOpen.set(false);
  }

  openSidebar(): void {
    this.isSidebarOpen.set(true);
  }

  markNotificationAsRead(id: string): void {
    this.notificationsSignal.update(items =>
      items.map(item => (item.id === id ? { ...item, read: true } : item))
    );
  }

  markAllNotificationsAsRead(): void {
    this.notificationsSignal.update(items =>
      items.map(item => ({ ...item, read: true }))
    );
  }
}
