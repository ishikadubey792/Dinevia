import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ScrollRevealDirective } from '../../../shared/directives/scroll-reveal.directive';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { ErrorAlertComponent } from '../../../shared/components/error-alert/error-alert.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ConfirmModalComponent } from '../../../shared/components/confirm-modal/confirm-modal.component';
import { RestaurantTableService } from '../../../core/services/restaurant-table.service';
import { AdminDataService } from '../../../core/services/admin-data.service';
import {
  RestaurantTable,
  CreateRestaurantTableDto,
  UpdateRestaurantTableDto,
  SUPPORTED_TABLE_STATUSES
} from '../../../core/models/restaurant-table.model';
import { OwnerRestaurant } from '../../../core/models/admin.model';

@Component({
  selector: 'app-admin-tables',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ScrollRevealDirective,
    LoadingSpinnerComponent,
    ErrorAlertComponent,
    EmptyStateComponent,
    StatusBadgeComponent,
    ConfirmModalComponent
  ],
  templateUrl: './admin-tables.component.html',
  styleUrl: './admin-tables.component.scss'
})
export class AdminTablesComponent implements OnInit {
  private readonly tableService = inject(RestaurantTableService);
  readonly adminData = inject(AdminDataService);

  // Supported table statuses contract
  readonly supportedStatuses = SUPPORTED_TABLE_STATUSES;

  // Owner restaurants list and selected restaurant
  readonly restaurants = signal<OwnerRestaurant[]>([]);
  readonly selectedRestaurantId = signal<number | null>(null);
  readonly isLoadingRestaurants = signal<boolean>(true);
  readonly restaurantsError = signal<string | null>(null);

  // Tables list and loading state
  readonly tables = signal<RestaurantTable[]>([]);
  readonly isLoadingTables = signal<boolean>(true);
  readonly tablesError = signal<string | null>(null);

  // Feedback notifications
  readonly toastMessage = signal<string | null>(null);

  // Search & Filter
  readonly searchQuery = signal<string>('');
  readonly statusFilter = signal<string>('all');

  // Computed filtered tables
  readonly filteredTables = computed(() => {
    let list = this.tables();
    const query = this.searchQuery().trim().toLowerCase();
    const filter = this.statusFilter();

    if (filter !== 'all') {
      list = list.filter(t => (t.status || '').toLowerCase() === filter.toLowerCase());
    }

    if (query) {
      list = list.filter(t =>
        String(t.tableNumber).includes(query) ||
        (t.status || '').toLowerCase().includes(query) ||
        `${t.capacity} guests`.includes(query)
      );
    }

    return list.slice().sort((a, b) => a.tableNumber - b.tableNumber);
  });

  // KPI Metrics computed for currently selected restaurant
  readonly totalTablesCount = computed(() => this.tables().length);
  readonly totalSeatsCount = computed(() =>
    this.tables().reduce((sum, t) => sum + (t.capacity || 0), 0)
  );
  readonly availableTablesCount = computed(() =>
    this.tables().filter(t => (t.status || '').toLowerCase() === 'available').length
  );
  readonly occupiedTablesCount = computed(() =>
    this.tables().filter(t => (t.status || '').toLowerCase() === 'occupied').length
  );

  // Active restaurant entity
  readonly activeRestaurant = computed(() => {
    const id = this.selectedRestaurantId();
    if (!id) return null;
    return this.restaurants().find(r => Number(r.id) === id) || null;
  });

  // Modal State: Add Table
  readonly isAddModalOpen = signal<boolean>(false);
  readonly isSavingAdd = signal<boolean>(false);
  readonly addError = signal<string | null>(null);
  addForm = {
    tableNumber: null as number | null,
    capacity: 4 as number | null,
    status: 'Available' as string
  };

  // Modal State: Edit Table
  readonly editingTable = signal<RestaurantTable | null>(null);
  readonly isSavingEdit = signal<boolean>(false);
  readonly editError = signal<string | null>(null);
  editForm = {
    tableNumber: null as number | null,
    capacity: null as number | null,
    status: 'Available' as string
  };

