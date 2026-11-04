import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { Component } from '@angular/core';
import { ownerAuthInterceptor } from './owner-auth.interceptor';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

@Component({ standalone: true, template: '' })
class DummyLoginComponent {}

describe('ownerAuthInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  let authService: AuthService;
  let router: Router;

  beforeEach(() => {
    sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideRouter([
          { path: 'admin/login', component: DummyLoginComponent }
        ]),
        provideHttpClient(withInterceptors([ownerAuthInterceptor])),
        provideHttpClientTesting()
      ]
    });

    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpTesting.verify();
    sessionStorage.clear();
  });

  it('should automatically attach Authorization: Bearer <token> to protected backend API requests', () => {
    authService.setOwnerSession({
      id: 'owner-44',
      name: 'Chef Julien Laurent',
      email: 'chef.julien@legabriel.fr',
      role: 'RestaurantOwner',
      accessToken: 'valid-test-jwt-token-999',
      tokenType: 'Bearer',
      expiresIn: 1800
    });

    http.get(`${environment.apiUrl}/restaurants/my-restaurants`).subscribe();

    const req = httpTesting.expectOne(`${environment.apiUrl}/restaurants/my-restaurants`);
    expect(req.request.headers.has('Authorization')).toBe(true);
    expect(req.request.headers.get('Authorization')).toBe('Bearer valid-test-jwt-token-999');

    req.flush({ statusCode: 200, data: [] });
  });

  it('should attach Authorization header for relative /api paths as well', () => {
    authService.setOwnerSession({
      id: 'owner-44',
      name: 'Chef Julien',
      email: 'julien@legabriel.fr',
      role: 'RestaurantOwner',
      accessToken: 'relative-jwt-token-777',
      tokenType: 'Bearer',
      expiresIn: 1800
    });

    http.get('/api/restaurants').subscribe();

    const req = httpTesting.expectOne('/api/restaurants');
    expect(req.request.headers.get('Authorization')).toBe('Bearer relative-jwt-token-777');

    req.flush([]);
  });

  it('should NOT attach Authorization header to unrelated third-party/external URLs', () => {
    authService.setOwnerSession({
      id: 'owner-44',
      name: 'Chef Julien',
      email: 'julien@legabriel.fr',
      role: 'RestaurantOwner',
      accessToken: 'should-not-leak-token',
      tokenType: 'Bearer',
      expiresIn: 1800
    });

    const externalUrl = 'https://images.unsplash.com/photo-1550966871?auto=format&fit=crop&w=900';
    http.get(externalUrl).subscribe();

    const req = httpTesting.expectOne(externalUrl);
    expect(req.request.headers.has('Authorization')).toBe(false);

    req.flush('fake-image-data');
  });

  it('should NOT attach Authorization header when owner is not authenticated', () => {
    expect(authService.isOwnerAuthenticated()).toBe(false);

    http.get(`${environment.apiUrl}/cuisines`).subscribe();

    const req = httpTesting.expectOne(`${environment.apiUrl}/cuisines`);
    expect(req.request.headers.has('Authorization')).toBe(false);

    req.flush({ statusCode: 200, data: [] });
  });

  it('should preserve request bodies untouched without modifying them', () => {
    authService.setOwnerSession({
      id: 'owner-44',
      name: 'Chef Julien',
      email: 'julien@legabriel.fr',
      role: 'RestaurantOwner',
      accessToken: 'body-test-token',
      tokenType: 'Bearer',
      expiresIn: 1800
    });

    const postPayload = { restaurantName: 'Le Gabriel', capacity: 40 };
    http.post(`${environment.apiUrl}/restaurants`, postPayload).subscribe();

    const req = httpTesting.expectOne(`${environment.apiUrl}/restaurants`);
    expect(req.request.body).toEqual(postPayload);
    expect(req.request.headers.get('Authorization')).toBe('Bearer body-test-token');

    req.flush({ statusCode: 200, message: 'Created' });
  });

  it('should intercept 401 on protected owner API call, clear owner session, and redirect to /admin/login', () => {
    authService.setOwnerSession({
      id: 'owner-44',
      name: 'Chef Julien Laurent',
      email: 'chef.julien@legabriel.fr',
      role: 'RestaurantOwner',
      accessToken: 'expired-or-revoked-token',
      tokenType: 'Bearer',
      expiresIn: 1800
    });

    const initialCustomer = authService.currentUser();
    expect(initialCustomer).toBeTruthy();

    const navigateSpy = vi.spyOn(router, 'navigate');

    let receivedError: any;
    http.get(`${environment.apiUrl}/restaurants/my-restaurants`).subscribe({
      next: () => expect.unreachable('Should fail with 401'),
      error: (err) => {
        receivedError = err;
      }
    });

    const req = httpTesting.expectOne(`${environment.apiUrl}/restaurants/my-restaurants`);
    req.flush(
      { statusCode: 401, message: 'Unauthorized token expired' },
      { status: 401, statusText: 'Unauthorized' }
    );

    expect(receivedError.status).toBe(401);

    // Owner session must be cleared
    expect(authService.isOwnerAuthenticated()).toBe(false);
    expect(authService.currentOwner()).toBeNull();
    expect(authService.getOwnerAccessToken()).toBeNull();

    // Redirect to /admin/login
    expect(navigateSpy).toHaveBeenCalledWith(['/admin/login']);

    // Customer persona must remain completely unaffected
    expect(authService.currentUser()).toEqual(initialCustomer);
    expect(authService.isAuthenticated()).toBe(true);
  });

  it('should NOT navigate away on 401 for /api/auth/login endpoint', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');

    let receivedError: any;
    http.post(`${environment.apiUrl}/auth/login`, { email: 'bad@email.com', password: 'bad' }).subscribe({
      next: () => expect.unreachable('Should fail with 401'),
      error: (err) => {
        receivedError = err;
      }
    });

    const req = httpTesting.expectOne(`${environment.apiUrl}/auth/login`);
    req.flush(
      { statusCode: 401, message: 'Invalid email or password.' },
      { status: 401, statusText: 'Unauthorized' }
    );

    expect(receivedError.status).toBe(401);
    // Should NOT redirect, allowing the login component to display the error inline
    expect(navigateSpy).not.toHaveBeenCalled();
  });
});

