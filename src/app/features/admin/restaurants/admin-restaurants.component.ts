import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ScrollRevealDirective } from '../../../shared/directives/scroll-reveal.directive';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ConfirmModalComponent } from '../../../shared/components/confirm-modal/confirm-modal.component';
import { RestaurantGalleryModalComponent } from './restaurant-gallery-modal/restaurant-gallery-modal.component';
import { RestaurantMenuModalComponent } from './restaurant-menu-modal/restaurant-menu-modal.component';
import { AdminDataService } from '../../../core/services/admin-data.service';
import { RestaurantMediaService } from '../../../core/services/restaurant-media.service';
import { OwnerRestaurant, RestaurantUpsertPayload } from '../../../core/models/admin.model';
import { resolveGalleryImageUrl, resolveMenuImageUrl, MenuImageItem } from '../../../core/models/restaurant-media.model';
import { resolveCoverImageUrl } from '../../../core/models/restaurant.model';

@Component({
  selector: 'app-admin-restaurants',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ScrollRevealDirective,
    LoadingSpinnerComponent,
    EmptyStateComponent,
    ConfirmModalComponent,
    RestaurantGalleryModalComponent,
    RestaurantMenuModalComponent
  ],
  templateUrl: './admin-restaurants.component.html',
  styleUrl: './admin-restaurants.component.scss'
})
export class AdminRestaurantsComponent implements OnInit, OnDestroy {
  readonly adminData = inject(AdminDataService);
  private readonly mediaService = inject(RestaurantMediaService);

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

  ngOnDestroy(): void {
    this.adminData.restoreSidebarAfterModal();
  }

  // Tab navigation: 'active' vs 'deactivated'
  readonly activeTab = signal<'active' | 'deactivated'>('active');

  readonly activeRestaurantsCount = computed(() =>
    this.adminData.ownerRestaurants().filter(r => r.isActive !== false).length
  );

  readonly deactivatedRestaurantsCount = computed(() =>
    this.adminData.ownerRestaurants().filter(r => r.isActive === false).length
  );

  // Search filter
  readonly searchQuery = signal<string>('');

  // Modals state
  readonly selectedRestaurant = signal<OwnerRestaurant | null>(null);
  readonly editingRestaurant = signal<OwnerRestaurant | null>(null);
  readonly deletingRestaurant = signal<OwnerRestaurant | null>(null);
  readonly deactivatingRestaurant = signal<OwnerRestaurant | null>(null);
  readonly reactivatingRestaurant = signal<OwnerRestaurant | null>(null);

  readonly isSaving = signal<boolean>(false);
  readonly editError = signal<string | null>(null);
  readonly isDeleting = signal<boolean>(false);
  readonly deleteError = signal<string | null>(null);
  readonly isDeactivating = signal<boolean>(false);
  readonly deactivateError = signal<string | null>(null);
  readonly isReactivating = signal<boolean>(false);
  readonly reactivateError = signal<string | null>(null);
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

  // Filtered restaurants signal based on active tab and search query
  readonly filteredRestaurants = computed<OwnerRestaurant[]>(() => {
    const tab = this.activeTab();
    const query = this.searchQuery().trim().toLowerCase();
    const list = this.adminData.ownerRestaurants();

    // 1. Filter by Active vs Deactivated tab
    const tabFiltered = list.filter(r =>
      tab === 'active' ? r.isActive !== false : r.isActive === false
    );

    // 2. Filter by search query
    if (!query) return tabFiltered;

    return tabFiltered.filter(r =>
      (r.name && r.name.toLowerCase().includes(query)) ||
      (r.city && r.city.toLowerCase().includes(query)) ||
      (r.address && r.address.toLowerCase().includes(query)) ||
      (r.description && r.description.toLowerCase().includes(query)) ||
      (Array.isArray(r.cuisines) && r.cuisines.some(c => c && c.toLowerCase().includes(query)))
    );
  });

  // Details Modal gallery preview state
  readonly detailsGalleryImages = signal<string[]>([]);
  readonly isLoadingDetailsGallery = signal<boolean>(false);

