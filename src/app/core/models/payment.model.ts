import { ApiResponse } from './cuisine.model';

/**
 * Strict Payment Status values matching ASP.NET Core backend:
 * - Pending: Payment initiated, awaiting demo processing
 * - Success: Demo payment succeeded, transitions booking to Confirmed
 * - Failed: Demo payment failed, booking remains Pending and can be retried
 */
export type PaymentStatus = 'Pending' | 'Success' | 'Failed';

/**
 * Backend Payment entity / DTO contract returned by:
 * - POST /api/payments/initiate/{bookingId}
 * - GET /api/payments/{paymentId}
 * - POST /api/payments/{paymentId}/process-demo?simulateSuccess=true|false
 * - GET /api/payments/history (as an array)
 *
 * Verified against RestaurantBookingAPI.Models.Payment:
 * - Id: int (id)
 * - BookingId: int (bookingId)
 * - Amount: decimal (amount)
 * - PaymentMethod: string (paymentMethod, default "Demo")
 * - Status: string (status, strictly 'Pending' | 'Success' | 'Failed')
 * - TransactionId: string? (transactionId, null when pending or failed, set on success)
 * - CreatedAt: DateTime (createdAt, ISO 8601 string)
 * - PaidAt: DateTime? (paidAt, null when pending or failed, set on success)
 */
export interface PaymentRecord {
  id: number;
  bookingId: number;
  amount: number;
  paymentMethod: string;
  status: PaymentStatus;
  transactionId?: string | null;
  createdAt: string;
  paidAt?: string | null;
}

/**
 * Response envelope types matching ASP.NET Core ApiResponse<T>:
 * {
 *   "statusCode": 200,
 *   "message": "...",
 *   "data": PaymentRecord
 * }
 */
export type PaymentApiResponse = ApiResponse<PaymentRecord>;
export type PaymentHistoryApiResponse = ApiResponse<PaymentRecord[]>;

/**
 * Query parameters for POST /api/payments/{paymentId}/process-demo
 */
export interface ProcessDemoPaymentParams {
  simulateSuccess: boolean;
}

/**
 * Safely unwrap backend API responses that arrive inside
 * the standard ApiResponse<T> envelope or as a direct DTO.
 */
export function unwrapPaymentResponse<T>(res: ApiResponse<T> | T): T {
  if (res && typeof res === 'object' && 'data' in res && (res as ApiResponse<T>).data !== undefined) {
    return (res as ApiResponse<T>).data;
  }
  return res as T;
}

/**
 * Normalizes payment status string to strict PaymentStatus union.
 */
export function normalizePaymentStatus(status: string | null | undefined): PaymentStatus {
  const normalized = (status ?? '').trim().toLowerCase();
  if (normalized === 'success') {
    return 'Success';
  }
  if (normalized === 'failed' || normalized === 'failure') {
    return 'Failed';
  }
  return 'Pending';
}
