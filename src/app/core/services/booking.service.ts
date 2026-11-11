import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, defer, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  BookingDetails,
  BookingCustomer,
  ApiRestaurantTableDto,
  AvailableTable,
  AvailabilityQuery,
  CreateBookingRequest,
  UpdateBookingRequest,
  ApiBookingRecord,
  ApiCreatedBooking,
  formatBookingDateParam,
  formatTimeSpanParam,
  formatDisplayTime,
  filterAvailableTables
} from '../models/booking.model';
import { ApiResponse } from '../models/cuisine.model';
import { RestaurantService } from './restaurant.service';

@Injectable({
  providedIn: 'root'
})
export class BookingService {
  private readonly http = inject(HttpClient);
  private readonly restaurantService = inject(RestaurantService);
  private readonly apiUrl = environment.apiUrl;

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
   * Submit a new table reservation to the backend API:
   * POST /api/bookings
   *
   * Real HTTP Observable-based implementation. Does NOT generate fake booking references
   * or claim success before the API responds.
   */
  createBooking(
    payload: CreateBookingRequest,
    context: {
      restaurantId: string;
      restaurantName: string;
      restaurantImage: string;
      restaurantCuisine: string;
      restaurantLocation: string;
      restaurantAddress?: string;
      restaurantPhone?: string;
      seatingArea?: string;
      customer: BookingCustomer;
    }
  ): Observable<BookingDetails> {
    return this.createBookingApi(payload, context);
  }

  /**
   * Backward-compatible mock reservation utility preserved for legacy tests and offline demo.
   */
  createMockBooking(params: {
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

    this.activeBookingSignal.set(newBooking);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('dinevia_active_booking', JSON.stringify(newBooking));
      } catch (e) {
        console.warn('Could not persist active booking to sessionStorage', e);
      }
    }

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
   * Fetch raw table availability from ASP.NET Core backend API:
   * GET /api/bookings/availability?BookingDate=...&StartTime=...&EndTime=...&NumberOfGuests=...
   *
   * Note: Backend stored procedure dbo.GetAvailableRestaurantTables does not filter by
   * RestaurantId, Status = 'Available', or active restaurant status. Use
   * getAvailableTablesForRestaurant() for complete client-side filtering.
   */
  getAvailableTables(query: AvailabilityQuery): Observable<AvailableTable[]> {
    return defer(() => {
      const bookingDate = formatBookingDateParam(query.bookingDate);
      const startTime = formatTimeSpanParam(query.startTime);
      const endTime = formatTimeSpanParam(query.endTime);
      const numberOfGuests = Math.trunc(Number(query.numberOfGuests));

      if (!Number.isFinite(numberOfGuests) || numberOfGuests < 1 || numberOfGuests > 20) {
        throw new Error('NumberOfGuests must be an integer between 1 and 20.');
      }

      const params = new HttpParams()
        .set('BookingDate', bookingDate)
        .set('StartTime', startTime)
        .set('EndTime', endTime)
        .set('NumberOfGuests', String(numberOfGuests));

      return this.http
        .get<ApiResponse<ApiRestaurantTableDto[]> | ApiRestaurantTableDto[]>(
          `${this.apiUrl}/bookings/availability`,
          { params }
        )
        .pipe(
          map(res => {
            if (Array.isArray(res)) {
              return res;
            }
            if (res && Array.isArray(res.data)) {
              return res.data;
            }
            return [];
          })
        );
    });
  }

