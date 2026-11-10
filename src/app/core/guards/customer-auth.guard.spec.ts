import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { customerAuthGuard } from './customer-auth.guard';
import { AuthService, DEFAULT_MOCK_USER } from '../services/auth.service';
import { Component } from '@angular/core';

@Component({ standalone: true, template: '' })
class DummyComponent {}

describe('customerAuthGuard', () => {
  let authService: AuthService;
  let router: Router;

  const dummyRoute = {} as ActivatedRouteSnapshot;
  const dummyState = { url: '/profile' } as RouterStateSnapshot;

  function createTestJwt(payload: Record<string, any>): string {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const body = btoa(JSON.stringify(payload))
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    return `${header}.${body}.mock-signature`;
  }

  const validCustomerJwt = createTestJwt({
    nameid: '1001',
    unique_name: 'Ishika Patron',
    email: 'ishika@example.com',
    role: 'Customer',
    exp: Math.floor(Date.now() / 1000) + 3600
  });

  const ownerJwt = createTestJwt({
    nameid: '888',
    unique_name: 'Chef Julien Laurent',
    email: 'julien@restaurant.fr',
    role: 'RestaurantOwner',
    exp: Math.floor(Date.now() / 1000) + 3600
  });

  const expiredCustomerJwt = createTestJwt({
    nameid: '1002',
    unique_name: 'Expired User',
    email: 'expired@example.com',
    role: 'Customer',
    exp: Math.floor(Date.now() / 1000) - 300
  });

  beforeEach(() => {
    sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideRouter([
          { path: 'login', component: DummyComponent },
          { path: 'profile', component: DummyComponent, canActivate: [customerAuthGuard] },
          { path: 'bookings', component: DummyComponent, canActivate: [customerAuthGuard] }
        ])
      ]
    });

    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('should redirect unauthenticated users to /login with returnUrl query parameter', () => {
    expect(authService.isCustomerAuthenticated()).toBe(false);

    const result = TestBed.runInInjectionContext(() => customerAuthGuard(dummyRoute, dummyState));

    expect(result instanceof UrlTree).toBe(true);
    const tree = result as UrlTree;
    expect(tree.root.children['primary'].segments.map(s => s.path).join('/')).toBe('login');
    expect(tree.queryParams['returnUrl']).toBe('/profile');
  });

  it('should reject default mock customer persona and redirect to /login with returnUrl', () => {
    // Default mock user persona is active for browsing
    expect(authService.isAuthenticated()).toBe(true);
    expect(authService.currentUser()?.fullName).toBe(DEFAULT_MOCK_USER.fullName);
    expect(authService.currentUser()?.isMockUser).toBe(true);

    // But strict customer JWT session is NOT authenticated
    expect(authService.isCustomerAuthenticated()).toBe(false);

    const state = { url: '/bookings' } as RouterStateSnapshot;
    const result = TestBed.runInInjectionContext(() => customerAuthGuard(dummyRoute, state));

    expect(result instanceof UrlTree).toBe(true);
    const tree = result as UrlTree;
    expect(tree.root.children['primary'].segments.map(s => s.path).join('/')).toBe('login');
    expect(tree.queryParams['returnUrl']).toBe('/bookings');
  });

  it('should allow navigation when a valid Customer session is active', () => {
    authService.setCustomerSession({
      id: 1001,
      name: 'Ishika Patron',
      email: 'ishika@example.com',
      role: 'Customer',
      accessToken: validCustomerJwt,
      tokenType: 'Bearer',
      expiresIn: 3600
    });

    expect(authService.isCustomerAuthenticated()).toBe(true);

    const result = TestBed.runInInjectionContext(() => customerAuthGuard(dummyRoute, dummyState));

    expect(result).toBe(true);
  });

  it('should reject and redirect expired Customer sessions', () => {
    // Attempting to establish or rehydrate an expired token
    sessionStorage.setItem(
      'dinevia_customer_session',
      JSON.stringify({
        user: { id: 1002, name: 'Expired User', email: 'expired@example.com', role: 'Customer' },
        accessToken: expiredCustomerJwt,
        tokenType: 'Bearer',
        expiresIn: 1800,
        authenticatedAt: Date.now() - 3600 * 1000
      })
    );

    // Re-inject service to re-read session
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideRouter([{ path: 'login', component: DummyComponent }])
      ]
    });
    const freshAuthService = TestBed.inject(AuthService);

    expect(freshAuthService.isCustomerAuthenticated()).toBe(false);

    const result = TestBed.runInInjectionContext(() => customerAuthGuard(dummyRoute, dummyState));

    expect(result instanceof UrlTree).toBe(true);
    expect((result as UrlTree).queryParams['returnUrl']).toBe('/profile');
  });

  it('should reject RestaurantOwner sessions attempting to access customer routes', () => {
    authService.setOwnerSession({
      id: 'owner-88',
      name: 'Chef Julien',
      email: 'julien@restaurant.fr',
      role: 'RestaurantOwner',
      accessToken: ownerJwt,
      tokenType: 'Bearer',
      expiresIn: 3600
    });

    expect(authService.isOwnerAuthenticated()).toBe(true);
    expect(authService.isCustomerAuthenticated()).toBe(false);

    const result = TestBed.runInInjectionContext(() => customerAuthGuard(dummyRoute, dummyState));

    expect(result instanceof UrlTree).toBe(true);
    expect((result as UrlTree).queryParams['returnUrl']).toBe('/profile');
  });

  it('should preserve URL query parameters in returnUrl destination', () => {
    const complexState = { url: '/profile?tab=security&ref=invite' } as RouterStateSnapshot;

    const result = TestBed.runInInjectionContext(() => customerAuthGuard(dummyRoute, complexState));

    expect(result instanceof UrlTree).toBe(true);
    expect((result as UrlTree).queryParams['returnUrl']).toBe('/profile?tab=security&ref=invite');
  });
});

