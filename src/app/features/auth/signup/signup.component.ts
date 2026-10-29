import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NavbarComponent } from '../../../shared/components/navbar/navbar.component';
import { FooterComponent } from '../../../shared/components/footer/footer.component';
import { AuthService } from '../../../core/services/auth.service';

export const passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');
  if (!password || !confirmPassword) return null;
  return password.value === confirmPassword.value ? null : { passwordMismatch: true };
};

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
  private readonly router = inject(Router);

  readonly isPasswordVisible = signal<boolean>(false);
  readonly isConfirmPasswordVisible = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  signupForm: FormGroup = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{7,15}$/)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
    agreeTerms: [true, [Validators.requiredTrue]]
  }, { validators: passwordMatchValidator });

  // Password strength computation
  readonly passwordStrength = computed(() => {
    const pwd = this.signupForm?.get('password')?.value || '';
    if (!pwd) return { score: 0, label: 'None', class: 'empty' };

    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

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

  onSubmit(): void {
    this.errorMessage.set(null);

    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      this.errorMessage.set('Please review and correct the highlighted fields before submitting.');
      return;
    }

    const { fullName, email, phone, password } = this.signupForm.value;
    this.isLoading.set(true);

    setTimeout(() => {
      const result = this.authService.signup({
        fullName,
        email,
        phone,
        _password: password
      });
      this.isLoading.set(false);

      if (result.success) {
        this.successMessage.set('Welcome to Dinevia! Your complimentary member profile has been initialized.');
        setTimeout(() => {
          this.router.navigate(['/profile']);
        }, 800);
      }
    }, 700);
  }
}
