import { Component, DestroyRef, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { BookingService } from '../../core/services/booking.service';
import { AuthService } from '../../core/services/auth.service';
import {
  BookingDetails,
  UpdateBookingRequest,
  getTodayDateString,
  normalizeToTimeInput,
  compareTimes,
  formatBookingDateParam,
  formatTimeSpanParam,
  formatDisplayTime
} from '../../core/models/booking.model';

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
export class BookingsComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly bookingService = inject(BookingService);
  private readonly authService = inject(AuthService);

  readonly allBookings = signal<BookingDetails[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly activeTab = signal<'all' | 'upcoming' | 'completed' | 'cancelled'>('all');

  // Selected booking for Details Modal
  readonly selectedBooking = signal<BookingDetails | null>(null);

  // Booking targeted for cancellation
  readonly bookingToCancel = signal<BookingDetails | null>(null);
  readonly cancelReason = signal<string>('Schedule conflict');
  readonly isCancelling = signal<boolean>(false);

  // Selected booking for Edit / Reschedule Modal
  readonly bookingToEdit = signal<BookingDetails | null>(null);
  readonly isUpdating = signal<boolean>(false);
  readonly editError = signal<string | null>(null);
  readonly editDate = signal<string>('');
  readonly editStartTime = signal<string>('18:30');
  readonly editEndTime = signal<string>('20:00');
  readonly editGuests = signal<number>(2);
  readonly editSpecialRequest = signal<string>('');
  readonly minDate = getTodayDateString();
  readonly guestOptions = Array.from({ length: 20 }, (_, i) => i + 1);

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

  ngOnInit(): void {
    this.loadBookings();
  }

  /**
   * Load real customer booking history from GET /api/bookings/customer/{customerId}.
   * Uses the numeric customer ID from the authenticated customer JWT session.
   */
  loadBookings(): void {
    this.errorMessage.set(null);

    if (!this.authService.isCustomerAuthenticated()) {
      this.allBookings.set([]);
      this.isLoading.set(false);
      return;
    }

    const session = this.authService.currentCustomerSession();
    const rawId = session?.user?.id;
    const numericCustomerId = Number(rawId);

    if (!Number.isFinite(numericCustomerId) || numericCustomerId <= 0) {
      this.allBookings.set([]);
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    this.bookingService
      .getCustomerBookings(numericCustomerId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (bookings) => {
          this.allBookings.set(bookings);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.isLoading.set(false);
          this.errorMessage.set(this.extractErrorMessage(err));
        }
      });
  }

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

  // ---------------------------------------------------------------------------
  // Edit / Reschedule Modal Flow (PUT /api/bookings/{id})
  // ---------------------------------------------------------------------------

  /**
   * Determine whether a booking is eligible for rescheduling.
   * Only upcoming/active confirmed or pending bookings with a dining date >= today can be edited.
   */
  canEdit(b: BookingDetails): boolean {
    if (b.status !== 'confirmed' && b.status !== 'pending') {
      return false;
    }
    const today = getTodayDateString();
    return !b.date || b.date >= today;
  }

  openEditModal(b: BookingDetails): void {
    if (!this.canEdit(b)) return;
    this.bookingToEdit.set(b);
    this.editError.set(null);
    this.isUpdating.set(false);

    this.editDate.set(b.date || getTodayDateString());

    let start = '18:30';
    let end = '20:00';
    if (b.time) {
      const parts = b.time.split(/[-–—]/);
      if (parts.length >= 2) {
        start = normalizeToTimeInput(parts[0].trim()) || '18:30';
        end = normalizeToTimeInput(parts[1].trim()) || '20:00';
      } else {
        start = normalizeToTimeInput(b.time.trim()) || '18:30';
      }
    }
    this.editStartTime.set(start);
    this.editEndTime.set(end);
    this.editGuests.set(b.guests || 2);
    this.editSpecialRequest.set(b.customer?.specialRequests || '');
  }

  closeEditModal(): void {
    this.bookingToEdit.set(null);
    this.isUpdating.set(false);
    this.editError.set(null);
  }

  /**
   * Confirm booking update via PUT /api/bookings/{id}.
   * Sends ONLY the verified UpdateBookingRequest fields (bookingDate, startTime, endTime, numberOfGuests, specialRequest).
   * Never sends customerId, restaurantId, restaurantTableId, name, email, or phone.
   */
  confirmUpdate(): void {
    const target = this.bookingToEdit();
    if (!target || this.isUpdating()) return;

    this.editError.set(null);

    const dateVal = this.editDate().trim();
    if (!dateVal || dateVal < this.minDate) {
      this.editError.set('Please select a valid dining date (today or in the future).');
      return;
    }

    const startVal = this.editStartTime().trim();
    const endVal = this.editEndTime().trim();
    if (!startVal || !endVal) {
      this.editError.set('Please enter both start and end times for your seating.');
      return;
    }

    if (compareTimes(startVal, endVal) >= 0) {
      this.editError.set('End time must be later than start time.');
      return;
    }

    const guestsVal = Number(this.editGuests());
    if (!Number.isFinite(guestsVal) || guestsVal < 1 || guestsVal > 20) {
      this.editError.set('Party size must be between 1 and 20 guests.');
      return;
    }

    // Availability capacity check: table cannot be changed via PUT
    if (target.tableCapacity && guestsVal > target.tableCapacity) {
      this.editError.set(
        `Your assigned table accommodates up to ${target.tableCapacity} guests. Table assignment cannot be changed during rescheduling. Please select at most ${target.tableCapacity} guests or reserve a new table.`
      );
      return;
    }

    const specialReqVal = this.editSpecialRequest().trim();
    if (specialReqVal.length > 1000) {
      this.editError.set('Special requests cannot exceed 1000 characters.');
      return;
    }

    let bookingDateParam: string;
    let startTimeParam: string;
    let endTimeParam: string;
    try {
      bookingDateParam = formatBookingDateParam(dateVal);
      startTimeParam = formatTimeSpanParam(startVal);
      endTimeParam = formatTimeSpanParam(endVal);
    } catch {
      this.editError.set('Invalid date or time format. Please check your inputs.');
      return;
    }

    const payload: UpdateBookingRequest = {
      bookingDate: bookingDateParam,
      startTime: startTimeParam,
      endTime: endTimeParam,
      numberOfGuests: guestsVal,
      specialRequest: specialReqVal.slice(0, 1000) || null
    };

    const backendId =
      target.backendId ??
      (target.bookingRef.startsWith('DV-')
        ? Number(target.bookingRef.replace('DV-', ''))
        : null);

    this.isUpdating.set(true);

    if (backendId && Number.isFinite(backendId) && backendId > 0 && !target.isMockReservation) {
      this.bookingService
        .updateBookingApi(backendId, payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.isUpdating.set(false);
            this.closeEditModal();
            this.showToast(
              `Reservation at ${target.restaurantName} (${target.bookingRef}) was successfully updated.`
            );
            this.loadBookings();
          },
          error: (err) => {
            this.isUpdating.set(false);
            this.editError.set(this.extractErrorMessage(err));
          }
        });
    } else {
      // Mock fallback for offline / demo reservations
      setTimeout(() => {
        this.isUpdating.set(false);
        const updated: BookingDetails = {
          ...target,
          date: dateVal,
          time: `${formatDisplayTime(startVal)} – ${formatDisplayTime(endVal)}`,
          guests: guestsVal,
          customer: {
            ...target.customer,
            specialRequests: specialReqVal || undefined
          }
        };
        this.allBookings.update(list =>
          list.map(b => (b.bookingRef === target.bookingRef ? updated : b))
        );
        this.closeEditModal();
        this.showToast(
          `Reservation at ${target.restaurantName} (${target.bookingRef}) was updated.`
        );
      }, 300);
    }
  }

  /**
   * Confirm booking cancellation.
   * Real bookings call POST /api/bookings/{id}/cancel without sending cancelReason.
   * Mock bookings fall back to local cancelBooking method for backward compatibility.
   */
  confirmCancellation(): void {
    const target = this.bookingToCancel();
    if (!target) return;

    const backendId =
      target.backendId ??
      (target.bookingRef.startsWith('DV-')
        ? Number(target.bookingRef.replace('DV-', ''))
        : null);

    this.isCancelling.set(true);

    if (backendId && Number.isFinite(backendId) && backendId > 0 && !target.isMockReservation) {
      // Real API cancellation: POST /api/bookings/{id}/cancel
      this.bookingService
        .cancelBookingApi(backendId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.isCancelling.set(false);
            this.closeCancelModal();

            // If details modal was open for this booking, update it
            const sel = this.selectedBooking();
            if (sel && (sel.bookingRef === target.bookingRef || sel.backendId === backendId)) {
              this.selectedBooking.set({
                ...sel,
                status: 'cancelled',
                cancelReason: this.cancelReason()
              });
            }

            this.showToast(
              `Reservation at ${target.restaurantName} (${target.bookingRef}) has been cancelled.`
            );
            // Refresh real booking list from backend
            this.loadBookings();
          },
          error: (err) => {
            this.isCancelling.set(false);
            this.showToast(this.extractErrorMessage(err));
          }
        });
    } else {
      // Backward compatibility for mock/offline reservations
      setTimeout(() => {
        this.bookingService.cancelBooking(target.bookingRef, this.cancelReason());
        this.isCancelling.set(false);
        this.closeCancelModal();

        const sel = this.selectedBooking();
        if (sel && sel.bookingRef === target.bookingRef) {
          this.selectedBooking.set({
            ...sel,
            status: 'cancelled',
            cancelReason: this.cancelReason()
          });
        }

        this.allBookings.update(list =>
          list.map(b =>
            b.bookingRef === target.bookingRef
              ? { ...b, status: 'cancelled' as const, cancelReason: this.cancelReason() }
              : b
          )
        );

        this.showToast(
          `Reservation at ${target.restaurantName} (${target.bookingRef}) has been cancelled.`
        );
      }, 300);
    }
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

  private extractErrorMessage(err: unknown): string {
    if (err && typeof err === 'object' && 'status' in err) {
      const httpErr = err as { status: number; error?: unknown };
      if (httpErr.status === 401) {
        return 'Your session has expired. Please log in again to view your reservations.';
      }
      if (httpErr.status === 403) {
        return 'You are not authorized to view these reservations.';
      }
      if (httpErr.status === 404) {
        return 'The requested booking could not be found.';
      }
      if (httpErr.status === 409) {
        return 'This booking is in a conflicting state and cannot be modified.';
      }
      if (httpErr.status === 400) {
        const body = httpErr.error;
        if (body && typeof body === 'object') {
          const msg =
            (body as Record<string, unknown>)['message'] ??
            (body as Record<string, unknown>)['detail'] ??
            (body as Record<string, unknown>)['title'];
          if (typeof msg === 'string' && msg.trim()) {
            return msg.trim();
          }
        }
        return 'Invalid request details. Please try again.';
      }
      if (httpErr.status === 0) {
        return 'Unable to reach the reservation server. Please check your internet connection.';
      }
    }
    return 'An unexpected error occurred while communicating with the reservation system.';
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
