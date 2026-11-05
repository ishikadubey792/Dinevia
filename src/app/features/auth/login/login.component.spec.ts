import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router, ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/services/auth.service';
import { CustomerAuthService } from '../../../core/services/customer-auth.service';
import { ApiResponse } from '../../../core/models/cuisine.model';
import { CustomerLoginResponseData } from '../../../core/models/customer-auth.model';

describe('LoginComponent Customer API Integration & Strict Validation', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let router: Router;
  let activatedRoute: ActivatedRoute;
  let authService: AuthService;
  let customerAuthServiceMock: { login: ReturnType<typeof vi.fn> };

  // Helper to generate test JWT token with specific claims
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

  const mockSuccessResponse: ApiResponse<CustomerLoginResponseData> = {
    statusCode: 200,
    message: 'Login successful.',
    data: {
      accessToken: validCustomerJwt,
      tokenType: 'Bearer',
      expiresIn: 1800
    }
  };

  beforeEach(async () => {
    sessionStorage.clear();

    customerAuthServiceMock = {
      login: vi.fn().mockReturnValue(of(mockSuccessResponse))
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        AuthService,
        { provide: CustomerAuthService, useValue: customerAuthServiceMock },
        provideRouter([
          { path: 'login', component: LoginComponent },
          { path: 'profile', component: LoginComponent },
          { path: 'book/le-gabriel', component: LoginComponent },
          { path: 'forgot-password', component: LoginComponent },
          { path: 'signup', component: LoginComponent }
        ])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    activatedRoute = TestBed.inject(ActivatedRoute);
    authService = TestBed.inject(AuthService);

    fixture.detectChanges();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('should create the login component with clean initial state', () => {
    expect(component).toBeTruthy();
    expect(component.isLoading()).toBe(false);
    expect(component.errorMessage()).toBeNull();
    expect(component.successMessage()).toBeNull();
    expect(component.isPasswordVisible()).toBe(false);
    expect(component.loginForm.valid).toBe(false);
  });

  it('should toggle password visibility signal', () => {
    expect(component.isPasswordVisible()).toBe(false);
    component.togglePasswordVisibility();
    expect(component.isPasswordVisible()).toBe(true);
    component.togglePasswordVisibility();
    expect(component.isPasswordVisible()).toBe(false);
  });

  it('should validate form fields: email required/valid, password min length 8', () => {
    // Empty form is invalid
    expect(component.loginForm.valid).toBe(false);

    // Invalid email
    component.loginForm.patchValue({
      email: 'not-an-email',
      password: 'ValidPassword123!'
    });
    expect(component.loginForm.valid).toBe(false);
    expect(component.loginForm.get('email')?.valid).toBe(false);

    // Password shorter than 8 characters
    component.loginForm.patchValue({
      email: 'customer@example.com',
      password: 'short'
    });
    expect(component.loginForm.valid).toBe(false);
    expect(component.loginForm.get('password')?.valid).toBe(false);

    // Valid inputs
    component.loginForm.patchValue({
      email: 'customer@example.com',
      password: 'Password@123'
    });
    expect(component.loginForm.valid).toBe(true);
  });

  it('should reject submission and display error when form is invalid', () => {
    component.loginForm.patchValue({
      email: '',
      password: ''
    });

    component.onSubmit();

    expect(customerAuthServiceMock.login).not.toHaveBeenCalled();
    expect(component.errorMessage()).toContain('Please provide a valid email and a password of at least 8 characters.');
    expect(component.isLoading()).toBe(false);
  });

  it('should execute successful customer login, establish session, and navigate to /profile', () => {
    const navigateSpy = vi.spyOn(router, 'navigateByUrl');

    component.loginForm.patchValue({
      email: 'ishika@example.com',
      password: 'Password@123'
    });

    component.onSubmit();

    expect(customerAuthServiceMock.login).toHaveBeenCalledWith({
      email: 'ishika@example.com',
      password: 'Password@123'
    });

    expect(component.isLoading()).toBe(false);
    expect(component.errorMessage()).toBeNull();
    expect(component.successMessage()).toContain('Welcome back, Ishika Patron!');
    expect(navigateSpy).toHaveBeenCalledWith('/profile');

    // Strict customer session must be established
    expect(authService.isCustomerAuthenticated()).toBe(true);
    expect(authService.getCustomerAccessToken()).toBe(validCustomerJwt);
    expect(authService.currentUser()?.fullName).toBe('Ishika Patron');
    expect(authService.currentUser()?.email).toBe('ishika@example.com');
  });

  it('should navigate to returnUrl if present in query parameters', () => {
    const navigateSpy = vi.spyOn(router, 'navigateByUrl');

    // Simulate queryParams containing returnUrl
    activatedRoute.snapshot.queryParams = { returnUrl: '/book/le-gabriel' };

    component.loginForm.patchValue({
      email: 'ishika@example.com',
      password: 'Password@123'
    });

    component.onSubmit();

    expect(navigateSpy).toHaveBeenCalledWith('/book/le-gabriel');
  });

  it('should prevent duplicate submissions while request is already pending (loading state)', () => {
    component.loginForm.patchValue({
      email: 'ishika@example.com',
      password: 'Password@123'
    });

    // Manually set loading to true
    component.isLoading.set(true);

    component.onSubmit();

    // Must return immediately without issuing another login request
    expect(customerAuthServiceMock.login).not.toHaveBeenCalled();
  });

  it('should handle 401 Unauthorized invalid credentials error gracefully', () => {
    customerAuthServiceMock.login.mockReturnValue(
      throwError(() => ({
        status: 401,
        error: { statusCode: 401, message: 'Invalid email or password.' }
      }))
    );

    component.loginForm.patchValue({
      email: 'wrong@example.com',
      password: 'WrongPassword123!'
    });

    component.onSubmit();

    expect(component.isLoading()).toBe(false);
    expect(component.errorMessage()).toContain('Invalid email or password. Please verify your credentials and try again.');
    expect(authService.isCustomerAuthenticated()).toBe(false);
  });

  it('should handle status 0 backend connection failure gracefully', () => {
    customerAuthServiceMock.login.mockReturnValue(
      throwError(() => ({
        status: 0,
        error: null
      }))
    );

    component.loginForm.patchValue({
      email: 'customer@example.com',
      password: 'Password@123'
    });

    component.onSubmit();

    expect(component.isLoading()).toBe(false);
    expect(component.errorMessage()).toContain('Unable to connect to the authentication server. Please ensure the backend is running');
    expect(authService.isCustomerAuthenticated()).toBe(false);
  });

  it('should reject login if backend returns a RestaurantOwner token', () => {
    const ownerResponse: ApiResponse<CustomerLoginResponseData> = {
      statusCode: 200,
      message: 'Login successful.',
      data: {
        accessToken: ownerJwt,
        tokenType: 'Bearer',
        expiresIn: 1800
      }
    };
    customerAuthServiceMock.login.mockReturnValue(of(ownerResponse));
    const navigateSpy = vi.spyOn(router, 'navigateByUrl');

    component.loginForm.patchValue({
      email: 'julien@restaurant.fr',
      password: 'Password@123'
    });

    component.onSubmit();

    expect(navigateSpy).not.toHaveBeenCalled();
    expect(component.errorMessage()).toContain("This account has role 'RestaurantOwner', which is not authorized for Customer login");
    expect(component.isLoading()).toBe(false);
    expect(authService.isCustomerAuthenticated()).toBe(false);
    expect(authService.getCustomerAccessToken()).toBeNull();
  });

  it('should reject login if returned token is expired', () => {
    const expiredResponse: ApiResponse<CustomerLoginResponseData> = {
      statusCode: 200,
      message: 'Login successful.',
      data: {
        accessToken: expiredCustomerJwt,
        tokenType: 'Bearer',
        expiresIn: 1800
      }
    };
    customerAuthServiceMock.login.mockReturnValue(of(expiredResponse));
    const navigateSpy = vi.spyOn(router, 'navigateByUrl');

    component.loginForm.patchValue({
      email: 'expired@example.com',
      password: 'Password@123'
    });

    component.onSubmit();

    expect(navigateSpy).not.toHaveBeenCalled();
    expect(component.errorMessage()).toContain('Security token has expired or is invalid.');
    expect(component.isLoading()).toBe(false);
    expect(authService.isCustomerAuthenticated()).toBe(false);
  });

  it('should reject login if token is missing exp claim', () => {
    const tokenNoExp = createTestJwt({
      nameid: '1003',
      unique_name: 'No Exp User',
      email: 'noexp@example.com',
      role: 'Customer'
    });

    const responseNoExp: ApiResponse<CustomerLoginResponseData> = {
      statusCode: 200,
      message: 'Login successful.',
      data: {
        accessToken: tokenNoExp,
        tokenType: 'Bearer',
        expiresIn: 1800
      }
    };
    customerAuthServiceMock.login.mockReturnValue(of(responseNoExp));

    component.loginForm.patchValue({
      email: 'noexp@example.com',
      password: 'Password@123'
    });

    component.onSubmit();

    expect(component.errorMessage()).toContain('Security token has expired or is invalid.');
    expect(authService.isCustomerAuthenticated()).toBe(false);
  });

  it('should reject login if response is missing accessToken', () => {
    const emptyTokenResponse: ApiResponse<CustomerLoginResponseData> = {
      statusCode: 200,
      message: 'Login successful.',
      data: {
        accessToken: '',
        tokenType: 'Bearer',
        expiresIn: 1800
      }
    };
    customerAuthServiceMock.login.mockReturnValue(of(emptyTokenResponse));

    component.loginForm.patchValue({
      email: 'empty@example.com',
      password: 'Password@123'
    });

    component.onSubmit();

    expect(component.errorMessage()).toContain('Missing access token in server response.');
    expect(authService.isCustomerAuthenticated()).toBe(false);
  });

  it('should reject login if token is missing ID claim', () => {
    const tokenMissingId = createTestJwt({
      unique_name: 'Ishika Patron',
      email: 'ishika@example.com',
      role: 'Customer',
      exp: Math.floor(Date.now() / 1000) + 3600
    });

    const response: ApiResponse<CustomerLoginResponseData> = {
      statusCode: 200,
      message: 'Login successful.',
      data: {
        accessToken: tokenMissingId,
        tokenType: 'Bearer',
        expiresIn: 1800
      }
    };
    customerAuthServiceMock.login.mockReturnValue(of(response));
    const setSessionSpy = vi.spyOn(authService, 'setCustomerSession');
    const navigateSpy = vi.spyOn(router, 'navigateByUrl');

    component.loginForm.patchValue({
      email: 'ishika@example.com',
      password: 'Password@123'
    });

    component.onSubmit();

    expect(component.errorMessage()).toContain('Security token is missing a valid user identifier.');
    expect(setSessionSpy).not.toHaveBeenCalled();
    expect(navigateSpy).not.toHaveBeenCalled();
    expect(authService.isCustomerAuthenticated()).toBe(false);
  });

  it('should reject login if token has invalid ID claim', () => {
    const tokenInvalidId = createTestJwt({
      nameid: '   ',
      unique_name: 'Ishika Patron',
      email: 'ishika@example.com',
      role: 'Customer',
      exp: Math.floor(Date.now() / 1000) + 3600
    });

    const response: ApiResponse<CustomerLoginResponseData> = {
      statusCode: 200,
      message: 'Login successful.',
      data: {
        accessToken: tokenInvalidId,
        tokenType: 'Bearer',
        expiresIn: 1800
      }
    };
    customerAuthServiceMock.login.mockReturnValue(of(response));
    const setSessionSpy = vi.spyOn(authService, 'setCustomerSession');

    component.loginForm.patchValue({
      email: 'ishika@example.com',
      password: 'Password@123'
    });

    component.onSubmit();

    expect(component.errorMessage()).toContain('Security token is missing a valid user identifier.');
    expect(setSessionSpy).not.toHaveBeenCalled();
    expect(authService.isCustomerAuthenticated()).toBe(false);
  });

  it('should reject login if token is missing Name claim', () => {
    const tokenMissingName = createTestJwt({
      nameid: '1001',
      email: 'ishika@example.com',
      role: 'Customer',
      exp: Math.floor(Date.now() / 1000) + 3600
    });

    const response: ApiResponse<CustomerLoginResponseData> = {
      statusCode: 200,
      message: 'Login successful.',
      data: {
        accessToken: tokenMissingName,
        tokenType: 'Bearer',
        expiresIn: 1800
      }
    };
    customerAuthServiceMock.login.mockReturnValue(of(response));
    const setSessionSpy = vi.spyOn(authService, 'setCustomerSession');

    component.loginForm.patchValue({
      email: 'ishika@example.com',
      password: 'Password@123'
    });

    component.onSubmit();

    expect(component.errorMessage()).toContain('Security token is missing a valid user name.');
    expect(setSessionSpy).not.toHaveBeenCalled();
    expect(authService.isCustomerAuthenticated()).toBe(false);
  });

  it('should reject login if token is missing Email claim', () => {
    const tokenMissingEmail = createTestJwt({
      nameid: '1001',
      unique_name: 'Ishika Patron',
      role: 'Customer',
      exp: Math.floor(Date.now() / 1000) + 3600
    });

    const response: ApiResponse<CustomerLoginResponseData> = {
      statusCode: 200,
      message: 'Login successful.',
      data: {
        accessToken: tokenMissingEmail,
        tokenType: 'Bearer',
        expiresIn: 1800
      }
    };
    customerAuthServiceMock.login.mockReturnValue(of(response));
    const setSessionSpy = vi.spyOn(authService, 'setCustomerSession');

    component.loginForm.patchValue({
      email: 'ishika@example.com',
      password: 'Password@123'
    });

    component.onSubmit();

    expect(component.errorMessage()).toContain('Security token is missing a valid email address.');
    expect(setSessionSpy).not.toHaveBeenCalled();
    expect(authService.isCustomerAuthenticated()).toBe(false);
  });

  it('should reject login if token has invalid Email claim', () => {
    const tokenInvalidEmail = createTestJwt({
      nameid: '1001',
      unique_name: 'Ishika Patron',
      email: 'not-an-email',
      role: 'Customer',
      exp: Math.floor(Date.now() / 1000) + 3600
    });

    const response: ApiResponse<CustomerLoginResponseData> = {
      statusCode: 200,
      message: 'Login successful.',
      data: {
        accessToken: tokenInvalidEmail,
        tokenType: 'Bearer',
        expiresIn: 1800
      }
    };
    customerAuthServiceMock.login.mockReturnValue(of(response));
    const setSessionSpy = vi.spyOn(authService, 'setCustomerSession');

    component.loginForm.patchValue({
      email: 'ishika@example.com',
      password: 'Password@123'
    });

    component.onSubmit();

    expect(component.errorMessage()).toContain('Security token is missing a valid email address.');
    expect(setSessionSpy).not.toHaveBeenCalled();
    expect(authService.isCustomerAuthenticated()).toBe(false);
  });

  it('should preserve existing Owner session during customer login', () => {
    // Pre-establish an owner session
    authService.setOwnerSession({
      id: 'owner-77',
      name: 'Chef Owner',
      email: 'owner@bistro.fr',
      role: 'RestaurantOwner',
      accessToken: 'owner-token-77',
      tokenType: 'Bearer',
      expiresIn: 3600
    });

    expect(authService.isOwnerAuthenticated()).toBe(true);

    component.loginForm.patchValue({
      email: 'ishika@example.com',
      password: 'Password@123'
    });

    component.onSubmit();

    // Customer is now authenticated
    expect(authService.isCustomerAuthenticated()).toBe(true);
    expect(authService.getCustomerAccessToken()).toBe(validCustomerJwt);

    // Owner remains authenticated and undisturbed
    expect(authService.isOwnerAuthenticated()).toBe(true);
    expect(authService.getOwnerAccessToken()).toBe('owner-token-77');
    expect(authService.currentOwner()?.name).toBe('Chef Owner');
  });
});

