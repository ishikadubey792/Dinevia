/**
 * Dinevia — Operating Hour Domain Models & DTOs
 * Corresponds to ASP.NET Core OperatingHour entity and OperatingHourController contracts.
 * Backend fields: Id, RestaurantId, DayOfWeek, OpenTime, CloseTime, IsClosed.
 */

export interface OperatingHour {
  id: number;
  restaurantId: number;
  dayOfWeek: string;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
}

export interface CreateOperatingHourDto {
  restaurantId: number;
  dayOfWeek: string;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
}

export interface UpdateOperatingHourDto {
  restaurantId: number;
  dayOfWeek: string;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
}

export const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
] as const;

export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

