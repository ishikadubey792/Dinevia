import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/cuisine.model';
import {
  OwnerDashboardMetrics,
  OwnerDashboardFilters
} from '../models/owner-dashboard.model';

@Injectable({
  providedIn: 'root'
})
export class OwnerDashboardService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Fetches aggregate dashboard metrics for all restaurants owned by the authenticated owner.
   * Endpoint: GET /api/owner/dashboard
   * Supports optional filters: restaurantId, fromDate, toDate.
   */
  getDashboard(filters?: OwnerDashboardFilters): Observable<OwnerDashboardMetrics> {
    let params = new HttpParams();

    if (filters) {
      if (filters.restaurantId !== undefined && filters.restaurantId !== null) {
        params = params.set('restaurantId', filters.restaurantId.toString());
      }
      if (filters.fromDate && filters.fromDate.trim() !== '') {
        params = params.set('fromDate', filters.fromDate.trim());
      }
      if (filters.toDate && filters.toDate.trim() !== '') {
        params = params.set('toDate', filters.toDate.trim());
      }
    }

    return this.http
      .get<ApiResponse<OwnerDashboardMetrics>>(`${this.apiUrl}/owner/dashboard`, { params })
      .pipe(map(response => response.data));
  }
}
