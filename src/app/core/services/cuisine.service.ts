import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, finalize, map, shareReplay, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiCuisine, ApiResponse } from '../models/cuisine.model';
import { toCuisineSlug } from '../models/restaurant.model';

@Injectable({
  providedIn: 'root'
})
export class CuisineService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  private readonly apiCuisinesSignal = signal<ApiCuisine[]>([]);
  readonly apiCuisines = this.apiCuisinesSignal.asReadonly();
  readonly isLoadingCuisines = signal<boolean>(false);
  readonly cuisinesLoadError = signal<string | null>(null);
  readonly isCuisinesLoaded = signal<boolean>(false);

  private inFlightCuisines$: Observable<ApiCuisine[]> | null = null;

  /**
   * Fetch all cuisines from backend ASP.NET Core API
   * GET /api/cuisines
   */
  getCuisines(): Observable<ApiResponse<ApiCuisine[]>> {
    return this.http.get<ApiResponse<ApiCuisine[]>>(`${this.apiUrl}/cuisines`);
  }

  /**
   * Load active cuisines once and share across components to avoid duplicate API calls.
   * Pass forceRefresh = true to explicitly retry/reload from backend.
   */
  loadCuisines(forceRefresh = false): Observable<ApiCuisine[]> {
    if (!forceRefresh && (this.isCuisinesLoaded() || this.cuisinesLoadError() !== null)) {
      return of(this.apiCuisinesSignal());
    }

    if (!forceRefresh && this.inFlightCuisines$) {
      return this.inFlightCuisines$;
    }

    this.isLoadingCuisines.set(true);
    this.cuisinesLoadError.set(null);

    const request$ = (this.getCuisines() as Observable<ApiResponse<ApiCuisine[]> | ApiCuisine[]>).pipe(
      map(res => {
        const rawList: ApiCuisine[] = Array.isArray(res)
          ? res
          : (res && Array.isArray(res.data) ? res.data : []);

        const seenSlugs = new Set<string>();
        const activeList: ApiCuisine[] = [];

        for (const item of rawList) {
          if (!item || item.isActive === false || typeof item.name !== 'string') {
            continue;
          }
          const trimmedName = item.name.trim();
          const slug = toCuisineSlug(trimmedName);
          if (!trimmedName || !slug || seenSlugs.has(slug)) {
            continue;
          }
          seenSlugs.add(slug);
          activeList.push({
            id: item.id,
            name: trimmedName,
            isActive: true
          });
        }

        return activeList;
      }),
      tap(active => {
        this.apiCuisinesSignal.set(active);
        this.isCuisinesLoaded.set(true);
        this.isLoadingCuisines.set(false);
        this.cuisinesLoadError.set(null);
        this.inFlightCuisines$ = null;
      }),
      catchError(() => {
        this.apiCuisinesSignal.set([]);
        this.isCuisinesLoaded.set(false);
        this.isLoadingCuisines.set(false);
        this.cuisinesLoadError.set('Unable to load cuisines right now. Please try again.');
        this.inFlightCuisines$ = null;
        return of([]);
      }),
      finalize(() => {
        if (this.inFlightCuisines$ === request$) {
          this.inFlightCuisines$ = null;
        }
      }),
      shareReplay(1)
    );

    if (this.isLoadingCuisines()) {
      this.inFlightCuisines$ = request$;
    }

    return request$;
  }
}

