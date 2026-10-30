import { Component, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AdminDataService } from '../../../../../core/services/admin-data.service';
import { AuthService } from '../../../../../core/services/auth.service';

@Component({
  selector: 'app-admin-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-header.component.html',
  styleUrl: './admin-header.component.scss'
})
export class AdminHeaderComponent {
  readonly adminData = inject(AdminDataService);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  readonly isNotificationOpen = signal<boolean>(false);
  readonly isProfileMenuOpen = signal<boolean>(false);
  readonly searchQuery = signal<string>('');

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.notification-container')) {
      this.isNotificationOpen.set(false);
    }
    if (!target.closest('.profile-menu-container')) {
      this.isProfileMenuOpen.set(false);
    }
  }

  toggleNotifications(): void {
    this.isNotificationOpen.update(open => !open);
    if (this.isNotificationOpen()) {
      this.isProfileMenuOpen.set(false);
    }
  }

  toggleProfileMenu(): void {
    this.isProfileMenuOpen.update(open => !open);
    if (this.isProfileMenuOpen()) {
      this.isNotificationOpen.set(false);
    }
  }

  logout(): void {
    this.isProfileMenuOpen.set(false);
    this.authService.logout();
    this.router.navigate(['/']);
  }
}

