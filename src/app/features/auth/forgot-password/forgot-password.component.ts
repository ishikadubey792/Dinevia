import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '../../../shared/components/navbar/navbar.component';
import { FooterComponent } from '../../../shared/components/footer/footer.component';
import { AuthService } from '../../../core/services/auth.service';
import { dineviaEmailValidator, getDineviaEmailErrorMessage } from '../../../core/validators/auth-validators';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    NavbarComponent,
    FooterComponent
  ],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss'
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  readonly isLoading = signal<boolean>(false);
  readonly isSubmitted = signal<boolean>(false);
  readonly submittedEmail = signal<string>('');
  readonly errorMessage = signal<string | null>(null);

  forgotForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, dineviaEmailValidator()]]
  });

  isFieldInvalid(fieldName: string): boolean {
    const field = this.forgotForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getEmailErrorMessage(): string {
    return getDineviaEmailErrorMessage(this.forgotForm.get('email')?.errors);
  }

  onSubmit(): void {
    this.errorMessage.set(null);

    if (this.forgotForm.invalid) {
      this.forgotForm.markAllAsTouched();
      this.errorMessage.set(this.getEmailErrorMessage() || 'Please enter a valid email address.');
      return;
    }

    const email = this.forgotForm.value.email.trim();
    this.isLoading.set(true);

    setTimeout(() => {
      this.authService.requestPasswordReset(email);
      this.submittedEmail.set(email);
      this.isLoading.set(false);
      this.isSubmitted.set(true);
    }, 600);
  }

  resetForm(): void {
    this.isSubmitted.set(false);
    this.forgotForm.reset();
  }
}
