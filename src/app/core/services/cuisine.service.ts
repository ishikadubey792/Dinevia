import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiCuisine, ApiResponse } from '../models/cuisine.model';

@Injectable({
  providedIn: 'root'
})
export class CuisineService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Fetch all cuisines from backend ASP.NET Core API
   * GET /api/cuisines
   */
  getCuisines(): Observable<ApiResponse<ApiCuisine[]>> {
    return this.http.get<ApiResponse<ApiCuisine[]>>(`${this.apiUrl}/cuisines`);
  }
}

