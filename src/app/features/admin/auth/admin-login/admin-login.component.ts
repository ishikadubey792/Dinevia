import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { OwnerAuthService } from '../../../../core/services/owner-auth.service';
import { parseJwtClaims } from '../../../../core/models/owner-auth.model';
import { standardEmailValidator } from '../../../../core/validators/auth-validators';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './admin-login.component.html',
  styleUrl: './admin-login.component.scss'
})
export class AdminLoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly ownerAuthService = inject(OwnerAuthService);

  readonly showPassword = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, standardEmailValidator()]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    rememberMe: [false]
  });

  // Backwards-compatibility getters & setters for existing tests and direct properties
  get email(): string {
    return this.loginForm.get('email')?.value ?? '';
  }
  set email(val: string) {
    this.loginForm.get('email')?.setValue(val);
  }

  get password(): string {
    return this.loginForm.get('password')?.value ?? '';
  }
  set password(val: string) {
    this.loginForm.get('password')?.setValue(val);
  }

  get rememberMe(): boolean {
    return !!this.loginForm.get('rememberMe')?.value;
  }
  set rememberMe(val: boolean) {
    this.loginForm.get('rememberMe')?.setValue(val);
  }

  togglePasswordVisibility(): void {
    this.showPassword.update(show => !show);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getEmailErrorMessage(): string {
    const control = this.loginForm.get('email');
    if (!control || !control.errors) return '';
    if (control.errors['required']) return 'Please enter your business email address.';
    return 'Please enter a valid email address.';
  }

  getPasswordErrorMessage(): string {
    const control = this.loginForm.get('password');
    if (!control || !control.errors) return '';
    if (control.errors['required']) return 'Please enter your account password.';
    if (control.errors['minlength']) return 'Password must be at least 8 characters long.';
    return 'Please enter a valid password.';
  }

  onLogin(): void {
    // 1. Duplicate submission guard
    if (this.isLoading()) {
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);

    const emailCtrl = this.loginForm.get('email');
    const pwdCtrl = this.loginForm.get('password');

    // Trim whitespace on submission
    const currentEmail = (emailCtrl?.value || '').trim();
    if (emailCtrl && emailCtrl.value !== currentEmail) {
      emailCtrl.setValue(currentEmail, { emitEvent: false });
    }

    // 2. Client-side field validations
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();

      if (!currentEmail || emailCtrl?.hasError('required')) {
        this.errorMessage.set('Please enter your business email address.');
      } else if (emailCtrl?.invalid) {
        this.errorMessage.set('Please enter a valid email address.');
      } else if (!pwdCtrl?.value || pwdCtrl?.hasError('required')) {
        this.errorMessage.set('Please enter your account password.');
      } else if (pwdCtrl?.hasError('minlength')) {
        this.errorMessage.set('Password must be at least 8 characters long.');
      } else {
        this.errorMessage.set('Please provide valid credentials before signing in.');
      }
      return;
    }

    const trimmedEmail = currentEmail;
    const rawPassword = pwdCtrl?.value || '';

    // 3. Initiate API Request
    this.isLoading.set(true);

    this.ownerAuthService.login({
      email: trimmedEmail,
      password: rawPassword
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

