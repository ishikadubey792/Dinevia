import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { OwnerAuthService } from '../../../../core/services/owner-auth.service';
import { parseJwtClaims } from '../../../../core/models/owner-auth.model';
import { isValidStandardEmail } from '../../../../core/validators/auth-validators';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './admin-login.component.html',
  styleUrl: './admin-login.component.scss'
})
export class AdminLoginComponent {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly ownerAuthService = inject(OwnerAuthService);

  email = '';
  password = '';
  rememberMe = false;

  readonly showPassword = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  togglePasswordVisibility(): void {
    this.showPassword.update(show => !show);
  }

  onLogin(): void {
    // 1. Duplicate submission guard
    if (this.isLoading()) {
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);

    const trimmedEmail = this.email ? this.email.trim() : '';

    // 2. Client-side field validations
    if (!trimmedEmail) {
      this.errorMessage.set('Please enter your business email address.');
      return;
    }

    if (!isValidStandardEmail(trimmedEmail)) {
      this.errorMessage.set('Please enter a valid email address.');
      return;
    }

    if (!this.password || this.password.trim().length === 0) {
      this.errorMessage.set('Please enter your account password.');
      return;
    }

    if (this.password.length < 8) {
      this.errorMessage.set('Password must be at least 8 characters long.');
      return;
    }

    // 3. Initiate API Request
    this.isLoading.set(true);

    this.ownerAuthService.login({
      email: trimmedEmail,
      password: this.password
    }).subscribe({
      next: (response) => {
        const token = response?.data?.accessToken;
        if (!token) {
          this.isLoading.set(false);
          this.errorMessage.set('Authentication response missing access token. Please try again.');
          return;
        }

        // Decode claims safely
        const claims = parseJwtClaims(token);
        const role = response?.data?.role || claims?.role || '';

        // 4. Role validation: Must be strictly RestaurantOwner
        if (role !== 'RestaurantOwner') {
          this.isLoading.set(false);
          this.errorMessage.set(
            `Access denied. This account has role '${role || 'Customer'}', which is not authorized for the Restaurant Owner Portal. Please sign in with a registered Restaurant Owner account or list your restaurant.`
          );
          return;
        }

        // 5. Establish separated owner session
        const id = response?.data?.id || claims?.id || 'owner';
        const name = response?.data?.name || claims?.name || trimmedEmail.split('@')[0];
        const email = response?.data?.email || claims?.email || trimmedEmail;
        const restaurant = response?.data?.restaurant || null;
        const expiresIn = response?.data?.expiresIn || 1800;
        const tokenType = response?.data?.tokenType || 'Bearer';

        this.authService.setOwnerSession({
          id,
          name,
          email,
          role: 'RestaurantOwner',
          restaurant,
          accessToken: token,
          tokenType,
          expiresIn
        });

        this.isLoading.set(false);
        this.successMessage.set(`Welcome back, ${name}! Redirecting to Sanctuary Console...`);

        // Navigate to Owner Dashboard
        this.router.navigate(['/admin/dashboard']);
      },
      error: (err) => {
        this.isLoading.set(false);

        if (err.status === 401) {
          this.errorMessage.set('Invalid email or password. Please verify your credentials and try again.');
        } else if (err.status === 400) {
          const detail = err.error?.message || err.error?.title || 'Invalid login request.';
          this.errorMessage.set(detail);
        } else if (err.status === 0) {
          this.errorMessage.set('Unable to connect to the authentication server. Please ensure the backend is running at https://localhost:7033.');
        } else {
          this.errorMessage.set(err.error?.message || 'Authentication failed. Please verify your connection and try again.');
        }
      }
    });
  }
}

