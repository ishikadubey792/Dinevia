import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ScrollRevealDirective } from '../../../shared/directives/scroll-reveal.directive';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ConfirmModalComponent } from '../../../shared/components/confirm-modal/confirm-modal.component';
import { AdminDataService } from '../../../core/services/admin-data.service';
import { OwnerRestaurant, RestaurantUpsertPayload } from '../../../core/models/admin.model';

@Component({
  selector: 'app-admin-restaurants',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ScrollRevealDirective,
    LoadingSpinnerComponent,
    EmptyStateComponent,
    ConfirmModalComponent
  ],
  templateUrl: './admin-restaurants.component.html',
  styleUrl: './admin-restaurants.component.scss'
})
export class AdminRestaurantsComponent implements OnInit {
  readonly adminData = inject(AdminDataService);

  readonly isLoading = computed(() =>
    this.adminData.isLoadingRestaurants() || (!this.adminData.isLoaded() && !this.adminData.restaurantLoadError())
  );

  ngOnInit(): void {
    if (!this.adminData.isLoaded()) {
      this.adminData.loadOwnerRestaurants().subscribe({
        error: () => {}
      });
    }
  }

  // Search filter
  readonly searchQuery = signal<string>('');

  // Modals state
  readonly selectedRestaurant = signal<OwnerRestaurant | null>(null);
  readonly editingRestaurant = signal<OwnerRestaurant | null>(null);
  readonly deletingRestaurant = signal<OwnerRestaurant | null>(null);
  readonly isSaving = signal<boolean>(false);
  readonly editError = signal<string | null>(null);
  readonly isDeleting = signal<boolean>(false);
  readonly deleteError = signal<string | null>(null);
  readonly toastMessage = signal<string | null>(null);

  // Add Establishment state
  readonly isAddOpen = signal<boolean>(false);
  readonly isAdding = signal<boolean>(false);
  readonly addError = signal<string | null>(null);
  addName = '';
  addAddress = '';
  addCity = '';
  addDescription = '';
  addPhone = '';
  addEmail = '';
  addCoverImageUrl = '';

  // Available cuisine tags for editor
  readonly availableCuisines: string[] = [
    'French Haute',
    'Contemporary',
    'Italian',
    'Japanese',
    'Biodynamic',
    'Vegetarian',
    'Mediterranean',
    'Steakhouse',
    'Seafood'
  ];

  // Edit form model
  editName = '';
  editAddress = '';
  editCity = '';
  editDescription = '';
  editPhone = '';
  editEmail = '';
  editCuisines: string[] = [];
  editCoverImageUrl = '';
  editCoverImagePreview: string | null = null;
  editSelectedFile: File | null = null;

