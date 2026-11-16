import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OwnerBookingService } from '../../../core/services/owner-booking.service';
import { AdminDataService } from '../../../core/services/admin-data.service';
import {
  OwnerRestaurantBooking,
  OwnerBookingFilters
} from '../../../core/models/owner-booking.model';
import { OwnerRestaurant } from '../../../core/models/admin.model';

@Component({
  selector: 'app-owner-bookings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './owner-bookings.component.html',
  styleUrl: './owner-bookings.component.scss'
})
export class OwnerBookingsComponent implements OnInit {
  private readonly ownerBookingService = inject(OwnerBookingService);
  private readonly adminData = inject(AdminDataService);

  // Bookings list and loading states
  readonly bookings = signal<OwnerRestaurantBooking[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successToast = signal<string | null>(null);

  // Owner restaurants for the filter dropdown
  readonly restaurants = signal<OwnerRestaurant[]>([]);

  // Filter form state
  filterRestaurantId: number | null = null;
  filterStatus: string = 'all';
  filterBookingDate: string = '';
  filterFromDate: string = '';
  filterToDate: string = '';

  // Single booking modal state
  readonly selectedBooking = signal<OwnerRestaurantBooking | null>(null);
  readonly isLoadingDetails = signal<boolean>(false);
  readonly detailsError = signal<string | null>(null);

  // Confirmation dialog state
  readonly actionConfirmation = signal<{
    action: 'confirm' | 'cancel';
    booking: OwnerRestaurantBooking;
  } | null>(null);
  readonly isSubmittingAction = signal<boolean>(false);
  readonly actionError = signal<string | null>(null);

  // Status counters computed from active bookings list
  readonly totalBookingsCount = computed(() => this.bookings().length);
  readonly pendingCount = computed(() =>
    this.bookings().filter(b => b.status?.toLowerCase() === 'pending').length
  );
  readonly confirmedCount = computed(() =>
    this.bookings().filter(b => b.status?.toLowerCase() === 'confirmed').length
  );
  readonly cancelledCount = computed(() =>
    this.bookings().filter(b => b.status?.toLowerCase() === 'cancelled').length
  );
  readonly completedCount = computed(() =>
    this.bookings().filter(b => b.status?.toLowerCase() === 'completed').length
  );

  ngOnInit(): void {
    this.loadRestaurants();
    this.loadBookings();
  }

  loadRestaurants(): void {
    this.adminData.loadOwnerRestaurants().subscribe({
      next: (restaurants) => {
        this.restaurants.set(restaurants);
      },
      error: () => {
        // Fallback to currently cached restaurants in service
        this.restaurants.set(this.adminData.ownerRestaurants());
      }
    });
  }

  loadBookings(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const filters: OwnerBookingFilters = {
      restaurantId: this.filterRestaurantId !== null && this.filterRestaurantId !== undefined
        ? Number(this.filterRestaurantId)
        : null,
      status: this.filterStatus && this.filterStatus !== 'all' ? this.filterStatus : null,
      bookingDate: this.filterBookingDate ? this.filterBookingDate : null,
      fromDate: this.filterFromDate ? this.filterFromDate : null,
      toDate: this.filterToDate ? this.filterToDate : null
    };

    this.ownerBookingService.getBookings(filters).subscribe({
      next: (data) => {
        this.bookings.set(data ?? []);
        this.isLoading.set(false);
      },
      error: (err) => {
        const errorMsg = err?.error?.message || err?.message || 'Unable to load restaurant bookings. Please try again.';
        this.errorMessage.set(errorMsg);
        this.isLoading.set(false);
      }
    });
  }

  applyFilters(): void {
    this.loadBookings();
  }

  clearFilters(): void {
    this.filterRestaurantId = null;
    this.filterStatus = 'all';
    this.filterBookingDate = '';
    this.filterFromDate = '';
    this.filterToDate = '';
    this.loadBookings();
  }

  setStatusTab(status: string): void {
    this.filterStatus = status;
    this.loadBookings();
  }

  // Booking detail view
  viewBookingDetails(id: number): void {
    this.isLoadingDetails.set(true);
    this.detailsError.set(null);

    this.ownerBookingService.getBookingById(id).subscribe({
      next: (booking) => {
        this.selectedBooking.set(booking);
        this.isLoadingDetails.set(false);
      },
      error: (err) => {
        this.detailsError.set(err?.error?.message || 'Could not fetch booking details.');
        this.isLoadingDetails.set(false);
      }
    });
  }

  closeBookingDetails(): void {
    this.selectedBooking.set(null);
    this.detailsError.set(null);
  }

  // Confirmation prompts
  promptConfirm(booking: OwnerRestaurantBooking, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.actionError.set(null);
    this.actionConfirmation.set({
      action: 'confirm',
      booking
    });
  }

  promptCancel(booking: OwnerRestaurantBooking, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.actionError.set(null);
    this.actionConfirmation.set({
      action: 'cancel',
      booking
    });
  }

  closeConfirmationDialog(): void {
    if (this.isSubmittingAction()) return;
    this.actionConfirmation.set(null);
    this.actionError.set(null);
  }

  // Action execution
  executeAction(): void {
    const confirmation = this.actionConfirmation();
    if (!confirmation || this.isSubmittingAction()) return;

    this.isSubmittingAction.set(true);
    this.actionError.set(null);

    const bookingId = confirmation.booking.bookingId;

    if (confirmation.action === 'confirm') {
      this.ownerBookingService.confirmBooking(bookingId).subscribe({
        next: (res) => {
          this.isSubmittingAction.set(false);
          this.actionConfirmation.set(null);
          this.showSuccessToast(`Reservation #${bookingId} confirmed successfully.`);

          // Update active modal if showing this booking
          const current = this.selectedBooking();
          if (current && current.bookingId === bookingId) {
            this.selectedBooking.set({
              ...current,
              status: res?.status || 'Confirmed'
            });
          }

          // Reload bookings list
          this.loadBookings();
        },
        error: (err) => {
          this.isSubmittingAction.set(false);
          const msg = err?.error?.message || 'Failed to confirm booking. Please try again.';
          this.actionError.set(msg);
        }
      });
    } else {
      this.ownerBookingService.cancelBooking(bookingId).subscribe({
        next: (res) => {
          this.isSubmittingAction.set(false);
          this.actionConfirmation.set(null);
          this.showSuccessToast(`Reservation #${bookingId} cancelled.`);

          // Update active modal if showing this booking
          const current = this.selectedBooking();
          if (current && current.bookingId === bookingId) {
            this.selectedBooking.set({
              ...current,
              status: res?.status || 'Cancelled'
            });
          }

          // Reload bookings list
          this.loadBookings();
        },
        error: (err) => {
          this.isSubmittingAction.set(false);
          const msg = err?.error?.message || 'Failed to cancel booking. Please try again.';
          this.actionError.set(msg);
        }
      });
    }
  }

  private showSuccessToast(message: string): void {
    this.successToast.set(message);
    setTimeout(() => {
      this.successToast.set(null);
    }, 4000);
  }

  // Formatting helpers
  formatDisplayTime(timeSpan?: string | null): string {
    if (!timeSpan) return '—';
    const parts = timeSpan.split(':');
    if (parts.length >= 2) {
      let hours = parseInt(parts[0], 10);
      const minutes = parts[1];
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${hours}:${minutes} ${ampm}`;
    }
    return timeSpan;
  }

  formatDisplayDate(dateStr?: string | null): string {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  }

  formatCurrency(amount?: number | null): string {
    if (amount === undefined || amount === null) return '—';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount);
  }

  isConfirmEligible(booking: OwnerRestaurantBooking): boolean {
    return booking.status?.toLowerCase() === 'pending';
  }

  isCancelEligible(booking: OwnerRestaurantBooking): boolean {
    const status = booking.status?.toLowerCase();
    return status === 'pending' || status === 'confirmed';
  }
}
