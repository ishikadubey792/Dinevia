import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

export type AuthRole = 'Customer' | 'RestaurantOwner';

/**
 * Extracts the normalized API path without query parameters, hash fragments,
 * or trailing slashes, relative to environment.apiUrl or /api.
 * Returns null if the request URL is external or not an API request.
 */
function getNormalizedApiPath(url: string, apiUrl: string): string | null {
  let path = url;
  if (path.startsWith(apiUrl)) {
    path = path.substring(apiUrl.length);
  } else if (path.startsWith('/api')) {
    path = path.substring(4);
  } else {
    return null;
  }

  // Strip query parameters and hash fragments
  const cleanPath = path.split('?')[0].split('#')[0];

  // Normalize leading slash and remove trailing slash
  let normalized = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }

  return normalized.toLowerCase();
}

/**
 * Checks if the endpoint is public and should never receive an authorization token.
 *
 * Public endpoints:
 * - Authentication & registration endpoints: /auth/*
 * - Cuisines lookup: GET /cuisines
 * - Booking availability: GET /bookings/availability
 * - Restaurant public discovery: GET /restaurants, GET /restaurants/{id} (excluding /restaurants/my-restaurants)
 */
function isPublicEndpoint(path: string, method: string): boolean {
  const upperMethod = method.toUpperCase();

  // Authentication and registration endpoints
  if (path.startsWith('/auth/')) {
    return true;
  }

  // Cuisines lookup: GET /cuisines
  if (upperMethod === 'GET' && (path === '/cuisines' || path.startsWith('/cuisines/'))) {
    return true;
  }

  // Booking availability lookup: GET /bookings/availability
  if (
    upperMethod === 'GET' &&
    (path === '/bookings/availability' || path.startsWith('/bookings/availability/'))
  ) {
    return true;
  }

  // Public restaurant discovery (GET /restaurants or GET /restaurants/{id}, excluding owner portfolio)
  if (upperMethod === 'GET') {
    if (path === '/restaurants') {
      return true;
    }
    // Match single segment /restaurants/{id} where id is not my-restaurants
    const restMatch = path.match(/^\/restaurants\/([^/]+)$/);
    if (restMatch && restMatch[1] !== 'my-restaurants') {
      return true;
    }
  }

  return false;
}

/**
 * Checks if the endpoint represents an owner-protected resource.
 * Owner classification takes precedence before any customer booking checks.
 *
 * Owner-protected endpoints:
 * - GET /bookings/my-restaurant-bookings
 * - GET /restaurants/my-restaurants
 * - GET /restaurants/my-restaurants/{id}
 * - Owner restaurant create/update/delete endpoints:
 *   - POST /restaurants
 *   - PUT /restaurants/{id}, PATCH /restaurants/{id}, DELETE /restaurants/{id}
 * - Admin/owner management endpoints (/admin/*, /owner/*)
 */
function isOwnerProtectedEndpoint(path: string, method: string): boolean {
  const upperMethod = method.toUpperCase();

  // 1. Owner bookings: GET /bookings/my-restaurant-bookings
  if (
    path === '/bookings/my-restaurant-bookings' ||
    path.startsWith('/bookings/my-restaurant-bookings/')
  ) {
    return true;
  }

  // 2. Owner restaurant portfolio: GET /restaurants/my-restaurants & GET /restaurants/my-restaurants/{id}
  if (
    path === '/restaurants/my-restaurants' ||
    path.startsWith('/restaurants/my-restaurants/')
  ) {
    return true;
  }

  // 3. Owner restaurant management:
  // POST /restaurants (Create restaurant)
  if (path === '/restaurants' && upperMethod === 'POST') {
    return true;
  }

  // PUT /restaurants/{id}, PATCH /restaurants/{id}, DELETE /restaurants/{id} (Update/delete restaurant)
  const singleRestMatch = path.match(/^\/restaurants\/([^/]+)$/);
  if (
    singleRestMatch &&
    singleRestMatch[1] !== 'my-restaurants' &&
    (upperMethod === 'PUT' || upperMethod === 'PATCH' || upperMethod === 'DELETE')
  ) {
    return true;
  }

  // 4. Other explicitly identified owner-only endpoints
  if (
    path === '/admin' || path.startsWith('/admin/') ||
    path === '/owner' || path.startsWith('/owner/')
  ) {
    return true;
  }

  return false;
}

/**
 * Checks if the endpoint represents a customer-protected resource.
 * Uses explicit path and HTTP-method matching for only the currently supported customer endpoints.
 *
 * Customer-protected endpoints:
 * - POST /bookings (Create customer booking)
 * - GET /bookings/{id} (Get single booking)
 * - GET /bookings/customer/{customerId} (Customer booking history)
 * - PUT /bookings/{id} (Update booking)
 * - POST /bookings/{id}/cancel (Cancel booking)
 * - Explicit customer profile and user endpoints: /customer/*, /profile/*, /users/*
 */
