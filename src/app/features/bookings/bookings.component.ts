import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { BookingService } from '../../core/services/booking.service';
import { BookingDetails } from '../../core/models/booking.model';

@Component({
  selector: 'app-bookings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    NavbarComponent,
    FooterComponent
  ],
  templateUrl: './bookings.component.html',
  styleUrl: './bookings.component.scss'
})
export class BookingsComponent {
  private readonly bookingService = inject(BookingService);

  readonly allBookings = this.bookingService.bookingHistory;
  readonly activeTab = signal<'all' | 'upcoming' | 'completed' | 'cancelled'>('all');

  // Selected booking for Details Modal
  readonly selectedBooking = signal<BookingDetails | null>(null);

  // Booking targeted for cancellation
  readonly bookingToCancel = signal<BookingDetails | null>(null);
  readonly cancelReason = signal<string>('Schedule conflict');
  readonly isCancelling = signal<boolean>(false);

  // Feedback toast
  readonly toastMessage = signal<string | null>(null);

  readonly cancellationReasons = [
    'Schedule conflict',
    'Change in party size',
    'Selected alternative dining venue',
    'Travel or transport delay',
    'Personal circumstances',
    'Other reason'
  ];

  // Filtered bookings list
  readonly filteredBookings = computed<BookingDetails[]>(() => {
    const list = this.allBookings();
    const tab = this.activeTab();

    if (tab === 'all') return list;
    if (tab === 'upcoming') {
      return list.filter(b => b.status === 'confirmed');
    }
    if (tab === 'completed') {
      return list.filter(b => b.status === 'completed');
    }
    if (tab === 'cancelled') {
      return list.filter(b => b.status === 'cancelled');
    }
    return list;
  });

  // Tab counts
  readonly tabCounts = computed(() => {
    const list = this.allBookings();
    return {
      all: list.length,
      upcoming: list.filter(b => b.status === 'confirmed').length,
      completed: list.filter(b => b.status === 'completed').length,
      cancelled: list.filter(b => b.status === 'cancelled').length
    };
  });

  setTab(tab: 'all' | 'upcoming' | 'completed' | 'cancelled'): void {
    this.activeTab.set(tab);
  }

  // Open Details Modal
  openDetails(b: BookingDetails): void {
    this.selectedBooking.set(b);
  }

  closeDetails(): void {
    this.selectedBooking.set(null);
  }

  // Open Cancel Modal
  openCancelModal(b: BookingDetails): void {
    this.bookingToCancel.set(b);
    this.cancelReason.set('Schedule conflict');
  }

  closeCancelModal(): void {
    this.bookingToCancel.set(null);
    this.isCancelling.set(false);
  }

  confirmCancellation(): void {
    const target = this.bookingToCancel();
    if (!target) return;

    this.isCancelling.set(true);
    setTimeout(() => {
      this.bookingService.cancelBooking(target.bookingRef, this.cancelReason());
      this.isCancelling.set(false);
      this.closeCancelModal();

      // If details modal was open for this booking, update it
      const sel = this.selectedBooking();
      if (sel && sel.bookingRef === target.bookingRef) {
        this.selectedBooking.set({
          ...sel,
          status: 'cancelled',
          cancelReason: this.cancelReason()
        });
      }

      this.showToast(`Reservation at ${target.restaurantName} (${target.bookingRef}) has been cancelled.`);
    }, 500);
  }

  copyRef(ref: string): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(ref).then(() => {
        this.showToast(`Booking reference ${ref} copied to clipboard.`);
      }).catch(() => {
        this.showToast(`Reference: ${ref}`);
      });
    } else {
      this.showToast(`Reference: ${ref}`);
    }
  }

  formatDate(dateStr: string): string {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
        return d.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
      }
    } catch {
      return dateStr;
    }
    return dateStr;
  }

  private showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => {
      if (this.toastMessage() === msg) {
        this.toastMessage.set(null);
      }
    }, 3500);
  }
}
