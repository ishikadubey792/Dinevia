import { vi } from 'vitest';

/**
 * Mock implementation of browser Geolocation API for unit tests.
 */
export class MockGeolocation implements Geolocation {
  lastSuccessCb: PositionCallback | null = null;
  lastErrorCb: PositionErrorCallback | null = null;
  lastOptions: PositionOptions | null = null;

  readonly getCurrentPositionSpy = vi.fn(
    (
      success: PositionCallback,
      error?: PositionErrorCallback | null,
      options?: PositionOptions
    ) => {
      this.lastSuccessCb = success;
      this.lastErrorCb = error ?? null;
      this.lastOptions = options ?? null;
    }
  );

  getCurrentPosition(
    success: PositionCallback,
    error?: PositionErrorCallback | null,
    options?: PositionOptions
  ): void {
    this.getCurrentPositionSpy(success, error, options);
  }

  readonly watchPosition = vi.fn();
  readonly clearWatch = vi.fn();

  triggerSuccess(coords: { latitude: number; longitude: number; accuracy?: number }): void {
    if (this.lastSuccessCb) {
      this.lastSuccessCb({
        coords: {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy ?? 12,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
          toJSON: () => ({})
        },
        timestamp: Date.now(),
        toJSON: () => ({})
      } as GeolocationPosition);
    }
  }

  triggerError(code: number, message = 'Geolocation error'): void {
    if (this.lastErrorCb) {
      this.lastErrorCb({
        code,
        message,
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3
      } as GeolocationPositionError);
    }
  }
}
