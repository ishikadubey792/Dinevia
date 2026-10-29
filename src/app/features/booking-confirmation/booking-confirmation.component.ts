import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { BookingService } from '../../core/services/booking.service';
import { BookingDetails } from '../../core/models/booking.model';

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

  readonly booking = signal<BookingDetails | null>(null);
  readonly noBookingFound = signal<boolean>(false);
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
    // 1. Check if active booking is present in BookingService
    const active = this.bookingService.activeBooking();

    // 2. Check query parameter ?ref=...
    this.route.queryParamMap.subscribe(params => {
      const ref = params.get('ref');

      if (ref) {
        const found = this.bookingService.getBookingByRef(ref);
        if (found) {
          this.booking.set(found);
          this.noBookingFound.set(false);
          return;
        }
      }

      if (active) {
        this.booking.set(active);
        this.noBookingFound.set(false);
      } else {
        // Direct access with no active reservation
        this.booking.set(null);
        this.noBookingFound.set(true);
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
