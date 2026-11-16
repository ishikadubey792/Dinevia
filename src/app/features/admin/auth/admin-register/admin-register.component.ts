import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminDataService } from '../../../../core/services/admin-data.service';
import { AuthService } from '../../../../core/services/auth.service';
import { CuisineService } from '../../../../core/services/cuisine.service';
import { OwnerAuthService } from '../../../../core/services/owner-auth.service';
import { ApiCuisine } from '../../../../core/models/cuisine.model';
import { OwnerRegisterRequest } from '../../../../core/models/owner-auth.model';
import {
  backendPasswordValidator,
  dineviaEmailValidator,
  getDineviaEmailErrorMessage,
  getIndianPhoneErrorMessage,
  getPasswordErrorMessage,
  indianPhoneValidator,
  isValidStandardEmail
} from '../../../../core/validators/auth-validators';

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
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './admin-register.component.html',
  styleUrl: './admin-register.component.scss'
})
export class AdminRegisterComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly adminData = inject(AdminDataService);
  private readonly authService = inject(AuthService);
  private readonly cuisineService = inject(CuisineService);
  private readonly ownerAuthService = inject(OwnerAuthService);

  readonly registerForm: FormGroup = this.fb.group({
    ownerName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    ownerEmail: ['', [Validators.required, dineviaEmailValidator(), Validators.maxLength(150)]],
    password: ['', [Validators.required, backendPasswordValidator()]],
    restaurantName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    streetAddress: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(250)]],
    city: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(1000)]],
    phone: ['', [Validators.required, indianPhoneValidator()]],
    restaurantEmail: ['', [Validators.required, dineviaEmailValidator(), Validators.maxLength(150)]],
    termsAccepted: [false, [Validators.requiredTrue]]
  });

  // Backward-compatible getters and setters
  get ownerName(): string { return this.registerForm.get('ownerName')?.value ?? ''; }
  set ownerName(val: string) { this.registerForm.get('ownerName')?.setValue(val); }

  get ownerEmail(): string { return this.registerForm.get('ownerEmail')?.value ?? ''; }
  set ownerEmail(val: string) { this.registerForm.get('ownerEmail')?.setValue(val); }

  get password(): string { return this.registerForm.get('password')?.value ?? ''; }
  set password(val: string) { this.registerForm.get('password')?.setValue(val); }

  get restaurantName(): string { return this.registerForm.get('restaurantName')?.value ?? ''; }
  set restaurantName(val: string) { this.registerForm.get('restaurantName')?.setValue(val); }

  get streetAddress(): string { return this.registerForm.get('streetAddress')?.value ?? ''; }
  set streetAddress(val: string) { this.registerForm.get('streetAddress')?.setValue(val); }

  get city(): string { return this.registerForm.get('city')?.value ?? ''; }
  set city(val: string) { this.registerForm.get('city')?.setValue(val); }

  get description(): string { return this.registerForm.get('description')?.value ?? ''; }
  set description(val: string) { this.registerForm.get('description')?.setValue(val); }

  get phone(): string { return this.registerForm.get('phone')?.value ?? ''; }
  set phone(val: string) { this.registerForm.get('phone')?.setValue(val); }

  get restaurantEmail(): string { return this.registerForm.get('restaurantEmail')?.value ?? ''; }
  set restaurantEmail(val: string) { this.registerForm.get('restaurantEmail')?.setValue(val); }

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

  constructor() {
    this.registerForm.get('termsAccepted')?.valueChanges.subscribe(val => {
      this.termsAccepted.set(!!val);
    });
  }

  ngOnInit(): void {
    this.loadCuisines();
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.registerForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getOwnerNameErrorMessage(): string {
    const control = this.registerForm.get('ownerName');
    if (!control || !control.errors) return '';
    if (control.errors['required']) return 'Owner / Chef full name is required.';
    if (control.errors['minlength']) return 'Name must be at least 2 characters.';
    return 'Please enter a valid owner name.';
  }

  getOwnerEmailErrorMessage(): string {
    return getDineviaEmailErrorMessage(this.registerForm.get('ownerEmail')?.errors);
  }

  getPasswordErrorMessage(): string {
    return getPasswordErrorMessage(this.registerForm.get('password')?.errors);
  }

  getRestaurantNameErrorMessage(): string {
    const control = this.registerForm.get('restaurantName');
    if (!control || !control.errors) return '';
    if (control.errors['required']) return 'Restaurant name is required.';
    if (control.errors['minlength']) return 'Restaurant name must be at least 2 characters.';
    return 'Please enter a valid restaurant name.';
  }

  getStreetAddressErrorMessage(): string {
    const control = this.registerForm.get('streetAddress');
    if (!control || !control.errors) return '';
    if (control.errors['required']) return 'Street address is required.';
    if (control.errors['minlength']) return 'Address must be at least 5 characters.';
    return 'Please enter a valid street address.';
  }

  getCityErrorMessage(): string {
    const control = this.registerForm.get('city');
    if (!control || !control.errors) return '';
    if (control.errors['required']) return 'City is required.';
    if (control.errors['minlength']) return 'City must be at least 2 characters.';
    return 'Please enter a valid city.';
  }

  getDescriptionErrorMessage(): string {
    const control = this.registerForm.get('description');
    if (!control || !control.errors) return '';
    if (control.errors['required']) return 'Restaurant description is required.';
    if (control.errors['minlength']) return 'Description must be at least 10 characters.';
    return 'Please enter a valid description.';
  }

  getPhoneErrorMessage(): string {
    return getIndianPhoneErrorMessage(this.registerForm.get('phone')?.errors);
  }

  getRestaurantEmailErrorMessage(): string {
    return getDineviaEmailErrorMessage(this.registerForm.get('restaurantEmail')?.errors);
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

    // Sync termsAccepted from signal if test set component.termsAccepted.set(true)
    if (this.termsAccepted()) {
      this.registerForm.get('termsAccepted')?.setValue(true, { emitEvent: false });
    }

    // Front-end validation
    if (!this.termsAccepted() && !this.registerForm.get('termsAccepted')?.value) {
      this.errorMessage.set('Please confirm that your establishment meets Dinevia hospitality standards.');
      return;
    }

    if (this.selectedCuisineIds.length === 0) {
      this.errorMessage.set('Please select at least one cuisine category.');
      return;
    }

    // Trim whitespace on all string controls
    const stringKeys = ['ownerName', 'ownerEmail', 'restaurantName', 'streetAddress', 'city', 'description', 'phone', 'restaurantEmail'];
    for (const key of stringKeys) {
      const c = this.registerForm.get(key);
      if (c && typeof c.value === 'string') {
        const trimmed = c.value.trim();
        if (c.value !== trimmed) {
          c.setValue(trimmed, { emitEvent: false });
        }
      }
    }

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();

      const ownerEmailCtrl = this.registerForm.get('ownerEmail');
      const restEmailCtrl = this.registerForm.get('restaurantEmail');
      const phoneCtrl = this.registerForm.get('phone');
      const pwdCtrl = this.registerForm.get('password');

      if (
        !this.ownerName.trim() ||
        !this.ownerEmail.trim() ||
        !this.password ||
        !this.restaurantName.trim() ||
        !this.streetAddress.trim() ||
        !this.city.trim() ||
        !this.description.trim() ||
        !this.phone.trim() ||
        !this.restaurantEmail.trim()
      ) {
        this.errorMessage.set('Please complete all required fields.');
      } else if (ownerEmailCtrl?.invalid || restEmailCtrl?.invalid) {
        this.errorMessage.set('Please enter valid email addresses for owner and restaurant.');
      } else if (phoneCtrl?.invalid) {
        this.errorMessage.set(this.getPhoneErrorMessage());
      } else if (pwdCtrl?.invalid) {
        this.errorMessage.set(this.getPasswordErrorMessage());
      } else {
        this.errorMessage.set('Please review and correct the highlighted fields before submitting.');
      }
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
