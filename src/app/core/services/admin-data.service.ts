import { Injectable, signal, computed } from '@angular/core';
import {
  AdminStatCard,
  AdminBookingItem,
  AdminRestaurantItem,
  AdminNotification,
  BookingTrendPoint,
  BookingStatusSummary
} from '../models/admin.model';
import { MOCK_RESTAURANTS } from '../data/mock-restaurants';

@Injectable({
  providedIn: 'root'
})
export class AdminDataService {
  // Mobile sidebar visibility state
  readonly isSidebarOpen = signal<boolean>(false);

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

  // Primary Executive Stats Cards
  readonly statCards: AdminStatCard[] = [
    {
      title: 'Total Dining Sanctuaries',
      value: '18',
      change: '+2 this month',
      isPositive: true,
      subtitle: 'Active Michelin & Curated Tables',
      badge: '94% Table Occupancy',
      icon: 'restaurant'
    },
    {
      title: 'Total Table Bookings',
      value: '1,428',
      change: '+14.8% vs last month',
      isPositive: true,
      subtitle: 'Reservations across all dining rooms',
      badge: '38 Bookings Today',
      icon: 'booking'
    },
    {
      title: 'Epicurean Members',
      value: '3,890',
      change: '+240 new patrons',
      isPositive: true,
      subtitle: 'Registered culinary gourmands',
      badge: '68% Repeat Diners',
      icon: 'customer'
    },
    {
      title: 'Gross Table Revenue',
      value: '$284,500',
      change: '+18.2% month-over-month',
      isPositive: true,
      subtitle: 'Cover deposits and prepaid menus',
      badge: '$198 Avg / Cover',
      icon: 'revenue'
    }
  ];

  // Today's Pulse Metrics
  readonly todaysPulse = {
    bookingsToday: 38,
    coversToday: 142,
    seatedNow: 24,
    pendingArrival: 14,
    avgRatingToday: 4.94,
    peakServiceWindow: '7:45 PM – 9:30 PM'
  };

