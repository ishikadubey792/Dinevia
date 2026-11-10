import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Functional route guard to protect customer-only portal routes (e.g. /profile, /bookings).
 *
 * Requirements:
 * 1. Requires a valid, active customer session.
 * 2. Uses isCustomerAuthenticated(), not the backward-compatible mock authentication check.
 * 3. Redirects unauthenticated users to '/login'.
 * 4. Preserves requested URL in the returnUrl query parameter.
 * 5. Does NOT allow default mock customer persona (Alexander Wright) without a valid JWT session.
 * 6. Does NOT allow RestaurantOwner tokens to access customer routes.
 */
export const customerAuthGuard: CanActivateFn = (route, state): boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Strictly verify authentic customer JWT session
  if (authService.isCustomerAuthenticated()) {
    return true;
  }

  // Preserve requested destination in returnUrl query parameter
  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url }
  });
};

