import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AdminLoginComponent } from './admin-login.component';
import { AuthService } from '../../../../core/services/auth.service';
import { OwnerAuthService } from '../../../../core/services/owner-auth.service';
import { ApiResponse } from '../../../../core/models/cuisine.model';
import { OwnerLoginResponseData } from '../../../../core/models/owner-auth.model';

describe('AdminLoginComponent API Integration & Session Isolation', () => {
  let component: AdminLoginComponent;
  let fixture: ComponentFixture<AdminLoginComponent>;
  let router: Router;
  let authService: AuthService;
  let ownerAuthServiceMock: { login: ReturnType<typeof vi.fn> };

  // Helper to generate test JWT token with specific claims
  function createTestJwt(payload: Record<string, any>): string {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = btoa(JSON.stringify(payload));
    return `${header}.${body}.mock-signature`;
  }

  const validOwnerJwt = createTestJwt({
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier': '88',
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name': 'Chef Julien Laurent',
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress': 'chef.julien@legabriel.fr',
    'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': 'RestaurantOwner'
  });

  const customerJwt = createTestJwt({
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier': '99',
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name': 'Jane Customer',
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress': 'jane@gmail.com',
    'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': 'Customer'
  });

  const mockSuccessResponse: ApiResponse<OwnerLoginResponseData> = {
    statusCode: 200,
    message: 'Login successful.',
    data: {
      accessToken: validOwnerJwt,
      tokenType: 'Bearer',
      expiresIn: 1800
    }
  };

  beforeEach(async () => {
    sessionStorage.clear();

    ownerAuthServiceMock = {
      login: vi.fn().mockReturnValue(of(mockSuccessResponse))
    };

    await TestBed.configureTestingModule({
      imports: [AdminLoginComponent],
      providers: [
        AuthService,
        { provide: OwnerAuthService, useValue: ownerAuthServiceMock },
        provideRouter([
          { path: 'admin/login', component: AdminLoginComponent },
          { path: 'admin/dashboard', component: AdminLoginComponent },
          { path: 'admin/register', component: AdminLoginComponent },
          { path: 'partner-with-us', component: AdminLoginComponent }
        ])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminLoginComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    authService = TestBed.inject(AuthService);

    fixture.detectChanges();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('should create the admin login component', () => {
    expect(component).toBeTruthy();
    expect(component.isLoading()).toBe(false);
    expect(component.errorMessage()).toBeNull();
  });

  it('should toggle password visibility signal', () => {
    expect(component.showPassword()).toBe(false);
    component.togglePasswordVisibility();
    expect(component.showPassword()).toBe(true);
    component.togglePasswordVisibility();
    expect(component.showPassword()).toBe(false);
  });

  it('should initialize with empty credentials and without demo credential shortcuts', () => {
    expect(component.email).toBe('');
    expect(component.password).toBe('');
    expect(component.rememberMe).toBe(false);
    expect(fixture.nativeElement.querySelector('.demo-accounts-strip')).toBeNull();

    const rememberCheckbox = fixture.nativeElement.querySelector('input[name="rememberMe"]') as HTMLInputElement;
    expect(rememberCheckbox).toBeTruthy();
    expect(rememberCheckbox.checked).toBe(false);
    expect(rememberCheckbox.hasAttribute('required')).toBe(false);
  });

  it('should treat rememberMe as optional and allow owner login whether rememberMe is false or true', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');

    // 1. With rememberMe unchecked (default false)
    component.email = 'chef.julien@legabriel.fr';
    component.password = 'DineviaPass2026!';
    component.rememberMe = false;
    component.onLogin();

    expect(ownerAuthServiceMock.login).toHaveBeenCalledTimes(1);
    expect(authService.isOwnerAuthenticated()).toBe(true);
    expect(navigateSpy).toHaveBeenCalledWith(['/admin/dashboard']);

    // 2. With rememberMe checked (true)
    authService.clearOwnerSession();
    ownerAuthServiceMock.login.mockClear();
    navigateSpy.mockClear();

    component.rememberMe = true;
    component.onLogin();

    expect(ownerAuthServiceMock.login).toHaveBeenCalledTimes(1);
    expect(authService.isOwnerAuthenticated()).toBe(true);
    expect(navigateSpy).toHaveBeenCalledWith(['/admin/dashboard']);
  });

  it('should validate email format and required password before submitting', () => {
    // 1. Empty email
    component.email = '';
    component.password = 'ValidPassword123!';
    component.onLogin();
    expect(ownerAuthServiceMock.login).not.toHaveBeenCalled();
    expect(component.errorMessage()).toContain('Please enter your business email address.');

    // 2. Invalid email format
    component.email = 'not-an-email';
    component.onLogin();
    expect(ownerAuthServiceMock.login).not.toHaveBeenCalled();
    expect(component.errorMessage()).toContain('Please enter a valid email address');

    // 3. Empty password
    component.email = 'valid.owner@dinevia.fr';
    component.password = '';
    component.onLogin();
    expect(ownerAuthServiceMock.login).not.toHaveBeenCalled();
    expect(component.errorMessage()).toContain('Please enter your account password.');

    // 4. Short password (< 8 chars)
    component.password = '12345';
    component.onLogin();
    expect(ownerAuthServiceMock.login).not.toHaveBeenCalled();
    expect(component.errorMessage()).toContain('Password must be at least 8 characters long.');
  });

  it('should execute successful owner login and navigate to /admin/dashboard', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');

    component.email = 'chef.julien@legabriel.fr';
    component.password = 'DineviaPass2026!';
    component.onLogin();

    expect(ownerAuthServiceMock.login).toHaveBeenCalledWith({
      email: 'chef.julien@legabriel.fr',
      password: 'DineviaPass2026!'
    });

    expect(component.isLoading()).toBe(false);
    expect(component.errorMessage()).toBeNull();
    expect(component.successMessage()).toContain('Welcome back, Chef Julien Laurent!');
    expect(navigateSpy).toHaveBeenCalledWith(['/admin/dashboard']);

    // Check that owner session is established
    expect(authService.isOwnerAuthenticated()).toBe(true);
    expect(authService.currentOwner()?.role).toBe('RestaurantOwner');
    expect(authService.currentOwner()?.email).toBe('chef.julien@legabriel.fr');
    expect(authService.getOwnerAccessToken()).toBe(validOwnerJwt);
  });

  it('should reject login if backend returns Customer or non-owner role', () => {
    const customerResponse: ApiResponse<OwnerLoginResponseData> = {
      statusCode: 200,
      message: 'Login successful.',
      data: {
        accessToken: customerJwt,
        tokenType: 'Bearer',
        expiresIn: 1800
      }
    };
    ownerAuthServiceMock.login.mockReturnValue(of(customerResponse));

    const navigateSpy = vi.spyOn(router, 'navigate');

    component.email = 'jane@gmail.com';
    component.password = 'CustomerPassword123!';
    component.onLogin();

    // Must NOT navigate to owner dashboard
    expect(navigateSpy).not.toHaveBeenCalled();

    // Must display access denied error for Customer role
    expect(component.errorMessage()).toContain("This account has role 'Customer', which is not authorized");
    expect(component.isLoading()).toBe(false);

    // Must NOT establish owner session
    expect(authService.isOwnerAuthenticated()).toBe(false);
    expect(authService.currentOwner()).toBeNull();
  });

  it('should keep customer session completely unaffected by owner authentication', () => {
    const initialCustomer = authService.currentUser();
    expect(initialCustomer).toBeTruthy();
    expect(initialCustomer?.fullName).toBe('Alexander Wright');

    component.email = 'chef.julien@legabriel.fr';
    component.password = 'DineviaPass2026!';
    component.onLogin();

    // Owner is authenticated
    expect(authService.isOwnerAuthenticated()).toBe(true);
    expect(authService.currentOwner()?.name).toBe('Chef Julien Laurent');

    // Customer persona remains untouched
    expect(authService.currentUser()).toEqual(initialCustomer);
    expect(authService.isAuthenticated()).toBe(true);

    // Clear owner session
    authService.clearOwnerSession();
    expect(authService.isOwnerAuthenticated()).toBe(false);
    expect(authService.currentOwner()).toBeNull();

    // Customer persona still remains untouched
    expect(authService.currentUser()).toEqual(initialCustomer);
  });

  it('should handle 401 Unauthorized invalid credentials error gracefully', () => {
    ownerAuthServiceMock.login.mockReturnValue(
      throwError(() => ({
        status: 401,
        error: { statusCode: 401, message: 'Invalid email or password.' }
      }))
    );

    component.email = 'wrong@legabriel.fr';
    component.password = 'IncorrectPass!';
    component.onLogin();

    expect(component.isLoading()).toBe(false);
    expect(component.errorMessage()).toBe('Invalid email or password. Please verify your credentials and try again.');
    expect(authService.isOwnerAuthenticated()).toBe(false);
  });

  it('should handle network/server connection failure (status 0)', () => {
    ownerAuthServiceMock.login.mockReturnValue(
      throwError(() => ({
        status: 0,
        statusText: 'Unknown Error'
      }))
    );

    component.email = 'chef.julien@legabriel.fr';
    component.password = 'ValidPassword123!';
    component.onLogin();

    expect(component.isLoading()).toBe(false);
    expect(component.errorMessage()).toContain('Unable to connect to the authentication server');
    expect(authService.isOwnerAuthenticated()).toBe(false);
  });

  it('should prevent duplicate submission while request is in-flight', () => {
    // Set isLoading to true to simulate in-flight request
    component.isLoading.set(true);

    component.email = 'chef.julien@legabriel.fr';
    component.password = 'ValidPassword123!';
    component.onLogin();

    // Service should not have been called
    expect(ownerAuthServiceMock.login).not.toHaveBeenCalled();
  });

  it('should never log passwords or JWT tokens to the console', () => {
    const logSpy = vi.spyOn(console, 'log');
    const infoSpy = vi.spyOn(console, 'info');
    const warnSpy = vi.spyOn(console, 'warn');
    const errorSpy = vi.spyOn(console, 'error');

    component.email = 'chef.julien@legabriel.fr';
    component.password = 'SecretSensitivePassword2026!';
    component.onLogin();

    const allConsoleCalls = [
      ...logSpy.mock.calls,
      ...infoSpy.mock.calls,
      ...warnSpy.mock.calls,
      ...errorSpy.mock.calls
    ].flat().map(arg => String(arg));

    const leakedPassword = allConsoleCalls.some(msg => msg.includes('SecretSensitivePassword2026!'));
    const leakedToken = allConsoleCalls.some(msg => msg.includes(validOwnerJwt));

    expect(leakedPassword).toBe(false);
    expect(leakedToken).toBe(false);
  });
});
