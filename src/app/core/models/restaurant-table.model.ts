/**
 * Dinevia — Restaurant Table Domain Models & DTOs
 * Corresponds to ASP.NET Core RestaurantTable entity and RestaurantTableController contracts.
 * Backend fields: Id, RestaurantId, TableNumber, Capacity, Status.
 * Note: No unsupported fields such as SeatingArea or IsActive are included.
 */

export interface RestaurantTable {
  id: number;
  restaurantId: number;
  tableNumber: number;
  capacity: number;
  status: string;
}

export interface CreateRestaurantTableDto {
  restaurantId: number;
  tableNumber: number;
  capacity: number;
  status: string;
}

export interface UpdateRestaurantTableDto {
  restaurantId: number;
  tableNumber: number;
  capacity: number;
  status: string;
}

export const SUPPORTED_TABLE_STATUSES = ['Available', 'Occupied', 'Reserved'] as const;
export type TableStatus = (typeof SUPPORTED_TABLE_STATUSES)[number];