  // Modal State: Delete Table Confirmation
  readonly deletingTable = signal<RestaurantTable | null>(null);
  readonly isDeleting = signal<boolean>(false);
  readonly deleteError = signal<string | null>(null);

  ngOnInit(): void {
    this.loadOwnerRestaurants();
  }

  /**
   * Loads restaurants owned by authenticated owner
   */
  loadOwnerRestaurants(): void {
    this.isLoadingRestaurants.set(true);
    this.restaurantsError.set(null);

    this.adminData.loadOwnerRestaurants().subscribe({
      next: (data) => {
        const owned = Array.isArray(data) ? data : [];
        this.restaurants.set(owned);
        this.isLoadingRestaurants.set(false);

        if (owned.length > 0) {
          // Select first owned restaurant by default if not set
          const currentId = this.selectedRestaurantId();
          const match = owned.find(r => Number(r.id) === currentId);
          const targetId = match ? Number(match.id) : Number(owned[0].id);
          this.selectedRestaurantId.set(targetId);
          this.loadTables(targetId);
        } else {
          this.tables.set([]);
          this.isLoadingTables.set(false);
        }
      },
      error: (err) => {
        this.isLoadingRestaurants.set(false);
        this.isLoadingTables.set(false);
        const msg = err?.error?.message || err?.statusText || 'Failed to load your restaurants.';
        this.restaurantsError.set(msg);
      }
    });
  }

  /**
   * Handles restaurant selector dropdown change
   */
  onRestaurantChange(restaurantIdVal: string | number): void {
    const numId = Number(restaurantIdVal);
    // Enforce owner scoping: ensure ID belongs to owner's restaurants
    const exists = this.restaurants().some(r => Number(r.id) === numId);
    if (!exists) return;

    this.selectedRestaurantId.set(numId);
    this.tablesError.set(null);
    this.loadTables(numId);
  }

  /**
   * Fetches tables for selected restaurant
   */
  loadTables(restaurantId: number): void {
    this.isLoadingTables.set(true);
    this.tablesError.set(null);

    this.tableService.getTablesByRestaurant(restaurantId).subscribe({
      next: (data) => {
        this.tables.set(Array.isArray(data) ? data : []);
        this.isLoadingTables.set(false);
      },
      error: (err) => {
        this.isLoadingTables.set(false);
        const msg = err?.error?.message || 'Failed to load restaurant tables. Please try again.';
        this.tablesError.set(msg);
      }
    });
  }

  /**
   * Opens Add Table modal
   */
  openAddModal(): void {
    this.addForm = {
      tableNumber: this.getNextSuggestedTableNumber(),
      capacity: 4,
      status: 'Available'
    };
    this.addError.set(null);
    this.isAddModalOpen.set(true);
  }

  closeAddModal(): void {
    this.isAddModalOpen.set(false);
    this.addError.set(null);
  }

  /**
   * Suggests next available table number
   */
  private getNextSuggestedTableNumber(): number {
    const currentTables = this.tables();
    if (currentTables.length === 0) return 1;
    const maxNum = Math.max(...currentTables.map(t => t.tableNumber || 0));
    return maxNum > 0 ? maxNum + 1 : 1;
  }

  /**
   * Submits Add Table form
   */
  submitAddTable(): void {
    const restId = this.selectedRestaurantId();
    if (!restId) {
      this.addError.set('Please select an establishment first.');
      return;
    }

    const tableNum = Number(this.addForm.tableNumber);
    const capacity = Number(this.addForm.capacity);
    const status = (this.addForm.status || '').trim();

    if (!tableNum || tableNum <= 0) {
      this.addError.set('Table number must be greater than 0.');
      return;
    }

    if (!capacity || capacity <= 0) {
      this.addError.set('Table capacity must be at least 1 guest.');
      return;
    }

    if (!status) {
      this.addError.set('Please select a valid table status.');
      return;
    }

    // Client-side duplicate check
    if (this.tables().some(t => t.tableNumber === tableNum)) {
      this.addError.set(`Table number ${tableNum} already exists in this restaurant.`);
      return;
    }

    const dto: CreateRestaurantTableDto = {
      restaurantId: restId,
      tableNumber: tableNum,
      capacity: capacity,
      status: status
    };

    this.isSavingAdd.set(true);
    this.addError.set(null);

    this.tableService.createTable(dto).subscribe({
      next: (created) => {
        this.isSavingAdd.set(false);
        this.closeAddModal();
        this.showToast(`Table #${created.tableNumber} added successfully.`);
        this.loadTables(restId);
      },
      error: (err) => {
        this.isSavingAdd.set(false);
        const msg = err?.error?.message ||
          (Array.isArray(err?.error?.errors) ? err.error.errors.join(' ') : 'Failed to create table.');
        this.addError.set(msg);
      }
    });
  }

