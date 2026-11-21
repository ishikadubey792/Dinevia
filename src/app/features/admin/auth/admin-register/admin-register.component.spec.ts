import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AdminRegisterComponent } from './admin-register.component';
import { AdminDataService } from '../../../../core/services/admin-data.service';
import { AuthService } from '../../../../core/services/auth.service';
import { CuisineService } from '../../../../core/services/cuisine.service';
import { OwnerAuthService } from '../../../../core/services/owner-auth.service';
import { LegalDocumentService } from '../../../../core/services/legal-document.service';
import { ApiCuisine, ApiResponse } from '../../../../core/models/cuisine.model';
import { OwnerRegisterResponseData } from '../../../../core/models/owner-auth.model';
import { LegalDocument } from '../../../../core/models/legal-document.model';

describe('AdminRegisterComponent', () => {
  let component: AdminRegisterComponent;
  let fixture: ComponentFixture<AdminRegisterComponent>;
  let router: Router;
  let adminData: AdminDataService;
  let authService: AuthService;
  let cuisineServiceMock: { getCuisines: ReturnType<typeof vi.fn> };
  let ownerAuthServiceMock: { registerRestaurantOwner: ReturnType<typeof vi.fn> };
  let legalDocumentServiceMock: {
    activeDocument: WritableSignal<LegalDocument | null>;
    loading: WritableSignal<boolean>;
    error: WritableSignal<string | null>;
    loadActiveTerms: ReturnType<typeof vi.fn>;
    reloadActiveTerms: ReturnType<typeof vi.fn>;
  };
  let activeDocSignal: WritableSignal<LegalDocument | null>;
  let loadingTermsSignal: WritableSignal<boolean>;
  let errorTermsSignal: WritableSignal<string | null>;

  const mockLegalDocument: LegalDocument = {
    id: 42,
    title: 'Dinevia Terms and Conditions',
    content: '<h2>Restaurant Owner Onboarding Charter</h2><p>Rules and hospitality standards...</p>',
    version: '2.0',
    effectiveDate: '2026-11-21'
  };

  const mockCuisinesResponse: ApiResponse<ApiCuisine[]> = {
    statusCode: 200,
    message: 'Cuisines fetched successfully.',
    data: [
      { id: 1, name: 'French Haute', isActive: true },
      { id: 2, name: 'Contemporary', isActive: true },
      { id: 3, name: 'Italian', isActive: true },
      { id: 4, name: 'Japanese', isActive: true }
    ]
  };

  const mockRegisterSuccessResponse: ApiResponse<OwnerRegisterResponseData> = {
    statusCode: 200,
    message: 'Restaurant owner registered successfully.',
    data: {
      id: 'owner-77',
      name: 'Chef Julien Laurent',
      email: 'julien.laurent@dinevia.fr',
      role: 'RestaurantOwner',
      restaurant: {
        id: 10,
        name: 'Maison Laurent Paris'
      },
      accessToken: 'jwt-access-token-xyz',
      tokenType: 'Bearer',
      expiresIn: 3600
    }
  };

  beforeEach(async () => {
    sessionStorage.clear();
    cuisineServiceMock = {
      getCuisines: vi.fn().mockReturnValue(of(mockCuisinesResponse))
    };

    ownerAuthServiceMock = {
      registerRestaurantOwner: vi.fn().mockReturnValue(of(mockRegisterSuccessResponse))
    };

    activeDocSignal = signal<LegalDocument | null>(mockLegalDocument);
    loadingTermsSignal = signal<boolean>(false);
    errorTermsSignal = signal<string | null>(null);

    legalDocumentServiceMock = {
      activeDocument: activeDocSignal,
      loading: loadingTermsSignal,
      error: errorTermsSignal,
      loadActiveTerms: vi.fn().mockImplementation(() => {
        activeDocSignal.set(mockLegalDocument);
        return of(mockLegalDocument);
      }),
      reloadActiveTerms: vi.fn().mockImplementation(() => {
        activeDocSignal.set(mockLegalDocument);
        return of(mockLegalDocument);
      })
    };

    await TestBed.configureTestingModule({
      imports: [AdminRegisterComponent],
      providers: [
        provideRouter([
          { path: 'admin/register', component: AdminRegisterComponent },
          { path: 'admin/restaurants', component: AdminRegisterComponent },
          { path: 'admin/dashboard', component: AdminRegisterComponent },
          { path: 'admin/login', component: AdminRegisterComponent },
          { path: 'partner-with-us', component: AdminRegisterComponent }
        ]),
        AdminDataService,
        AuthService,
        {
          provide: CuisineService,
          useValue: cuisineServiceMock
        },
        {
          provide: OwnerAuthService,
          useValue: ownerAuthServiceMock
        },
        {
          provide: LegalDocumentService,
          useValue: legalDocumentServiceMock
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminRegisterComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    adminData = TestBed.inject(AdminDataService);
    authService = TestBed.inject(AuthService);
    fixture.detectChanges();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('should create the admin register component', () => {
    expect(component).toBeTruthy();
  });

  // 1. Terms loading on initialization
  it('should fetch active Terms on initialization using LegalDocumentService', () => {
    expect(legalDocumentServiceMock.loadActiveTerms).toHaveBeenCalledTimes(1);
    expect(component.activeTerms()).toEqual(mockLegalDocument);
  });

  // 2. Modal open and close
  it('should open and close the Terms modal without automatically checking acceptance', () => {
    expect(component.isTermsModalOpen()).toBe(false);
    expect(component.termsAccepted()).toBe(false);

    component.openTermsModal();
    expect(component.isTermsModalOpen()).toBe(true);

    component.closeTermsModal();
    expect(component.isTermsModalOpen()).toBe(false);
    // Closing modal must not check checkbox
    expect(component.termsAccepted()).toBe(false);
    expect(component.registerForm.get('termsAccepted')?.value).toBe(false);
  });

  // 3. Checkbox initially unchecked
  it('should initialize business registration fields empty and terms unchecked by default', () => {
    expect(component.ownerName).toBe('');
    expect(component.ownerEmail).toBe('');
    expect(component.password).toBe('');
    expect(component.restaurantName).toBe('');
    expect(component.streetAddress).toBe('');
    expect(component.city).toBe('');
    expect(component.description).toBe('');
    expect(component.phone).toBe('');
    expect(component.restaurantEmail).toBe('');
    expect(component.selectedCuisineIds).toEqual([]);
    expect(component.selectedCuisines).toEqual([]);
    expect(component.coverImagePreview).toBe('');

    expect(component.termsAccepted()).toBe(false);
    expect(component.registerForm.get('termsAccepted')?.value).toBe(false);
    expect(component.isSubmitting()).toBe(false);
  });

  it('should load cuisines from CuisineService on init', () => {
    expect(cuisineServiceMock.getCuisines).toHaveBeenCalled();
    expect(component.availableCuisines().length).toBe(4);
    expect(component.isLoadingCuisines()).toBe(false);
  });

  // 12. Existing cuisine selection works
  it('should toggle cuisine selection using number IDs and names', () => {
    expect(component.isCuisineSelected(3)).toBe(false);
    expect(component.selectedCuisineIds.includes(3)).toBe(false);

    component.toggleCuisine(3);
    expect(component.isCuisineSelected(3)).toBe(true);
    expect(component.selectedCuisineIds.includes(3)).toBe(true);
    expect(component.selectedCuisines.includes('Italian')).toBe(true);

    component.toggleCuisine('Italian');
    expect(component.isCuisineSelected(3)).toBe(false);
    expect(component.selectedCuisineIds.includes(3)).toBe(false);
  });

  it('should handle API error gracefully when loading cuisines', () => {
    cuisineServiceMock.getCuisines.mockReturnValue(throwError(() => new Error('Server unreachable')));
    component.loadCuisines();

    expect(component.isLoadingCuisines()).toBe(false);
    expect(component.cuisineLoadError()).toBeTruthy();
    expect(component.availableCuisines().length).toBeGreaterThan(0);
  });

  // 4. Mandatory acceptance
  it('should keep termsAccepted unchecked by default and block submission until checked', () => {
    const termsCheckbox = fixture.nativeElement.querySelector('input[name="termsAccepted"]') as HTMLInputElement;
    expect(termsCheckbox).toBeTruthy();
    expect(termsCheckbox.checked).toBe(false);
    expect(component.termsAccepted()).toBe(false);

    // Fill all required business fields while leaving termsAccepted false
    component.ownerName = 'Chef Julien Laurent';
    component.ownerEmail = 'julien.laurent@dinevia.com';
    component.password = 'OwnerPass@2026';
    component.restaurantName = 'Le Gabriel Atelier';
    component.streetAddress = '42 Rue du Faubourg';
    component.city = 'Paris';
    component.description = 'Contemporary fine dining sanctuary with seasonal tasting menus.';
    component.phone = '9876543210';
    component.restaurantEmail = 'reservations@legabriel.com';
    component.selectedCuisineIds = [1];

    component.onSubmit();

    expect(component.errorMessage()).toContain('You must accept the Terms and Conditions to register.');
    expect(ownerAuthServiceMock.registerRestaurantOwner).not.toHaveBeenCalled();
    expect(component.isSubmitting()).toBe(false);

    // Checking termsAccepted allows registration submission
    component.termsAccepted.set(true);
    component.onSubmit();

    expect(ownerAuthServiceMock.registerRestaurantOwner).toHaveBeenCalledTimes(1);
  });

  // 5, 6, 7. Correct LegalDocumentId & AcceptedTerms in payload, successful owner registration
  it('should register restaurant with AcceptedTerms and LegalDocumentId, establish owner session, and navigate', () => {
    vi.useFakeTimers();
    const initialCount = adminData.ownerRestaurants().length;
    const navigateSpy = vi.spyOn(router, 'navigate');

    component.ownerName = 'Chef Julien Laurent';
    component.ownerEmail = 'julien.laurent@dinevia.com';
    component.password = 'OwnerPass@2026';
    component.restaurantName = 'Le Gabriel Atelier';
    component.streetAddress = '42 Rue du Faubourg';
    component.city = 'Paris';
    component.description = 'Contemporary fine dining sanctuary with seasonal tasting menus.';
    component.phone = '9876543210';
    component.restaurantEmail = 'reservations@legabriel.com';
    component.selectedCuisineIds = [1];
    component.termsAccepted.set(true);

    component.onSubmit();

    expect(ownerAuthServiceMock.registerRestaurantOwner).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerName: 'Chef Julien Laurent',
        ownerEmail: 'julien.laurent@dinevia.com',
        acceptedTerms: true,
        legalDocumentId: 42
      })
    );
    expect(component.successMessage()).toContain('Registration successful');
    expect(authService.isOwnerAuthenticated()).toBe(true);
    expect(authService.currentOwner()?.name).toBe('Chef Julien Laurent');
    expect(authService.getOwnerAccessToken()).toBe('jwt-access-token-xyz');
    expect(adminData.ownerRestaurants().length).toBe(initialCount + 1);

    vi.advanceTimersByTime(500);
    expect(navigateSpy).toHaveBeenCalledWith(['/admin/dashboard']);
    vi.useRealTimers();
  });

  // 8. Terms API failure blocks registration
  it('should block registration if active Terms cannot be loaded or verified', () => {
    activeDocSignal.set(null);
    fixture.detectChanges();

    component.ownerName = 'Chef Julien Laurent';
    component.ownerEmail = 'julien.laurent@dinevia.com';
    component.password = 'OwnerPass@2026';
    component.restaurantName = 'Le Gabriel Atelier';
    component.streetAddress = '42 Rue du Faubourg';
    component.city = 'Paris';
    component.description = 'Contemporary fine dining sanctuary with seasonal tasting menus.';
    component.phone = '9876543210';
    component.restaurantEmail = 'reservations@legabriel.com';
    component.selectedCuisineIds = [1];
    component.termsAccepted.set(true);

    component.onSubmit();

    expect(ownerAuthServiceMock.registerRestaurantOwner).not.toHaveBeenCalled();
    expect(component.errorMessage()).toContain('Terms and Conditions could not be verified');
  });

  // 9. Retry functionality
  it('should display error message and allow retry when terms fail to load', () => {
    errorTermsSignal.set('Failed to load terms document.');
    activeDocSignal.set(null);
    fixture.detectChanges();

    const errorAlert = fixture.nativeElement.querySelector('.terms-error-alert');
    expect(errorAlert).toBeTruthy();
    expect(errorAlert.textContent).toContain('Failed to load terms document.');

    const retryBtn = fixture.nativeElement.querySelector('.terms-retry-btn') as HTMLButtonElement;
    expect(retryBtn).toBeTruthy();
    retryBtn.click();

    expect(legalDocumentServiceMock.reloadActiveTerms).toHaveBeenCalledTimes(1);
  });

  // 10. Updated Terms response resets acceptance
  it('should reset acceptance checkbox, show update notice, and reload terms when backend indicates terms changed', () => {
    ownerAuthServiceMock.registerRestaurantOwner.mockReturnValue(
      throwError(() => ({
        status: 400,
        error: {
          statusCode: 400,
          message: 'The Terms and Conditions have been updated. Please accept the latest terms.'
        }
      }))
    );

    component.ownerName = 'Chef Julien Laurent';
    component.ownerEmail = 'julien.laurent@dinevia.com';
    component.password = 'OwnerPass@2026';
    component.restaurantName = 'Le Gabriel Atelier';
    component.streetAddress = '42 Rue du Faubourg';
    component.city = 'Paris';
    component.description = 'Contemporary fine dining sanctuary with seasonal tasting menus.';
    component.phone = '9876543210';
    component.restaurantEmail = 'reservations@legabriel.com';
    component.selectedCuisineIds = [1];
    component.termsAccepted.set(true);

    component.onSubmit();

    expect(component.termsAccepted()).toBe(false);
    expect(component.registerForm.get('termsAccepted')?.value).toBe(false);
    expect(component.errorMessage()).toContain('Terms and Conditions have been updated');
    expect(legalDocumentServiceMock.reloadActiveTerms).toHaveBeenCalled();
  });

  // 11. Existing image upload works
  it('should handle cover image selection and preview', () => {
    const dummyFile = new File(['image-bytes'], 'facade.jpg', { type: 'image/jpeg' });
    const event = {
      target: {
        files: [dummyFile]
      }
    } as unknown as Event;

    component.onFileSelected(event);
    expect(component.selectedCoverFile).toBe(dummyFile);
  });

  it('should handle API registration failure gracefully and display error message', () => {
    ownerAuthServiceMock.registerRestaurantOwner.mockReturnValue(
      throwError(() => ({
        status: 400,
        error: {
          statusCode: 400,
          message: 'An establishment with this email is already registered.'
        }
      }))
    );
    const navigateSpy = vi.spyOn(router, 'navigate');

    component.ownerName = 'Chef Julien Laurent';
    component.ownerEmail = 'julien.laurent@dinevia.com';
    component.password = 'OwnerPass@2026';
    component.restaurantName = 'Le Gabriel Atelier';
    component.streetAddress = '42 Rue du Faubourg';
    component.city = 'Paris';
    component.description = 'Contemporary fine dining sanctuary with seasonal tasting menus.';
    component.phone = '9876543210';
    component.restaurantEmail = 'reservations@legabriel.com';
    component.selectedCuisineIds = [1];
    component.termsAccepted.set(true);

    component.onSubmit();

    expect(component.isSubmitting()).toBe(false);
    expect(component.errorMessage()).toBe('An establishment with this email is already registered.');
    expect(navigateSpy).not.toHaveBeenCalled();
    expect(authService.isOwnerAuthenticated()).toBe(false);
  });

  it('should reject invalid email format before calling register API', () => {
    component.ownerName = 'Chef Julien Laurent';
    component.ownerEmail = 'not-an-email';
    component.password = 'OwnerPass@2026';
    component.restaurantName = 'Le Gabriel Atelier';
    component.streetAddress = '42 Rue du Faubourg';
    component.city = 'Paris';
    component.description = 'Contemporary fine dining sanctuary with seasonal tasting menus.';
    component.phone = '9876543210';
    component.restaurantEmail = 'reservations@legabriel.com';
    component.selectedCuisineIds = [1];
    component.termsAccepted.set(true);

    component.onSubmit();

    expect(ownerAuthServiceMock.registerRestaurantOwner).not.toHaveBeenCalled();
    expect(component.errorMessage()).toBe('Please enter valid email addresses for owner and restaurant.');
  });

  it('should reject empty form submission and mark all controls as touched', () => {
    component.onSubmit();
    expect(ownerAuthServiceMock.registerRestaurantOwner).not.toHaveBeenCalled();
    expect(component.errorMessage()).toBeTruthy();
  });

  it('should reject invalid phone number formats (alphabetic, short, long, invalid starting digit)', () => {
    const invalidPhones = ['abcdefghij', '98765', '987654321099', '1234567890', '5876543210'];

    for (const phone of invalidPhones) {
      component.ownerName = 'Chef Julien Laurent';
      component.ownerEmail = 'julien.laurent@dinevia.com';
      component.password = 'OwnerPass@2026';
      component.restaurantName = 'Le Gabriel Atelier';
      component.streetAddress = '42 Rue du Faubourg';
      component.city = 'Paris';
      component.description = 'Contemporary fine dining sanctuary with seasonal tasting menus.';
      component.phone = phone;
      component.restaurantEmail = 'reservations@legabriel.com';
      component.selectedCuisineIds = [1];
      component.termsAccepted.set(true);

      component.onSubmit();

      expect(ownerAuthServiceMock.registerRestaurantOwner).not.toHaveBeenCalled();
      expect(component.registerForm.get('phone')?.invalid).toBe(true);
      expect(component.errorMessage()).toBe(component.getPhoneErrorMessage());
      expect(component.errorMessage()!.length).toBeGreaterThan(0);
    }
  });

  it('should reject invalid password formats (missing upper, lower, digit, special or whitespace)', () => {
    const invalidPasswords = [
      'short1!',         // < 8 chars
      'nouppercase123!', // no uppercase
      'NOLOWERCASE123!', // no lowercase
      'NoDigitsHere!',   // no digit
      'NoSpecialChar12', // no special character
      'Has Space 123!'   // whitespace
    ];

    for (const pwd of invalidPasswords) {
      component.ownerName = 'Chef Julien Laurent';
      component.ownerEmail = 'julien.laurent@dinevia.com';
      component.password = pwd;
      component.restaurantName = 'Le Gabriel Atelier';
      component.streetAddress = '42 Rue du Faubourg';
      component.city = 'Paris';
      component.description = 'Contemporary fine dining sanctuary with seasonal tasting menus.';
      component.phone = '9876543210';
      component.restaurantEmail = 'reservations@legabriel.com';
      component.selectedCuisineIds = [1];
      component.termsAccepted.set(true);

      component.onSubmit();

      expect(ownerAuthServiceMock.registerRestaurantOwner).not.toHaveBeenCalled();
      expect(component.registerForm.get('password')?.invalid).toBe(true);
      expect(component.errorMessage()).toBeTruthy();
    }
  });

  it('should trim string values before dispatching registration payload', () => {
    component.ownerName = '   Chef Julien Laurent   ';
    component.ownerEmail = '  julien.laurent@dinevia.com  ';
    component.password = 'OwnerPass@2026';
    component.restaurantName = '  Le Gabriel Atelier  ';
    component.streetAddress = '  42 Rue du Faubourg  ';
    component.city = '  Paris  ';
    component.description = '  Contemporary fine dining sanctuary with seasonal tasting menus.  ';
    component.phone = '  9876543210  ';
    component.restaurantEmail = '  reservations@legabriel.com  ';
    component.selectedCuisineIds = [1];
    component.termsAccepted.set(true);

    component.onSubmit();

    expect(ownerAuthServiceMock.registerRestaurantOwner).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerName: 'Chef Julien Laurent',
        ownerEmail: 'julien.laurent@dinevia.com',
        restaurantName: 'Le Gabriel Atelier',
        address: '42 Rue du Faubourg',
        city: 'Paris',
        description: 'Contemporary fine dining sanctuary with seasonal tasting menus.',
        phone: '9876543210',
        restaurantEmail: 'reservations@legabriel.com',
        acceptedTerms: true,
        legalDocumentId: 42
      })
    );
  });

  it('should prevent duplicate submissions while already submitting', () => {
    component.isSubmitting.set(true);
    component.onSubmit();
    expect(ownerAuthServiceMock.registerRestaurantOwner).not.toHaveBeenCalled();
  });

  it('should prevent checking terms checkbox when terms are loading or not loaded', () => {
    loadingTermsSignal.set(true);
    fixture.detectChanges();

    const mockEvent = {
      preventDefault: vi.fn()
    } as unknown as MouseEvent;

    component.handleTermsCheckboxClick(mockEvent);
    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });
});
