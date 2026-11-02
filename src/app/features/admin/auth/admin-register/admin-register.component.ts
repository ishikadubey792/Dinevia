import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-register',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './admin-register.component.html',
  styleUrl: './admin-register.component.scss'
})
export class AdminRegisterComponent {
  private readonly router = inject(Router);

  restaurantName = 'Maison de Haute Gastronomie';
  ownerName = 'Chef Michel Delacroix';
  businessEmail = 'michel@maison-delacroix.fr';
  phoneNumber = '+33 1 42 68 88 00';
  city = 'Paris, France';
  cuisine = 'Contemporary French';
  seatingCapacity = 18;
  accreditation = 'Michelin Star (1-3)';

  readonly isSubmitting = signal<boolean>(false);
  readonly termsAccepted = signal<boolean>(true);

  onSubmit(): void {
    this.isSubmitting.set(true);

    // Simulate luxury onboarding registration
    setTimeout(() => {
      this.isSubmitting.set(false);
      this.router.navigate(['/admin/dashboard']);
    }, 700);
  }
}

