import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  GeolocationService,
  GEOLOCATION,
  UserCoordinates,
  DEFAULT_GEOLOCATION_OPTIONS
} from './geolocation.service';
import { MockGeolocation } from '../testing/mock-geolocation.helper';

describe('GeolocationService', () => {
  let service: GeolocationService;
  let mockGeo: MockGeolocation;

  beforeEach(() => {
    mockGeo = new MockGeolocation();

    TestBed.configureTestingModule({
      providers: [
        GeolocationService,
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: GEOLOCATION, useValue: mockGeo }
      ]
    });

    service = TestBed.inject(GeolocationService);
  });

  // ── 1. Initial State ──

  describe('Initial State', () => {
    it('should initialize with status "idle", null coordinates, and null errorMessage', () => {
      expect(service.status()).toBe('idle');
      expect(service.coordinates()).toBeNull();
      expect(service.errorMessage()).toBeNull();
      expect(service.isLocating()).toBe(false);
      expect(service.hasLocation()).toBe(false);
    });

    it('should not request location automatically on service instantiation', () => {
      expect(mockGeo.getCurrentPositionSpy).not.toHaveBeenCalled();
    });

    it('should report isSupported() as true when browser Geolocation is available', () => {
      expect(service.isSupported()).toBe(true);
    });
  });

  // ── 2. Successful Location Retrieval ──

  describe('Successful Location Retrieval', () => {
    it('should update status to "locating" immediately upon calling getCurrentLocation', () => {
      const locationPromise = service.getCurrentLocation();

      expect(service.status()).toBe('locating');
      expect(service.isLocating()).toBe(true);
      expect(service.errorMessage()).toBeNull();
      expect(mockGeo.getCurrentPositionSpy).toHaveBeenCalledOnce();

      // Resolve pending promise to avoid unhandled async state
      mockGeo.triggerSuccess({ latitude: 13.0827, longitude: 80.2707 });
      return locationPromise;
    });

    it('should store coordinates and update status to "granted" upon success', async () => {
      const locationPromise = service.getCurrentLocation();

      mockGeo.triggerSuccess({ latitude: 13.0827, longitude: 80.2707, accuracy: 15 });
      const result: UserCoordinates | null = await locationPromise;

      expect(result).toEqual({
        latitude: 13.0827,
        longitude: 80.2707,
        accuracy: 15
      });
      expect(service.coordinates()).toEqual({
        latitude: 13.0827,
        longitude: 80.2707,
        accuracy: 15
      });
      expect(service.status()).toBe('granted');
      expect(service.errorMessage()).toBeNull();
      expect(service.isLocating()).toBe(false);
      expect(service.hasLocation()).toBe(true);
    });

    it('should pass default accuracy and timeout options to getCurrentPosition', () => {
      const locationPromise = service.getCurrentLocation();

      expect(mockGeo.lastOptions).toEqual(DEFAULT_GEOLOCATION_OPTIONS);
      expect(mockGeo.lastOptions?.enableHighAccuracy).toBe(true);
      expect(mockGeo.lastOptions?.timeout).toBe(10000);
      expect(mockGeo.lastOptions?.maximumAge).toBe(60000);

      mockGeo.triggerSuccess({ latitude: 13.0827, longitude: 80.2707 });
      return locationPromise;
    });

    it('should allow overriding default options', () => {
      const customOptions: PositionOptions = {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 0
      };

      const locationPromise = service.getCurrentLocation(customOptions);

      expect(mockGeo.lastOptions).toEqual(customOptions);

      mockGeo.triggerSuccess({ latitude: 13.0827, longitude: 80.2707 });
      return locationPromise;
    });
  });

  // ── 3. Error Handling ──

  describe('Error Handling', () => {
    it('should handle permission denied (code 1) with "denied" status and user-facing message', async () => {
      const locationPromise = service.getCurrentLocation();

      mockGeo.triggerError(1, 'User denied Geolocation');
      const result = await locationPromise;

      expect(result).toBeNull();
      expect(service.coordinates()).toBeNull();
      expect(service.status()).toBe('denied');
      expect(service.errorMessage()).toContain('permission denied');
      expect(service.isLocating()).toBe(false);
      expect(service.hasLocation()).toBe(false);
    });

    it('should handle position unavailable (code 2) with "unavailable" status and user-facing message', async () => {
      const locationPromise = service.getCurrentLocation();

      mockGeo.triggerError(2, 'Network location provider failed');
      const result = await locationPromise;

      expect(result).toBeNull();
      expect(service.coordinates()).toBeNull();
      expect(service.status()).toBe('unavailable');
      expect(service.errorMessage()).toContain('unavailable');
      expect(service.isLocating()).toBe(false);
    });

    it('should handle timeout (code 3) with "timeout" status and user-facing message', async () => {
      const locationPromise = service.getCurrentLocation();

      mockGeo.triggerError(3, 'Timeout expired');
      const result = await locationPromise;

      expect(result).toBeNull();
      expect(service.coordinates()).toBeNull();
      expect(service.status()).toBe('timeout');
      expect(service.errorMessage()).toContain('timed out');
      expect(service.isLocating()).toBe(false);
    });

    it('should handle unrecognized error codes gracefully', async () => {
      const locationPromise = service.getCurrentLocation();

      mockGeo.triggerError(999, 'Custom obscure hardware fault');
      const result = await locationPromise;

      expect(result).toBeNull();
      expect(service.status()).toBe('unavailable');
      expect(service.errorMessage()).toBe('Custom obscure hardware fault');
    });

    it('should handle synchronous exception thrown during getCurrentPosition invocation', async () => {
      mockGeo.getCurrentPositionSpy.mockImplementationOnce(() => {
        throw new Error('Security policy violation');
      });

      const result = await service.getCurrentLocation();

      expect(result).toBeNull();
      expect(service.status()).toBe('unavailable');
      expect(service.errorMessage()).toBe('Security policy violation');
      expect(service.coordinates()).toBeNull();
    });
  });

  // ── 4. In-Flight Request Deduplication ──

  describe('In-Flight Request Deduplication', () => {
    it('should reuse existing in-flight request when called multiple times concurrently', async () => {
      const firstCallPromise = service.getCurrentLocation();
      const secondCallPromise = service.getCurrentLocation();

      // Only one underlying browser call should have been initiated
      expect(mockGeo.getCurrentPositionSpy).toHaveBeenCalledOnce();
      expect(firstCallPromise).toBe(secondCallPromise);

      mockGeo.triggerSuccess({ latitude: 13.0827, longitude: 80.2707 });

      const [res1, res2] = await Promise.all([firstCallPromise, secondCallPromise]);
      expect(res1).toEqual({ latitude: 13.0827, longitude: 80.2707, accuracy: 12 });
      expect(res2).toEqual({ latitude: 13.0827, longitude: 80.2707, accuracy: 12 });

      // After completion, subsequent call starts a fresh request
      const thirdCallPromise = service.getCurrentLocation();
      expect(mockGeo.getCurrentPositionSpy).toHaveBeenCalledTimes(2);
      mockGeo.triggerSuccess({ latitude: 12.9716, longitude: 77.5946 });
      await thirdCallPromise;
    });
  });

  // ── 5. State Reset ──

  describe('State Reset', () => {
    it('should reset coordinates, status, and errorMessage when clearLocation() is called', async () => {
      const locationPromise = service.getCurrentLocation();
      mockGeo.triggerSuccess({ latitude: 13.0827, longitude: 80.2707 });
      await locationPromise;

      expect(service.status()).toBe('granted');
      expect(service.coordinates()).not.toBeNull();

      service.clearLocation();

      expect(service.status()).toBe('idle');
      expect(service.coordinates()).toBeNull();
      expect(service.errorMessage()).toBeNull();
      expect(service.hasLocation()).toBe(false);
    });

    it('should reset state when reset() alias is called', async () => {
      const locationPromise = service.getCurrentLocation();
      mockGeo.triggerError(1, 'Denied');
      await locationPromise;

      expect(service.status()).toBe('denied');
      expect(service.errorMessage()).not.toBeNull();

      service.reset();

      expect(service.status()).toBe('idle');
      expect(service.errorMessage()).toBeNull();
    });
  });

  // ── 6. Geolocation API Unavailable in Browser ──

  describe('Geolocation API Unavailable in Browser', () => {
    let unavailService: GeolocationService;

    beforeEach(() => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          GeolocationService,
          { provide: PLATFORM_ID, useValue: 'browser' },
          { provide: GEOLOCATION, useValue: null }
        ]
      });

      unavailService = TestBed.inject(GeolocationService);
    });

    it('should report isSupported() as false when GEOLOCATION token is null', () => {
      expect(unavailService.isSupported()).toBe(false);
    });

    it('should return null and set status to "unavailable" when attempting getCurrentLocation', async () => {
      const result = await unavailService.getCurrentLocation();

      expect(result).toBeNull();
      expect(unavailService.status()).toBe('unavailable');
      expect(unavailService.errorMessage()).toContain('not supported');
      expect(unavailService.coordinates()).toBeNull();
    });
  });

  // ── 7. SSR / Server Environment ──

  describe('SSR / Server Environment Compatibility', () => {
    let ssrService: GeolocationService;
    let ssrMockGeo: MockGeolocation;

    beforeEach(() => {
      ssrMockGeo = new MockGeolocation();
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          GeolocationService,
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: GEOLOCATION, useValue: ssrMockGeo }
        ]
      });

      ssrService = TestBed.inject(GeolocationService);
    });

    it('should initialize safely on server without errors', () => {
      expect(ssrService.status()).toBe('idle');
      expect(ssrService.coordinates()).toBeNull();
      expect(ssrService.errorMessage()).toBeNull();
      expect(ssrService.isSupported()).toBe(false);
    });

    it('should never invoke navigator.geolocation on server and set status to "unavailable"', async () => {
      const result = await ssrService.getCurrentLocation();

      expect(result).toBeNull();
      expect(ssrService.status()).toBe('unavailable');
      expect(ssrService.errorMessage()).toContain('server-rendered');
      expect(ssrMockGeo.getCurrentPositionSpy).not.toHaveBeenCalled();
    });
  });
});
