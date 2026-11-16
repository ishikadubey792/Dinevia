import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/cuisine.model';
import {
  OperatingHour,
  CreateOperatingHourDto,
  UpdateOperatingHourDto
} from '../models/operating-hour.model';

@Injectable({
  providedIn: 'root'
})
export class OperatingHourService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/operating-hours`;

  /**
   * Fetches operating hours for a specific restaurant.
   * GET /api/operating-hours/restaurant/{restaurantId}
   */
  getOperatingHoursByRestaurant(restaurantId: number): Observable<OperatingHour[]> {
    return this.http
      .get<ApiResponse<OperatingHour[]>>(`${this.baseUrl}/restaurant/${restaurantId}`)
      .pipe(
        map(response => Array.isArray(response?.data) ? response.data : [])
      );
  }

  /**
   * Fetches a single operating hour entry by ID.
   * GET /api/operating-hours/{id}
   */
  getOperatingHourById(id: number): Observable<OperatingHour> {
    return this.http
      .get<ApiResponse<OperatingHour>>(`${this.baseUrl}/${id}`)
      .pipe(
        map(response => response.data)
      );
  }

  /**
   * Creates an operating hour entry for a day of week.
   * Requires RestaurantOwner role.
   * POST /api/operating-hours
   */
  createOperatingHour(dto: CreateOperatingHourDto): Observable<OperatingHour> {
    return this.http
      .post<ApiResponse<OperatingHour>>(this.baseUrl, dto)
      .pipe(
        map(response => response.data)
      );
  }

  /**
   * Updates an existing operating hour entry.
   * Requires RestaurantOwner role.
   * PUT /api/operating-hours/{id}
   */
  updateOperatingHour(id: number, dto: UpdateOperatingHourDto): Observable<{ id: number }> {
    return this.http
      .put<ApiResponse<{ id: number }>>(`${this.baseUrl}/${id}`, dto)
      .pipe(
        map(response => response.data)
      );
  }

  /**
   * Deletes an operating hour entry.
   * Requires RestaurantOwner role.
   * DELETE /api/operating-hours/{id}
   */
  deleteOperatingHour(id: number): Observable<{ id: number }> {
    return this.http
      .delete<ApiResponse<{ id: number }>>(`${this.baseUrl}/${id}`)
      .pipe(
        map(response => response.data)
      );
  }
}

