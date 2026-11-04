import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminDataService } from '../../../core/services/admin-data.service';
import { AuthService } from '../../../core/services/auth.service';
import { AdminBookingItem, BookingTrendPoint, OwnerRestaurant } from '../../../core/models/admin.model';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss'
})
export class AdminDashboardComponent implements OnInit {
  readonly adminData = inject(AdminDataService);
  private readonly authService = inject(AuthService);

  readonly ownerName = computed(() =>
    this.authService.currentOwner()?.name ||
    this.authService.currentUser()?.fullName ||
    'Restaurant Owner'
  );

  readonly isLoading = this.adminData.isLoadingRestaurants;
  readonly loadError = this.adminData.restaurantLoadError;
  readonly ownerRestaurants = this.adminData.ownerRestaurants;

  readonly trendView = signal<'weekly' | 'monthly'>('weekly');
  readonly bookingStatusFilter = signal<string>('all');
  readonly selectedBooking = signal<AdminBookingItem | null>(null);
  readonly notificationToast = signal<string | null>(null);

  readonly currentChartData = computed<BookingTrendPoint[]>(() => {
    return this.trendView() === 'weekly'
      ? this.adminData.weeklyBookingTrends
      : this.adminData.monthlyBookingTrends;
  });

  readonly filteredBookings = computed<AdminBookingItem[]>(() => {
    const filter = this.bookingStatusFilter();
    const bookings = this.adminData.recentBookings();
    if (filter === 'all') return bookings;
    return bookings.filter(b => b.status === filter);
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.adminData.loadOwnerRestaurants().subscribe({
      error: () => {
        // Error state handled inside AdminDataService signal
      }
    });
  }

  retryLoad(): void {
    this.loadData();
  }

  setTrendView(view: 'weekly' | 'monthly'): void {
    this.trendView.set(view);
  }

  setBookingFilter(status: string): void {
    this.bookingStatusFilter.set(status);
  }

  viewBookingDetails(booking: AdminBookingItem): void {
    this.selectedBooking.set(booking);
  }

  closeBookingDetails(): void {
    this.selectedBooking.set(null);
  }

  triggerQuickAction(message: string): void {
    this.notificationToast.set(message);
    setTimeout(() => {
      this.notificationToast.set(null);
    }, 3500);
  }
}
