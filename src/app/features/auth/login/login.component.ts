import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { NavbarComponent } from '../../../shared/components/navbar/navbar.component';
import { FooterComponent } from '../../../shared/components/footer/footer.component';
import { AuthService } from '../../../core/services/auth.service';
import { CustomerAuthService } from '../../../core/services/customer-auth.service';
import { parseJwtClaims } from '../../../core/models/customer-auth.model';
import { isValidStandardEmail, standardEmailValidator } from '../../../core/validators/auth-validators';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    NavbarComponent,
    FooterComponent
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  @Input() embedded = false;
  @Output() authSuccess = new EventEmitter<void>();
  @Output() switchToSignup = new EventEmitter<void>();
  @Output() forgotPassword = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly customerAuthService = inject(CustomerAuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly isPasswordVisible = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, standardEmailValidator()]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    rememberMe: [false]
  });

  togglePasswordVisibility(): void {
    this.isPasswordVisible.update(v => !v);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
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
    return isValidStandardEmail(val);
  }

  onForgotPasswordClick(): void {
    this.forgotPassword.emit();
    this.router.navigate(['/forgot-password']);
  }

  onSubmit(): void {
    if (this.isLoading()) {
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.errorMessage.set('Please provide a valid email and a password of at least 8 characters.');
      return;
    }

    const email = (this.loginForm.get('email')?.value || '').trim();
    const password = this.loginForm.get('password')?.value || '';

    this.isLoading.set(true);

    this.customerAuthService.login({ email, password }).subscribe({
      next: (response) => {
        const token = response?.data?.accessToken;
        if (!token || typeof token !== 'string' || token.trim().length === 0) {
          this.isLoading.set(false);
          this.errorMessage.set('Authentication failed: Missing access token in server response.');
          return;
        }

        // Decode JWT claims using existing parseJwtClaims utility
        const claims = parseJwtClaims(token);
        if (!claims) {
          this.isLoading.set(false);
          this.errorMessage.set('Authentication failed: Malformed or undecodable security token.');
          return;
        }

        // 2. Validate role: exactly "Customer"
        const role = claims.role || claims['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || '';
        if (role !== 'Customer') {
          this.isLoading.set(false);
          this.errorMessage.set(
            `Access denied. This account has role '${role || 'Unknown'}', which is not authorized for Customer login. Restaurant owners must sign in through the Partner Portal.`
          );
          return;
        }

        // 3. Validate user identifier: non-empty valid user identifier (no fallback)
        const rawId = claims.id || claims['nameid'] || claims['sub'] || claims['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];
        if (!this.isValidUserIdentifier(rawId)) {
          this.isLoading.set(false);
          this.errorMessage.set('Authentication failed: Security token is missing a valid user identifier.');
          return;
        }
        const id = typeof rawId === 'string' ? rawId.trim() : (rawId as number);

        // 4. Validate name: non-empty string (no fallback to email prefix)
        const rawName = claims.name || claims['unique_name'] || claims['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'];
        if (!this.isValidName(rawName)) {
          this.isLoading.set(false);
          this.errorMessage.set('Authentication failed: Security token is missing a valid user name.');
          return;
        }
        const name = (rawName as string).trim();

        // 5. Validate email: non-empty valid email (no fallback to input email)
        const rawEmail = claims.email || claims['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'];
        if (!this.isValidEmail(rawEmail)) {
          this.isLoading.set(false);
          this.errorMessage.set('Authentication failed: Security token is missing a valid email address.');
          return;
        }
        const tokenEmail = (rawEmail as string).trim();

        // 6. Validate token expiration: finite numeric timestamp greater than current Unix time
        const nowInSeconds = Math.floor(Date.now() / 1000);
        if (
          claims.exp === undefined ||
          claims.exp === null ||
          typeof claims.exp !== 'number' ||
          !Number.isFinite(claims.exp) ||
          claims.exp <= nowInSeconds
        ) {
          this.isLoading.set(false);
          this.errorMessage.set('Authentication failed: Security token has expired or is invalid.');
          return;
        }

        const expiresIn = response?.data?.expiresIn || 1800;
        const tokenType = response?.data?.tokenType || 'Bearer';

        // 7. Pass verified token and identity claims to AuthService.setCustomerSession()
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
          this.errorMessage.set('Authentication failed: Security token verification failed.');
          return;
        }

        this.isLoading.set(false);
        this.successMessage.set(`Welcome back, ${name}! Redirecting to your member portal...`);
        this.authSuccess.emit();

        if (!this.embedded) {
          // Navigate to the intended returnUrl if present, otherwise navigate to /profile
          const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/profile';
          this.router.navigateByUrl(returnUrl);
        }
      },
      error: (err) => {
        this.isLoading.set(false);

        if (err.status === 401) {
          this.errorMessage.set('Invalid email or password. Please verify your credentials and try again.');
        } else if (err.status === 0) {
          this.errorMessage.set(
            'Unable to connect to the authentication server. Please ensure the backend is running at https://localhost:7033.'
          );
        } else if (err.status === 400) {
          const detail = err.error?.message || err.error?.title || 'Invalid login request.';
          this.errorMessage.set(detail);
        } else {
          this.errorMessage.set(
            err.error?.message || 'Authentication failed. Please verify your connection and try again.'
          );
        }
      }
    });
  }
}
