/**
 * Owner Restaurant Booking models representing GET /api/bookings/my-restaurant-bookings
 * and single booking details GET /api/bookings/my-restaurant-bookings/{id}.
 */

export type OwnerBookingStatus = 'Pending' | 'Confirmed' | 'Cancelled' | 'Completed';

export interface OwnerRestaurantBooking {
  bookingId: number;
  restaurantId: number;
  restaurantName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  bookingDate: string; // ISO date format, e.g. "2026-11-20T00:00:00"
  startTime: string;   // e.g. "19:00:00"
  endTime: string;     // e.g. "21:00:00"
  numberOfGuests: number;
  status: OwnerBookingStatus | string;
  specialRequest?: string | null;
  createdAt: string;

  // Associated Table details
  restaurantTableId?: number | null;
  tableNumber?: number | null;

  // Associated Payment details (demo mode)
  paymentId?: number | null;
  paymentAmount?: number | null;
  paymentStatus?: string | null;
  paymentMethod?: string | null;
  paidAt?: string | null;
}

export interface OwnerBookingFilters {
  restaurantId?: number | null;
  status?: string | null;
  bookingDate?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
}

export interface OwnerBookingActionResponse {
  id: number;
  status: string;
}
