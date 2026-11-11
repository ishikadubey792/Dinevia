import { Injectable, PLATFORM_ID, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from './auth.service';

export type AuthModalMode = 'login' | 'signup';

const EXCLUDED_MODAL_PREFIXES = ['/login', '/signup', '/forgot-password', '/admin'] as const;

@Injectable({
  providedIn: 'root'
})
export class AuthModalService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly authService = inject(AuthService);

  private readonly _isOpen = signal<boolean>(false);
  private readonly _activeMode = signal<AuthModalMode>('login');
  private readonly _hasDismissed = signal<boolean>(false);
  private readonly _hasEvaluatedInitialLoad = signal<boolean>(false);

  readonly isOpen = this._isOpen.asReadonly();
  readonly activeMode = this._activeMode.asReadonly();
  readonly hasDismissed = this._hasDismissed.asReadonly();

  constructor() {
    effect(() => {
      if (this.hasActiveSession() && this._isOpen()) {
        this._isOpen.set(false);
      }
    });
  }

  hasActiveSession(): boolean {
    const customerActive = this.authService.isCustomerAuthenticated();
    const ownerActive =
      this.authService.isOwnerAuthenticated() && !this.authService.isOwnerSessionExpired();
    return customerActive || ownerActive;
  }

  isExcludedRoute(url: string): boolean {
    const cleanPath = (url || '/').split('?')[0].split('#')[0];
    return EXCLUDED_MODAL_PREFIXES.some(
      prefix => cleanPath === prefix || cleanPath.startsWith(`${prefix}/`)
    );
  }

  evaluateInitialLoad(url: string): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }

    if (this._hasEvaluatedInitialLoad() || this._hasDismissed()) {
      return this._isOpen();
    }

    this._hasEvaluatedInitialLoad.set(true);

    if (this.hasActiveSession() || this.isExcludedRoute(url)) {
      this._isOpen.set(false);
      return false;
    }

    this._activeMode.set('login');
    this._isOpen.set(true);
    return true;
  }

  handleRouteChange(url: string): void {
    if (this.isExcludedRoute(url) && this._isOpen()) {
      this.close(false);
    }
  }

  open(mode: AuthModalMode = 'login'): void {
    this._activeMode.set(mode);
    this._isOpen.set(true);
  }

  switchMode(mode: AuthModalMode): void {
    this._activeMode.set(mode);
  }

  close(markDismissed = true): void {
    this._isOpen.set(false);
    if (markDismissed) {
      this._hasDismissed.set(true);
    }
  }

  handleAuthSuccess(): void {
    this._isOpen.set(false);
  }
}

