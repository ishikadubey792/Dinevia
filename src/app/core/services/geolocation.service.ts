import {
  Injectable,
  InjectionToken,
  PLATFORM_ID,
  computed,
  inject,
  signal
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Geographic coordinates of the user.
 */
export interface UserCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

/**
 * Lifecycle and permission status of geolocation requests.
 */
export type GeolocationStatus =
  | 'idle'
  | 'locating'
  | 'granted'
  | 'denied'
  | 'unavailable'
  | 'timeout';

/**
 * Default options for geolocation position retrieval.
 */
export const DEFAULT_GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 60000
};

/**
 * Injection token for resolving the browser's Geolocation API.
 * Facilitates strict unit testing and graceful SSR execution without referencing global window/navigator.
 */
export const GEOLOCATION = new InjectionToken<Geolocation | null>(
  'GEOLOCATION',
  {
    providedIn: 'root',
    factory: () => {
      const platformId = inject(PLATFORM_ID);
      if (!isPlatformBrowser(platformId)) {
        return null;
      }
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        return null;
      }
      return navigator.geolocation;
    }
  }
);

/**
 * GeolocationService
 *
 * Manages user location retrieval using the browser Geolocation API
 * with Angular Signals for reactive UI bindings and full SSR safety.
 *
 * Highlights:
 * - Angular Signals for reactive state tracking (`coordinates`, `status`, `errorMessage`)
 * - SSR safe: Guards all navigator / DOM API access behind `isPlatformBrowser(PLATFORM_ID)`
 * - Never accesses `navigator` during module initialization or server-side rendering
 * - In-flight deduplication: Reuses pending request when multiple calls occur while locating
 * - Informative user-facing error messages for permission denial, timeout, and hardware unavailability
 */
@Injectable({
  providedIn: 'root'
})
export class GeolocationService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly geolocationApi = inject(GEOLOCATION, { optional: true });

  // ── Reactive State Signals ──
  private readonly coordinatesSignal = signal<UserCoordinates | null>(null);
  private readonly statusSignal = signal<GeolocationStatus>('idle');
  private readonly errorMessageSignal = signal<string | null>(null);

  // ── Public Readonly Signals ──
  readonly coordinates = this.coordinatesSignal.asReadonly();
  readonly status = this.statusSignal.asReadonly();
  readonly errorMessage = this.errorMessageSignal.asReadonly();

  // ── Derived Signals ──
  readonly isLocating = computed(() => this.statusSignal() === 'locating');
  readonly hasLocation = computed(() => this.coordinatesSignal() !== null);

  // ── In-Flight Request Deduplication ──
  private inFlightPromise: Promise<UserCoordinates | null> | null = null;

  /**
   * Resolves the active Geolocation API instance safely.
   * Returns `null` if running on the server or if Geolocation is unsupported.
   */
  private getGeolocation(): Geolocation | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    if (this.geolocationApi) {
      return this.geolocationApi;
    }
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator && navigator.geolocation) {
      return navigator.geolocation;
    }
    return null;
  }

  /**
   * Checks whether the Geolocation API is supported in the current runtime environment.
   */
  isSupported(): boolean {
    return this.getGeolocation() !== null;
  }

  /**
   * Requests the user's current geographic coordinates.
   *
   * @param options Optional PositionOptions to override default settings.
   * @returns Promise resolving to UserCoordinates on success, or null on failure/unavailability.
   */
  getCurrentLocation(
    options: PositionOptions = DEFAULT_GEOLOCATION_OPTIONS
  ): Promise<UserCoordinates | null> {
    // 1. SSR Guard
    if (!isPlatformBrowser(this.platformId)) {
      this.statusSignal.set('unavailable');
      this.errorMessageSignal.set('Geolocation is not supported in server-rendered environments.');
      this.coordinatesSignal.set(null);
      return Promise.resolve(null);
    }

    // 2. Reuse in-flight request if currently locating
    if (this.inFlightPromise) {
      return this.inFlightPromise;
    }

    // 3. Browser API Support Guard
    const geo = this.getGeolocation();
    if (!geo) {
      this.statusSignal.set('unavailable');
      this.errorMessageSignal.set('Geolocation is not supported by your browser or environment.');
      this.coordinatesSignal.set(null);
      return Promise.resolve(null);
    }

    // 4. Begin Locating
    this.statusSignal.set('locating');
    this.errorMessageSignal.set(null);

    this.inFlightPromise = new Promise<UserCoordinates | null>((resolve) => {
      try {
        geo.getCurrentPosition(
          (position: GeolocationPosition) => {
            const userCoords: UserCoordinates = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy
            };

            this.coordinatesSignal.set(userCoords);
            this.statusSignal.set('granted');
            this.errorMessageSignal.set(null);
            resolve(userCoords);
          },
          (error: GeolocationPositionError) => {
            this.coordinatesSignal.set(null);
            this.handlePositionError(error);
            resolve(null);
          },
          options
        );
      } catch (err: unknown) {
        this.coordinatesSignal.set(null);
        this.statusSignal.set('unavailable');
        const message = err instanceof Error ? err.message : 'Failed to request geolocation.';
        this.errorMessageSignal.set(message);
        resolve(null);
      }
    }).finally(() => {
      this.inFlightPromise = null;
    });

    return this.inFlightPromise;
  }

  /**
   * Maps GeolocationPositionError codes to user-friendly messages and appropriate status.
   */
  private handlePositionError(error: GeolocationPositionError): void {
    switch (error.code) {
      case 1: // GeolocationPositionError.PERMISSION_DENIED
        this.statusSignal.set('denied');
        this.errorMessageSignal.set(
          'Location permission denied. Please enable location permissions in your browser to find restaurants near you.'
        );
        break;

      case 2: // GeolocationPositionError.POSITION_UNAVAILABLE
        this.statusSignal.set('unavailable');
        this.errorMessageSignal.set(
          'Location information is unavailable. Please check your network or GPS connection.'
        );
        break;

      case 3: // GeolocationPositionError.TIMEOUT
        this.statusSignal.set('timeout');
        this.errorMessageSignal.set(
          'Location request timed out. Please try again.'
        );
        break;

      default:
        this.statusSignal.set('unavailable');
        this.errorMessageSignal.set(
          error.message || 'An unknown error occurred while retrieving your location.'
        );
        break;
    }
  }

  /**
   * Resets the geolocation state back to idle.
   */
  clearLocation(): void {
    this.coordinatesSignal.set(null);
    this.statusSignal.set('idle');
    this.errorMessageSignal.set(null);
  }

  /**
   * Alias for clearLocation for consumer convenience.
   */
  reset(): void {
    this.clearLocation();
  }
}
