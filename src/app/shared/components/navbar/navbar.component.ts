import {
  Component,
  DestroyRef,
  HostListener,
  OnDestroy,
  PLATFORM_ID,
  computed,
  inject,
  signal
} from '@angular/core';
import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent implements OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.closeMobileMenu();
        this.closeAllPopovers();
      });
  }

  readonly isMobileMenuOpen = signal<boolean>(false);
  readonly isScrolled = signal<boolean>(false);
  readonly isUserMenuOpen = signal<boolean>(false);
  readonly isCartNoticeOpen = signal<boolean>(false);

  readonly isCustomerLoggedIn = computed<boolean>(() => {
    return typeof this.authService.isCustomerAuthenticated === 'function'
      ? this.authService.isCustomerAuthenticated()
      : false;
  });

  readonly isOwnerLoggedIn = computed<boolean>(() => {
    const hasOwner =
      typeof this.authService.isOwnerAuthenticated === 'function'
        ? this.authService.isOwnerAuthenticated()
        : false;
    const isExpired =
      typeof this.authService.isOwnerSessionExpired === 'function'
        ? this.authService.isOwnerSessionExpired()
        : false;
    return hasOwner && !isExpired;
  });

  readonly hasActiveAuthSession = computed<boolean>(() => {
    return this.isCustomerLoggedIn() || this.isOwnerLoggedIn();
  });

  readonly customerAccount = computed(() => {
    if (!this.isCustomerLoggedIn()) {
      return null;
    }
    const session =
      typeof this.authService.currentCustomerSession === 'function'
        ? this.authService.currentCustomerSession()
        : null;
    return session?.user ?? null;
  });

  readonly ownerAccount = computed(() => {
    if (!this.isOwnerLoggedIn()) {
      return null;
    }
    return typeof this.authService.currentOwner === 'function'
      ? this.authService.currentOwner()
      : null;
  });

  readonly userInitials = computed<string>(() => {
    const customer = this.customerAccount();
    if (customer?.name) {
      return this.computeInitials(customer.name);
    }

    const owner = this.ownerAccount();
    if (owner?.name) {
      return this.computeInitials(owner.name);
    }

    return '';
  });

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.isScrolled.set(window.scrollY > 12);
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    if (window.innerWidth > 920 && this.isMobileMenuOpen()) {
      this.closeMobileMenu();
    }
  }

  @HostListener('window:keydown.escape')
  onEscapeKey(): void {
    this.closeAllPopovers();
    if (this.isMobileMenuOpen()) {
      this.closeMobileMenu();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target) {
      return;
    }

    if (this.isUserMenuOpen() && !target.closest('.user-menu-wrap')) {
      this.isUserMenuOpen.set(false);
    }

    if (this.isCartNoticeOpen() && !target.closest('.cart-action-wrap')) {
      this.isCartNoticeOpen.set(false);
    }
  }

  toggleMobileMenu(): void {
    const next = !this.isMobileMenuOpen();
    this.isMobileMenuOpen.set(next);
    this.closeAllPopovers();
    this.syncBodyScroll(next);
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
    this.syncBodyScroll(false);
  }

  toggleUserMenu(event?: Event): void {
    event?.stopPropagation();
    const next = !this.isUserMenuOpen();
    this.isUserMenuOpen.set(next);
    if (next) {
      this.isCartNoticeOpen.set(false);
    }
  }

  closeUserMenu(): void {
    this.isUserMenuOpen.set(false);
  }

  toggleCartNotice(event?: Event): void {
    event?.stopPropagation();
    const next = !this.isCartNoticeOpen();
    this.isCartNoticeOpen.set(next);
    if (next) {
      this.isUserMenuOpen.set(false);
    }
  }

  closeCartNotice(): void {
    this.isCartNoticeOpen.set(false);
  }

  logoutCustomer(): void {
    this.closeAllPopovers();
    this.closeMobileMenu();
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  logoutOwner(): void {
    this.closeAllPopovers();
    this.closeMobileMenu();
    if (typeof this.authService.logoutOwner === 'function') {
      this.authService.logoutOwner();
    }
    this.router.navigate(['/admin/login']);
  }

  logout(): void {
    this.logoutCustomer();
  }

  ngOnDestroy(): void {
    this.syncBodyScroll(false);
  }

  private closeAllPopovers(): void {
    this.isUserMenuOpen.set(false);
    this.isCartNoticeOpen.set(false);
  }

  private syncBodyScroll(locked: boolean): void {
    if (isPlatformBrowser(this.platformId)) {
      this.document.body.style.overflow = locked ? 'hidden' : '';
    }
  }

  private computeInitials(fullName: string): string {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return '';
    }
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
}