  /**
   * Opens Edit Table modal
   */
  openEditModal(table: RestaurantTable): void {
    this.editingTable.set(table);
    this.editForm = {
      tableNumber: table.tableNumber,
      capacity: table.capacity,
      status: table.status || 'Available'
    };
    this.editError.set(null);
  }

  closeEditModal(): void {
    this.editingTable.set(null);
    this.editError.set(null);
  }

  /**
   * Submits Edit Table form
   */
  submitEditTable(): void {
    const table = this.editingTable();
    const restId = this.selectedRestaurantId();
    if (!table || !restId) return;

    const tableNum = Number(this.editForm.tableNumber);
    const capacity = Number(this.editForm.capacity);
    const status = (this.editForm.status || '').trim();

    if (!tableNum || tableNum <= 0) {
      this.editError.set('Table number must be greater than 0.');
      return;
    }

    if (!capacity || capacity <= 0) {
      this.editError.set('Table capacity must be at least 1 guest.');
      return;
    }

    if (!status) {
      this.editError.set('Please select a valid table status.');
      return;
    }

    // Client-side duplicate check
    if (this.tables().some(t => t.id !== table.id && t.tableNumber === tableNum)) {
      this.editError.set(`Table number ${tableNum} already exists in this restaurant.`);
      return;
    }

    const dto: UpdateRestaurantTableDto = {
      restaurantId: restId,
      tableNumber: tableNum,
      capacity: capacity,
      status: status
    };

    this.isSavingEdit.set(true);
    this.editError.set(null);

    this.tableService.updateTable(table.id, dto).subscribe({
      next: () => {
        this.isSavingEdit.set(false);
        this.closeEditModal();
        this.showToast(`Table #${tableNum} updated successfully.`);
        this.loadTables(restId);
      },
      error: (err) => {
        this.isSavingEdit.set(false);
        const msg = err?.error?.message ||
          (Array.isArray(err?.error?.errors) ? err.error.errors.join(' ') : 'Failed to update table.');
        this.editError.set(msg);
      }
    });
  }

  /**
   * Opens Delete Table confirmation modal
   */
  openDeleteModal(table: RestaurantTable): void {
    this.deletingTable.set(table);
    this.deleteError.set(null);
  }

  closeDeleteModal(): void {
    this.deletingTable.set(null);
    this.deleteError.set(null);
  }

  /**
   * Confirms and executes table deletion
   */
  confirmDeleteTable(): void {
    const table = this.deletingTable();
    const restId = this.selectedRestaurantId();
    if (!table || !restId) return;

    this.isDeleting.set(true);
    this.deleteError.set(null);

    this.tableService.deleteTable(table.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.closeDeleteModal();
        this.showToast(`Table #${table.tableNumber} removed successfully.`);
        this.loadTables(restId);
      },
      error: (err) => {
        this.isDeleting.set(false);
        const backendMsg = err?.error?.message;
        // Check for foreign key or reservation conflicts
        if (err?.status === 400 || err?.status === 409 || (backendMsg && backendMsg.toLowerCase().includes('booking'))) {
          this.deleteError.set(
            backendMsg || `Cannot delete Table #${table.tableNumber} because it has associated customer bookings.`
          );
        } else {
          this.deleteError.set(backendMsg || 'Failed to delete table. Please try again.');
        }
      }
    });
  }

  private showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => {
      if (this.toastMessage() === msg) {
        this.toastMessage.set(null);
      }
    }, 4000);
  }
}

