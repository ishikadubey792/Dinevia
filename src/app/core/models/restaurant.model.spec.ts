import { describe, it, expect } from 'vitest';
import {
  ApiRestaurantDto,
  Restaurant,
  mapApiRestaurantToDomain,
  calculateHaversineDistanceKm,
  isValidCoordinate
} from './restaurant.model';

describe('Restaurant Model & Location Utilities', () => {
  // ── 1. calculateHaversineDistanceKm ──

  describe('calculateHaversineDistanceKm', () => {
    it('should return 0 km for identical coordinates', () => {
      // Equator & Prime Meridian
      expect(calculateHaversineDistanceKm(0, 0, 0, 0)).toBe(0);

      // Chennai coordinates
      const chennaiLat = 13.0827;
      const chennaiLon = 80.2707;
      expect(calculateHaversineDistanceKm(chennaiLat, chennaiLon, chennaiLat, chennaiLon)).toBe(0);

      // Paris coordinates
      expect(calculateHaversineDistanceKm(48.8584, 2.2945, 48.8584, 2.2945)).toBe(0);
    });

    it('should calculate known distance between Chennai and Bangalore (~290.17 km) with full precision', () => {
      const chennaiLat = 13.0827;
      const chennaiLon = 80.2707;
      const bangaloreLat = 12.9716;
      const bangaloreLon = 77.5946;

      const distance = calculateHaversineDistanceKm(chennaiLat, chennaiLon, bangaloreLat, bangaloreLon);
      expect(distance).toBeCloseTo(290.17, 2);

      // Commutative check: distance from B to A equals A to B with full precision
      const reverseDistance = calculateHaversineDistanceKm(bangaloreLat, bangaloreLon, chennaiLat, chennaiLon);
      expect(reverseDistance).toBeCloseTo(distance, 10);
    });

    it('should calculate known distance between Paris and London (~340.54 km)', () => {
      const parisLat = 48.8584;
      const parisLon = 2.2945;
      const londonLat = 51.5007;
      const londonLon = -0.1246;

      const distance = calculateHaversineDistanceKm(parisLat, parisLon, londonLat, londonLon);
      expect(distance).toBeCloseTo(340.54, 2);
    });

    it('should calculate short intra-city dining distance and retain full floating-point precision without premature rounding', () => {
      // Marina Beach to T. Nagar, Chennai (~5.31 km)
      const marinaLat = 13.05;
      const marinaLon = 80.2824;
      const tNagarLat = 13.0418;
      const tNagarLon = 80.2341;

      const distance = calculateHaversineDistanceKm(marinaLat, marinaLon, tNagarLat, tNagarLon);
      expect(distance).toBeCloseTo(5.31, 2);

      // Verify that the distance retains full precision and is NOT prematurely rounded to 1 decimal place
      expect(distance).not.toBe(5.3);
      const decimalDigits = (distance.toString().split('.')[1] || '').length;
      expect(decimalDigits).toBeGreaterThan(1);

      // Verify that the UI presentation layer can format it to 1 decimal place when needed
      expect(Number(distance.toFixed(1))).toBe(5.3);
    });

    it('should throw an error for invalid coordinate values', () => {
      // Latitude > 90
      expect(() => calculateHaversineDistanceKm(91, 0, 0, 0)).toThrow('Invalid coordinates');
      expect(() => calculateHaversineDistanceKm(0, 0, 95.5, 0)).toThrow('Invalid coordinates');

      // Latitude < -90
      expect(() => calculateHaversineDistanceKm(-90.1, 0, 0, 0)).toThrow('Invalid coordinates');
      expect(() => calculateHaversineDistanceKm(0, 0, -100, 0)).toThrow('Invalid coordinates');

      // Longitude > 180
      expect(() => calculateHaversineDistanceKm(0, 180.1, 0, 0)).toThrow('Invalid coordinates');
      expect(() => calculateHaversineDistanceKm(0, 0, 0, 200)).toThrow('Invalid coordinates');

      // Longitude < -180
      expect(() => calculateHaversineDistanceKm(0, -181, 0, 0)).toThrow('Invalid coordinates');
      expect(() => calculateHaversineDistanceKm(0, 0, 0, -185)).toThrow('Invalid coordinates');

      // Non-finite values
      expect(() => calculateHaversineDistanceKm(NaN, 0, 0, 0)).toThrow('Invalid coordinates');
      expect(() => calculateHaversineDistanceKm(0, Infinity, 0, 0)).toThrow('Invalid coordinates');
      expect(() => calculateHaversineDistanceKm(0, 0, -Infinity, 0)).toThrow('Invalid coordinates');

      // Null / undefined passed as numbers
      expect(() => calculateHaversineDistanceKm(null as unknown as number, 0, 0, 0)).toThrow('Invalid coordinates');
      expect(() => calculateHaversineDistanceKm(0, undefined as unknown as number, 0, 0)).toThrow('Invalid coordinates');
    });
  });

  // ── 2. isValidCoordinate ──

  describe('isValidCoordinate', () => {
    it('should return true for valid coordinates within boundary ranges', () => {
      expect(isValidCoordinate(0, 0)).toBe(true);
      expect(isValidCoordinate(90, 180)).toBe(true);
      expect(isValidCoordinate(-90, -180)).toBe(true);
      expect(isValidCoordinate(13.0827, 80.2707)).toBe(true);
    });

    it('should return false for out-of-range or non-finite values', () => {
      expect(isValidCoordinate(90.1, 0)).toBe(false);
      expect(isValidCoordinate(-90.1, 0)).toBe(false);
      expect(isValidCoordinate(0, 180.1)).toBe(false);
      expect(isValidCoordinate(0, -180.1)).toBe(false);
      expect(isValidCoordinate(NaN, 0)).toBe(false);
      expect(isValidCoordinate(0, NaN)).toBe(false);
      expect(isValidCoordinate(Infinity, 0)).toBe(false);
      expect(isValidCoordinate(null, 80)).toBe(false);
      expect(isValidCoordinate(13, null)).toBe(false);
      expect(isValidCoordinate(undefined, 80)).toBe(false);
      expect(isValidCoordinate('invalid', 80)).toBe(false);
    });
  });

  // ── 3. mapApiRestaurantToDomain Coordinate Mapping ──

  describe('mapApiRestaurantToDomain', () => {
    const baseDto: ApiRestaurantDto = {
      id: 101,
      name: 'Southern Spice Sanctuary',
      address: 'Taj Coromandel, 37 MG Road',
      city: 'Chennai',
      description: 'Iconic South Indian culinary landmark.',
      coverImagePath: '/uploads/spice.jpg',
      rating: 4.9,
      reviewCount: 320,
      priceRange: '$$$$',
      isActive: true,
      restaurantCuisines: [
        { cuisine: { id: 1, name: 'South Indian' } }
      ]
    };

    it('should map valid numeric latitude and longitude from ApiRestaurantDto to domain Restaurant', () => {
      const dtoWithCoords: ApiRestaurantDto = {
        ...baseDto,
        latitude: 13.0617,
        longitude: 80.2464
      };

      const restaurant: Restaurant = mapApiRestaurantToDomain(dtoWithCoords);

      expect(restaurant.id).toBe('101');
      expect(restaurant.name).toBe('Southern Spice Sanctuary');
      expect(restaurant.latitude).toBe(13.0617);
      expect(restaurant.longitude).toBe(80.2464);
      expect(restaurant.city).toBe('Chennai');
    });

    it('should map null coordinates from ApiRestaurantDto to null in domain Restaurant', () => {
      const dtoWithNullCoords: ApiRestaurantDto = {
        ...baseDto,
        latitude: null,
        longitude: null
      };

      const restaurant: Restaurant = mapApiRestaurantToDomain(dtoWithNullCoords);

      expect(restaurant.latitude).toBeNull();
      expect(restaurant.longitude).toBeNull();
    });

    it('should map missing (undefined) coordinates from ApiRestaurantDto to null in domain Restaurant', () => {
      const dtoWithMissingCoords: ApiRestaurantDto = {
        ...baseDto
        // latitude and longitude omitted
      };

      const restaurant: Restaurant = mapApiRestaurantToDomain(dtoWithMissingCoords);

      expect(restaurant.latitude).toBeNull();
      expect(restaurant.longitude).toBeNull();
    });

    it('should safely parse numeric string coordinates if provided by API payload', () => {
      const dtoWithStringCoords: ApiRestaurantDto = {
        ...baseDto,
        latitude: '13.0827' as unknown as number,
        longitude: '80.2707' as unknown as number
      };

      const restaurant: Restaurant = mapApiRestaurantToDomain(dtoWithStringCoords);

      expect(restaurant.latitude).toBe(13.0827);
      expect(restaurant.longitude).toBe(80.2707);
    });

    it('should map unparseable non-numeric coordinates to null without throwing', () => {
      const dtoWithBadCoords: ApiRestaurantDto = {
        ...baseDto,
        latitude: 'invalid-lat' as unknown as number,
        longitude: 'invalid-lon' as unknown as number
      };

      const restaurant: Restaurant = mapApiRestaurantToDomain(dtoWithBadCoords);

      expect(restaurant.latitude).toBeNull();
      expect(restaurant.longitude).toBeNull();
    });

    it('should preserve all existing properties and not mutate the input DTO', () => {
      const clone = { ...baseDto, latitude: 13.05, longitude: 80.25 };
      const originalJson = JSON.stringify(clone);

      const restaurant = mapApiRestaurantToDomain(clone);

      // Verify no mutation
      expect(JSON.stringify(clone)).toBe(originalJson);

      // Verify existing fields remain intact
      expect(restaurant.name).toBe('Southern Spice Sanctuary');
      expect(restaurant.cuisine).toBe('South Indian');
      expect(restaurant.cuisines).toEqual(['South Indian']);
      expect(restaurant.rating).toBe(4.9);
      expect(restaurant.reviewCount).toBe(320);
      expect(restaurant.priceRange).toBe('$$$$');
      expect(restaurant.location).toBe('Taj Coromandel, 37 MG Road, Chennai');
      expect(restaurant.neighborhood).toBe('Chennai');
    });
  });
});
