import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NavbarComponent } from '../../../shared/components/navbar/navbar.component';
import { FooterComponent } from '../../../shared/components/footer/footer.component';
import { AuthService } from '../../../core/services/auth.service';
import { CustomerAuthService } from '../../../core/services/customer-auth.service';
import { parseJwtClaims } from '../../../core/models/customer-auth.model';

export const passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');
  if (!password || !confirmPassword) return null;
  return password.value === confirmPassword.value ? null : { passwordMismatch: true };
};

export function backendPasswordValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) {
      return null;
    }

    if (value.length < 8) {
      return { minlength: { requiredLength: 8, actualLength: value.length } };
    }

    if (value.length > 128) {
      return { maxlength: { requiredLength: 128, actualLength: value.length } };
    }

    if (/\s/.test(value)) {
      return { hasWhitespace: true };
    }

    if (!/[A-Z]/.test(value)) {
      return { requiresUppercase: true };
    }

    if (!/[a-z]/.test(value)) {
      return { requiresLowercase: true };
    }

    if (!/\d/.test(value)) {
      return { requiresDigit: true };
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(value)) {
      return { requiresSpecial: true };
    }

    return null;
  };
}

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    NavbarComponent,
    FooterComponent
  ],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.scss'
})
export class SignupComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly customerAuthService = inject(CustomerAuthService);
  private readonly router = inject(Router);

  readonly isPasswordVisible = signal<boolean>(false);
  readonly isConfirmPasswordVisible = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  private readonly passwordInputSignal = signal<string>('');

  signupForm: FormGroup = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9()]{7,15}$/)]],
    password: ['', [Validators.required, backendPasswordValidator()]],
    confirmPassword: ['', [Validators.required]],
    agreeTerms: [true, [Validators.requiredTrue]]
  }, { validators: passwordMatchValidator });

  constructor() {
    this.signupForm.get('password')?.valueChanges.subscribe(val => {
      this.passwordInputSignal.set(val || '');
    });
  }

  // Password strength computation
  readonly passwordStrength = computed(() => {
    const pwd = this.passwordInputSignal() || this.signupForm?.get('password')?.value || '';
    if (!pwd) return { score: 0, label: 'None', class: 'empty' };

    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9\s]/.test(pwd)) score++;

    switch (score) {
      case 1:
        return { score: 1, label: 'Weak', class: 'weak' };
      case 2:
        return { score: 2, label: 'Fair', class: 'fair' };
      case 3:
        return { score: 3, label: 'Good', class: 'good' };
      case 4:
        return { score: 4, label: 'Excellent', class: 'strong' };
      default:
        return { score: 1, label: 'Weak', class: 'weak' };
    }
  });

  togglePasswordVisibility(): void {
    this.isPasswordVisible.update(v => !v);
  }

  toggleConfirmPasswordVisibility(): void {
    this.isConfirmPasswordVisible.update(v => !v);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.signupForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  hasPasswordMismatch(): boolean {
    return !!(
      this.signupForm.hasError('passwordMismatch') &&
      this.signupForm.get('confirmPassword')?.touched
    );
  }

  getPasswordErrorMessage(): string {
    const control = this.signupForm.get('password');
    if (!control || !control.errors) return '';
    if (control.errors['required']) return 'Password is required.';
    if (control.errors['minlength']) return 'Password must be at least 8 characters.';
    if (control.errors['maxlength']) return 'Password cannot exceed 128 characters.';
    if (control.errors['hasWhitespace']) return 'Password must not contain whitespace.';
    if (control.errors['requiresUppercase']) return 'Password must contain at least one uppercase letter.';
    if (control.errors['requiresLowercase']) return 'Password must contain at least one lowercase letter.';
    if (control.errors['requiresDigit']) return 'Password must contain at least one digit.';
    if (control.errors['requiresSpecial']) return 'Password must contain at least one special character.';
    return 'Password does not meet complexity requirements.';
  }

  private isValidUserIdentifier(val: unknown): boolean {
    if (val === undefined || val === null) {
      return false;
    }
    if (typeof val === 'number') {
      return Number.isFinite(val) && val > 0;
    }
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed.length === 0 || trimmed === 'null' || trimmed === 'undefined') {
        return false;
      }
      return /^[a-zA-Z0-9_\-\.]+$/.test(trimmed);
    }
    return false;
  }

  private isValidName(val: unknown): boolean {
    if (typeof val !== 'string') {
      return false;
    }
    const trimmed = val.trim();
    return trimmed.length > 0 && trimmed !== 'null' && trimmed !== 'undefined';
  }

  private isValidEmail(val: unknown): boolean {
    if (typeof val !== 'string') {
      return false;
    }
    const trimmed = val.trim();
    if (trimmed.length === 0) {
      return false;
    }
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  }

  onSubmit(): void {
    if (this.isLoading()) {
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);

    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      this.errorMessage.set('Please review and correct the highlighted fields before submitting.');
      return;
    }

    const fullName = (this.signupForm.get('fullName')?.value || '').trim();
    const email = (this.signupForm.get('email')?.value || '').trim();
    const password = this.signupForm.get('password')?.value || '';

    this.isLoading.set(true);

    // Call real Customer Registration endpoint (POST /api/auth/register)
    this.customerAuthService.register({
      name: fullName,
      email,
      password
    }).subscribe({
      next: () => {
        // Registration successful -> automatically log the customer in
        this.customerAuthService.login({ email, password }).subscribe({
          next: (loginResponse) => {
            const token = loginResponse?.data?.accessToken;
            if (!token || typeof token !== 'string' || token.trim().length === 0) {
              this.isLoading.set(false);
              this.errorMessage.set('Account created, but automatic sign-in failed: Missing access token. Please sign in manually.');
              return;
            }

            // Decode JWT claims using existing parseJwtClaims utility
            const claims = parseJwtClaims(token);
            if (!claims) {
              this.isLoading.set(false);
              this.errorMessage.set('Account created, but automatic sign-in failed: Malformed or invalid security token. Please sign in manually.');
              return;
            }

            // Validate role: exactly "Customer"
            const role = claims.role || claims['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || '';
            if (role !== 'Customer') {
              this.isLoading.set(false);
              this.errorMessage.set('Account created, but automatic sign-in failed: Invalid account role. Please sign in manually.');
              return;
            }

            // Validate user identifier: non-empty valid user identifier (no fallback)
            const rawId = claims.id || claims['nameid'] || claims['sub'] || claims['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];
            if (!this.isValidUserIdentifier(rawId)) {
              this.isLoading.set(false);
              this.errorMessage.set('Account created, but automatic sign-in failed: Missing valid user identifier. Please sign in manually.');
              return;
            }
            const id = typeof rawId === 'string' ? rawId.trim() : (rawId as number);

            // Validate name: non-empty string (no fallback)
            const rawName = claims.name || claims['unique_name'] || claims['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'];
            if (!this.isValidName(rawName)) {
              this.isLoading.set(false);
              this.errorMessage.set('Account created, but automatic sign-in failed: Missing valid user name. Please sign in manually.');
              return;
            }
            const name = (rawName as string).trim();

            // Validate email: non-empty valid email (no fallback)
            const rawEmail = claims.email || claims['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'];
            if (!this.isValidEmail(rawEmail)) {
              this.isLoading.set(false);
              this.errorMessage.set('Account created, but automatic sign-in failed: Missing valid email address. Please sign in manually.');
              return;
            }
            const tokenEmail = (rawEmail as string).trim();

            // Validate token expiration: finite numeric timestamp greater than current Unix time
            const nowInSeconds = Math.floor(Date.now() / 1000);
            if (
              claims.exp === undefined ||
              claims.exp === null ||
              typeof claims.exp !== 'number' ||
              !Number.isFinite(claims.exp) ||
              claims.exp <= nowInSeconds
            ) {
              this.isLoading.set(false);
              this.errorMessage.set('Account created, but automatic sign-in failed: Security token has expired or is invalid. Please sign in manually.');
              return;
            }

            const expiresIn = loginResponse?.data?.expiresIn || 1800;
            const tokenType = loginResponse?.data?.tokenType || 'Bearer';

            // Pass verified token and identity claims to AuthService.setCustomerSession()
            const sessionEstablished = this.authService.setCustomerSession({
              id,
              name,
              email: tokenEmail,
              role: 'Customer',
              accessToken: token,
              tokenType,
              expiresIn
            });

            if (!sessionEstablished) {
              this.isLoading.set(false);
              this.errorMessage.set('Account created, but customer session verification failed. Please sign in manually.');
              return;
            }

            this.isLoading.set(false);
            this.successMessage.set(`Welcome to Dinevia, ${name}! Your membership has been activated.`);
            this.router.navigate(['/profile']);
          },
          error: () => {
            this.isLoading.set(false);
            this.errorMessage.set('Account created successfully, but automatic sign-in was unavailable. Please proceed to the login page.');
          }
        });
      },
      error: (err) => {
        this.isLoading.set(false);
        if (err.status === 0) {
          this.errorMessage.set(
            'Unable to connect to the authentication server. Please ensure the backend is running at https://localhost:7033.'
          );
        } else if (err.status === 400 || err.status === 409) {
          let message = 'Registration failed. Please review your details and try again.';
          if (err.error?.message) {
            message = err.error.message;
          } else if (err.error?.errors && typeof err.error.errors === 'object') {
            const firstKey = Object.keys(err.error.errors)[0];
            if (firstKey && Array.isArray(err.error.errors[firstKey])) {
              message = err.error.errors[firstKey][0];
            }
          }
          this.errorMessage.set(message);
        } else {
          this.errorMessage.set(
            err.error?.message || 'Registration failed. Please verify your connection and try again.'
          );
        }
      }
    });
  }
}
