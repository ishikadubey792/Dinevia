import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { Component } from '@angular/core';
import { ownerAuthInterceptor, authInterceptor } from './owner-auth.interceptor';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

@Component({ standalone: true, template: '' })
class DummyLoginComponent {}

describe('ownerAuthInterceptor & authInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  let authService: AuthService;
  let router: Router;

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

  const validOwnerJwt = createTestJwt({
    nameid: 'owner-44',
    unique_name: 'Chef Julien Laurent',
    email: 'chef.julien@legabriel.fr',
    role: 'RestaurantOwner',
    exp: Math.floor(Date.now() / 1000) + 3600
  });

  const expiredCustomerJwt = createTestJwt({
    nameid: '1002',
    unique_name: 'Expired Customer',
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
          { path: 'admin/login', component: DummyLoginComponent },
          { path: 'login', component: DummyLoginComponent }
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

  // --------------------------------------------------------------------------
  // 1. Owner-protected Endpoints & Precedence
  // --------------------------------------------------------------------------
  describe('Owner-protected Endpoints & Precedence', () => {
    it('should classify GET /bookings/my-restaurant-bookings as RestaurantOwner before any customer checks', () => {
      // Both customer and owner sessions active to verify precedence
      authService.setCustomerSession({
        id: 1001,
        name: 'Ishika Patron',
        email: 'ishika@example.com',
        role: 'Customer',
        accessToken: validCustomerJwt,
        tokenType: 'Bearer',
        expiresIn: 3600
      });

      authService.setOwnerSession({
        id: 'owner-44',
        name: 'Chef Julien Laurent',
        email: 'chef.julien@legabriel.fr',
        role: 'RestaurantOwner',
        accessToken: validOwnerJwt,
        tokenType: 'Bearer',
        expiresIn: 3600
      });

      // Absolute URL
      http.get(`${environment.apiUrl}/bookings/my-restaurant-bookings`).subscribe();
      const absReq = httpTesting.expectOne(`${environment.apiUrl}/bookings/my-restaurant-bookings`);
      expect(absReq.request.headers.get('Authorization')).toBe(`Bearer ${validOwnerJwt}`);
      expect(absReq.request.headers.get('Authorization')).not.toContain(validCustomerJwt);
      absReq.flush({ statusCode: 200, data: [] });

      // Relative /api path
      http.get('/api/bookings/my-restaurant-bookings').subscribe();
      const relReq = httpTesting.expectOne('/api/bookings/my-restaurant-bookings');
      expect(relReq.request.headers.get('Authorization')).toBe(`Bearer ${validOwnerJwt}`);
      relReq.flush({ statusCode: 200, data: [] });
    });

    it('should attach Owner token on GET /restaurants/my-restaurants and subpaths', () => {
      authService.setOwnerSession({
        id: 'owner-44',
        name: 'Chef Julien Laurent',
        email: 'chef.julien@legabriel.fr',
        role: 'RestaurantOwner',
        accessToken: validOwnerJwt,
        tokenType: 'Bearer',
        expiresIn: 3600
      });

      http.get(`${environment.apiUrl}/restaurants/my-restaurants`).subscribe();
      const listReq = httpTesting.expectOne(`${environment.apiUrl}/restaurants/my-restaurants`);
      expect(listReq.request.headers.get('Authorization')).toBe(`Bearer ${validOwnerJwt}`);
      listReq.flush({ statusCode: 200, data: [] });

      http.get('/api/restaurants/my-restaurants/102').subscribe();
      const itemReq = httpTesting.expectOne('/api/restaurants/my-restaurants/102');
      expect(itemReq.request.headers.get('Authorization')).toBe(`Bearer ${validOwnerJwt}`);
      itemReq.flush({ statusCode: 200, data: {} });
    });

    it('should attach Owner token on owner restaurant create/update/delete endpoints and preserve body', () => {
      authService.setOwnerSession({
        id: 'owner-44',
        name: 'Chef Julien',
        email: 'julien@legabriel.fr',
        role: 'RestaurantOwner',
        accessToken: validOwnerJwt,
        tokenType: 'Bearer',
        expiresIn: 3600
      });

      const postPayload = { restaurantName: 'Le Gabriel', capacity: 40 };
      http.post(`${environment.apiUrl}/restaurants`, postPayload).subscribe();
      const postReq = httpTesting.expectOne(`${environment.apiUrl}/restaurants`);
      expect(postReq.request.headers.get('Authorization')).toBe(`Bearer ${validOwnerJwt}`);
      expect(postReq.request.body).toEqual(postPayload);
      postReq.flush({ statusCode: 200, message: 'Created' });

      http.delete('/api/restaurants/102').subscribe();
      const delReq = httpTesting.expectOne('/api/restaurants/102');
      expect(delReq.request.headers.get('Authorization')).toBe(`Bearer ${validOwnerJwt}`);
      delReq.flush({ statusCode: 200 });

      http.put('/api/restaurants/102', { name: 'Updated' }).subscribe();
      const putReq = httpTesting.expectOne('/api/restaurants/102');
      expect(putReq.request.headers.get('Authorization')).toBe(`Bearer ${validOwnerJwt}`);
      putReq.flush({ statusCode: 200 });
    });

    it('should NOT attach Authorization header when owner is not authenticated', () => {
      expect(authService.isOwnerAuthenticated()).toBe(false);

      http.get(`${environment.apiUrl}/restaurants/my-restaurants`).subscribe({
        next: () => {},
        error: () => {}
      });
      const req = httpTesting.expectOne(`${environment.apiUrl}/restaurants/my-restaurants`);
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush({ statusCode: 401 }, { status: 401, statusText: 'Unauthorized' });
    });
  });

  // --------------------------------------------------------------------------
  // 2. Customer-protected Endpoints (Explicit Matching)
  // --------------------------------------------------------------------------
  describe('Customer-protected Endpoints', () => {
    it('should attach Customer token on POST /bookings', () => {
      authService.setCustomerSession({
        id: 1001,
        name: 'Ishika Patron',
        email: 'ishika@example.com',
        role: 'Customer',
        accessToken: validCustomerJwt,
        tokenType: 'Bearer',
        expiresIn: 3600
      });

      const bookingPayload = { restaurantId: 5, guests: 4, date: '2026-12-01' };
      http.post(`${environment.apiUrl}/bookings`, bookingPayload).subscribe();

      const req = httpTesting.expectOne(`${environment.apiUrl}/bookings`);
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${validCustomerJwt}`);
      expect(req.request.body).toEqual(bookingPayload);
      req.flush({ statusCode: 201, data: { id: 99 } });
    });

    it('should attach Customer token on GET /bookings/customer/{customerId}', () => {
      authService.setCustomerSession({
        id: 1001,
        name: 'Ishika Patron',
        email: 'ishika@example.com',
        role: 'Customer',
        accessToken: validCustomerJwt,
        tokenType: 'Bearer',
        expiresIn: 3600
      });

      http.get(`${environment.apiUrl}/bookings/customer/1001`).subscribe();
      const req = httpTesting.expectOne(`${environment.apiUrl}/bookings/customer/1001`);
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${validCustomerJwt}`);
      req.flush({ statusCode: 200, data: [] });
    });

    it('should attach Customer token on customer profile and user endpoints', () => {
      authService.setCustomerSession({
        id: 1001,
        name: 'Ishika Patron',
        email: 'ishika@example.com',
        role: 'Customer',
        accessToken: validCustomerJwt,
        tokenType: 'Bearer',
        expiresIn: 3600
      });

      http.get('/api/customer/profile').subscribe();
      const profileReq = httpTesting.expectOne('/api/customer/profile');
      expect(profileReq.request.headers.get('Authorization')).toBe(`Bearer ${validCustomerJwt}`);
      profileReq.flush({ statusCode: 200, data: {} });

      http.get('/api/users/me').subscribe();
      const usersReq = httpTesting.expectOne('/api/users/me');
      expect(usersReq.request.headers.get('Authorization')).toBe(`Bearer ${validCustomerJwt}`);
      usersReq.flush({ statusCode: 200, data: {} });
    });

    it('should NOT attach stale or expired Customer tokens', () => {
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

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          AuthService,
          provideRouter([{ path: 'login', component: DummyLoginComponent }]),
          provideHttpClient(withInterceptors([ownerAuthInterceptor])),
          provideHttpClientTesting()
        ]
      });
      const freshHttp = TestBed.inject(HttpClient);
      const freshHttpTesting = TestBed.inject(HttpTestingController);
      const freshAuth = TestBed.inject(AuthService);

      expect(freshAuth.isCustomerAuthenticated()).toBe(false);

      freshHttp.post(`${environment.apiUrl}/bookings`, { restaurantId: 1 }).subscribe();
      const req = freshHttpTesting.expectOne(`${environment.apiUrl}/bookings`);
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush({ statusCode: 200, data: {} });

      freshHttpTesting.verify();
    });
  });

  // --------------------------------------------------------------------------
  // 3. Public Endpoints (Precedence & Clean Bypass)
  // --------------------------------------------------------------------------
  describe('Public Endpoints', () => {
    it('should ensure GET /bookings/availability always remains public (no token)', () => {
      authService.setCustomerSession({
        id: 1001,
        name: 'Ishika Patron',
        email: 'ishika@example.com',
        role: 'Customer',
        accessToken: validCustomerJwt,
        tokenType: 'Bearer',
        expiresIn: 3600
      });
      authService.setOwnerSession({
        id: 'owner-44',
        name: 'Chef Julien',
        email: 'julien@legabriel.fr',
        role: 'RestaurantOwner',
        accessToken: validOwnerJwt,
        tokenType: 'Bearer',
        expiresIn: 3600
      });

      // Absolute URL with query params
      http.get(`${environment.apiUrl}/bookings/availability?restaurantId=1&date=2026-11-10`).subscribe();
      const absReq = httpTesting.expectOne(`${environment.apiUrl}/bookings/availability?restaurantId=1&date=2026-11-10`);
      expect(absReq.request.headers.has('Authorization')).toBe(false);
      absReq.flush({ statusCode: 200, data: [] });

      // Relative path
      http.get('/api/bookings/availability').subscribe();
      const relReq = httpTesting.expectOne('/api/bookings/availability');
      expect(relReq.request.headers.has('Authorization')).toBe(false);
      relReq.flush({ statusCode: 200, data: [] });
    });

    it('should ensure public restaurant discovery endpoints always remain public (no token)', () => {
      authService.setCustomerSession({
        id: 1001,
        name: 'Ishika Patron',
        email: 'ishika@example.com',
        role: 'Customer',
        accessToken: validCustomerJwt,
        tokenType: 'Bearer',
        expiresIn: 3600
      });
      authService.setOwnerSession({
        id: 'owner-44',
        name: 'Chef Julien',
        email: 'julien@legabriel.fr',
        role: 'RestaurantOwner',
        accessToken: validOwnerJwt,
        tokenType: 'Bearer',
        expiresIn: 3600
      });

      // Public restaurant catalog (GET /restaurants)
      http.get(`${environment.apiUrl}/restaurants`).subscribe();
      const listReq = httpTesting.expectOne(`${environment.apiUrl}/restaurants`);
      expect(listReq.request.headers.has('Authorization')).toBe(false);
      listReq.flush({ statusCode: 200, data: [] });

      // Relative public catalog path
      http.get('/api/restaurants').subscribe();
      const relListReq = httpTesting.expectOne('/api/restaurants');
      expect(relListReq.request.headers.has('Authorization')).toBe(false);
      relListReq.flush([]);

      // Public single restaurant view (GET /restaurants/42)
      http.get(`${environment.apiUrl}/restaurants/42`).subscribe();
      const detailReq = httpTesting.expectOne(`${environment.apiUrl}/restaurants/42`);
      expect(detailReq.request.headers.has('Authorization')).toBe(false);
      detailReq.flush({ statusCode: 200, data: {} });
    });

    it('should NOT attach token on public cuisines and authentication endpoints', () => {
      authService.setCustomerSession({
        id: 1001,
        name: 'Ishika Patron',
        email: 'ishika@example.com',
        role: 'Customer',
        accessToken: validCustomerJwt,
        tokenType: 'Bearer',
        expiresIn: 3600
      });

      http.get(`${environment.apiUrl}/cuisines`).subscribe();
      const cuisinesReq = httpTesting.expectOne(`${environment.apiUrl}/cuisines`);
      expect(cuisinesReq.request.headers.has('Authorization')).toBe(false);
      cuisinesReq.flush({ statusCode: 200, data: [] });

      http.post(`${environment.apiUrl}/auth/register`, { email: 'new@user.com' }).subscribe();
      const regReq = httpTesting.expectOne(`${environment.apiUrl}/auth/register`);
      expect(regReq.request.headers.has('Authorization')).toBe(false);
      regReq.flush({ statusCode: 200 });

      http.post(`${environment.apiUrl}/auth/register-restaurant-owner`, {}).subscribe();
      const ownerRegReq = httpTesting.expectOne(`${environment.apiUrl}/auth/register-restaurant-owner`);
      expect(ownerRegReq.request.headers.has('Authorization')).toBe(false);
      ownerRegReq.flush({ statusCode: 200 });
    });

    it('should NOT attach token to unrelated third-party/external URLs', () => {
      authService.setOwnerSession({
        id: 'owner-44',
        name: 'Chef Julien',
        email: 'julien@legabriel.fr',
        role: 'RestaurantOwner',
        accessToken: validOwnerJwt,
        tokenType: 'Bearer',
        expiresIn: 3600
      });

      const externalUrl = 'https://images.unsplash.com/photo-1550966871?auto=format&fit=crop&w=900';
      http.get(externalUrl).subscribe();

      const req = httpTesting.expectOne(externalUrl);
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush('fake-image');
    });
  });

  // --------------------------------------------------------------------------
  // 4. Unknown Booking, Restaurant, and API Paths (No Token Attached)
  // --------------------------------------------------------------------------
  describe('Unknown Booking & Restaurant Paths', () => {
    it('should NOT attach any token on unknown booking paths even when Customer or Owner is authenticated', () => {
      authService.setCustomerSession({
        id: 1001,
        name: 'Ishika Patron',
        email: 'ishika@example.com',
        role: 'Customer',
        accessToken: validCustomerJwt,
        tokenType: 'Bearer',
        expiresIn: 3600
      });
      authService.setOwnerSession({
        id: 'owner-44',
        name: 'Chef Julien',
        email: 'julien@legabriel.fr',
        role: 'RestaurantOwner',
        accessToken: validOwnerJwt,
        tokenType: 'Bearer',
        expiresIn: 3600
      });

      // 1. Generic GET /bookings (without customer ID)
      http.get(`${environment.apiUrl}/bookings`).subscribe();
      const getBookingsReq = httpTesting.expectOne(`${environment.apiUrl}/bookings`);
      expect(getBookingsReq.request.headers.has('Authorization')).toBe(false);
      getBookingsReq.flush([]);

      // 2. Unknown booking subpath (GET /bookings/unknown-feature)
      http.get(`${environment.apiUrl}/bookings/unknown-feature`).subscribe();
      const unknownGetReq = httpTesting.expectOne(`${environment.apiUrl}/bookings/unknown-feature`);
      expect(unknownGetReq.request.headers.has('Authorization')).toBe(false);
      unknownGetReq.flush({ data: 'none' });

      // 3. Unknown booking POST subpath (POST /bookings/unknown-action)
      http.post(`${environment.apiUrl}/bookings/unknown-action`, { test: 1 }).subscribe();
      const unknownPostReq = httpTesting.expectOne(`${environment.apiUrl}/bookings/unknown-action`);
      expect(unknownPostReq.request.headers.has('Authorization')).toBe(false);
      unknownPostReq.flush({ data: 'none' });

      // 4. Unknown booking DELETE (DELETE /bookings/1234)
      http.delete('/api/bookings/1234').subscribe();
      const unknownDelReq = httpTesting.expectOne('/api/bookings/1234');
      expect(unknownDelReq.request.headers.has('Authorization')).toBe(false);
      unknownDelReq.flush({});
    });

    it('should NOT attach any token on unknown restaurant paths even when Owner is authenticated', () => {
      authService.setOwnerSession({
        id: 'owner-44',
        name: 'Chef Julien',
        email: 'julien@legabriel.fr',
        role: 'RestaurantOwner',
        accessToken: validOwnerJwt,
        tokenType: 'Bearer',
        expiresIn: 3600
      });

      // Unknown multi-segment restaurant GET path
      http.get(`${environment.apiUrl}/restaurants/unknown/subpath`).subscribe();
      const unknownGetReq = httpTesting.expectOne(`${environment.apiUrl}/restaurants/unknown/subpath`);
      expect(unknownGetReq.request.headers.has('Authorization')).toBe(false);
      unknownGetReq.flush({ data: 'none' });

      // Unknown restaurant POST subpath
      http.post('/api/restaurants/unknown/subpath', { sample: true }).subscribe();
      const unknownPostReq = httpTesting.expectOne('/api/restaurants/unknown/subpath');
      expect(unknownPostReq.request.headers.has('Authorization')).toBe(false);
      unknownPostReq.flush({ data: 'none' });

      // Unknown multi-segment DELETE path
      http.delete('/api/restaurants/unknown/extra/segments').subscribe();
      const unknownDelReq = httpTesting.expectOne('/api/restaurants/unknown/extra/segments');
      expect(unknownDelReq.request.headers.has('Authorization')).toBe(false);
      unknownDelReq.flush({});
    });

    it('should NOT attach any token on completely unclassified API endpoints', () => {
      authService.setOwnerSession({
        id: 'owner-44',
        name: 'Chef Julien',
        email: 'julien@legabriel.fr',
        role: 'RestaurantOwner',
        accessToken: validOwnerJwt,
        tokenType: 'Bearer',
        expiresIn: 3600
      });

      http.get(`${environment.apiUrl}/unclassified-feature/analytics`).subscribe();
      const req = httpTesting.expectOne(`${environment.apiUrl}/unclassified-feature/analytics`);
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush({ ok: true });
    });
  });

  // --------------------------------------------------------------------------
  // 5. Dual Sessions & Token Leakage Prevention
  // --------------------------------------------------------------------------
  describe('Dual Sessions Isolation', () => {
    it('should ensure both sessions exist simultaneously without token leakage', () => {
      authService.setCustomerSession({
        id: 1001,
        name: 'Ishika Patron',
        email: 'ishika@example.com',
        role: 'Customer',
        accessToken: validCustomerJwt,
        tokenType: 'Bearer',
        expiresIn: 3600
      });

      authService.setOwnerSession({
        id: 'owner-44',
        name: 'Chef Julien Laurent',
        email: 'chef.julien@legabriel.fr',
        role: 'RestaurantOwner',
        accessToken: validOwnerJwt,
        tokenType: 'Bearer',
        expiresIn: 3600
      });

      expect(authService.isCustomerAuthenticated()).toBe(true);
      expect(authService.isOwnerAuthenticated()).toBe(true);

      // 1. Customer request receives ONLY customer JWT, never owner JWT
      http.post(`${environment.apiUrl}/bookings`, { guests: 2 }).subscribe();
      const custReq = httpTesting.expectOne(`${environment.apiUrl}/bookings`);
      expect(custReq.request.headers.get('Authorization')).toBe(`Bearer ${validCustomerJwt}`);
      expect(custReq.request.headers.get('Authorization')).not.toContain(validOwnerJwt);
      custReq.flush({ statusCode: 200 });

      // 2. Owner request receives ONLY owner JWT, never customer JWT
      http.get(`${environment.apiUrl}/bookings/my-restaurant-bookings`).subscribe();
      const ownerReq = httpTesting.expectOne(`${environment.apiUrl}/bookings/my-restaurant-bookings`);
      expect(ownerReq.request.headers.get('Authorization')).toBe(`Bearer ${validOwnerJwt}`);
      expect(ownerReq.request.headers.get('Authorization')).not.toContain(validCustomerJwt);
      ownerReq.flush({ statusCode: 200, data: [] });

      // 3. Public request receives NO token
      http.get(`${environment.apiUrl}/bookings/availability`).subscribe();
      const pubReq = httpTesting.expectOne(`${environment.apiUrl}/bookings/availability`);
      expect(pubReq.request.headers.has('Authorization')).toBe(false);
      pubReq.flush({ statusCode: 200 });

      // 4. Unclassified request receives NO token
      http.get(`${environment.apiUrl}/unclassified-feature`).subscribe();
      const unclassReq = httpTesting.expectOne(`${environment.apiUrl}/unclassified-feature`);
      expect(unclassReq.request.headers.has('Authorization')).toBe(false);
      unclassReq.flush({ statusCode: 200 });
    });

    it('should never attach Owner token to customer-protected requests when only owner is authenticated', () => {
      authService.setOwnerSession({
        id: 'owner-44',
        name: 'Chef Julien',
        email: 'julien@legabriel.fr',
        role: 'RestaurantOwner',
        accessToken: validOwnerJwt,
        tokenType: 'Bearer',
        expiresIn: 3600
      });

      expect(authService.isOwnerAuthenticated()).toBe(true);
      expect(authService.isCustomerAuthenticated()).toBe(false);

      http.post(`${environment.apiUrl}/bookings`, { guests: 2 }).subscribe({
        next: () => {},
        error: () => {}
      });
      const req = httpTesting.expectOne(`${environment.apiUrl}/bookings`);
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush({ statusCode: 401 }, { status: 401, statusText: 'Unauthorized' });
    });
  });

  // --------------------------------------------------------------------------
  // 6. 401 Unauthorized Error Handling
  // --------------------------------------------------------------------------
  describe('401 Handling & Redirection', () => {
    it('should intercept 401 on RestaurantOwner request, clear owner session, and redirect to /admin/login', () => {
      authService.setOwnerSession({
        id: 'owner-44',
        name: 'Chef Julien Laurent',
        email: 'chef.julien@legabriel.fr',
        role: 'RestaurantOwner',
        accessToken: validOwnerJwt,
        tokenType: 'Bearer',
        expiresIn: 3600
      });

      authService.setCustomerSession({
        id: 1001,
        name: 'Ishika Patron',
        email: 'ishika@example.com',
        role: 'Customer',
        accessToken: validCustomerJwt,
        tokenType: 'Bearer',
        expiresIn: 3600
      });

      const navigateSpy = vi.spyOn(router, 'navigate');

      let receivedError: any;
      http.get(`${environment.apiUrl}/bookings/my-restaurant-bookings`).subscribe({
        next: () => expect.unreachable('Should fail with 401'),
        error: (err) => {
          receivedError = err;
        }
      });

      const req = httpTesting.expectOne(`${environment.apiUrl}/bookings/my-restaurant-bookings`);
      req.flush(
        { statusCode: 401, message: 'Unauthorized owner token' },
        { status: 401, statusText: 'Unauthorized' }
      );

      expect(receivedError.status).toBe(401);

      // Owner session must be cleared
      expect(authService.isOwnerAuthenticated()).toBe(false);
      expect(authService.getOwnerAccessToken()).toBeNull();

      // Redirect to /admin/login
      expect(navigateSpy).toHaveBeenCalledWith(['/admin/login']);

      // Customer session must remain completely intact
      expect(authService.isCustomerAuthenticated()).toBe(true);
      expect(authService.getCustomerAccessToken()).toBe(validCustomerJwt);
    });

    it('should avoid redirect loop if already on /admin/login when RestaurantOwner 401 occurs', () => {
      authService.setOwnerSession({
        id: 'owner-44',
        name: 'Chef Julien',
        email: 'julien@legabriel.fr',
        role: 'RestaurantOwner',
        accessToken: validOwnerJwt,
        tokenType: 'Bearer',
        expiresIn: 3600
      });

      vi.spyOn(router, 'url', 'get').mockReturnValue('/admin/login');
      const navigateSpy = vi.spyOn(router, 'navigate');

      http.get(`${environment.apiUrl}/restaurants/my-restaurants`).subscribe({
        next: () => expect.unreachable('Should fail with 401'),
        error: () => {}
      });

      const req = httpTesting.expectOne(`${environment.apiUrl}/restaurants/my-restaurants`);
      req.flush({ statusCode: 401 }, { status: 401, statusText: 'Unauthorized' });

      expect(authService.isOwnerAuthenticated()).toBe(false);
      expect(navigateSpy).not.toHaveBeenCalled();
    });

    it('should intercept 401 on Customer request, clear customer session, and redirect to /login with returnUrl', () => {
      authService.setCustomerSession({
        id: 1001,
        name: 'Ishika Patron',
        email: 'ishika@example.com',
        role: 'Customer',
        accessToken: validCustomerJwt,
        tokenType: 'Bearer',
        expiresIn: 3600
      });

      authService.setOwnerSession({
        id: 'owner-44',
        name: 'Chef Julien',
        email: 'julien@legabriel.fr',
        role: 'RestaurantOwner',
        accessToken: validOwnerJwt,
        tokenType: 'Bearer',
        expiresIn: 3600
      });

      vi.spyOn(router, 'url', 'get').mockReturnValue('/bookings');
      const navigateSpy = vi.spyOn(router, 'navigate');

      let receivedError: any;
      http.post(`${environment.apiUrl}/bookings`, { guests: 2 }).subscribe({
        next: () => expect.unreachable('Should fail with 401'),
        error: (err) => {
          receivedError = err;
        }
      });

      const req = httpTesting.expectOne(`${environment.apiUrl}/bookings`);
      req.flush(
        { statusCode: 401, message: 'Unauthorized customer token' },
        { status: 401, statusText: 'Unauthorized' }
      );

      expect(receivedError.status).toBe(401);

      // Customer session must be cleared
      expect(authService.isCustomerAuthenticated()).toBe(false);
      expect(authService.getCustomerAccessToken()).toBeNull();

      // Redirect to /login with returnUrl preserved
      expect(navigateSpy).toHaveBeenCalledWith(['/login'], {
        queryParams: { returnUrl: '/bookings' }
      });

      // Owner session must remain completely intact
      expect(authService.isOwnerAuthenticated()).toBe(true);
      expect(authService.getOwnerAccessToken()).toBe(validOwnerJwt);
    });

    it('should avoid redirect loop if already on /login when Customer 401 occurs', () => {
      authService.setCustomerSession({
        id: 1001,
        name: 'Ishika Patron',
        email: 'ishika@example.com',
        role: 'Customer',
        accessToken: validCustomerJwt,
        tokenType: 'Bearer',
        expiresIn: 3600
      });

      vi.spyOn(router, 'url', 'get').mockReturnValue('/login?returnUrl=%2Fbookings');
      const navigateSpy = vi.spyOn(router, 'navigate');

      http.post(`${environment.apiUrl}/bookings`, { guests: 2 }).subscribe({
        next: () => expect.unreachable('Should fail with 401'),
        error: () => {}
      });

      const req = httpTesting.expectOne(`${environment.apiUrl}/bookings`);
      req.flush({ statusCode: 401 }, { status: 401, statusText: 'Unauthorized' });

      expect(authService.isCustomerAuthenticated()).toBe(false);
      expect(navigateSpy).not.toHaveBeenCalled();
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
      expect(navigateSpy).not.toHaveBeenCalled();
    });
  });
});
