import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/cuisine.model';
import {
  RestaurantTable,
  CreateRestaurantTableDto,
  UpdateRestaurantTableDto
} from '../models/restaurant-table.model';

@Injectable({
  providedIn: 'root'
})
export class RestaurantTableService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/restaurant-tables`;

  /**
   * Fetches all tables for a specific restaurant.
   * GET /api/restaurant-tables/restaurant/{restaurantId}
   */
  getTablesByRestaurant(restaurantId: number): Observable<RestaurantTable[]> {
    return this.http
      .get<ApiResponse<RestaurantTable[]>>(`${this.baseUrl}/restaurant/${restaurantId}`)
      .pipe(
        map(response => Array.isArray(response?.data) ? response.data : [])
      );
  }

  /**
   * Fetches a single table by ID.
   * GET /api/restaurant-tables/{id}
   */
  getTableById(id: number): Observable<RestaurantTable> {
    return this.http
      .get<ApiResponse<RestaurantTable>>(`${this.baseUrl}/${id}`)
      .pipe(
        map(response => response.data)
      );
  }

  /**
   * Creates a new table for a restaurant.
   * Requires RestaurantOwner role. Owner ownership is verified on backend.
   * POST /api/restaurant-tables
   */
  createTable(dto: CreateRestaurantTableDto): Observable<RestaurantTable> {
    return this.http
      .post<ApiResponse<RestaurantTable>>(this.baseUrl, dto)
      .pipe(
        map(response => response.data)
      );
  }

  /**
   * Updates an existing table.
   * Requires RestaurantOwner role.
   * PUT /api/restaurant-tables/{id}
   */
  updateTable(id: number, dto: UpdateRestaurantTableDto): Observable<{ id: number }> {
    return this.http
      .put<ApiResponse<{ id: number }>>(`${this.baseUrl}/${id}`, dto)
      .pipe(
        map(response => response.data)
      );
  }

  /**
   * Deletes a table.
   * Requires RestaurantOwner role.
   * DELETE /api/restaurant-tables/{id}
   */
  deleteTable(id: number): Observable<{ id: number }> {
    return this.http
      .delete<ApiResponse<{ id: number }>>(`${this.baseUrl}/${id}`)
      .pipe(
        map(response => response.data)
      );
  }
}