  // Details Modal menu preview state
  readonly detailsMenuImages = signal<MenuImageItem[]>([]);
  readonly isLoadingDetailsMenu = signal<boolean>(false);
  readonly isDetailsMenuInactive = signal<boolean>(false);

  // Gallery Management Modal state
  readonly galleryRestaurant = signal<OwnerRestaurant | null>(null);

  // Menu Management Modal state
  readonly menuRestaurant = signal<OwnerRestaurant | null>(null);

  // 1. View Details Modal
  openDetails(restaurant: OwnerRestaurant): void {
    this.selectedRestaurant.set(restaurant);
    this.loadDetailsGallery(restaurant.id);
    this.loadDetailsMenu(restaurant);
  }

  loadDetailsGallery(restaurantId: string | number): void {
    this.isLoadingDetailsGallery.set(true);
    this.mediaService.getGalleryImages(restaurantId).subscribe({
      next: (images) => {
        this.isLoadingDetailsGallery.set(false);
        const urls = images.map(img => resolveGalleryImageUrl(img.imagePath));
        this.detailsGalleryImages.set(urls);
        this.adminData.updateRestaurant(String(restaurantId), { galleryImages: urls });
      },
      error: () => {
        this.isLoadingDetailsGallery.set(false);
        this.detailsGalleryImages.set([]);
      }
    });
  }

