import { HttpInterceptorFn } from '@angular/common/http';
import { delay } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

/**
 * Development-Only Controlled Delay Interceptor
 *
 * Simulates realistic network latency (1.2s) exclusively when explicitly requested:
 * - Environment is non-production (environment.production === false)
 * - AND either `?simulateDelay=true` query parameter is present in the current URL
 *   OR `sessionStorage.getItem('DINEVIA_SIMULATE_DELAY') === 'true'`
 *
 * In automated unit tests, production deployments, and default development runs,
 * this interceptor passes requests through immediately with ZERO artificial delay.
 */
export const devDelayInterceptor: HttpInterceptorFn = (req, next) => {
  if (environment.production) {
    return next(req);
  }

  if (typeof window === 'undefined') {
    return next(req);
  }

  const hasSearchFlag = Boolean(window.location?.search?.includes('simulateDelay=true'));
  let hasStorageFlag = false;
  try {
    hasStorageFlag = window.sessionStorage?.getItem('DINEVIA_SIMULATE_DELAY') === 'true';
  } catch {
    // Gracefully handle sandboxed environments without session storage access
  }

  if (hasSearchFlag || hasStorageFlag) {
    return next(req).pipe(delay(1200));
  }

  return next(req);
};