function isCustomerProtectedEndpoint(path: string, method: string): boolean {
  const upperMethod = method.toUpperCase();

  // 1. POST /api/bookings (Create customer booking)
  if (path === '/bookings' && upperMethod === 'POST') {
    return true;
  }

  // 2. GET /api/bookings/customer/{customerId} (Customer booking history)
  if (
    upperMethod === 'GET' &&
    (path === '/bookings/customer' || path.startsWith('/bookings/customer/'))
  ) {
    return true;
  }

  // 3. GET /api/bookings/{id} (Get single booking by ID)
  if (upperMethod === 'GET') {
    const singleBookingMatch = path.match(/^\/bookings\/(\d+)$/);
    if (singleBookingMatch) {
      return true;
    }
  }

  // 4. PUT /api/bookings/{id} (Update booking)
  if (upperMethod === 'PUT') {
    const updateMatch = path.match(/^\/bookings\/(\d+)$/);
    if (updateMatch) {
      return true;
    }
  }

  // 5. POST /api/bookings/{id}/cancel (Cancel booking)
  if (upperMethod === 'POST') {
    const cancelMatch = path.match(/^\/bookings\/(\d+)\/cancel$/);
    if (cancelMatch) {
      return true;
    }
  }

  // 6. Explicitly identified customer profile/user endpoints
  if (
    path === '/customer' || path.startsWith('/customer/') ||
    path === '/profile' || path.startsWith('/profile/') ||
    path === '/users' || path.startsWith('/users/')
  ) {
    return true;
  }

  return false;
}

/**
 * Functional HTTP interceptor for Dinevia API requests.
 *
 * Responsibilities:
 * 1. Attaches Customer JWT to customer-protected API requests.
 * 2. Attaches RestaurantOwner JWT to owner-protected API requests.
 * 3. Never attaches both tokens to the same request.
 * 4. Never attaches stale or expired tokens.
 * 5. Does NOT attach tokens to public endpoints (login, register, cuisines, availability, public discovery).
 * 6. Does NOT attach tokens to unknown / unclassified API endpoints by default.
 * 7. Does NOT attach tokens to external/third-party URLs (e.g. Unsplash, Google Fonts).
 * 8. Preserves request bodies without modification.
 * 9. Intercepts 401 Unauthorized errors:
 *    - For RestaurantOwner requests: clears ONLY the owner session and redirects to /admin/login.
 *    - For Customer requests: clears ONLY the customer session and redirects to /login.
 *    - Avoids redirect loops.
 */
export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // 1. External or non-API requests never receive authentication headers
  const normalizedPath = getNormalizedApiPath(req.url, environment.apiUrl);
  if (!normalizedPath) {
    return next(req);
  }

  // 2. Public unauthenticated endpoints never receive authentication headers
  if (isPublicEndpoint(normalizedPath, req.method)) {
    return next(req);
  }

  // 3. Classify target role for protected resources
  // Owner classification takes precedence before Customer classification
  const isOwnerReq = isOwnerProtectedEndpoint(normalizedPath, req.method);
  const isCustomerReq = !isOwnerReq && isCustomerProtectedEndpoint(normalizedPath, req.method);

  // 4. Unknown / unclassified endpoints receive NO token by default
  if (!isOwnerReq && !isCustomerReq) {
    return next(req);
  }

  // 5. Select appropriate token with strict validation
  let tokenToAttach: string | null = null;
  let attachedRole: AuthRole | null = null;

  if (isOwnerReq) {
    const ownerToken = authService.getOwnerAccessToken();
    const isOwnerValid = authService.isOwnerAuthenticated() && !authService.isOwnerSessionExpired();
    if (isOwnerValid && ownerToken && ownerToken.trim().length > 0) {
      tokenToAttach = ownerToken.trim();
      attachedRole = 'RestaurantOwner';
    }
  } else if (isCustomerReq) {
    const customerToken = authService.getCustomerAccessToken();
    const isCustomerValid = authService.isCustomerAuthenticated();
    if (isCustomerValid && customerToken && customerToken.trim().length > 0) {
      tokenToAttach = customerToken.trim();
      attachedRole = 'Customer';
    }
  }

  let outgoingReq = req;

  // Attach Authorization header if a valid token was selected
  if (tokenToAttach) {
    outgoingReq = outgoingReq.clone({
      setHeaders: {
        Authorization: `Bearer ${tokenToAttach}`
      }
    });
  }

  return next(outgoingReq).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        const isLoginEndpoint = normalizedPath.startsWith('/auth/login');

        // Handle 401 Unauthorized for authenticated API requests
        if (error.status === 401 && !isLoginEndpoint) {
          if (attachedRole === 'RestaurantOwner' || (!attachedRole && isOwnerReq)) {
            authService.clearOwnerSession();
            const currentUrl = router.url;
            if (!currentUrl.startsWith('/admin/login')) {
              router.navigate(['/admin/login']);
            }
          } else if (attachedRole === 'Customer' || (!attachedRole && isCustomerReq)) {
            authService.clearCustomerSession();
            const currentUrl = router.url;
            if (!currentUrl.startsWith('/login')) {
              router.navigate(['/login'], {
                queryParams: { returnUrl: currentUrl || '/profile' }
              });
            }
          }
        }
      }

      return throwError(() => error);
    })
  );
};

// Export ownerAuthInterceptor as an alias to authInterceptor for seamless backward compatibility
export const ownerAuthInterceptor = authInterceptor;
