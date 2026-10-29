import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { AuthService } from '../../core/services/auth.service';
import { BookingService } from '../../core/services/booking.service';
import { RestaurantService } from '../../core/services/restaurant.service';
import { User } from '../../core/models/user.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    NavbarComponent,
    FooterComponent
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly authService = inject(AuthService);
  private readonly bookingService = inject(BookingService);
  private readonly restaurantService = inject(RestaurantService);
  private readonly router = inject(Router);

  readonly isEditMode = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly toastMessage = signal<string | null>(null);

  // Available options for selection in profile
  readonly cityOptions = ['New York', 'Paris', 'London', 'Tokyo', 'San Francisco', 'Milan'];
  
  readonly seatingOptions = [
    "Chef's Counter & Window Alcove",
    "Main Dining Room",
    "Private Wine Vault",
    "Outdoor Garden Terrace",
    "Sommelier Corner"
  ];

  readonly dietaryOptions = [
    'Pescatarian',
    'Gluten-Free Friendly',
    'Vegetarian',
    'Vegan',
    'Dairy-Free',
    'Nut Allergy',
    'Shellfish-Free',
    'Halal'
  ];

  readonly cuisineOptions = [
    'Italian',
    'French Contemporary',
    'Japanese Omakase',
    'Spanish Tapas',
    'Nordic Tasting',
    'Modern American',
    'Mediterranean'
  ];

  readonly selectedDietary = signal<string[]>([]);
  readonly selectedCuisines = signal<string[]>([]);

  profileForm!: FormGroup;

  // Computed metrics
  readonly upcomingBookingsCount = computed(() => {
    return this.bookingService.bookingHistory().filter(b => b.status === 'confirmed').length;
  });

  readonly wishlistCount = computed(() => {
    return this.restaurantService.savedIds().size;
  });

  readonly userInitials = computed(() => {
    const user = this.authService.currentUser();
    if (!user || !user.fullName) return 'DV';
    const parts = user.fullName.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return user.fullName.substring(0, 2).toUpperCase();
  });

  ngOnInit(): void {
    this.initForm();
  }

  private initForm(): void {
    const user = this.authService.currentUser();
    const defaults = {
      fullName: user?.fullName || 'Alexander Wright',
      email: user?.email || 'a.wright@epicuredining.com',
      phone: user?.phone || '+1 (555) 234-5678',
      preferredCity: user?.preferredCity || 'New York',
      preferredSeating: user?.preferredSeating || "Chef's Counter & Window Alcove"
    };

    this.selectedDietary.set(user?.dietaryPreferences || ['Pescatarian', 'Gluten-Free Friendly']);
    this.selectedCuisines.set(user?.favoriteCuisines || ['Italian', 'French Contemporary', 'Japanese Omakase']);

    this.profileForm = this.fb.group({
      fullName: [defaults.fullName, [Validators.required, Validators.minLength(2)]],
      email: [defaults.email, [Validators.required, Validators.email]],
      phone: [defaults.phone, [Validators.required, Validators.pattern(/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{7,15}$/)]],
      preferredCity: [defaults.preferredCity, [Validators.required]],
      preferredSeating: [defaults.preferredSeating, [Validators.required]]
    });
  }

  enableEdit(): void {
    this.initForm();
    this.isEditMode.set(true);
  }

  cancelEdit(): void {
    this.isEditMode.set(false);
  }

  toggleDietary(tag: string): void {
    const current = [...this.selectedDietary()];
    const index = current.indexOf(tag);
    if (index >= 0) {
      current.splice(index, 1);
    } else {
      current.push(tag);
    }
    this.selectedDietary.set(current);
  }

  toggleCuisine(tag: string): void {
    const current = [...this.selectedCuisines()];
    const index = current.indexOf(tag);
    if (index >= 0) {
      current.splice(index, 1);
    } else {
      current.push(tag);
    }
    this.selectedCuisines.set(current);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.profileForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    const formVal = this.profileForm.value;

    setTimeout(() => {
      this.authService.updateProfile({
        fullName: formVal.fullName,
        email: formVal.email,
        phone: formVal.phone,
        preferredCity: formVal.preferredCity,
        preferredSeating: formVal.preferredSeating,
        dietaryPreferences: this.selectedDietary(),
        favoriteCuisines: this.selectedCuisines()
      });

      this.isSaving.set(false);
      this.isEditMode.set(false);
      this.showToast('Profile information successfully updated in mock session.');
    }, 500);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  private showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => {
      if (this.toastMessage() === msg) {
        this.toastMessage.set(null);
      }
    }, 3500);
  }
}
