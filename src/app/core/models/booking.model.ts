export interface BookingCustomer {
  fullName: string;
  email: string;
  phone: string;
  specialRequests?: string;
  occasion?: string;
  dietaryPreferences?: string[];
}

export interface BookingDetails {
  bookingRef: string;
  /** Numeric backend booking ID when real, or legacy string ('rest-1') for mock history */
  backendId?: number;
  restaurantId: string;
  restaurantName: string;
  restaurantImage: string;
  restaurantCuisine: string;
  restaurantLocation: string;
  restaurantAddress?: string;
  restaurantPhone?: string;
  date: string; // YYYY-MM-DD
  time: string; // e.g. "7:30 PM"
  guests: number;
  seatingArea?: string; // e.g. "Chef-Curated Table", "Main Dining Room", etc.
  customer: BookingCustomer;
  createdAt: string;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  cancelReason?: string;
  isMockReservation: boolean;
  restaurantTableId?: number;
  tableCapacity?: number;
}

// ---- Phase 3: Real API DTOs ----

/** POST /api/bookings request body */
export interface CreateBookingRequest {
  restaurantTableId: number;
  bookingDate: string;    // ISO 8601 datetime e.g. "2025-12-20T00:00:00"
  startTime: string;      // TimeSpan e.g. "18:00:00"
  endTime: string;        // TimeSpan e.g. "20:00:00"
  numberOfGuests: number;
  specialRequest?: string | null;
}

/** PUT /api/bookings/{id} request body */
export interface UpdateBookingRequest {
  bookingDate: string;
  startTime: string;
  endTime: string;
  numberOfGuests: number;
  specialRequest?: string | null;
}

/**
 * Backend booking record as returned by GET /api/bookings/customer/{customerId}.
 * Response schema is undocumented in Swagger; fields verified via live API during Phase 3.
 */
export interface ApiBookingRecord {
  id: number;
  restaurantTableId: number;
  bookingDate: string;
  startTime: string;
  endTime: string;
  numberOfGuests: number;
  specialRequest?: string | null;
  status: string;          // e.g. "Confirmed", "Cancelled", "Completed"
  createdAt?: string;
  restaurantTable?: {
    id: number;
    restaurantId: number;
    tableNumber: number;
    capacity: number;
  };
}

/** Wraps CreateBookingRequest success data returned by POST /api/bookings */
export interface ApiCreatedBooking {
  id: number;
  restaurantTableId?: number;
  bookingDate?: string;
  startTime?: string;
  endTime?: string;
  numberOfGuests?: number;
  status?: string;
  createdAt?: string;
}

export interface TimeSlotAvailability {
  time: string;
  available: boolean;
  statusText: 'Available' | 'Few Tables Left' | 'Fully Booked';
  period: 'lunch' | 'dinner';
}

export interface ApiRestaurantTableDto {
  id: number;
  restaurantId: number;
  tableNumber: number;
  capacity: number;
  status: string;
}

export interface AvailableTable {
  id: number;
  restaurantId: number;
  tableNumber: number;
  capacity: number;
  status: string;
}

export interface AvailabilityQuery {
  bookingDate: string;
  startTime: string;
  endTime: string;
  numberOfGuests: number;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatBookingDateParam(dateStr: string): string {
  const trimmed = (dateStr || '').trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);
  if (!match) {
    throw new Error(`Invalid BookingDate format: "${dateStr}"`);
  }
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error(`Invalid BookingDate calendar value: "${dateStr}"`);
  }
  return `${match[1]}-${match[2]}-${match[3]}T00:00:00`;
}

export function parseTimeToParts(timeStr: string): { hours: number; minutes: number; seconds: number } | null {
  const trimmed = (timeStr || '').trim();
  if (!trimmed) return null;

  // Match 12-hour format e.g. "7:30 PM" or "07:30:00 pm"
  const amPmMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (amPmMatch) {
    let hours = Number(amPmMatch[1]);
    const minutes = Number(amPmMatch[2]);
    const seconds = amPmMatch[3] ? Number(amPmMatch[3]) : 0;
    const period = amPmMatch[4].toUpperCase();

    if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
      return null;
    }

    if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }

    return { hours, minutes, seconds };
  }

  // Match 24-hour format e.g. "18:30" or "18:30:00"
  const milMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!milMatch) return null;

  const hours = Number(milMatch[1]);
  const minutes = Number(milMatch[2]);
  const seconds = milMatch[3] ? Number(milMatch[3]) : 0;

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
    return null;
  }

  return { hours, minutes, seconds };
}

