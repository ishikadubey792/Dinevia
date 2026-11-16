import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/cuisine.model';
import {
  OwnerRestaurantBooking,
  OwnerBookingFilters,
  OwnerBookingActionResponse
} from '../models/owner-booking.model';

@Injectable({
  providedIn: 'root'
})
export class OwnerBookingService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Retrieves bookings for all restaurants owned by the authenticated RestaurantOwner.
   * Server derives owner identity from the JWT access token.
   * Supports optional query filters: restaurantId, status, bookingDate, fromDate, toDate.
   */
  getBookings(filters?: OwnerBookingFilters): Observable<OwnerRestaurantBooking[]> {
    let params = new HttpParams();

    if (filters) {
      if (filters.restaurantId !== undefined && filters.restaurantId !== null) {
        params = params.set('restaurantId', filters.restaurantId.toString());
      }
      if (filters.status && filters.status.trim() !== '' && filters.status.toLowerCase() !== 'all') {
        params = params.set('status', filters.status.trim());
      }
      if (filters.bookingDate && filters.bookingDate.trim() !== '') {
        params = params.set('bookingDate', filters.bookingDate.trim());
      }
      if (filters.fromDate && filters.fromDate.trim() !== '') {
        params = params.set('fromDate', filters.fromDate.trim());
      }
      if (filters.toDate && filters.toDate.trim() !== '') {
        params = params.set('toDate', filters.toDate.trim());
      }
    }

    return this.http
      .get<ApiResponse<OwnerRestaurantBooking[]>>(`${this.apiUrl}/bookings/my-restaurant-bookings`, { params })
      .pipe(map(response => response.data ?? []));
  }

  /**
   * Retrieves a single booking by ID if it belongs to any restaurant owned by the authenticated owner.
   */
  getBookingById(id: number): Observable<OwnerRestaurantBooking> {
    return this.http
      .get<ApiResponse<OwnerRestaurantBooking>>(`${this.apiUrl}/bookings/my-restaurant-bookings/${id}`)
      .pipe(map(response => response.data));
  }

  /**
   * Confirms a Pending booking belonging to the authenticated owner's restaurant.
   * Endpoint: POST /api/bookings/{id}/confirm
   */
  confirmBooking(id: number): Observable<OwnerBookingActionResponse> {
    return this.http
      .post<ApiResponse<OwnerBookingActionResponse>>(`${this.apiUrl}/bookings/${id}/confirm`, {})
      .pipe(map(response => response.data));
  }

  /**
   * Cancels an eligible Pending or Confirmed booking for the authenticated owner's restaurant.
   * Endpoint: POST /api/bookings/{id}/owner-cancel
   */
  cancelBooking(id: number): Observable<OwnerBookingActionResponse> {
    return this.http
      .post<ApiResponse<OwnerBookingActionResponse>>(`${this.apiUrl}/bookings/${id}/owner-cancel`, {})
      .pipe(map(response => response.data));
  }
}