  // Filtered restaurants signal
  readonly filteredRestaurants = computed<OwnerRestaurant[]>(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const list = this.adminData.ownerRestaurants();
    if (!query) return list;

    return list.filter(r =>
      (r.name && r.name.toLowerCase().includes(query)) ||
      (r.city && r.city.toLowerCase().includes(query)) ||
      (r.address && r.address.toLowerCase().includes(query)) ||
      (r.description && r.description.toLowerCase().includes(query)) ||
      (Array.isArray(r.cuisines) && r.cuisines.some(c => c && c.toLowerCase().includes(query)))
    );
  });

  // 1. View Details Modal
  openDetails(restaurant: OwnerRestaurant): void {
    this.selectedRestaurant.set(restaurant);
  }

  closeDetails(): void {
    this.selectedRestaurant.set(null);
  }

  // 2. Edit Modal
  openEdit(restaurant: OwnerRestaurant): void {
    this.editError.set(null);
    this.editingRestaurant.set(restaurant);
    this.editName = restaurant.name;
    this.editAddress = restaurant.address;
    this.editCity = restaurant.city;
    this.editDescription = restaurant.description;
    this.editPhone = restaurant.phone;
    this.editEmail = restaurant.email;
    this.editCuisines = [...restaurant.cuisines];
    this.editCoverImageUrl = restaurant.coverImageUrl;
    this.editCoverImagePreview = restaurant.coverImageUrl;
    this.editSelectedFile = null;
  }

  closeEdit(): void {
    if (!this.isSaving()) {
      this.editingRestaurant.set(null);
      this.editError.set(null);
    }
  }

  toggleEditCuisine(cuisine: string): void {
    if (this.editCuisines.includes(cuisine)) {
      if (this.editCuisines.length > 1) {
        this.editCuisines = this.editCuisines.filter(c => c !== cuisine);
      }
    } else {
      this.editCuisines.push(cuisine);
    }
  }

  onEditCoverFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.editSelectedFile = file;

      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        this.editCoverImagePreview = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  saveEdit(): void {
    const current = this.editingRestaurant();
    if (!current || this.isSaving()) return;

    if (!this.editName.trim() || !this.editAddress.trim() || !this.editPhone.trim()) {
      this.editError.set('Restaurant name, street address, and contact phone are required.');
      return;
    }

    if (this.editEmail.trim() && !this.editEmail.includes('@')) {
      this.editError.set('Please provide a valid email address.');
      return;
    }

    this.isSaving.set(true);
    this.editError.set(null);

    const payload: RestaurantUpsertPayload = {
      name: this.editName.trim(),
      address: this.editAddress.trim(),
      city: this.editCity.trim(),
      description: this.editDescription.trim(),
      phone: this.editPhone.trim(),
      email: this.editEmail.trim(),
      coverImagePath: this.editCoverImageUrl.trim() || null,
      isActive: current.status !== 'draft'
    };

    this.adminData.updateMyRestaurant(current.id, payload).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.showToast(`Updated "${this.editName}" successfully.`);
        this.closeEdit();

        // If details modal was open for this restaurant, update it as well
        if (this.selectedRestaurant()?.id === current.id) {
          const updated = this.adminData.ownerRestaurants().find(r => r.id === current.id);
          if (updated) this.selectedRestaurant.set(updated);
        }
      },
      error: (err) => {
        this.isSaving.set(false);
        const errorMsg =
          err?.error?.message ||
          err?.message ||
          'Failed to update restaurant details. Please verify your entries.';
        this.editError.set(errorMsg);
      }
    });
  }

  // 3. Delete Confirmation Modal
  confirmDelete(restaurant: OwnerRestaurant): void {
    this.deleteError.set(null);
    this.deletingRestaurant.set(restaurant);
  }

  cancelDelete(): void {
    if (!this.isDeleting()) {
      this.deletingRestaurant.set(null);
      this.deleteError.set(null);
    }
  }

  executeDelete(): void {
    const current = this.deletingRestaurant();
    if (!current || this.isDeleting()) return;

    this.isDeleting.set(true);
    this.deleteError.set(null);

    this.adminData.deleteMyRestaurant(current.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.showToast(`Removed "${current.name}" from your portfolio.`);
        this.cancelDelete();

        if (this.selectedRestaurant()?.id === current.id) {
          this.closeDetails();
        }
      },
      error: (err) => {
        this.isDeleting.set(false);
        const errorMsg =
          err?.error?.message ||
          err?.message ||
          'Failed to delete establishment. It may have active bookings or associated records.';
        this.deleteError.set(errorMsg);
      }
    });
  }

  // 4. Add Establishment Modal
  openAdd(): void {
    this.addName = '';
    this.addAddress = '';
    this.addCity = '';
    this.addDescription = '';
    this.addPhone = '';
    this.addEmail = '';
    this.addCoverImageUrl = '';
    this.addError.set(null);
    this.isAddOpen.set(true);
  }

  closeAdd(): void {
    if (!this.isAdding()) {
      this.isAddOpen.set(false);
      this.addError.set(null);
    }
  }

  saveAdd(): void {
    if (this.isAdding()) return;

    if (!this.addName.trim() || !this.addAddress.trim() || !this.addPhone.trim()) {
      this.addError.set('Restaurant name, street address, and contact phone are required.');
      return;
    }

    if (this.addEmail.trim() && !this.addEmail.includes('@')) {
      this.addError.set('Please provide a valid email address.');
      return;
    }

    this.isAdding.set(true);
    this.addError.set(null);

    const payload: RestaurantUpsertPayload = {
      name: this.addName.trim(),
      address: this.addAddress.trim(),
      city: this.addCity.trim(),
      description: this.addDescription.trim(),
      phone: this.addPhone.trim(),
      email: this.addEmail.trim(),
      coverImagePath: this.addCoverImageUrl.trim() || null,
      isActive: true
    };

    this.adminData.createMyRestaurant(payload).subscribe({
      next: (created) => {
        this.isAdding.set(false);
        this.showToast(`Added "${created.name}" to your portfolio.`);
        this.closeAdd();
      },
      error: (err) => {
        this.isAdding.set(false);
        const errorMsg =
          err?.error?.message ||
          err?.message ||
          'Failed to add establishment. Please verify your entries.';
        this.addError.set(errorMsg);
      }
    });
  }

  showToast(message: string): void {
    this.toastMessage.set(message);
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 3500);
  }
}

