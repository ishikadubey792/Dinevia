import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AdminRegisterComponent } from './admin-register.component';
import { AdminDataService } from '../../../../core/services/admin-data.service';
import { AuthService } from '../../../../core/services/auth.service';
import { CuisineService } from '../../../../core/services/cuisine.service';
import { ApiCuisine, ApiResponse } from '../../../../core/models/cuisine.model';

describe('AdminRegisterComponent', () => {
  let component: AdminRegisterComponent;
  let fixture: ComponentFixture<AdminRegisterComponent>;
  let router: Router;
  let adminData: AdminDataService;
  let cuisineServiceMock: { getCuisines: ReturnType<typeof vi.fn> };

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

  beforeEach(async () => {
    cuisineServiceMock = {
      getCuisines: vi.fn().mockReturnValue(of(mockCuisinesResponse))
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
        {
          provide: AuthService,
          useValue: {
            currentUser: () => null,
            login: () => ({ success: true }),
            logout: () => {}
          }
        },
        {
          provide: CuisineService,
          useValue: cuisineServiceMock
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminRegisterComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    adminData = TestBed.inject(AdminDataService);
    fixture.detectChanges();
  });

  it('should create the admin register component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize the 8 required business fields with sensible defaults', () => {
    // 1. Restaurant Name
    expect(component.restaurantName).toBeTruthy();
    // 2. Street Address
    expect(component.streetAddress).toBeTruthy();
    // 3. City
    expect(component.city).toBeTruthy();
    // 4. Description
    expect(component.description).toBeTruthy();
    // 5. Phone
    expect(component.phone).toBeTruthy();
    // 6. Restaurant Email
    expect(component.restaurantEmail).toBeTruthy();
    // 7. Multiple Cuisines Selection (IDs as numbers)
    expect(component.selectedCuisineIds.length).toBeGreaterThan(0);
    expect(typeof component.selectedCuisineIds[0]).toBe('number');
    expect(component.selectedCuisines.length).toBeGreaterThan(0);
    // 8. Cover Image preview
    expect(component.coverImagePreview).toBeTruthy();

    expect(component.termsAccepted()).toBe(true);
    expect(component.isSubmitting()).toBe(false);
  });

  it('should load cuisines from CuisineService on init', () => {
    expect(cuisineServiceMock.getCuisines).toHaveBeenCalled();
    expect(component.availableCuisines().length).toBe(4);
    expect(component.isLoadingCuisines()).toBe(false);
  });

  it('should toggle cuisine selection using number IDs and names', () => {
    // Italian has ID 3 and is initially unselected
    expect(component.isCuisineSelected(3)).toBe(false);
    expect(component.selectedCuisineIds.includes(3)).toBe(false);

    // Toggle by ID
    component.toggleCuisine(3);
    expect(component.isCuisineSelected(3)).toBe(true);
    expect(component.selectedCuisineIds.includes(3)).toBe(true);
    expect(component.selectedCuisines.includes('Italian')).toBe(true);

    // Toggle by name (backward compatibility)
    component.toggleCuisine('Italian');
    expect(component.isCuisineSelected(3)).toBe(false);
    expect(component.selectedCuisineIds.includes(3)).toBe(false);
  });

  it('should handle API error gracefully when loading cuisines', () => {
    cuisineServiceMock.getCuisines.mockReturnValue(throwError(() => new Error('Server unreachable')));
    component.loadCuisines();

    expect(component.isLoadingCuisines()).toBe(false);
    expect(component.cuisineLoadError()).toBeTruthy();
    // Fallback options preserved so UI is not broken
    expect(component.availableCuisines().length).toBeGreaterThan(0);
  });

  it('should register restaurant and navigate to /admin/restaurants on submit', () => {
    vi.useFakeTimers();
    const initialCount = adminData.ownerRestaurants().length;
    const navigateSpy = vi.spyOn(router, 'navigate');

    component.onSubmit();
    expect(component.isSubmitting()).toBe(true);

    vi.advanceTimersByTime(700);
    expect(component.isSubmitting()).toBe(false);
    expect(navigateSpy).toHaveBeenCalledWith(['/admin/restaurants']);
    expect(adminData.ownerRestaurants().length).toBe(initialCount + 1);
    vi.useRealTimers();
  });
});