  /**
   * Fetch available tables for a specific restaurant and enforce client-side filtering:
   * - restaurantId === selected restaurant
   * - status === 'Available'
   * - capacity >= numberOfGuests
   * - restaurant is active
   */
  getAvailableTablesForRestaurant(
    restaurantId: string | number,
    query: AvailabilityQuery,
    isRestaurantActive = true
  ): Observable<AvailableTable[]> {
    return this.getAvailableTables(query).pipe(
      map(tables =>
        filterAvailableTables(tables, restaurantId, query.numberOfGuests, isRestaurantActive)
      )
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Phase 3: Real API Methods
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Create a real customer booking via POST /api/bookings.
   * Requires Customer JWT (attached by authInterceptor automatically).
   *
   * @param payload  Verified CreateBookingRequest — no customerId needed.
   * @param context  Frontend-only display info (restaurant, customer) for confirmation page.
   * @returns        Observable<BookingDetails> mapped from the backend response.
   */
  createBookingApi(
    payload: CreateBookingRequest,
    context: {
      restaurantId: string;
      restaurantName: string;
      restaurantImage: string;
      restaurantCuisine: string;
      restaurantLocation: string;
      restaurantAddress?: string;
      restaurantPhone?: string;
      seatingArea?: string;
      customer: BookingCustomer;
    }
  ): Observable<BookingDetails> {
    return this.http
      .post<ApiResponse<ApiCreatedBooking> | ApiCreatedBooking>(
        `${this.apiUrl}/bookings`,
        payload
      )
      .pipe(
        map(res => {
          // Support both { statusCode, message, data } envelope and bare object
          const data: ApiCreatedBooking =
            res && typeof res === 'object' && 'data' in res && res.data !== undefined
              ? (res as ApiResponse<ApiCreatedBooking>).data
              : (res as ApiCreatedBooking);

          const backendId = data?.id ?? 0;
          const bookingRef = `DV-${backendId}`;

          // Parse date from bookingDate ISO string
          const rawDate = data?.bookingDate ?? payload.bookingDate;
          const datePart = rawDate ? rawDate.split('T')[0] : payload.bookingDate.split('T')[0];

          // Format display time from start/end
          const startDisplay = formatDisplayTime(data?.startTime ?? payload.startTime);
          const endDisplay = formatDisplayTime(data?.endTime ?? payload.endTime);
          const timeDisplay = `${startDisplay} – ${endDisplay}`;

          // Normalize status
          const rawStatus = (data?.status ?? 'confirmed').toLowerCase();
          const status = (['confirmed', 'pending', 'cancelled', 'completed'] as const).includes(
            rawStatus as 'confirmed' | 'pending' | 'cancelled' | 'completed'
          )
            ? (rawStatus as BookingDetails['status'])
            : 'confirmed';

          const booking: BookingDetails = {
            bookingRef,
            backendId,
            restaurantId: context.restaurantId,
            restaurantName: context.restaurantName,
            restaurantImage: context.restaurantImage,
            restaurantCuisine: context.restaurantCuisine,
            restaurantLocation: context.restaurantLocation,
            restaurantAddress: context.restaurantAddress,
            restaurantPhone: context.restaurantPhone,
            date: datePart,
            time: timeDisplay,
            guests: data?.numberOfGuests ?? payload.numberOfGuests,
            seatingArea: context.seatingArea ?? 'Chef-Curated Table',
            customer: context.customer,
            createdAt: data?.createdAt ?? new Date().toISOString(),
            status,
            isMockReservation: false
          };

          // Set active booking for confirmation page
          this.activeBookingSignal.set(booking);
          if (typeof window !== 'undefined') {
            try {
              sessionStorage.setItem('dinevia_active_booking', JSON.stringify(booking));
            } catch (e) {
              console.warn('Could not persist active booking to sessionStorage', e);
            }
          }

          return booking;
        }),
        catchError(err => {
          return throwError(() => err);
        })
      );
  }

  /**
   * Fetch real customer booking history via GET /api/bookings/customer/{customerId}.
   * Requires Customer JWT (attached by authInterceptor automatically).
   *
   * @param customerId  Numeric backend customer ID from JWT session.
   */
  getCustomerBookings(customerId: number): Observable<BookingDetails[]> {
    return this.http
      .get<ApiResponse<ApiBookingRecord[]> | ApiBookingRecord[]>(
        `${this.apiUrl}/bookings/customer/${customerId}`
      )
      .pipe(
        map(res => {
          const records: ApiBookingRecord[] = Array.isArray(res)
            ? res
            : Array.isArray((res as ApiResponse<ApiBookingRecord[]>)?.data)
            ? (res as ApiResponse<ApiBookingRecord[]>).data
            : [];

          return records.map(r => this.mapApiBookingRecord(r));
        }),
        catchError(err => throwError(() => err))
      );
  }

  /**
   * Cancel a customer booking via POST /api/bookings/{id}/cancel.
   * Requires Customer JWT (attached by authInterceptor automatically).
   * The backend accepts an empty POST body — no cancellation reason is sent.
   *
   * @param backendId  Numeric backend booking ID.
   */
  cancelBookingApi(backendId: number): Observable<void> {
    return this.http
      .post<void>(`${this.apiUrl}/bookings/${backendId}/cancel`, {})
      .pipe(
        map(() => void 0),
        catchError(err => throwError(() => err))
      );
  }

  /**
   * Update a customer booking via PUT /api/bookings/{id}.
   * Only the verified UpdateBookingRequest fields are sent — restaurantTableId is NOT updatable.
   *
   * @param backendId  Numeric backend booking ID.
   * @param payload    UpdateBookingRequest fields.
   */
  updateBookingApi(backendId: number, payload: UpdateBookingRequest): Observable<void> {
    return this.http
      .put<void>(`${this.apiUrl}/bookings/${backendId}`, payload)
      .pipe(
        map(() => void 0),
        catchError(err => throwError(() => err))
      );
  }

  /**
   * Maps a raw ApiBookingRecord from the backend to the frontend BookingDetails model.
   * Enriches restaurant name/image from Phase 1 restaurant list when not in the API response.
   */
  private mapApiBookingRecord(r: ApiBookingRecord): BookingDetails {
    const backendId = r.id;
    const bookingRef = `DV-${backendId}`;

    // Extract date portion from ISO booking date
    const datePart = r.bookingDate ? r.bookingDate.split('T')[0] : '';

    // Format display time
    const startDisplay = r.startTime ? formatDisplayTime(r.startTime) : '';
    const endDisplay = r.endTime ? formatDisplayTime(r.endTime) : '';
    const timeDisplay = startDisplay && endDisplay ? `${startDisplay} – ${endDisplay}` : startDisplay;

    // Normalize backend status to frontend status values
    const rawStatus = (r.status ?? 'confirmed').toLowerCase().trim();
    const statusMap: Record<string, BookingDetails['status']> = {
      confirmed: 'confirmed',
      pending: 'pending',
      cancelled: 'cancelled',
      canceled: 'cancelled',
      completed: 'completed',
      done: 'completed'
    };
    const status: BookingDetails['status'] = statusMap[rawStatus] ?? 'confirmed';

    // Try to enrich restaurant info from Phase 1 list via restaurantId on table
    const restaurantId = r.restaurantTable?.restaurantId ?? 0;
    const enriched = restaurantId
      ? this.restaurantService.enrichFromLoadedList({ id: restaurantId } as any)
      : null;

    const fallbackImage =
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80';

    return {
      bookingRef,
      backendId,
      restaurantId: String(restaurantId || ''),
      restaurantName: enriched?.name ?? `Restaurant #${restaurantId}`,
      restaurantImage: enriched?.imageUrl ?? fallbackImage,
      restaurantCuisine: enriched?.cuisine ?? 'Fine Dining',
      restaurantLocation: enriched ? `${enriched.neighborhood ?? ''}, ${enriched.city ?? ''}`.replace(/^,\s*/, '') : '',
      restaurantAddress: enriched?.address ?? enriched?.location,
      restaurantPhone: enriched?.phone,
      date: datePart,
      time: timeDisplay,
      guests: r.numberOfGuests ?? 1,
      seatingArea: r.restaurantTable ? `Table #${r.restaurantTable.tableNumber}` : 'Chef-Curated Table',
      customer: {
        fullName: '',
        email: '',
        phone: '',
        specialRequests: r.specialRequest ?? undefined
      },
      createdAt: r.createdAt ?? new Date().toISOString(),
      status,
      isMockReservation: false,
      restaurantTableId: r.restaurantTableId ?? r.restaurantTable?.id,
      tableCapacity: r.restaurantTable?.capacity
    };
  }
}