  loadDetailsMenu(restaurant: OwnerRestaurant): void {
    // If establishment is deactivated, do not call GET (backend requires active restaurant)
    if (restaurant.isActive === false) {
      this.isDetailsMenuInactive.set(true);
      this.detailsMenuImages.set([]);
      this.isLoadingDetailsMenu.set(false);
      return;
    }

    this.isDetailsMenuInactive.set(false);
    this.isLoadingDetailsMenu.set(true);
    this.mediaService.getMenuImages(restaurant.id).subscribe({
      next: (images) => {
        this.isLoadingDetailsMenu.set(false);
        const sorted = images
          .slice()
          .sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id)
          .map((img, idx) => ({
            ...img,
            fullUrl: resolveMenuImageUrl(img.imagePath),
            pageLabel: `Page ${img.displayOrder || idx + 1}`
          }));
        this.detailsMenuImages.set(sorted);
      },
      error: () => {
        this.isLoadingDetailsMenu.set(false);
        this.detailsMenuImages.set([]);
      }
    });
  }

  closeDetails(): void {
    this.selectedRestaurant.set(null);
    this.detailsGalleryImages.set([]);
    this.detailsMenuImages.set([]);
    this.isDetailsMenuInactive.set(false);
  }

  // Gallery Modal Handlers
  openGallery(restaurant: OwnerRestaurant): void {
    this.adminData.autoCollapseForModal();
    this.galleryRestaurant.set(restaurant);
  }

  closeGallery(): void {
    this.galleryRestaurant.set(null);
    this.adminData.restoreSidebarAfterModal();
  }

  // Menu Modal Handlers
  openMenu(restaurant: OwnerRestaurant): void {
    this.adminData.autoCollapseForModal();
    this.menuRestaurant.set(restaurant);
  }

  closeMenu(): void {
    this.menuRestaurant.set(null);
    this.adminData.restoreSidebarAfterModal();
  }

  onMenuChanged(event: { restaurantId: string; imagesCount: number }): void {
    const currentDetails = this.selectedRestaurant();
    if (currentDetails && String(currentDetails.id) === event.restaurantId) {
      this.loadDetailsMenu(currentDetails);
    }
  }

  onPrimaryImageChanged(event: { restaurantId: string; newCoverPath: string; newCoverUrl: string }): void {
    const resolvedUrl = event.newCoverUrl || resolveCoverImageUrl(event.newCoverPath);

    // 1. Update AdminDataService portfolio state (restaurant cards immediately reflect new cover)
    this.adminData.updateRestaurant(event.restaurantId, {
      coverImagePath: event.newCoverPath,
      coverImageUrl: resolvedUrl
    });

    // 2. If details modal is open for this restaurant, update it as well
    const currentDetails = this.selectedRestaurant();
    if (currentDetails && String(currentDetails.id) === event.restaurantId) {
      this.selectedRestaurant.set({
        ...currentDetails,
        coverImagePath: event.newCoverPath,
        coverImageUrl: resolvedUrl
      });
    }

    // 3. If gallery modal is open for this restaurant, update it as well
    const currentGallery = this.galleryRestaurant();
    if (currentGallery && String(currentGallery.id) === event.restaurantId) {
      this.galleryRestaurant.set({
        ...currentGallery,
        coverImagePath: event.newCoverPath,
        coverImageUrl: resolvedUrl
      });
    }
  }

  onGalleryChanged(event: { restaurantId: string; imagesCount: number; primaryUrl?: string }): void {
    this.loadDetailsGallery(event.restaurantId);
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
      coverImagePath: this.editCoverImageUrl.trim() || current.coverImagePath || null,
      isActive: current.isActive !== false
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

  // 4. Deactivate Confirmation Modal
  confirmDeactivate(restaurant: OwnerRestaurant): void {
    this.deactivateError.set(null);
    this.deactivatingRestaurant.set(restaurant);
  }

  cancelDeactivate(): void {
    if (!this.isDeactivating()) {
      this.deactivatingRestaurant.set(null);
      this.deactivateError.set(null);
    }
  }

  executeDeactivate(): void {
    const current = this.deactivatingRestaurant();
    if (!current || this.isDeactivating()) return;

    this.isDeactivating.set(true);
    this.deactivateError.set(null);

    const payload: RestaurantUpsertPayload = {
      name: current.name,
      address: current.address,
      city: current.city || '',
      description: current.description || '',
      phone: current.phone,
      email: current.email || '',
      coverImagePath: current.coverImagePath || current.coverImageUrl || null,
      isActive: false
    };

    this.adminData.updateMyRestaurant(current.id, payload).subscribe({
      next: () => {
        this.isDeactivating.set(false);
        this.showToast(`Deactivated "${current.name}". It is now listed under Deactivated Restaurants.`);
        this.cancelDeactivate();

        if (this.selectedRestaurant()?.id === current.id) {
          const updated = this.adminData.ownerRestaurants().find(r => r.id === current.id);
          if (updated) this.selectedRestaurant.set(updated);
        }
      },
      error: (err) => {
        this.isDeactivating.set(false);
        const errorMsg =
          err?.error?.message ||
          err?.message ||
          'Failed to deactivate establishment. Please try again.';
        this.deactivateError.set(errorMsg);
      }
    });
  }

  // 5. Reactivate Confirmation Modal
  confirmReactivate(restaurant: OwnerRestaurant): void {
    this.reactivateError.set(null);
    this.reactivatingRestaurant.set(restaurant);
  }

  cancelReactivate(): void {
    if (!this.isReactivating()) {
      this.reactivatingRestaurant.set(null);
      this.reactivateError.set(null);
    }
  }

  executeReactivate(): void {
    const current = this.reactivatingRestaurant();
    if (!current || this.isReactivating()) return;

    this.isReactivating.set(true);
    this.reactivateError.set(null);

    const payload: RestaurantUpsertPayload = {
      name: current.name,
      address: current.address,
      city: current.city || '',
      description: current.description || '',
      phone: current.phone,
      email: current.email || '',
      coverImagePath: current.coverImagePath || current.coverImageUrl || null,
      isActive: true
    };

    this.adminData.updateMyRestaurant(current.id, payload).subscribe({
      next: () => {
        this.isReactivating.set(false);
        this.showToast(`Reactivated "${current.name}". It is now active and live on Dinevia.`);
        this.cancelReactivate();

        if (this.selectedRestaurant()?.id === current.id) {
          const updated = this.adminData.ownerRestaurants().find(r => r.id === current.id);
          if (updated) this.selectedRestaurant.set(updated);
        }
      },
      error: (err) => {
        this.isReactivating.set(false);
        const errorMsg =
          err?.error?.message ||
          err?.message ||
          'Failed to reactivate establishment. Please try again.';
        this.reactivateError.set(errorMsg);
      }
    });
  }

  // 6. Add Establishment Modal
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

