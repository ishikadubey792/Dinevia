import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { SignupComponent } from './signup.component';
import { AuthService } from '../../../core/services/auth.service';
import { CustomerAuthService } from '../../../core/services/customer-auth.service';
import { ApiResponse } from '../../../core/models/cuisine.model';
import {
  CustomerRegisterResponseData,
  CustomerLoginResponseData
} from '../../../core/models/customer-auth.model';

describe('SignupComponent Real API Integration & Strict Validation', () => {
  let component: SignupComponent;
  let fixture: ComponentFixture<SignupComponent>;
  let router: Router;
  let authService: AuthService;
  let customerAuthServiceMock: {
    register: ReturnType<typeof vi.fn>;
    login: ReturnType<typeof vi.fn>;
  };

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

  const mockRegisterResponse: ApiResponse<CustomerRegisterResponseData> = {
    statusCode: 200,
    message: 'User registered successfully.',
    data: {
      id: 1001,
      name: 'Ishika Patron',
      email: 'ishika@example.com'
    }
  };

  const mockLoginResponse: ApiResponse<CustomerLoginResponseData> = {
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
      register: vi.fn().mockReturnValue(of(mockRegisterResponse)),
      login: vi.fn().mockReturnValue(of(mockLoginResponse))
    };

    await TestBed.configureTestingModule({
      imports: [SignupComponent],
      providers: [
        AuthService,
        { provide: CustomerAuthService, useValue: customerAuthServiceMock },
        provideRouter([
          { path: 'signup', component: SignupComponent },
          { path: 'profile', component: SignupComponent },
          { path: 'login', component: SignupComponent }
        ])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SignupComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    authService = TestBed.inject(AuthService);

    fixture.detectChanges();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('should create the signup component with clean initial state', () => {
    expect(component).toBeTruthy();
    expect(component.isLoading()).toBe(false);
    expect(component.errorMessage()).toBeNull();
    expect(component.successMessage()).toBeNull();
    expect(component.isPasswordVisible()).toBe(false);
    expect(component.isConfirmPasswordVisible()).toBe(false);
    expect(component.signupForm.valid).toBe(false);
    expect(component.signupForm.get('fullName')?.value).toBe('');
    expect(component.signupForm.get('email')?.value).toBe('');
    expect(component.signupForm.get('phone')?.value).toBe('');
    expect(component.signupForm.get('agreeTerms')?.value).toBe(false);
  });

  it('should toggle password and confirm password visibility signals', () => {
    expect(component.isPasswordVisible()).toBe(false);
    component.togglePasswordVisibility();
    expect(component.isPasswordVisible()).toBe(true);
    component.togglePasswordVisibility();
    expect(component.isPasswordVisible()).toBe(false);

    expect(component.isConfirmPasswordVisible()).toBe(false);
    component.toggleConfirmPasswordVisibility();
    expect(component.isConfirmPasswordVisible()).toBe(true);
    component.toggleConfirmPasswordVisibility();
    expect(component.isConfirmPasswordVisible()).toBe(false);
  });

  it('should compute password strength correctly based on complexity', () => {
    component.signupForm.patchValue({ password: 'short' });
    expect(component.passwordStrength().score).toBeLessThanOrEqual(2);

    component.signupForm.patchValue({ password: 'Password@123' });
    expect(component.passwordStrength().score).toBe(4);
    expect(component.passwordStrength().label).toBe('Excellent');
  });

  it('should validate form inputs: fullName, email, phone, password complexity, and agreeTerms', () => {
    // Empty form is invalid
    expect(component.signupForm.valid).toBe(false);

    // Fill valid inputs
    component.signupForm.patchValue({
      fullName: 'Ishika Patron',
      email: 'ishika@example.com',
      phone: '9876543210',
      password: 'Password@123',
      confirmPassword: 'Password@123',
      agreeTerms: true
    });
    expect(component.signupForm.valid).toBe(true);

    // Mismatched passwords
    component.signupForm.patchValue({ confirmPassword: 'DifferentPassword@123' });
    component.signupForm.get('confirmPassword')?.markAsTouched();
    expect(component.signupForm.valid).toBe(false);
    expect(component.hasPasswordMismatch()).toBe(true);

    // Unchecked terms
    component.signupForm.patchValue({
      confirmPassword: 'Password@123',
      agreeTerms: false
    });
    expect(component.signupForm.valid).toBe(false);
  });

  it('should reject passwords that do not meet backend complexity requirements', () => {
    const testCases = [
      { pwd: 'password@123', reason: 'requiresUppercase' },
      { pwd: 'PASSWORD@123', reason: 'requiresLowercase' },
      { pwd: 'Password1234', reason: 'requiresSpecial' },
      { pwd: 'Password@abc', reason: 'requiresDigit' },
      { pwd: 'Pass word@123', reason: 'hasWhitespace' },
      { pwd: 'Pass@1', reason: 'minlength' }
    ];

    for (const testCase of testCases) {
      component.signupForm.patchValue({
        fullName: 'Ishika Patron',
        email: 'ishika@example.com',
        phone: '9876543210',
        password: testCase.pwd,
        confirmPassword: testCase.pwd,
        agreeTerms: true
      });

      expect(component.signupForm.get('password')?.valid).toBe(false);
      expect(component.getPasswordErrorMessage().length).toBeGreaterThan(0);
    }
  });

  it('should block signup submission until mandatory agreeTerms checkbox is checked', () => {
    const termsCheckbox = fixture.nativeElement.querySelector('input[formControlName="agreeTerms"]') as HTMLInputElement;
    expect(termsCheckbox).toBeTruthy();
    expect(termsCheckbox.checked).toBe(false);

    // Populate all valid fields except agreeTerms remains false
    component.signupForm.patchValue({
      fullName: 'Ishika Patron',
      email: 'ishika@example.com',
      phone: '9876543210',
      password: 'Password@123',
      confirmPassword: 'Password@123',
      agreeTerms: false
    });

    component.onSubmit();

    expect(customerAuthServiceMock.register).not.toHaveBeenCalled();
    expect(component.isFieldInvalid('agreeTerms')).toBe(true);
    expect(component.errorMessage()).toContain('Please review and correct the highlighted fields');

    // Now check agreeTerms and submit cleanly
    component.signupForm.patchValue({ agreeTerms: true });
    component.onSubmit();

    expect(customerAuthServiceMock.register).toHaveBeenCalledTimes(1);
    expect(authService.isCustomerAuthenticated()).toBe(true);
  });

  it('should reject submission and display error when form is invalid', () => {
    component.signupForm.patchValue({
      fullName: '',
      email: 'invalid-email',
      password: 'short'
    });

    component.onSubmit();

    expect(customerAuthServiceMock.register).not.toHaveBeenCalled();
    expect(component.errorMessage()).toContain('Please review and correct the highlighted fields');
    expect(component.isLoading()).toBe(false);
  });

  it('should successfully register customer, perform automatic login, and navigate to /profile', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');

    component.signupForm.patchValue({
      fullName: 'Ishika Patron',
      email: 'ishika@example.com',
      phone: '9876543210',
      password: 'Password@123',
      confirmPassword: 'Password@123',
      agreeTerms: true
    });

    component.onSubmit();

    // Verify register called with backend-supported fields only (NO phone)
    expect(customerAuthServiceMock.register).toHaveBeenCalledWith({
      name: 'Ishika Patron',
      email: 'ishika@example.com',
      password: 'Password@123'
    });

    // Verify automatic login called with credentials
    expect(customerAuthServiceMock.login).toHaveBeenCalledWith({
      email: 'ishika@example.com',
      password: 'Password@123'
    });

    expect(component.isLoading()).toBe(false);
    expect(component.errorMessage()).toBeNull();
    expect(component.successMessage()).toContain('Welcome to Dinevia, Ishika Patron!');
    expect(navigateSpy).toHaveBeenCalledWith(['/profile']);

    // Check that customer session is established
    expect(authService.isCustomerAuthenticated()).toBe(true);
    expect(authService.getCustomerAccessToken()).toBe(validCustomerJwt);
    expect(authService.currentUser()?.fullName).toBe('Ishika Patron');
    expect(authService.currentUser()?.email).toBe('ishika@example.com');
  });

  it('should handle duplicate email (400 Bad Request / 409 Conflict) from backend gracefully', () => {
    customerAuthServiceMock.register.mockReturnValue(
      throwError(() => ({
        status: 400,
        error: { message: 'A customer account with this email address already exists.' }
      }))
    );

    component.signupForm.patchValue({
      fullName: 'Ishika Patron',
      email: 'existing@example.com',
      phone: '9876543210',
      password: 'Password@123',
      confirmPassword: 'Password@123',
      agreeTerms: true
    });

    component.onSubmit();

    expect(component.isLoading()).toBe(false);
    expect(component.errorMessage()).toBe('A customer account with this email address already exists.');
    expect(customerAuthServiceMock.login).not.toHaveBeenCalled();
    expect(authService.isCustomerAuthenticated()).toBe(false);
  });

  it('should handle backend connection failure (status 0) during registration', () => {
    customerAuthServiceMock.register.mockReturnValue(
      throwError(() => ({
        status: 0,
        error: null
      }))
    );

    component.signupForm.patchValue({
      fullName: 'Ishika Patron',
      email: 'ishika@example.com',
      phone: '9876543210',
      password: 'Password@123',
      confirmPassword: 'Password@123',
      agreeTerms: true
    });

    component.onSubmit();

    expect(component.isLoading()).toBe(false);
    expect(component.errorMessage()).toContain('Unable to connect to the authentication server');
    expect(customerAuthServiceMock.login).not.toHaveBeenCalled();
    expect(authService.isCustomerAuthenticated()).toBe(false);
  });

  it('should handle failed automatic login after successful registration', () => {
    customerAuthServiceMock.login.mockReturnValue(
      throwError(() => ({
        status: 500,
        error: { message: 'Internal server error' }
      }))
    );

    component.signupForm.patchValue({
      fullName: 'Ishika Patron',
      email: 'ishika@example.com',
      phone: '9876543210',
      password: 'Password@123',
      confirmPassword: 'Password@123',
      agreeTerms: true
    });

    component.onSubmit();

    expect(component.isLoading()).toBe(false);
    expect(component.errorMessage()).toContain('Account created successfully, but automatic sign-in was unavailable');
    expect(authService.isCustomerAuthenticated()).toBe(false);
  });

  it('should reject automatic login if backend returns a RestaurantOwner token', () => {
    const ownerLoginResponse: ApiResponse<CustomerLoginResponseData> = {
      statusCode: 200,
      message: 'Login successful.',
      data: {
        accessToken: ownerJwt,
        tokenType: 'Bearer',
        expiresIn: 1800
      }
    };
    customerAuthServiceMock.login.mockReturnValue(of(ownerLoginResponse));
    const navigateSpy = vi.spyOn(router, 'navigate');

    component.signupForm.patchValue({
      fullName: 'Ishika Patron',
      email: 'ishika@example.com',
      phone: '9876543210',
      password: 'Password@123',
      confirmPassword: 'Password@123',
      agreeTerms: true
    });

    component.onSubmit();

    expect(navigateSpy).not.toHaveBeenCalled();
    expect(component.errorMessage()).toContain('Invalid account role');
    expect(authService.isCustomerAuthenticated()).toBe(false);
  });

  it('should reject automatic login if returned token has expired or invalid claims', () => {
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
    const navigateSpy = vi.spyOn(router, 'navigate');

    component.signupForm.patchValue({
      fullName: 'Ishika Patron',
      email: 'ishika@example.com',
      phone: '9876543210',
      password: 'Password@123',
      confirmPassword: 'Password@123',
      agreeTerms: true
    });

    component.onSubmit();

    expect(navigateSpy).not.toHaveBeenCalled();
    expect(component.errorMessage()).toContain('Security token has expired or is invalid');
    expect(authService.isCustomerAuthenticated()).toBe(false);
  });

  it('should reject automatic login if token is missing user identifier claim', () => {
    const tokenNoId = createTestJwt({
      unique_name: 'No Id User',
      email: 'noid@example.com',
      role: 'Customer',
      exp: Math.floor(Date.now() / 1000) + 3600
    });

    const responseNoId: ApiResponse<CustomerLoginResponseData> = {
      statusCode: 200,
      message: 'Login successful.',
      data: {
        accessToken: tokenNoId,
        tokenType: 'Bearer',
        expiresIn: 1800
      }
    };
    customerAuthServiceMock.login.mockReturnValue(of(responseNoId));

    component.signupForm.patchValue({
      fullName: 'Ishika Patron',
      email: 'noid@example.com',
      phone: '9876543210',
      password: 'Password@123',
      confirmPassword: 'Password@123',
      agreeTerms: true
    });

    component.onSubmit();

    expect(component.errorMessage()).toContain('Missing valid user identifier');
    expect(authService.isCustomerAuthenticated()).toBe(false);
  });

  it('should enforce strict Indian mobile numbers and .com/.in email domains', () => {
    const emailCtrl = component.signupForm.get('email');
    const phoneCtrl = component.signupForm.get('phone');

    // Valid Indian phone numbers
    for (const validPhone of ['9876543210', '8765432109', '7654321098', '6123456789']) {
      phoneCtrl?.setValue(validPhone);
      expect(phoneCtrl?.valid).toBe(true);
    }

    // Invalid phone numbers (start digit < 6, <10 digits, >10 digits, non-numeric)
    for (const invalidPhone of ['1234567890', '987654321', '98765432101', '98765abc10', '+919876543210']) {
      phoneCtrl?.setValue(invalidPhone);
      expect(phoneCtrl?.valid).toBe(false);
      expect(component.getPhoneErrorMessage().length).toBeGreaterThan(0);
    }

    // Valid .com and .in emails
    for (const validEmail of ['user@gmail.com', 'ishika@yahoo.in', 'person@example.com']) {
      emailCtrl?.setValue(validEmail);
      expect(emailCtrl?.valid).toBe(true);
    }

    // Rejected email domains & malformed emails
    for (const badEmail of ['user@domain.org', 'user@domain.net', 'user@domain.co', 'user@gmail.com.in', 'invalid-email']) {
      emailCtrl?.setValue(badEmail);
      expect(emailCtrl?.valid).toBe(false);
      expect(component.getEmailErrorMessage()).toContain('.com or .in');
    }
  });

  it('should emit authSuccess and switchToLogin in embedded modal mode without navigating', () => {
    component.embedded = true;
    fixture.detectChanges();

    const authSuccessSpy = vi.fn();
    const switchLoginSpy = vi.fn();
    component.authSuccess.subscribe(authSuccessSpy);
    component.switchToLogin.subscribe(switchLoginSpy);

    const navigateSpy = vi.spyOn(router, 'navigate');
    const switchBtn = fixture.nativeElement.querySelector('.footer-action-link.btn-as-link') as HTMLButtonElement;
    expect(switchBtn).toBeTruthy();
    switchBtn.click();
    expect(switchLoginSpy).toHaveBeenCalledTimes(1);

    component.signupForm.patchValue({
      fullName: 'Ishika Patron',
      email: 'ishika@yahoo.in',
      phone: '9876543210',
      password: 'Password@123',
      confirmPassword: 'Password@123',
      agreeTerms: true
    });

    component.onSubmit();

    expect(authSuccessSpy).toHaveBeenCalledTimes(1);
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('should prevent duplicate submissions while request is already pending (loading state)', () => {
    component.signupForm.patchValue({
      fullName: 'Ishika Patron',
      email: 'ishika@example.com',
      phone: '9876543210',
      password: 'Password@123',
      confirmPassword: 'Password@123',
      agreeTerms: true
    });

    // Simulate active loading state
    component.isLoading.set(true);

    component.onSubmit();

    expect(customerAuthServiceMock.register).not.toHaveBeenCalled();
  });
});