  // Recent Bookings Log
  private readonly recentBookingsSignal = signal<AdminBookingItem[]>([
    {
      id: 'bk-101',
      bookingRef: 'DIN-9402',
      restaurantId: 'rest-1',
      restaurantName: 'Le Gabriel Paris',
      customerName: 'Claire Montgomery',
      customerEmail: 'claire.m@montgomery-arts.fr',
      customerPhone: '+33 6 42 19 88 01',
      date: '2026-10-30',
      time: '7:30 PM',
      guests: 4,
      seatingArea: 'Imperial Salon (Window)',
      depositAmount: 480,
      status: 'seated',
      specialRequests: 'Celebrating 15th wedding anniversary, preferred Vintage Champagne pairing.',
      createdAt: '2026-10-30T16:15:00Z'
    },
    {
      id: 'bk-102',
      bookingRef: 'DIN-9398',
      restaurantId: 'rest-2',
      restaurantName: 'L\'Arpège Heritage',
      customerName: 'Marcus Vance',
      customerEmail: 'marcus.vance@vancapital.com',
      customerPhone: '+1 (415) 890-2134',
      date: '2026-10-30',
      time: '8:00 PM',
      guests: 2,
      seatingArea: 'Chef\'s Counter Experience',
      depositAmount: 350,
      status: 'confirmed',
      specialRequests: 'Allergic to shellfish. Sommelier tasting requested.',
      createdAt: '2026-10-30T14:40:00Z'
    },
    {
      id: 'bk-103',
      bookingRef: 'DIN-9395',
      restaurantId: 'rest-3',
      restaurantName: 'Osteria Francescana',
      customerName: 'Giulia Bertoli',
      customerEmail: 'giulia.bertoli@milano-design.it',
      customerPhone: '+39 02 8923 1109',
      date: '2026-10-30',
      time: '8:30 PM',
      guests: 6,
      seatingArea: 'Private Wine Vault',
      depositAmount: 900,
      status: 'confirmed',
      specialRequests: 'Corporate dinner with international guests. Tasting menu requested.',
      createdAt: '2026-10-30T11:20:00Z'
    },
    {
      id: 'bk-104',
      bookingRef: 'DIN-9391',
      restaurantId: 'rest-4',
      restaurantName: 'Odette National Gallery',
      customerName: 'Jonathan Tan',
      customerEmail: 'j.tan@apexcapital.sg',
      customerPhone: '+65 9123 4567',
      date: '2026-10-30',
      time: '7:00 PM',
      guests: 2,
      seatingArea: 'Main Dining Room',
      depositAmount: 280,
      status: 'seated',
      specialRequests: 'Window table preferred overlooking the glass atrium.',
      createdAt: '2026-10-30T09:05:00Z'
    },
    {
      id: 'bk-105',
      bookingRef: 'DIN-9388',
      restaurantId: 'rest-5',
      restaurantName: 'Mirazur Côte d\'Azur',
      customerName: 'Helena Lindqvist',
      customerEmail: 'helena.l@nordicluxury.se',
      customerPhone: '+46 8 555 1234',
      date: '2026-10-31',
      time: '1:00 PM',
      guests: 4,
      seatingArea: 'Mediterranean Garden Terrace',
      depositAmount: 620,
      status: 'pending',
      specialRequests: 'One vegan tasting menu, three standard 9-course Lunar menus.',
      createdAt: '2026-10-30T08:12:00Z'
    },
    {
      id: 'bk-106',
      bookingRef: 'DIN-9384',
      restaurantId: 'rest-6',
      restaurantName: 'The Clove Club',
      customerName: 'Oliver Kensington',
      customerEmail: 'oliver.kensington@mayfair.co.uk',
      customerPhone: '+44 20 7946 0912',
      date: '2026-10-31',
      time: '7:30 PM',
      guests: 8,
      seatingArea: 'Library Private Dining',
      depositAmount: 1120,
      status: 'confirmed',
      specialRequests: 'Birthday celebration. Custom dessert message requested.',
      createdAt: '2026-10-29T21:40:00Z'
    },
    {
      id: 'bk-107',
      bookingRef: 'DIN-9380',
      restaurantId: 'rest-1',
      restaurantName: 'Le Gabriel Paris',
      customerName: 'Sophia Zhang',
      customerEmail: 'sophia.zhang@shanghaifashion.cn',
      customerPhone: '+86 21 8899 7711',
      date: '2026-10-31',
      time: '9:00 PM',
      guests: 2,
      seatingArea: 'Alcove Sanctuary',
      depositAmount: 320,
      status: 'pending',
      specialRequests: 'Non-alcoholic botanical pairing.',
      createdAt: '2026-10-29T19:15:00Z'
    },
    {
      id: 'bk-108',
      bookingRef: 'DIN-9377',
      restaurantId: 'rest-7',
      restaurantName: 'Steirereck am Stadtpark',
      customerName: 'Franziska Weber',
      customerEmail: 'franziska.w@vienna-legal.at',
      customerPhone: '+43 1 711 0022',
      date: '2026-10-29',
      time: '7:00 PM',
      guests: 2,
      seatingArea: 'Parkside Pavilion',
      depositAmount: 260,
      status: 'completed',
      specialRequests: 'Exceptional service noted by guest.',
      createdAt: '2026-10-29T10:30:00Z'
    }
  ]);

  readonly recentBookings = this.recentBookingsSignal.asReadonly();

