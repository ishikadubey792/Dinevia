import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, defer, throwError, of } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  PaymentRecord,
  PaymentApiResponse,
  PaymentHistoryApiResponse,
  unwrapPaymentResponse
} from '../models/payment.model';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  private readonly activePaymentSignal = signal<PaymentRecord | null>(this.loadInitialActivePayment());
  readonly activePayment = this.activePaymentSignal.asReadonly();

  setActivePayment(payment: PaymentRecord | null): void {
    this.activePaymentSignal.set(payment);
    if (typeof window !== 'undefined') {
      try {
        if (payment) {
          sessionStorage.setItem('dinevia_active_payment', JSON.stringify(payment));
        } else {
          sessionStorage.removeItem('dinevia_active_payment');
        }
      } catch (e) {
        console.warn('Could not persist active payment to sessionStorage', e);
      }
    }
  }

  private loadInitialActivePayment(): PaymentRecord | null {
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('dinevia_active_payment');
        if (stored) {
          return JSON.parse(stored);
        }
      } catch (e) {
        console.warn('Could not read active payment from sessionStorage', e);
      }
    }
    return null;
  }

  /**
   * Initiates a pending payment for a given booking ID.
   * POST /api/payments/initiate/{bookingId}
   *
   * Backend business rules:
   * - Calculates amount on the server as ₹100 per guest.
   * - Creates a record with status 'Pending'.
   * - Requires Customer JWT authentication.
   *
   * @param bookingId Numeric backend booking ID (must be positive integer).
   */
  initiatePayment(bookingId: number): Observable<PaymentRecord> {
    return defer(() => {
      const cleanId = Math.trunc(Number(bookingId));
      if (!Number.isFinite(cleanId) || cleanId <= 0) {
        return throwError(() => new Error(`Invalid booking ID: ${bookingId}. Must be a positive integer.`));
      }

      return this.http
        .post<PaymentApiResponse | PaymentRecord>(
          `${this.apiUrl}/payments/initiate/${cleanId}`,
          {}
        )
        .pipe(
          map(res => unwrapPaymentResponse(res)),
          catchError(err => throwError(() => err))
        );
    });
  }

  /**
   * Processes a demo payment simulation for a given payment ID.
   * POST /api/payments/{paymentId}/process-demo?simulateSuccess=true|false
   *
   * Backend business rules:
   * - simulateSuccess=true: Transitions payment to 'Success' and booking to 'Confirmed'.
   * - simulateSuccess=false: Transitions payment to 'Failed'; booking remains 'Pending'.
   * - Failed payment can be retried using the same paymentId.
   * - Requires Customer JWT authentication.
   *
   * @param paymentId Numeric backend payment ID (must be positive integer).
   * @param simulateSuccess Whether the demo run should simulate a successful or failed charge.
   */
  processDemoPayment(paymentId: number, simulateSuccess: boolean): Observable<PaymentRecord> {
    return defer(() => {
      const cleanId = Math.trunc(Number(paymentId));
      if (!Number.isFinite(cleanId) || cleanId <= 0) {
        return throwError(() => new Error(`Invalid payment ID: ${paymentId}. Must be a positive integer.`));
      }

      const params = new HttpParams().set('simulateSuccess', String(Boolean(simulateSuccess)));

      return this.http
        .post<PaymentApiResponse | PaymentRecord>(
          `${this.apiUrl}/payments/${cleanId}/process-demo`,
          {},
          { params }
        )
        .pipe(
          map(res => unwrapPaymentResponse(res)),
          catchError(err => throwError(() => err))
        );
    });
  }

  /**
   * Fetches details of a single payment by payment ID.
   * GET /api/payments/{paymentId}
   *
   * Requires Customer JWT authentication.
   *
   * @param paymentId Numeric backend payment ID (must be positive integer).
   */
  getPayment(paymentId: number): Observable<PaymentRecord> {
    return defer(() => {
      const cleanId = Math.trunc(Number(paymentId));
      if (!Number.isFinite(cleanId) || cleanId <= 0) {
        return throwError(() => new Error(`Invalid payment ID: ${paymentId}. Must be a positive integer.`));
      }

      return this.http
        .get<PaymentApiResponse | PaymentRecord>(
          `${this.apiUrl}/payments/${cleanId}`
        )
        .pipe(
          map(res => unwrapPaymentResponse(res)),
          catchError(err => throwError(() => err))
        );
    });
  }

  /**
   * Fetches payment history for the currently authenticated customer.
   * GET /api/payments/history
   *
   * Requires Customer JWT authentication.
   */
  getPaymentHistory(): Observable<PaymentRecord[]> {
    return this.http
      .get<PaymentHistoryApiResponse | PaymentRecord[]>(
        `${this.apiUrl}/payments/history`
      )
      .pipe(
        map(res => {
          const unwrapped = unwrapPaymentResponse(res);
          return Array.isArray(unwrapped) ? unwrapped : [];
        }),
        catchError(err => throwError(() => err))
      );
  }

  /**
   * Recovers an existing payment or initiates a new one for a booking ID.
   * Handles idempotency and network recovery:
   * 1. Validates bookingId > 0.
   * 2. Checks customer payment history for an existing payment with matching bookingId.
   *    If found, sets activePayment and returns it immediately (reusing Pending or Failed payment, or returning Success).
   * 3. If not found in history, attempts initiatePayment(bookingId).
   * 4. In case of initiation failure (e.g., 400 Bad Request indicating payment already exists),
   *    re-queries payment history to recover the record.
   *
   * @param bookingId Numeric backend booking ID.
   */
  recoverOrInitiatePayment(bookingId: number): Observable<PaymentRecord> {
    return defer(() => {
      const cleanId = Math.trunc(Number(bookingId));
      if (!Number.isFinite(cleanId) || cleanId <= 0) {
        return throwError(() => new Error(`Invalid booking ID: ${bookingId}. Must be a positive integer.`));
      }

      return this.getPaymentHistory().pipe(
        catchError(() => of([] as PaymentRecord[])),
        switchMap(history => {
          const matches = (history || []).filter(p => p.bookingId === cleanId);
          if (matches.length > 0) {
            const successRecord = matches.find(p => p.status === 'Success');
            const bestRecord = successRecord || [...matches].sort((a, b) => (b.id || 0) - (a.id || 0))[0];
            this.setActivePayment(bestRecord);
            return of(bestRecord);
          }

          // No payment found in history: initiate new payment
          return this.initiatePayment(cleanId).pipe(
            tap(newPayment => this.setActivePayment(newPayment)),
            catchError(initErr => {
              // Re-check history in case another call or previous request succeeded
              return this.getPaymentHistory().pipe(
                catchError(() => of([] as PaymentRecord[])),
                switchMap(freshHistory => {
                  const freshMatches = (freshHistory || []).filter(p => p.bookingId === cleanId);
                  if (freshMatches.length > 0) {
                    const successRecord = freshMatches.find(p => p.status === 'Success');
                    const recovered = successRecord || [...freshMatches].sort((a, b) => (b.id || 0) - (a.id || 0))[0];
                    this.setActivePayment(recovered);
                    return of(recovered);
                  }
                  return throwError(() => initErr);
                })
              );
            })
          );
        })
      );
    });
  }
}

