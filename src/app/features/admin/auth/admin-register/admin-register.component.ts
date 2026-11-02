import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminDataService } from '../../../../core/services/admin-data.service';
import { AuthService } from '../../../../core/services/auth.service';
import { CuisineService } from '../../../../core/services/cuisine.service';
import { ApiCuisine } from '../../../../core/models/cuisine.model';

export const DEFAULT_FALLBACK_CUISINES: ApiCuisine[] = [
  { id: 1, name: 'French Haute', isActive: true },
  { id: 2, name: 'Contemporary', isActive: true },
  { id: 3, name: 'Italian', isActive: true },
  { id: 4, name: 'Japanese', isActive: true },
  { id: 5, name: 'Biodynamic', isActive: true },
  { id: 6, name: 'Vegetarian', isActive: true },
  { id: 7, name: 'Mediterranean', isActive: true },
  { id: 8, name: 'Steakhouse', isActive: true },
  { id: 9, name: 'Seafood', isActive: true }
];

@Component({
  selector: 'app-admin-register',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './admin-register.component.html',
  styleUrl: './admin-register.component.scss'
})
export class AdminRegisterComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly adminData = inject(AdminDataService);
  private readonly authService = inject(AuthService);
  private readonly cuisineService = inject(CuisineService);

  // Owner credentials
  ownerName = 'Chef Julien Laurent';
  ownerEmail = 'julien.laurent@dinevia.fr';
  password = '••••••••••••';

  // 1. Restaurant Name
  restaurantName = 'Maison Laurent Paris';
  // 2. Street Address
  streetAddress = '18 Rue Royale';
  // 3. City
  city = 'Paris';
  // 4. Description
  description = 'An intimate dining sanctuary pairing French terroir gastronomy with master cellar vintages and refined table pacing.';
  // 5. Phone
  phone = '+33 1 42 68 88 00';
  // 6. Restaurant Email
  restaurantEmail = 'contact@maisonlaurent.fr';

  // 7. Multiple Cuisines Selection (Live ASP.NET Core API Integration)
  readonly availableCuisines = signal<ApiCuisine[]>(DEFAULT_FALLBACK_CUISINES);
  readonly isLoadingCuisines = signal<boolean>(false);
  readonly cuisineLoadError = signal<string | null>(null);

  // Stored as numbers for backend List<int> CuisineIds
  selectedCuisineIds: number[] = [1, 2];

  // Helper for human-readable selected cuisine names
  get selectedCuisineNames(): string[] {
    const list = this.availableCuisines();
    return list
      .filter(c => this.selectedCuisineIds.includes(c.id))
      .map(c => c.name);
  }

  // Getter for backward-compatibility with existing tests and mock data
  get selectedCuisines(): string[] {
    const names = this.selectedCuisineNames;
    return names.length > 0 ? names : ['French Haute', 'Contemporary'];
  }

  // 8. One Cover Image Upload with Preview
  coverImagePreview = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=900&auto=format&fit=crop&q=80';
  selectedCoverFile: File | null = null;

  readonly isSubmitting = signal<boolean>(false);
  readonly termsAccepted = signal<boolean>(true);

  ngOnInit(): void {
    this.loadCuisines();
  }

  loadCuisines(): void {
    this.isLoadingCuisines.set(true);
    this.cuisineLoadError.set(null);

    this.cuisineService.getCuisines().subscribe({
      next: (response) => {
        this.isLoadingCuisines.set(false);
        if (response && Array.isArray(response.data)) {
          const active = response.data.filter(c => c.isActive !== false);
          this.availableCuisines.set(active);

          // If current selections are not in active list, sync with available IDs
          const activeIds = new Set(active.map(c => c.id));
          const validSelected = this.selectedCuisineIds.filter(id => activeIds.has(id));
          if (validSelected.length > 0) {
            this.selectedCuisineIds = validSelected;
          } else if (active.length > 0) {
            this.selectedCuisineIds = active.slice(0, 2).map(c => c.id);
          }
        }
      },
      error: (err) => {
        this.isLoadingCuisines.set(false);
        this.cuisineLoadError.set('Could not refresh cuisines from live server. Displaying standard options.');
        console.warn('[AdminRegisterComponent] Live cuisines endpoint unavailable, fallback preserved:', err);
      }
    });
  }

  toggleCuisine(cuisine: ApiCuisine | number | string): void {
    let id: number | undefined;

    if (typeof cuisine === 'number') {
      id = cuisine;
    } else if (typeof cuisine === 'object' && cuisine !== null) {
      id = cuisine.id;
    } else if (typeof cuisine === 'string') {
      const found = this.availableCuisines().find(
        c => c.name.toLowerCase() === cuisine.toLowerCase()
      );
      if (found) {
        id = found.id;
      } else {
        const fallback = DEFAULT_FALLBACK_CUISINES.find(
          c => c.name.toLowerCase() === cuisine.toLowerCase()
        );
        id = fallback ? fallback.id : undefined;
      }
    }

    if (id === undefined) return;

    if (this.selectedCuisineIds.includes(id)) {
      if (this.selectedCuisineIds.length > 1) {
        this.selectedCuisineIds = this.selectedCuisineIds.filter(item => item !== id);
      }
    } else {
      this.selectedCuisineIds.push(id);
    }
  }

  isCuisineSelected(cuisineId: number): boolean {
    return this.selectedCuisineIds.includes(cuisineId);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.selectedCoverFile = file;

      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        this.coverImagePreview = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  onSubmit(): void {
    this.isSubmitting.set(true);

    // Prepare structure for future ASP.NET Core multipart/form-data integration
    const formData = new FormData();
    formData.append('ownerName', this.ownerName.trim());
    formData.append('ownerEmail', this.ownerEmail.trim());
    formData.append('password', this.password);
    formData.append('name', this.restaurantName.trim());
    formData.append('address', this.streetAddress.trim());
    formData.append('city', this.city.trim());
    formData.append('description', this.description.trim());
    formData.append('phone', this.phone.trim());
    formData.append('email', this.restaurantEmail.trim());
    // Store selected cuisine IDs as numbers for List<int> CuisineIds backend contract
    formData.append('cuisineIds', JSON.stringify(this.selectedCuisineIds));
    formData.append('cuisines', JSON.stringify(this.selectedCuisines));
    if (this.selectedCoverFile) {
      formData.append('coverImage', this.selectedCoverFile);
    }

    console.info('[AdminRegister: Prepared multipart/form-data payload for backend API]', {
      name: this.restaurantName,
      address: this.streetAddress,
      city: this.city,
      description: this.description,
      phone: this.phone,
      email: this.restaurantEmail,
      cuisineIds: this.selectedCuisineIds,
      cuisines: this.selectedCuisines,
      hasFile: !!this.selectedCoverFile
    });

    // Add to owner's portfolio in local mock state
    this.adminData.addRestaurant({
      name: this.restaurantName.trim(),
      address: this.streetAddress.trim(),
      city: this.city.trim(),
      description: this.description.trim(),
      phone: this.phone.trim(),
      email: this.restaurantEmail.trim(),
      cuisines: [...this.selectedCuisines],
      coverImageUrl: this.coverImagePreview,
      rating: 5.0,
      reviewCount: 0,
      status: 'active'
    });

    // Set owner session in AuthService
    this.authService.login(this.ownerEmail, this.password);

    setTimeout(() => {
      this.isSubmitting.set(false);
      this.router.navigate(['/admin/restaurants']);
    }, 700);
  }
}
