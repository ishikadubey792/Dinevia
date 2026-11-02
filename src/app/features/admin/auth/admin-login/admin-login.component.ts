import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';

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

  email = 'owner@legabriel.fr';
  password = '••••••••••••';
  rememberMe = true;
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  onLogin(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    // Simulate luxury authentication response
    setTimeout(() => {
      this.isLoading.set(false);
      this.router.navigate(['/admin/dashboard']);
    }, 600);
  }

  useDemoCredentials(account: 'le-gabriel' | 'arpege' | 'executive'): void {
    if (account === 'le-gabriel') {
      this.email = 'chef.julien@legabriel.fr';
    } else if (account === 'arpege') {
      this.email = 'owner@arpege-paris.fr';
    } else {
      this.email = 'elena.vance@dinevia.com';
    }
    this.password = 'DineviaPass2026!';
  }
}

