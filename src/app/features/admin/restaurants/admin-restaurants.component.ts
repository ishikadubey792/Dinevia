import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminDataService } from '../../../core/services/admin-data.service';
import { OwnerRestaurant } from '../../../core/models/admin.model';

@Component({
  selector: 'app-admin-restaurants',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './admin-restaurants.component.html',
  styleUrl: './admin-restaurants.component.scss'
})
export class AdminRestaurantsComponent {
  readonly adminData = inject(AdminDataService);

  // Search filter
  readonly searchQuery = signal<string>('');

  // Modals state
  readonly selectedRestaurant = signal<OwnerRestaurant | null>(null);
  readonly editingRestaurant = signal<OwnerRestaurant | null>(null);
  readonly deletingRestaurant = signal<OwnerRestaurant | null>(null);
  readonly toastMessage = signal<string | null>(null);

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
      r.name.toLowerCase().includes(query) ||
      r.city.toLowerCase().includes(query) ||
      r.cuisines.some(c => c.toLowerCase().includes(query))
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
    this.editingRestaurant.set(null);
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
    if (!current) return;

    this.adminData.updateRestaurant(current.id, {
      name: this.editName.trim(),
      address: this.editAddress.trim(),
      city: this.editCity.trim(),
      description: this.editDescription.trim(),
      phone: this.editPhone.trim(),
      email: this.editEmail.trim(),
      cuisines: [...this.editCuisines],
      coverImageUrl: this.editCoverImagePreview || this.editCoverImageUrl
    });

    this.showToast(`Updated "${this.editName}" successfully.`);
    this.closeEdit();

    // If details modal was open for this restaurant, update it as well
    if (this.selectedRestaurant()?.id === current.id) {
      const updated = this.adminData.ownerRestaurants().find(r => r.id === current.id);
      if (updated) this.selectedRestaurant.set(updated);
    }
  }

  // 3. Delete Confirmation Modal
  confirmDelete(restaurant: OwnerRestaurant): void {
    this.deletingRestaurant.set(restaurant);
  }

  cancelDelete(): void {
    this.deletingRestaurant.set(null);
  }

  executeDelete(): void {
    const current = this.deletingRestaurant();
    if (!current) return;

    this.adminData.deleteRestaurant(current.id);
    this.showToast(`Removed "${current.name}" from your portfolio.`);
    this.cancelDelete();

    if (this.selectedRestaurant()?.id === current.id) {
      this.closeDetails();
    }
  }

  showToast(message: string): void {
    this.toastMessage.set(message);
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 3500);
  }
}

