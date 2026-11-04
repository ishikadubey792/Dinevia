import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Functional route guard to protect restaurant owner portal routes.
 *
 * Requirements:
 * 1. Requires a valid, active owner session.
 * 2. Requires exact role 'RestaurantOwner'.
 * 3. Requires an active, non-empty access token.
 * 4. Checks that the session has not expired locally.
 * 5. Redirects unauthenticated/unauthorized users to '/admin/login'.
 * 6. Does NOT treat default mock customer persona (or any Customer account) as an owner.
 */
export const ownerAuthGuard: CanActivateFn = (route, state): boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // 1. Must have an authenticated owner session
  if (!authService.isOwnerAuthenticated()) {
    return router.createUrlTree(['/admin/login']);
  }

  // 2. Must possess the exact role 'RestaurantOwner'
  const owner = authService.currentOwner();
  if (!owner || owner.role !== 'RestaurantOwner') {
    return router.createUrlTree(['/admin/login']);
  }

  // 3. Must possess a valid access token
  const token = authService.getOwnerAccessToken();
  if (!token || token.trim().length === 0) {
    return router.createUrlTree(['/admin/login']);
  }

  // 4. Must not be expired based on session timestamp
  if (authService.isOwnerSessionExpired()) {
    authService.clearOwnerSession();
    return router.createUrlTree(['/admin/login']);
  }

  return true;
};

