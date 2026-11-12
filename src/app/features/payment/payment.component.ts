import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { PaymentService } from '../../core/services/payment.service';
import { BookingService } from '../../core/services/booking.service';
import { AuthService } from '../../core/services/auth.service';
import { PaymentRecord, PaymentStatus } from '../../core/models/payment.model';
import { BookingDetails } from '../../core/models/booking.model';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    NavbarComponent,
    FooterComponent
  ],
  templateUrl: './payment.component.html',
  styleUrl: './payment.component.scss'
})
export class PaymentComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly paymentService = inject(PaymentService);
  private readonly bookingService = inject(BookingService);
  readonly authService = inject(AuthService);

  readonly paymentId = signal<number | null>(null);
  readonly payment = signal<PaymentRecord | null>(null);
  readonly booking = signal<BookingDetails | null>(null);

  readonly isLoading = signal<boolean>(true);
  readonly isProcessing = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly paymentStatus = computed<PaymentStatus>(() => {
    const p = this.payment();
    return p ? (p.status as PaymentStatus) : 'Pending';
  });

  readonly amount = computed<number>(() => {
    return this.payment()?.amount ?? 0;
  });

  readonly bookingRef = computed<string>(() => {
    const b = this.booking();
    if (b && b.bookingRef) return b.bookingRef;
    const p = this.payment();
    return p ? `DV-${p.bookingId}` : '';
  });

  readonly formattedBookingDate = computed<string>(() => {
    const b = this.booking();
    if (!b || !b.date) return '';
    try {
      const parts = b.date.split('-');
      if (parts.length === 3) {
        const d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
        return d.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        });
      }
    } catch {
      return b.date;
    }
    return b.date;
  });

  ngOnInit(): void {
    const rawId = this.route.snapshot.paramMap.get('paymentId');
    const id = Number(rawId);

    if (!Number.isFinite(id) || id <= 0) {
      this.errorMessage.set('Invalid payment reference ID.');
      this.isLoading.set(false);
      return;
    }

    this.paymentId.set(id);

    // Hydrate from active payment signal if available
    const active = this.paymentService.activePayment();
    if (active && active.id === id) {
      this.payment.set(active);
    }

    // Always fetch latest authoritative state from backend
    this.paymentService.getPayment(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (record) => {
          this.payment.set(record);
          this.paymentService.setActivePayment(record);
          this.loadBookingContext(record.bookingId);
        },
        error: (err) => {
          this.isLoading.set(false);
          if (err && typeof err === 'object' && 'status' in err) {
            const status = (err as { status: number }).status;
            if (status === 404) {
              this.errorMessage.set('Payment record was not found or does not belong to your account.');
              return;
            }
            if (status === 403 || status === 401) {
              this.errorMessage.set('You are not authorized to view this payment.');
              return;
            }
          }
          this.errorMessage.set('Unable to retrieve payment details. Please check your connection or return to your reservations.');
        }
      });
  }

  private loadBookingContext(bookingId: number): void {
    const active = this.bookingService.activeBooking();
    if (active && active.backendId === bookingId) {
      this.booking.set(active);
      this.isLoading.set(false);
      return;
    }

    this.bookingService.getBookingByIdApi(bookingId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (b) => {
          this.booking.set(b);
          this.isLoading.set(false);
        },
        error: () => {
          // If booking details cannot be resolved, payment record is still rendered
          this.isLoading.set(false);
        }
      });
  }

  onSimulateSuccess(): void {
    if (this.isProcessing() || !this.payment()) {
      return;
    }

    this.isProcessing.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const paymentId = this.payment()!.id;
    this.paymentService.processDemoPayment(paymentId, true)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.payment.set(updated);
          this.paymentService.setActivePayment(updated);
          this.bookingService.updateBookingStatus(updated.bookingId, 'confirmed');

          // Verify booking status confirmation from API
          this.bookingService.getBookingByIdApi(updated.bookingId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: (b) => {
                this.booking.set(b);
                this.isProcessing.set(false);
                this.router.navigate(['/booking/confirmation']);
              },
              error: () => {
                this.isProcessing.set(false);
                this.router.navigate(['/booking/confirmation']);
              }
            });
        },
        error: (err) => {
          this.isProcessing.set(false);
          this.errorMessage.set(this.extractErrorMessage(err, 'Failed to process demo payment.'));
        }
      });
  }

  onSimulateFailure(): void {
    if (this.isProcessing() || !this.payment()) {
      return;
    }

    this.isProcessing.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const paymentId = this.payment()!.id;
    this.paymentService.processDemoPayment(paymentId, false)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.payment.set(updated);
          this.paymentService.setActivePayment(updated);
          this.isProcessing.set(false);
          this.errorMessage.set(
            'Payment simulation declined. Your reservation remains Pending. You can retry below using the same payment reference.'
          );
        },
        error: (err) => {
          this.isProcessing.set(false);
          this.errorMessage.set(this.extractErrorMessage(err, 'Failed to process demo payment simulation.'));
        }
      });
  }

  private extractErrorMessage(err: unknown, fallback: string): string {
    if (err && typeof err === 'object') {
      if ('error' in err) {
        const body = (err as { error?: unknown }).error;
        if (body && typeof body === 'object') {
          const msg =
            (body as Record<string, unknown>)['message'] ??
            (body as Record<string, unknown>)['detail'] ??
            (body as Record<string, unknown>)['title'];
          if (typeof msg === 'string' && msg.trim()) {
            return msg.trim();
          }
        }
      }
      if ('message' in err && typeof (err as { message?: unknown }).message === 'string') {
        return (err as { message: string }).message;
      }
    }
    return fallback;
  }
}

