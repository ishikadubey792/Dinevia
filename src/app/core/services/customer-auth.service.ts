import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/cuisine.model';
import {
  CustomerRegisterRequest,
  CustomerRegisterResponseData,
  CustomerLoginRequest,
  CustomerLoginResponseData
} from '../models/customer-auth.model';

@Injectable({
  providedIn: 'root'
})
export class CustomerAuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Register a new Customer account with the ASP.NET Core backend.
   * POST /api/auth/register
   * Content-Type: application/json
   */
  register(
    data: CustomerRegisterRequest
  ): Observable<ApiResponse<CustomerRegisterResponseData>> {
    const payload: CustomerRegisterRequest = {
      name: data.name.trim(),
      email: data.email.trim(),
      password: data.password
    };

    return this.http.post<ApiResponse<CustomerRegisterResponseData>>(
      `${this.apiUrl}/auth/register`,
      payload
    );
  }

  /**
   * Authenticate Customer credentials against the ASP.NET Core backend.
   * POST /api/auth/login
   * Content-Type: application/json
   */
  login(
    data: CustomerLoginRequest
  ): Observable<ApiResponse<CustomerLoginResponseData>> {
    const payload: CustomerLoginRequest = {
      email: data.email.trim(),
      password: data.password
    };

    return this.http.post<ApiResponse<CustomerLoginResponseData>>(
      `${this.apiUrl}/auth/login`,
      payload
    );
  }
}

