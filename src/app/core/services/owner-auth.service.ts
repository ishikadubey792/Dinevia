import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/cuisine.model';
import {
  OwnerRegisterRequest,
  OwnerRegisterResponseData,
  OwnerLoginRequest,
  OwnerLoginResponseData
} from '../models/owner-auth.model';

@Injectable({
  providedIn: 'root'
})
export class OwnerAuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Constructs multipart/form-data with exact ASP.NET Core DTO field names:
   * - OwnerName
   * - OwnerEmail
   * - Password
   * - RestaurantName
   * - Address
   * - City
   * - Description
   * - Phone
   * - RestaurantEmail
   * - CuisineIds (List<int>, appended individually per item)
   * - CoverImage (IFormFile)
   */
  buildRegisterFormData(request: OwnerRegisterRequest): FormData {
    const formData = new FormData();

    formData.append('OwnerName', request.ownerName.trim());
    formData.append('OwnerEmail', request.ownerEmail.trim());
    formData.append('Password', request.password);
    formData.append('RestaurantName', request.restaurantName.trim());
    formData.append('Address', request.address.trim());
    formData.append('City', request.city.trim());
    formData.append('Description', request.description.trim());
    formData.append('Phone', request.phone.trim());
    formData.append('RestaurantEmail', request.restaurantEmail.trim());

    if (request.cuisineIds && request.cuisineIds.length > 0) {
      for (const cuisineId of request.cuisineIds) {
        formData.append('CuisineIds', cuisineId.toString());
      }
    }

    if (request.coverImage) {
      formData.append('CoverImage', request.coverImage, request.coverImage.name);
    }

    return formData;
  }

  /**
   * Register a new Restaurant Owner
   * POST /api/auth/register-restaurant-owner
   * Content-Type: multipart/form-data (browser auto-generates boundary)
   */
  registerRestaurantOwner(
    data: OwnerRegisterRequest | FormData
  ): Observable<ApiResponse<OwnerRegisterResponseData>> {
    const formData = data instanceof FormData ? data : this.buildRegisterFormData(data);

    return this.http.post<ApiResponse<OwnerRegisterResponseData>>(
      `${this.apiUrl}/auth/register-restaurant-owner`,
      formData
    );
  }

  /**
   * Authenticate Restaurant Owner against ASP.NET Core API
   * POST /api/auth/login
   * Content-Type: application/json (Angular HttpClient automatically applies application/json)
   */
  login(request: OwnerLoginRequest): Observable<ApiResponse<OwnerLoginResponseData>> {
    const payload: OwnerLoginRequest = {
      email: request.email.trim(),
      password: request.password
    };

    return this.http.post<ApiResponse<OwnerLoginResponseData>>(
      `${this.apiUrl}/auth/login`,
      payload
    );
  }
}

