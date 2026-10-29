import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { NavbarComponent } from '../../../shared/components/navbar/navbar.component';
import { FooterComponent } from '../../../shared/components/footer/footer.component';
import { AuthService } from '../../../core/services/auth.service';

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
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly isPasswordVisible = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  loginForm: FormGroup = this.fb.group({
    email: ['a.wright@epicuredining.com', [Validators.required, Validators.email]],
    password: ['Elegance2026!', [Validators.required, Validators.minLength(6)]],
    rememberMe: [true]
  });

  togglePasswordVisibility(): void {
    this.isPasswordVisible.update(v => !v);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  fillDemoCredentials(): void {
    this.loginForm.patchValue({
      email: 'a.wright@epicuredining.com',
      password: 'Elegance2026!',
      rememberMe: true
    });
    this.errorMessage.set(null);
  }

  onSubmit(): void {
    this.errorMessage.set(null);

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.errorMessage.set('Please provide a valid email and password.');
      return;
    }

    const { email, password, rememberMe } = this.loginForm.value;
    this.isLoading.set(true);

    setTimeout(() => {
      const result = this.authService.login(email, password, rememberMe);
      this.isLoading.set(false);

      if (result.success) {
        this.successMessage.set('Authentication successful. Welcome back to Dinevia!');
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/profile';
        setTimeout(() => {
          this.router.navigateByUrl(returnUrl);
        }, 600);
      } else {
        this.errorMessage.set(result.error || 'Invalid credentials.');
      }
    }, 600);
  }
}
