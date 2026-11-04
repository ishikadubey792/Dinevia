import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

/**
 * Functional HTTP interceptor for Dinevia API requests.
 *
 * Responsibilities:
 * 1. Automatically attaches `Authorization: Bearer <token>` to requests targeting the backend API.
 * 2. Does NOT attach tokens to external/third-party URLs (e.g. Unsplash images, Google Fonts).
 * 3. Does NOT modify request bodies.
 * 4. Intercepts 401 Unauthorized errors from authenticated API calls and:
 *    - Clears ONLY the owner session (`clearOwnerSession()`), preserving customer session state.
 *    - Redirects to `/admin/login`.
 * 5. Avoids logging sensitive tokens or passwords.
 */
export const ownerAuthInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Check if request is directed to the backend API
  const apiUrl = environment.apiUrl;
  const isApiRequest = req.url.startsWith(apiUrl) || req.url.startsWith('/api');

  // Obtain owner JWT access token safely
  const token = authService.getOwnerAccessToken();

  let outgoingReq = req;

  // Attach token only for backend API requests when an owner token is active
  if (isApiRequest && token && token.trim().length > 0) {
    outgoingReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token.trim()}`
      }
    });
  }

  return next(outgoingReq).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        // Handle 401 Unauthorized for owner API requests
        // Do not intercept 401 on /api/auth/login itself so AdminLoginComponent can display credentials error
        const isLoginEndpoint = req.url.includes('/auth/login');

        if (error.status === 401 && isApiRequest && !isLoginEndpoint && token) {
          // Clear only owner session; customer session remains completely untouched
          authService.clearOwnerSession();
          router.navigate(['/admin/login']);
        }
      }

      return throwError(() => error);
    })
  );
};