  // Recent Restaurant Additions
  readonly recentRestaurants: AdminRestaurantItem[] = [
    {
      id: 'rest-1',
      name: 'Le Gabriel — La Réserve',
      cuisine: 'Haute Cuisine Française',
      city: 'Paris',
      neighborhood: '8ème Arrondissement',
      rating: 4.95,
      reviewCount: 312,
      priceRange: '$$$$',
      imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80',
      badge: '3 Michelin Stars',
      tablesCount: 16,
      status: 'active',
      addedDate: 'October 15, 2026'
    },
    {
      id: 'rest-2',
      name: 'L\'Arpège Heritage',
      cuisine: 'Biodynamic Culinary Art',
      city: 'Paris',
      neighborhood: '7ème Arrondissement',
      rating: 4.92,
      reviewCount: 284,
      priceRange: '$$$$',
      imageUrl: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=600&auto=format&fit=crop&q=80',
      badge: 'Green Michelin Star',
      tablesCount: 14,
      status: 'active',
      addedDate: 'October 18, 2026'
    },
    {
      id: 'rest-3',
      name: 'Osteria Francescana',
      cuisine: 'Modern Italian Masterpiece',
      city: 'Modena',
      neighborhood: 'Historic Center',
      rating: 4.98,
      reviewCount: 418,
      priceRange: '$$$$',
      imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&auto=format&fit=crop&q=80',
      badge: 'World #1 Icon',
      tablesCount: 12,
      status: 'active',
      addedDate: 'October 22, 2026'
    },
    {
      id: 'rest-4',
      name: 'Odette National Gallery',
      cuisine: 'Modern French with Asian Accents',
      city: 'Singapore',
      neighborhood: 'Civic District',
      rating: 4.94,
      reviewCount: 265,
      priceRange: '$$$$',
      imageUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=600&auto=format&fit=crop&q=80',
      badge: 'Asia\'s Best',
      tablesCount: 18,
      status: 'active',
      addedDate: 'October 25, 2026'
    }
  ];

  // Booking Trends (Weekly Data)
  readonly weeklyBookingTrends: BookingTrendPoint[] = [
    { period: 'Mon', bookings: 42, covers: 118, revenue: 19800, percentageHeight: 45 },
    { period: 'Tue', bookings: 54, covers: 146, revenue: 24200, percentageHeight: 56 },
    { period: 'Wed', bookings: 68, covers: 182, revenue: 31500, percentageHeight: 68 },
    { period: 'Thu', bookings: 88, covers: 240, revenue: 42100, percentageHeight: 82 },
    { period: 'Fri', bookings: 138, covers: 395, revenue: 68400, percentageHeight: 100 },
    { period: 'Sat', bookings: 146, covers: 412, revenue: 72900, percentageHeight: 105 },
    { period: 'Sun', bookings: 92, covers: 258, revenue: 44200, percentageHeight: 74 }
  ];

  // Booking Trends (Monthly Overview)
  readonly monthlyBookingTrends: BookingTrendPoint[] = [
    { period: 'May', bookings: 1020, covers: 2890, revenue: 194000, percentageHeight: 68 },
    { period: 'Jun', bookings: 1140, covers: 3180, revenue: 218000, percentageHeight: 76 },
    { period: 'Jul', bookings: 1280, covers: 3560, revenue: 246000, percentageHeight: 85 },
    { period: 'Aug', bookings: 1190, covers: 3340, revenue: 232000, percentageHeight: 80 },
    { period: 'Sep', bookings: 1350, covers: 3780, revenue: 265000, percentageHeight: 90 },
    { period: 'Oct', bookings: 1428, covers: 3980, revenue: 284500, percentageHeight: 100 }
  ];

  // Booking Status Breakdown
  readonly statusSummaries: BookingStatusSummary[] = [
    {
      status: 'Confirmed',
      count: 972,
      percentage: 68,
      color: '#234637',
      badgeClass: 'status-confirmed'
    },
    {
      status: 'Seated & Dining',
      count: 200,
      percentage: 14,
      color: '#C8795A',
      badgeClass: 'status-seated'
    },
    {
      status: 'Pending Host Review',
      count: 143,
      percentage: 10,
      color: '#D97706',
      badgeClass: 'status-pending'
    },
    {
      status: 'Completed',
      count: 71,
      percentage: 5,
      color: '#565A52',
      badgeClass: 'status-completed'
    },
    {
      status: 'Cancelled',
      count: 42,
      percentage: 3,
      color: '#E02424',
      badgeClass: 'status-cancelled'
    }
  ];

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

