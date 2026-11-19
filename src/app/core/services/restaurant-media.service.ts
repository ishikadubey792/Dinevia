import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, map, catchError, throwError, toArray, concatMap, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  RestaurantImageDto,
  GalleryActionResponse,
  MenuImageDto,
  MenuActionResponse
} from '../models/restaurant-media.model';

export interface BatchUploadResult<T = RestaurantImageDto> {
  successes: T[];
  failures: { file: File; error: string }[];
}

@Injectable({
  providedIn: 'root'
})
export class RestaurantMediaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/restaurants`;

  // =========================================================================
  // GALLERY MEDIA APIS
  // =========================================================================

  /**
   * Retrieves all gallery images for a restaurant.
   * GET /api/restaurants/{restaurantId}/images
   */
  getGalleryImages(restaurantId: number | string): Observable<RestaurantImageDto[]> {
    const cleanId = String(restaurantId).trim();
    return this.http
      .get<RestaurantImageDto[]>(`${this.baseUrl}/${cleanId}/images`)
      .pipe(
        map(images => Array.isArray(images) ? images : []),
        catchError(err => throwError(() => err))
      );
  }

  /**
   * Uploads a single gallery image for a restaurant.
   * POST /api/restaurants/{restaurantId}/images
   * Note: The field name must be exactly 'image' to match backend model binding.
   * Never manually set Content-Type so browser sets boundary.
   */
  uploadGalleryImage(restaurantId: number | string, file: File): Observable<RestaurantImageDto> {
    const cleanId = String(restaurantId).trim();
    const formData = new FormData();
    formData.append('image', file, file.name);

    return this.http
      .post<RestaurantImageDto>(`${this.baseUrl}/${cleanId}/images`, formData)
      .pipe(
        catchError(err => throwError(() => err))
      );
  }

  /**
   * Uploads multiple gallery images sequentially, isolating partial failures.
   */
  uploadMultipleGalleryImages(
    restaurantId: number | string,
    files: File[]
  ): Observable<BatchUploadResult<RestaurantImageDto>> {
    if (!files || files.length === 0) {
      return of({ successes: [], failures: [] });
    }

    return from(files).pipe(
      concatMap(file =>
        this.uploadGalleryImage(restaurantId, file).pipe(
          map(dto => ({ success: true as const, file, dto, error: '' })),
          catchError(err => {
            const errorMsg =
              err?.error?.message ||
              err?.error ||
              err?.statusText ||
              `Failed to upload ${file.name}.`;
            return of({ success: false as const, file, dto: null, error: String(errorMsg) });
          })
        )
      ),
      toArray(),
      map(results => {
        const successes: RestaurantImageDto[] = [];
        const failures: { file: File; error: string }[] = [];

        for (const res of results) {
          if (res.success && res.dto) {
            successes.push(res.dto);
          } else {
            failures.push({ file: res.file, error: res.error });
          }
        }

        return { successes, failures };
      })
    );
  }

  /**
   * Deletes a gallery image from a restaurant.
   * DELETE /api/restaurants/{restaurantId}/images/{imageId}
   */
  deleteGalleryImage(
    restaurantId: number | string,
    imageId: number
  ): Observable<GalleryActionResponse> {
    const cleanId = String(restaurantId).trim();
    return this.http
      .delete<GalleryActionResponse>(`${this.baseUrl}/${cleanId}/images/${imageId}`)
      .pipe(
        catchError(err => throwError(() => err))
      );
  }

  /**
   * Sets an existing gallery image as the primary cover image of a restaurant.
   * PUT /api/restaurants/{restaurantId}/images/{imageId}/primary
   */
  setPrimaryImage(
    restaurantId: number | string,
    imageId: number
  ): Observable<GalleryActionResponse> {
    const cleanId = String(restaurantId).trim();
    return this.http
      .put<GalleryActionResponse>(`${this.baseUrl}/${cleanId}/images/${imageId}/primary`, {})
      .pipe(
        catchError(err => throwError(() => err))
      );
  }

  // =========================================================================
  // MENU MEDIA APIS
  // =========================================================================

  /**
   * Retrieves all menu images for a restaurant in display order.
   * GET /api/restaurants/{restaurantId}/menu-images
   */
  getMenuImages(restaurantId: number | string): Observable<MenuImageDto[]> {
    const cleanId = String(restaurantId).trim();
    return this.http
      .get<MenuImageDto[]>(`${this.baseUrl}/${cleanId}/menu-images`)
      .pipe(
        map(images => Array.isArray(images) ? images : []),
        catchError(err => throwError(() => err))
      );
  }

  /**
   * Uploads a single menu image for a restaurant.
   * POST /api/restaurants/{restaurantId}/menu-images
   * Note: The field name must be exactly 'image' to match backend model binding.
   * Never manually set Content-Type so browser sets boundary.
   */
  uploadMenuImage(restaurantId: number | string, file: File): Observable<MenuImageDto> {
    const cleanId = String(restaurantId).trim();
    const formData = new FormData();
    formData.append('image', file, file.name);

    return this.http
      .post<MenuImageDto>(`${this.baseUrl}/${cleanId}/menu-images`, formData)
      .pipe(
        catchError(err => throwError(() => err))
      );
  }

  /**
   * Uploads multiple menu images sequentially using concatMap, preserving display order.
   */
  uploadMultipleMenuImages(
    restaurantId: number | string,
    files: File[]
  ): Observable<BatchUploadResult<MenuImageDto>> {
    if (!files || files.length === 0) {
      return of({ successes: [], failures: [] });
    }

    return from(files).pipe(
      concatMap(file =>
        this.uploadMenuImage(restaurantId, file).pipe(
          map(dto => ({ success: true as const, file, dto, error: '' })),
          catchError(err => {
            const errorMsg =
              err?.error?.message ||
              err?.error ||
              err?.statusText ||
              `Failed to upload ${file.name}.`;
            return of({ success: false as const, file, dto: null, error: String(errorMsg) });
          })
        )
      ),
      toArray(),
      map(results => {
        const successes: MenuImageDto[] = [];
        const failures: { file: File; error: string }[] = [];

        for (const res of results) {
          if (res.success && res.dto) {
            successes.push(res.dto);
          } else {
            failures.push({ file: res.file, error: res.error });
          }
        }

        return { successes, failures };
      })
    );
  }

  /**
   * Deletes a menu image from a restaurant.
   * DELETE /api/restaurants/{restaurantId}/menu-images/{imageId}
   */
  deleteMenuImage(
    restaurantId: number | string,
    imageId: number
  ): Observable<MenuActionResponse> {
    const cleanId = String(restaurantId).trim();
    return this.http
      .delete<MenuActionResponse>(`${this.baseUrl}/${cleanId}/menu-images/${imageId}`)
      .pipe(
        catchError(err => throwError(() => err))
      );
  }
}
