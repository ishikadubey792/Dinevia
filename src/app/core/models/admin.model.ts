export interface AdminStatCard {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  subtitle: string;
  badge: string;
  icon: string;
}

export interface AdminBookingItem {
  id: string;
  bookingRef: string;
  restaurantId: string;
  restaurantName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  date: string;
  time: string;
  guests: number;
  seatingArea: string;
  depositAmount: number;
  status: 'confirmed' | 'seated' | 'pending' | 'completed' | 'cancelled';
  specialRequests?: string;
  createdAt: string;
}

export interface AdminRestaurantItem {
  id: string;
  name: string;
  cuisine: string;
  city: string;
  neighborhood: string;
  rating: number;
  reviewCount: number;
  priceRange: string;
  imageUrl: string;
  badge?: string;
  tablesCount: number;
  status: 'active' | 'maintenance' | 'draft';
  addedDate: string;
}

export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'booking' | 'vip' | 'review' | 'alert';
  read: boolean;
}

export interface BookingTrendPoint {
  period: string; // e.g., 'Mon', 'Tue', 'Jan'
  bookings: number;
  covers: number;
  revenue: number;
  percentageHeight: number;
}

export interface BookingStatusSummary {
  status: string;
  count: number;
  percentage: number;
  color: string;
  badgeClass: string;
}

