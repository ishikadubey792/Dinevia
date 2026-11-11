import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AdminRegisterComponent } from './admin-register.component';
import { AdminDataService } from '../../../../core/services/admin-data.service';
import { AuthService } from '../../../../core/services/auth.service';
import { CuisineService } from '../../../../core/services/cuisine.service';
import { OwnerAuthService } from '../../../../core/services/owner-auth.service';
import { ApiCuisine, ApiResponse } from '../../../../core/models/cuisine.model';
import { OwnerRegisterResponseData } from '../../../../core/models/owner-auth.model';

describe('AdminRegisterComponent', () => {
  let component: AdminRegisterComponent;
  let fixture: ComponentFixture<AdminRegisterComponent>;
  let router: Router;
  let adminData: AdminDataService;
  let authService: AuthService;
  let cuisineServiceMock: { getCuisines: ReturnType<typeof vi.fn> };
  let ownerAuthServiceMock: { registerRestaurantOwner: ReturnType<typeof vi.fn> };

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

  it('should initialize the business registration fields empty and terms unchecked by default', () => {
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
    expect(component.isSubmitting()).toBe(false);
  });

  it('should load cuisines from CuisineService on init', () => {
    expect(cuisineServiceMock.getCuisines).toHaveBeenCalled();
    expect(component.availableCuisines().length).toBe(4);
    expect(component.isLoadingCuisines()).toBe(false);
  });

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

    expect(component.errorMessage()).toContain('Please confirm that your establishment meets Dinevia hospitality standards.');
    expect(ownerAuthServiceMock.registerRestaurantOwner).not.toHaveBeenCalled();
    expect(component.isSubmitting()).toBe(false);

    // Checking termsAccepted allows registration submission
    component.termsAccepted.set(true);
    component.onSubmit();

    expect(ownerAuthServiceMock.registerRestaurantOwner).toHaveBeenCalledTimes(1);
  });

  it('should register restaurant, establish owner session, and navigate to /admin/dashboard on submit', () => {
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

    expect(ownerAuthServiceMock.registerRestaurantOwner).toHaveBeenCalled();
    expect(component.successMessage()).toContain('Registration successful');
    expect(authService.isOwnerAuthenticated()).toBe(true);
    expect(authService.currentOwner()?.name).toBe('Chef Julien Laurent');
    expect(authService.getOwnerAccessToken()).toBe('jwt-access-token-xyz');
    expect(adminData.ownerRestaurants().length).toBe(initialCount + 1);

    vi.advanceTimersByTime(500);
    expect(navigateSpy).toHaveBeenCalledWith(['/admin/dashboard']);
    vi.useRealTimers();
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

  it('should prevent duplicate submissions while already submitting', () => {
    component.isSubmitting.set(true);
    component.onSubmit();
    expect(ownerAuthServiceMock.registerRestaurantOwner).not.toHaveBeenCalled();
  });
});
