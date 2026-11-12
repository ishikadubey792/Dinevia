import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { BookingService } from '../../core/services/booking.service';
import { PaymentService } from '../../core/services/payment.service';
import { BookingDetails } from '../../core/models/booking.model';
import { PaymentRecord } from '../../core/models/payment.model';

@Component({
  selector: 'app-booking-confirmation',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    NavbarComponent,
    FooterComponent
  ],
  templateUrl: './booking-confirmation.component.html',
  styleUrl: './booking-confirmation.component.scss'
})
export class BookingConfirmationComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly bookingService = inject(BookingService);
  private readonly paymentService = inject(PaymentService);

  readonly booking = signal<BookingDetails | null>(null);
  readonly payment = signal<PaymentRecord | null>(null);
  readonly noBookingFound = signal<boolean>(false);
  readonly isVerifying = signal<boolean>(true);
  readonly isRecoveringPayment = signal<boolean>(false);
  readonly copiedToClipboard = signal<boolean>(false);
  readonly toastMessage = signal<string | null>(null);

  // Formatted date string
  readonly formattedBookingDate = computed(() => {
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
    const active = this.bookingService.activeBooking();

    this.route.queryParamMap.subscribe(params => {
      const idParam = params.get('id') || params.get('bookingId');
      const refParam = params.get('ref');

      let numericId: number | null = null;
      if (idParam && !isNaN(Number(idParam)) && Number(idParam) > 0) {
        numericId = Math.trunc(Number(idParam));
      } else if (refParam && refParam.startsWith('DV-')) {
        const parsed = Number(refParam.replace('DV-', ''));
        if (!isNaN(parsed) && parsed > 0) {
          numericId = parsed;
        }
      } else if (active?.backendId && active.backendId > 0 && !active.isMockReservation) {
        numericId = active.backendId;
      }

      // If this is explicitly an offline/mock reservation
      if (active?.isMockReservation && !numericId) {
        this.booking.set(active);
        this.noBookingFound.set(false);
        this.isVerifying.set(false);
        return;
      }

      if (numericId) {
        this.isVerifying.set(true);
        this.verifyAndLoadBooking(numericId, active);
      } else {
        this.booking.set(null);
        this.noBookingFound.set(true);
        this.isVerifying.set(false);
      }
    });
  }

  /**
   * Securely verifies the reservation status directly from GET /api/bookings/{id}.
   * Does NOT assume or trust unverified client-side status.
   */
  private verifyAndLoadBooking(bookingId: number, cachedBooking: BookingDetails | null): void {
    this.bookingService.getBookingByIdApi(bookingId).subscribe({
      next: (backendBooking) => {
        // Merge enriched metadata from client context if IDs match
        const enriched: BookingDetails = {
          ...backendBooking,
          restaurantName:
            cachedBooking?.restaurantName && !cachedBooking.restaurantName.startsWith('Restaurant #')
              ? cachedBooking.restaurantName
              : backendBooking.restaurantName,
          restaurantImage: cachedBooking?.restaurantImage || backendBooking.restaurantImage,
          restaurantCuisine: cachedBooking?.restaurantCuisine || backendBooking.restaurantCuisine,
          restaurantLocation: cachedBooking?.restaurantLocation || backendBooking.restaurantLocation,
          restaurantAddress: cachedBooking?.restaurantAddress || backendBooking.restaurantAddress,
          customer: {
            fullName: cachedBooking?.customer?.fullName || backendBooking.customer?.fullName || '',
            email: cachedBooking?.customer?.email || backendBooking.customer?.email || '',
            phone: cachedBooking?.customer?.phone || backendBooking.customer?.phone || '',
            occasion: cachedBooking?.customer?.occasion || backendBooking.customer?.occasion,
            specialRequests: backendBooking.customer?.specialRequests || cachedBooking?.customer?.specialRequests,
            dietaryPreferences: cachedBooking?.customer?.dietaryPreferences || backendBooking.customer?.dietaryPreferences
          }
        };

        this.booking.set(enriched);
        this.noBookingFound.set(false);
        this.isVerifying.set(false);

        // Fetch payment details
        this.loadPaymentDetails(bookingId);
      },
      error: () => {
        // If GET /api/bookings/{id} fails (404, 401, or error), do NOT display confirmed status
        this.booking.set(null);
        this.noBookingFound.set(true);
        this.isVerifying.set(false);
      }
    });
  }

  /**
   * Fetches real payment record from active session or payment history.
   */
  private loadPaymentDetails(bookingId: number): void {
    const activePay = this.paymentService.activePayment();
    if (activePay && activePay.bookingId === bookingId) {
      this.payment.set(activePay);
    }

    this.paymentService.getPaymentHistory().subscribe({
      next: (history) => {
        const matches = (history || []).filter(p => p.bookingId === bookingId);
        if (matches.length > 0) {
          const successPay = matches.find(p => p.status === 'Success');
          const bestPay = successPay || [...matches].sort((a, b) => (b.id || 0) - (a.id || 0))[0];
          this.payment.set(bestPay);
          this.paymentService.setActivePayment(bestPay);
        }
      },
      error: () => {
        // Non-blocking: payment remains null or activePay
      }
    });
  }

  /**
   * Recovers or initiates payment for an unconfirmed (Pending) booking and navigates to the payment demo page.
   */
  onProceedToPayment(): void {
    const b = this.booking();
    if (!b?.backendId || this.isRecoveringPayment()) return;

    this.isRecoveringPayment.set(true);

    this.paymentService.recoverOrInitiatePayment(b.backendId).subscribe({
      next: (paymentRecord) => {
        this.isRecoveringPayment.set(false);
        this.paymentService.setActivePayment(paymentRecord);
        if (paymentRecord.status === 'Success') {
          this.verifyAndLoadBooking(b.backendId!, b);
        } else {
          this.router.navigate(['/booking/payment', paymentRecord.id]);
        }
      },
      error: () => {
        this.isRecoveringPayment.set(false);
        this.showToast('Unable to initiate payment guarantee. Please retry or complete it in My Bookings.');
      }
    });
  }

  copyReference(): void {
    const b = this.booking();
    if (!b) return;

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(b.bookingRef).then(() => {
        this.copiedToClipboard.set(true);
        this.showToast('Reference code copied to clipboard.');
        setTimeout(() => this.copiedToClipboard.set(false), 3000);
      }).catch(() => {
        this.showToast(`Reference Code: ${b.bookingRef}`);
      });
    } else {
      this.showToast(`Reference Code: ${b.bookingRef}`);
    }
  }

  printConfirmation(): void {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }

  private showToast(message: string): void {
    this.toastMessage.set(message);
    setTimeout(() => {
      if (this.toastMessage() === message) {
        this.toastMessage.set(null);
      }
    }, 3500);
  }
}
