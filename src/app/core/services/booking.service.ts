import { Injectable, inject, signal } from '@angular/core';
import { BookingDetails, BookingCustomer, TimeSlotAvailability } from '../models/booking.model';
import { RestaurantService } from './restaurant.service';

@Injectable({
  providedIn: 'root'
})
export class BookingService {
  private readonly restaurantService = inject(RestaurantService);

  private readonly activeBookingSignal = signal<BookingDetails | null>(this.loadInitialActiveBooking());
  private readonly bookingsHistorySignal = signal<BookingDetails[]>(this.loadInitialStoredBookings());

  readonly activeBooking = this.activeBookingSignal.asReadonly();
  readonly bookingHistory = this.bookingsHistorySignal.asReadonly();

  private loadInitialActiveBooking(): BookingDetails | null {
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('dinevia_active_booking');
        if (stored) {
          return JSON.parse(stored);
        }
      } catch (e) {
        console.warn('Could not read active booking from sessionStorage', e);
      }
    }
    return null;
  }

  private loadInitialStoredBookings(): BookingDetails[] {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('dinevia_booking_history');
        if (stored) {
          return JSON.parse(stored);
        }
      } catch (e) {
        console.warn('Could not read bookings history from localStorage', e);
      }
    }

    // Default curated bookings for rich demo experience
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 6);
    const nextWeekStr = nextWeek.toISOString().split('T')[0];

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 14);
    const pastDateStr = pastDate.toISOString().split('T')[0];

    const sampleBookings: BookingDetails[] = [
      {
        bookingRef: 'DV-742918',
        restaurantId: 'rest-1',
        restaurantName: "L'Aura Osteria",
        restaurantImage: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=900&q=80',
        restaurantCuisine: 'Italian',
        restaurantLocation: 'SoHo, Manhattan',
        restaurantAddress: '142 Mercer Street, SoHo, New York, NY 10012',
        restaurantPhone: '+1 (212) 555-0198',
        date: tomorrowStr,
        time: '7:30 PM',
        guests: 2,
        seatingArea: "Chef's Counter",
        customer: {
          fullName: 'Alexander Wright',
          email: 'a.wright@epicuredining.com',
          phone: '+1 (555) 234-5678',
          occasion: 'Romantic Date Night',
          specialRequests: 'Quiet corner or alcove table for anniversary celebration.',
          dietaryPreferences: ['Pescatarian']
        },
        createdAt: new Date().toISOString(),
        status: 'confirmed',
        isMockReservation: true
      },
      {
        bookingRef: 'DV-915420',
        restaurantId: 'rest-2',
        restaurantName: 'Maison Blanche',
        restaurantImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80',
        restaurantCuisine: 'French Contemporary',
        restaurantLocation: 'Upper East Side, Manhattan',
        restaurantAddress: '782 Madison Avenue, New York, NY 10065',
        restaurantPhone: '+1 (212) 555-0142',
        date: nextWeekStr,
        time: '8:00 PM',
        guests: 4,
        seatingArea: 'Window Alcove',
        customer: {
          fullName: 'Alexander Wright',
          email: 'a.wright@epicuredining.com',
          phone: '+1 (555) 234-5678',
          occasion: 'Executive / Business Dinner',
          specialRequests: 'Sommelier consultation on reserve burgundy pairing.',
          dietaryPreferences: ['Gluten-Free Friendly']
        },
        createdAt: new Date().toISOString(),
        status: 'confirmed',
        isMockReservation: true
      },
      {
        bookingRef: 'DV-389145',
        restaurantId: 'rest-3',
        restaurantName: 'Kyoto Kura',
        restaurantImage: 'https://images.unsplash.com/photo-1578474846511-04ba529f0b88?auto=format&fit=crop&w=900&q=80',
        restaurantCuisine: 'Japanese Omakase',
        restaurantLocation: 'Tribeca, Manhattan',
        restaurantAddress: '88 Greenwich Street, New York, NY 10006',
        restaurantPhone: '+1 (212) 555-0177',
        date: pastDateStr,
        time: '7:00 PM',
        guests: 2,
        seatingArea: 'Hinoki Counter',
        customer: {
          fullName: 'Alexander Wright',
          email: 'a.wright@epicuredining.com',
          phone: '+1 (555) 234-5678',
          occasion: 'Special Milestone',
          specialRequests: 'Grand omakase tasting with seasonal sea urchin.',
          dietaryPreferences: []
        },
        createdAt: pastDate.toISOString(),
        status: 'completed',
        isMockReservation: true
      }
    ];

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('dinevia_booking_history', JSON.stringify(sampleBookings));
      } catch (e) {
        console.warn('Could not persist sample bookings to localStorage', e);
      }
    }

    return sampleBookings;
  }

  /**
   * Cancel an existing reservation with reason
   */
  cancelBooking(ref: string, reason: string = 'Schedule conflict'): boolean {
    const list = this.bookingsHistorySignal();
    const index = list.findIndex(b => b.bookingRef.toUpperCase() === ref.toUpperCase());
    if (index === -1) return false;

    const updatedBooking: BookingDetails = {
      ...list[index],
      status: 'cancelled',
      cancelReason: reason
    };

    const updatedList = [...list];
    updatedList[index] = updatedBooking;
    this.bookingsHistorySignal.set(updatedList);

    const active = this.activeBookingSignal();
    if (active && active.bookingRef.toUpperCase() === ref.toUpperCase()) {
      this.activeBookingSignal.set(updatedBooking);
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('dinevia_active_booking', JSON.stringify(updatedBooking));
        } catch (e) {
          console.warn(e);
        }
      }
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('dinevia_booking_history', JSON.stringify(updatedList));
      } catch (e) {
        console.warn(e);
      }
    }

    return true;
  }

  /**
   * Submit a new table reservation and generate reference code
   */
  createBooking(params: {
    restaurantId: string;
    date: string;
    time: string;
    guests: number;
    seatingArea?: string;
    customer: BookingCustomer;
  }): BookingDetails {
    const restaurant = this.restaurantService.getRestaurantById(params.restaurantId);

    const refNumber = `DV-${Math.floor(100000 + Math.random() * 900000)}`;

    const newBooking: BookingDetails = {
      bookingRef: refNumber,
      restaurantId: params.restaurantId,
      restaurantName: restaurant ? restaurant.name : 'Exclusive Dining Sanctuary',
      restaurantImage: restaurant ? restaurant.imageUrl : 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80',
      restaurantCuisine: restaurant ? restaurant.cuisine : 'Fine Dining',
      restaurantLocation: restaurant ? `${restaurant.neighborhood}, ${restaurant.city}` : 'Metropolitan',
      restaurantAddress: restaurant?.address || restaurant?.location,
      restaurantPhone: restaurant?.phone || '+1 (212) 555-0198',
      date: params.date,
      time: params.time,
      guests: params.guests,
      seatingArea: params.seatingArea || "Chef-Curated Table",
      customer: params.customer,
      createdAt: new Date().toISOString(),
      status: 'confirmed',
      isMockReservation: true
    };

    // Update active booking signal and session storage
    this.activeBookingSignal.set(newBooking);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('dinevia_active_booking', JSON.stringify(newBooking));
      } catch (e) {
        console.warn('Could not persist active booking to sessionStorage', e);
      }
    }

    // Append to local history
    const currentList = [newBooking, ...this.bookingsHistorySignal()];
    this.bookingsHistorySignal.set(currentList);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('dinevia_booking_history', JSON.stringify(currentList));
      } catch (e) {
        console.warn('Could not persist bookings history to localStorage', e);
      }
    }

    console.info('[Dinevia BookingService: Mock Reservation Created]', newBooking);
    return newBooking;
  }

  /**
   * Find booking by reference code
   */
  getBookingByRef(ref: string): BookingDetails | undefined {
    const active = this.activeBookingSignal();
    if (active && active.bookingRef.toUpperCase() === ref.toUpperCase()) {
      return active;
    }
    return this.bookingsHistorySignal().find(b => b.bookingRef.toUpperCase() === ref.toUpperCase());
  }

  /**
   * Reset the active booking state
   */
  clearActiveBooking(): void {
    this.activeBookingSignal.set(null);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem('dinevia_active_booking');
      } catch (e) {
        console.warn('Could not clear active booking from sessionStorage', e);
      }
    }
  }

  /**
   * Generate realistic mock availability for any chosen date and restaurant
   */
  getTimeSlotsForDate(restaurantId: string, dateStr: string): TimeSlotAvailability[] {
    const restaurant = this.restaurantService.getRestaurantById(restaurantId);

    // Standard high-end dinner & lunch seating periods
    const allSlots: { time: string; period: 'lunch' | 'dinner'; defaultAvailable: boolean }[] = [
      { time: '12:00 PM', period: 'lunch', defaultAvailable: true },
      { time: '12:30 PM', period: 'lunch', defaultAvailable: true },
      { time: '1:00 PM', period: 'lunch', defaultAvailable: false },
      { time: '1:30 PM', period: 'lunch', defaultAvailable: true },
      { time: '5:30 PM', period: 'dinner', defaultAvailable: true },
      { time: '6:00 PM', period: 'dinner', defaultAvailable: true },
      { time: '6:30 PM', period: 'dinner', defaultAvailable: false },
      { time: '7:00 PM', period: 'dinner', defaultAvailable: true },
      { time: '7:30 PM', period: 'dinner', defaultAvailable: true },
      { time: '8:00 PM', period: 'dinner', defaultAvailable: false },
      { time: '8:30 PM', period: 'dinner', defaultAvailable: true },
      { time: '9:00 PM', period: 'dinner', defaultAvailable: true },
      { time: '9:30 PM', period: 'dinner', defaultAvailable: false }
    ];

    // If restaurant has custom availableSlots, ensure they are prioritized as available
    const customSlots = restaurant?.availableSlots || [];

    // Simple pseudo-random seed based on date string and restaurantId
    const seed = (dateStr + restaurantId)
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);

    return allSlots.map((item, index) => {
      const isCustomFav = customSlots.includes(item.time);
      // Determine availability variation
      const pseudoVal = (seed + index * 7) % 10;
      let available = item.defaultAvailable;

      if (isCustomFav) {
        available = true;
      } else if (pseudoVal > 7) {
        available = false;
      }

      let statusText: 'Available' | 'Few Tables Left' | 'Fully Booked' = 'Available';
      if (!available) {
        statusText = 'Fully Booked';
      } else if (pseudoVal === 6 || pseudoVal === 7) {
        statusText = 'Few Tables Left';
      }

      return {
        time: item.time,
        period: item.period,
        available,
        statusText
      };
    });
  }
}
