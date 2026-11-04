import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ownerAuthGuard } from './owner-auth.guard';
import { AuthService } from '../services/auth.service';
import { Component } from '@angular/core';

@Component({ standalone: true, template: '' })
class DummyComponent {}

describe('ownerAuthGuard', () => {
  let authService: AuthService;
  let router: Router;

  const dummyRoute = {} as ActivatedRouteSnapshot;
  const dummyState = { url: '/admin/dashboard' } as RouterStateSnapshot;

  beforeEach(() => {
    sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideRouter([
          { path: 'admin/login', component: DummyComponent },
          { path: 'admin/dashboard', component: DummyComponent, canActivate: [ownerAuthGuard] }
        ])
      ]
    });

    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('should redirect unauthenticated users to /admin/login', () => {
    // Default state: no owner session
    expect(authService.isOwnerAuthenticated()).toBe(false);

    const result = TestBed.runInInjectionContext(() => ownerAuthGuard(dummyRoute, dummyState));

    expect(result instanceof UrlTree).toBe(true);
    expect((result as UrlTree).toString()).toBe('/admin/login');
  });

  it('should reject default mock customer persona and redirect to /admin/login', () => {
    // Customer session is active (Alexander Wright), but owner is NOT authenticated
    expect(authService.isAuthenticated()).toBe(true);
    expect(authService.currentUser()?.fullName).toBe('Alexander Wright');
    expect(authService.isOwnerAuthenticated()).toBe(false);

    const result = TestBed.runInInjectionContext(() => ownerAuthGuard(dummyRoute, dummyState));

    expect(result instanceof UrlTree).toBe(true);
    expect((result as UrlTree).toString()).toBe('/admin/login');

    // Customer session must remain intact
    expect(authService.isAuthenticated()).toBe(true);
  });

  it('should reject user with Customer role even if owner session was somehow populated', () => {
    authService.setOwnerSession({
      id: 'cust-1',
      name: 'Jane Customer',
      email: 'jane@gmail.com',
      role: 'Customer',
      accessToken: 'valid-token-xyz',
      tokenType: 'Bearer',
      expiresIn: 3600
    });

    const result = TestBed.runInInjectionContext(() => ownerAuthGuard(dummyRoute, dummyState));

    expect(result instanceof UrlTree).toBe(true);
    expect((result as UrlTree).toString()).toBe('/admin/login');
  });

  it('should reject user with Admin or unauthorized role and redirect to /admin/login', () => {
    authService.setOwnerSession({
      id: 'admin-1',
      name: 'System Admin',
      email: 'admin@dinevia.com',
      role: 'Admin',
      accessToken: 'admin-token',
      tokenType: 'Bearer',
      expiresIn: 3600
    });

    const result = TestBed.runInInjectionContext(() => ownerAuthGuard(dummyRoute, dummyState));

    expect(result instanceof UrlTree).toBe(true);
    expect((result as UrlTree).toString()).toBe('/admin/login');
  });

  it('should reject and redirect if token is missing or empty', () => {
    authService.setOwnerSession({
      id: 'owner-1',
      name: 'Chef Julien',
      email: 'julien@legabriel.fr',
      role: 'RestaurantOwner',
      accessToken: '', // Empty token
      tokenType: 'Bearer',
      expiresIn: 3600
    });

    const result = TestBed.runInInjectionContext(() => ownerAuthGuard(dummyRoute, dummyState));

    expect(result instanceof UrlTree).toBe(true);
    expect((result as UrlTree).toString()).toBe('/admin/login');
  });

  it('should allow route access when user has valid RestaurantOwner session and token', () => {
    authService.setOwnerSession({
      id: 'owner-1',
      name: 'Chef Julien Laurent',
      email: 'chef.julien@legabriel.fr',
      role: 'RestaurantOwner',
      accessToken: 'valid-jwt-token-abc',
      tokenType: 'Bearer',
      expiresIn: 3600
    });

    const result = TestBed.runInInjectionContext(() => ownerAuthGuard(dummyRoute, dummyState));

    expect(result).toBe(true);
  });

  it('should clear expired session and redirect to /admin/login', () => {
    authService.setOwnerSession({
      id: 'owner-1',
      name: 'Chef Julien Laurent',
      email: 'chef.julien@legabriel.fr',
      role: 'RestaurantOwner',
      accessToken: 'expired-jwt-token',
      tokenType: 'Bearer',
      expiresIn: 1 // 1 second
    });

    // Mock Date.now to simulate token expiration
    const futureTime = Date.now() + 10000;
    const dateSpy = vi.spyOn(Date, 'now').mockReturnValue(futureTime);

    const result = TestBed.runInInjectionContext(() => ownerAuthGuard(dummyRoute, dummyState));

    expect(result instanceof UrlTree).toBe(true);
    expect((result as UrlTree).toString()).toBe('/admin/login');
    // Session should have been cleared
    expect(authService.isOwnerAuthenticated()).toBe(false);

    dateSpy.mockRestore();
  });
});