export function formatTimeSpanParam(timeStr: string): string {
  const parts = parseTimeToParts(timeStr);
  if (!parts) {
    throw new Error(`Invalid TimeSpan format: "${timeStr}"`);
  }
  return `${pad2(parts.hours)}:${pad2(parts.minutes)}:${pad2(parts.seconds)}`;
}

export function normalizeToTimeInput(timeStr: string): string {
  const parts = parseTimeToParts(timeStr);
  if (!parts) return '';
  return `${pad2(parts.hours)}:${pad2(parts.minutes)}`;
}

export function compareTimes(start: string, end: string): number {
  const s = parseTimeToParts(start);
  const e = parseTimeToParts(end);
  if (!s || !e) return NaN;
  const sSec = s.hours * 3600 + s.minutes * 60 + s.seconds;
  const eSec = e.hours * 3600 + e.minutes * 60 + e.seconds;
  return sSec - eSec;
}

export function formatDisplayTime(timeStr: string): string {
  const parts = parseTimeToParts(timeStr);
  if (!parts) return timeStr;
  const period = parts.hours >= 12 ? 'PM' : 'AM';
  const displayHour = parts.hours % 12 === 0 ? 12 : parts.hours % 12;
  return `${displayHour}:${pad2(parts.minutes)} ${period}`;
}

export function filterAvailableTables(
  tables: readonly ApiRestaurantTableDto[],
  restaurantId: string | number,
  numberOfGuests: number,
  isRestaurantActive = true
): AvailableTable[] {
  if (!isRestaurantActive || !Array.isArray(tables)) {
    return [];
  }

  const rawRestId = String(restaurantId ?? '').trim();
  if (!rawRestId || !Number.isFinite(numberOfGuests) || numberOfGuests < 1) {
    return [];
  }

  const isNumericId = /^\d+$/.test(rawRestId);
  const targetNumericId = isNumericId ? Number(rawRestId) : NaN;

  return tables
    .filter((t): t is ApiRestaurantTableDto => {
      if (!t || typeof t !== 'object') return false;

      const matchesRestaurant = isNumericId
        ? Number(t.restaurantId) === targetNumericId
        : String(t.restaurantId ?? '').trim() === rawRestId;
      if (!matchesRestaurant) return false;

      const statusNormalized = typeof t.status === 'string' ? t.status.trim().toLowerCase() : '';
      if (statusNormalized !== 'available') return false;

      if (typeof t.capacity !== 'number' || !Number.isFinite(t.capacity) || t.capacity < numberOfGuests) {
        return false;
      }

      return true;
    })
    .map(t => ({
      id: t.id,
      restaurantId: t.restaurantId,
      tableNumber: t.tableNumber,
      capacity: t.capacity,
      status: t.status.trim()
    }))
    .sort((a, b) => a.tableNumber - b.tableNumber || a.id - b.id);
}

export interface PreparedAvailabilityRequest {
  valid: true;
  query: AvailabilityQuery;
  key: string;
}

export interface InvalidAvailabilityRequest {
  valid: false;
  error: string;
}

export function getTodayDateString(): string {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = pad2(today.getMonth() + 1);
  const dd = pad2(today.getDate());
  return `${yyyy}-${mm}-${dd}`;
}

export function prepareAvailabilityRequest(
  restaurantId: string | number,
  inputs: {
    bookingDate: string;
    startTime: string;
    endTime: string;
    numberOfGuests: number;
  }
): PreparedAvailabilityRequest | InvalidAvailabilityRequest {
  const cleanRestId = String(restaurantId ?? '').trim();
  if (!cleanRestId) {
    return { valid: false, error: 'Restaurant could not be identified.' };
  }

  let bookingDateParam: string;
  try {
    bookingDateParam = formatBookingDateParam(inputs.bookingDate);
  } catch {
    return { valid: false, error: 'Please select a valid dining date.' };
  }

  let startTimeParam: string;
  let endTimeParam: string;
  try {
    startTimeParam = formatTimeSpanParam(inputs.startTime);
    endTimeParam = formatTimeSpanParam(inputs.endTime);
  } catch {
    return { valid: false, error: 'Please select valid start and end times.' };
  }

  if (compareTimes(startTimeParam, endTimeParam) >= 0) {
    return { valid: false, error: 'End time must be later than start time.' };
  }

  const guests = Math.trunc(Number(inputs.numberOfGuests));
  if (!Number.isFinite(guests) || guests < 1 || guests > 20) {
    return { valid: false, error: 'Party size must be between 1 and 20 guests.' };
  }

  const key = `${cleanRestId}|${bookingDateParam}|${startTimeParam}|${endTimeParam}|${guests}`;
  return {
    valid: true,
    query: {
      bookingDate: bookingDateParam,
      startTime: startTimeParam,
      endTime: endTimeParam,
      numberOfGuests: guests
    },
    key
  };
}
