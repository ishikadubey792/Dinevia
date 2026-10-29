export interface BookingCustomer {
  fullName: string;
  email: string;
  phone: string;
  specialRequests?: string;
  occasion?: string;
  dietaryPreferences?: string[];
}

export interface BookingDetails {
  bookingRef: string;
  restaurantId: string;
  restaurantName: string;
  restaurantImage: string;
  restaurantCuisine: string;
  restaurantLocation: string;
  restaurantAddress?: string;
  restaurantPhone?: string;
  date: string; // YYYY-MM-DD
  time: string; // e.g. "7:30 PM"
  guests: number;
  seatingArea?: string; // e.g. "Chef-Curated Table", "Main Dining Room", etc.
  customer: BookingCustomer;
  createdAt: string;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  cancelReason?: string;
  isMockReservation: boolean;
}

export interface TimeSlotAvailability {
  time: string;
  available: boolean;
  statusText: 'Available' | 'Few Tables Left' | 'Fully Booked';
  period: 'lunch' | 'dinner';
}
