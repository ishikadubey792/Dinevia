/**
 * Owner Dashboard Analytics models representing GET /api/owner/dashboard
 */

export interface RestaurantBookingSummary {
  restaurantId: number;
  restaurantName: string;
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  completedBookings: number;
}

export interface PaymentStatusSummary {
  status: string;
  count: number;
  totalAmount: number;
}

export interface OwnerDashboardMetrics {
  totalRestaurants: number;
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  completedBookings: number;
  upcomingBookings: number;

  restaurantSummaries: RestaurantBookingSummary[];
  paymentSummaries: PaymentStatusSummary[];

  totalSuccessfulPaymentAmount: number;
  paymentNote: string;
}

export interface OwnerDashboardFilters {
  fromDate?: string | null;
  toDate?: string | null;
  restaurantId?: number | null;
}
