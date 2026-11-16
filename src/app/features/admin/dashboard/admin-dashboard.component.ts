import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OwnerDashboardService } from '../../../core/services/owner-dashboard.service';
import { AdminDataService } from '../../../core/services/admin-data.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  OwnerDashboardMetrics,
  OwnerDashboardFilters,
  RestaurantBookingSummary,
  PaymentStatusSummary
} from '../../../core/models/owner-dashboard.model';
import { OwnerRestaurant } from '../../../core/models/admin.model';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss'
})
export class AdminDashboardComponent implements OnInit {
  private readonly ownerDashboardService = inject(OwnerDashboardService);
  readonly adminData = inject(AdminDataService);
  private readonly authService = inject(AuthService);

  readonly ownerName = computed(() =>
    this.authService.currentOwner()?.name ||
    this.authService.currentUser()?.fullName ||
    'Restaurant Owner'
  );

  // Live Metrics State
  readonly metrics = signal<OwnerDashboardMetrics | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly loadError = signal<string | null>(null);

  // Restaurants for filter dropdown
  readonly restaurants = signal<OwnerRestaurant[]>([]);

  // Filter models
  filterRestaurantId: number | null = null;
  filterFromDate: string = '';
  filterToDate: string = '';

  // Zero-data evaluation
  readonly isZeroState = computed(() => {
    const m = this.metrics();
    if (!m) return false;
    return m.totalRestaurants === 0 && m.totalBookings === 0;
  });

  // Successful revenue formatted in INR
  readonly formattedRevenue = computed(() => {
    const amount = this.metrics()?.totalSuccessfulPaymentAmount ?? 0;
    return this.formatCurrency(amount);
  });

  ngOnInit(): void {
    this.loadRestaurants();
    this.loadData();
  }

  loadRestaurants(): void {
    this.adminData.loadOwnerRestaurants().subscribe({
      next: (data) => {
        this.restaurants.set(data);
      },
      error: () => {
        this.restaurants.set(this.adminData.ownerRestaurants());
      }
    });
  }

  loadData(): void {
    this.isLoading.set(true);
    this.loadError.set(null);

    const filters: OwnerDashboardFilters = {
      restaurantId: this.filterRestaurantId !== null && this.filterRestaurantId !== undefined
        ? Number(this.filterRestaurantId)
        : null,
      fromDate: this.filterFromDate ? this.filterFromDate : null,
      toDate: this.filterToDate ? this.filterToDate : null
    };

    this.ownerDashboardService.getDashboard(filters).subscribe({
      next: (data) => {
        this.metrics.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        const msg = err?.error?.message || err?.message || 'Unable to load dashboard analytics. Please verify your connection.';
        this.loadError.set(msg);
        this.isLoading.set(false);
      }
    });
  }

  retryLoad(): void {
    this.loadData();
    this.loadRestaurants();
  }

  applyFilters(): void {
    this.loadData();
  }

  resetFilters(): void {
    this.filterRestaurantId = null;
    this.filterFromDate = '';
    this.filterToDate = '';
    this.loadData();
  }

  formatCurrency(amount?: number | null): string {
    if (amount === undefined || amount === null) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount);
  }

  // Payment status styling
  getPaymentStatusClass(status?: string | null): string {
    const s = (status || '').toLowerCase();
    if (s === 'success' || s === 'completed') return 'status-success';
    if (s === 'pending') return 'status-pending';
    return 'status-failed';
  }
}
