import { Component, signal, computed, HostListener, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent implements OnDestroy {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly routerSub: Subscription;

  readonly isMobileMenuOpen = signal<boolean>(false);
  readonly isScrolled = signal<boolean>(false);
  readonly isUserMenuOpen = signal<boolean>(false);

  readonly userInitials = computed(() => {
    const user = this.authService.currentUser();
    if (!user || !user.fullName) return 'DV';
    const parts = user.fullName.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return user.fullName.substring(0, 2).toUpperCase();
  });

  constructor() {
    this.routerSub = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        this.closeMobileMenu();
        this.closeUserMenu();
      });
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (typeof window !== 'undefined') {
      this.isScrolled.set(window.scrollY > 20);
    }
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024 && this.isMobileMenuOpen()) {
      this.closeMobileMenu();
    }
  }

  @HostListener('window:keydown.escape')
  onEscapeKey(): void {
    this.closeMobileMenu();
    this.closeUserMenu();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-menu-container')) {
      this.closeUserMenu();
    }
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update(open => !open);
    this.syncBodyScroll();
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
    this.syncBodyScroll();
  }

  toggleUserMenu(): void {
    this.isUserMenuOpen.update(open => !open);
  }

  closeUserMenu(): void {
    this.isUserMenuOpen.set(false);
  }

  logout(): void {
    this.closeUserMenu();
    this.closeMobileMenu();
    this.authService.logout();
    this.router.navigate(['/']);
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    this.unlockBodyScroll();
  }

  private syncBodyScroll(): void {
    if (typeof document !== 'undefined') {
      if (this.isMobileMenuOpen()) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    }
  }

  private unlockBodyScroll(): void {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  }
}
