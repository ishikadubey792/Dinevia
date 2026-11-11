import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminDataService } from '../../../../core/services/admin-data.service';
import { AuthService } from '../../../../core/services/auth.service';
import { CuisineService } from '../../../../core/services/cuisine.service';
import { OwnerAuthService } from '../../../../core/services/owner-auth.service';
import { ApiCuisine } from '../../../../core/models/cuisine.model';
import { OwnerRegisterRequest } from '../../../../core/models/owner-auth.model';
import { isValidStandardEmail } from '../../../../core/validators/auth-validators';

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
  private readonly ownerAuthService = inject(OwnerAuthService);

  // Owner credentials (initially empty)
  ownerName = '';
  ownerEmail = '';
  password = '';

  // 1. Restaurant Name
  restaurantName = '';
  // 2. Street Address
  streetAddress = '';
  // 3. City
  city = '';
  // 4. Description
  description = '';
  // 5. Phone
  phone = '';
  // 6. Restaurant Email
  restaurantEmail = '';

  // 7. Multiple Cuisines Selection (Live ASP.NET Core API Integration)
  readonly availableCuisines = signal<ApiCuisine[]>(DEFAULT_FALLBACK_CUISINES);
  readonly isLoadingCuisines = signal<boolean>(false);
  readonly cuisineLoadError = signal<string | null>(null);

  // Stored as numbers for backend List<int> CuisineIds
  selectedCuisineIds: number[] = [];

  // Helper for human-readable selected cuisine names
  get selectedCuisineNames(): string[] {
    const list = this.availableCuisines();
    return list
      .filter(c => this.selectedCuisineIds.includes(c.id))
      .map(c => c.name);
  }

  get selectedCuisines(): string[] {
    return this.selectedCuisineNames;
  }

  // 8. One Cover Image Upload with Preview
  coverImagePreview = '';
  selectedCoverFile: File | null = null;

  // Form submission and validation states
  readonly isSubmitting = signal<boolean>(false);
  readonly termsAccepted = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

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

          // Keep only previously chosen IDs that remain active
          const activeIds = new Set(active.map(c => c.id));
          this.selectedCuisineIds = this.selectedCuisineIds.filter(id => activeIds.has(id));
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
      this.selectedCuisineIds = this.selectedCuisineIds.filter(item => item !== id);
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
    // 12. Prevent duplicate submissions while request is running
    if (this.isSubmitting()) {
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);

    // Front-end validation
    if (!this.termsAccepted()) {
      this.errorMessage.set('Please confirm that your establishment meets Dinevia hospitality standards.');
      return;
    }

    if (this.selectedCuisineIds.length === 0) {
      this.errorMessage.set('Please select at least one cuisine category.');
      return;
    }

    if (
      !this.ownerName.trim() ||
      !this.ownerEmail.trim() ||
      !this.password ||
      !this.restaurantName.trim() ||
      !this.streetAddress.trim() ||
      !this.city.trim() ||
      !this.phone.trim() ||
      !this.restaurantEmail.trim()
    ) {
      this.errorMessage.set('Please complete all required fields.');
      return;
    }

    if (!isValidStandardEmail(this.ownerEmail) || !isValidStandardEmail(this.restaurantEmail)) {
      this.errorMessage.set('Please enter valid email addresses for owner and restaurant.');
      return;
    }

    this.isSubmitting.set(true);

    const requestPayload: OwnerRegisterRequest = {
      ownerName: this.ownerName.trim(),
      ownerEmail: this.ownerEmail.trim(),
      password: this.password,
      restaurantName: this.restaurantName.trim(),
      address: this.streetAddress.trim(),
      city: this.city.trim(),
      description: this.description.trim(),
      phone: this.phone.trim(),
      restaurantEmail: this.restaurantEmail.trim(),
      cuisineIds: this.selectedCuisineIds,
      coverImage: this.selectedCoverFile
    };

    // Call real POST /api/auth/register-restaurant-owner multipart/form-data API
    this.ownerAuthService.registerRestaurantOwner(requestPayload).subscribe({
      next: (response) => {
        this.isSubmitting.set(false);
        const data = response?.data;

        if (data) {
          // 13 & 14. Establish dedicated owner authentication session
          this.authService.setOwnerSession({
            id: data.id,
            name: data.name,
            email: data.email,
            role: data.role,
            restaurant: data.restaurant,
            accessToken: data.accessToken,
            tokenType: data.tokenType,
            expiresIn: data.expiresIn
          });
        }

        // Add to owner's portfolio in local mock state for immediate dashboard reflection
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

        this.successMessage.set('Registration successful! Opening your sanctuary console...');

        // 15. Navigate to /admin/dashboard only after successful registration and session establishment
        setTimeout(() => {
          this.router.navigate(['/admin/dashboard']);
        }, 500);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        let message = 'Restaurant registration failed. Please review your details and try again.';

        if (err?.error?.message) {
          message = err.error.message;
        } else if (err?.error?.errors && typeof err.error.errors === 'object') {
          const keys = Object.keys(err.error.errors);
          if (keys.length > 0 && Array.isArray(err.error.errors[keys[0]])) {
            message = err.error.errors[keys[0]][0];
          }
        }

        this.errorMessage.set(message);
      }
    });
  }
}
