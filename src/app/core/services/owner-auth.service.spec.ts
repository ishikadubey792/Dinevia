import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { OwnerAuthService } from './owner-auth.service';
import {
  OwnerRegisterRequest,
  OwnerRegisterResponseData,
  OwnerLoginRequest,
  OwnerLoginResponseData,
  parseJwtClaims
} from '../models/owner-auth.model';
import { ApiResponse } from '../models/cuisine.model';
import { environment } from '../../../environments/environment';

describe('OwnerAuthService', () => {
  let service: OwnerAuthService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        OwnerAuthService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(OwnerAuthService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should build multipart FormData with exact PascalCase field names and individual CuisineIds', () => {
    const dummyFile = new File(['fake-cover-bytes'], 'facade.jpg', { type: 'image/jpeg' });
    const request: OwnerRegisterRequest = {
      ownerName: 'Chef Julien Laurent',
      ownerEmail: 'chef.julien@legabriel.fr',
      password: 'SecurePassword2026!',
      restaurantName: 'Le Gabriel Paris',
      address: '42 Avenue Gabriel',
      city: 'Paris',
      description: 'Haute gastronomy sanctuary.',
      phone: '+33 1 42 68 88 00',
      restaurantEmail: 'reservations@legabriel.fr',
      cuisineIds: [1, 2, 7],
      coverImage: dummyFile
    };

    const formData = service.buildRegisterFormData(request);

    // Verify exact PascalCase field names
    expect(formData.get('OwnerName')).toBe('Chef Julien Laurent');
    expect(formData.get('OwnerEmail')).toBe('chef.julien@legabriel.fr');
    expect(formData.get('Password')).toBe('SecurePassword2026!');
    expect(formData.get('RestaurantName')).toBe('Le Gabriel Paris');
    expect(formData.get('Address')).toBe('42 Avenue Gabriel');
    expect(formData.get('City')).toBe('Paris');
    expect(formData.get('Description')).toBe('Haute gastronomy sanctuary.');
    expect(formData.get('Phone')).toBe('+33 1 42 68 88 00');
    expect(formData.get('RestaurantEmail')).toBe('reservations@legabriel.fr');

    // Verify each numeric cuisine ID is appended separately with key "CuisineIds"
    const cuisineIds = formData.getAll('CuisineIds');
    expect(cuisineIds.length).toBe(3);
    expect(cuisineIds).toEqual(['1', '2', '7']);

    // Verify cover image
    const coverImage = formData.get('CoverImage') as File;
    expect(coverImage).toBeTruthy();
    expect(coverImage.name).toBe('facade.jpg');
  });

  it('should post multipart FormData to /auth/register-restaurant-owner without manual Content-Type header', () => {
    const request: OwnerRegisterRequest = {
      ownerName: 'Chef Julien',
      ownerEmail: 'julien@restaurant.com',
      password: 'SecretPassword123!',
      restaurantName: 'Maison Laurent',
      address: '18 Rue Royale',
      city: 'Paris',
      description: 'Fine dining.',
      phone: '+33 1 42 68 88 00',
      restaurantEmail: 'info@maisonlaurent.com',
      cuisineIds: [1, 3]
    };

    const mockResponse: ApiResponse<OwnerRegisterResponseData> = {
      statusCode: 200,
      message: 'Restaurant owner registered successfully.',
      data: {
        id: 'usr-901',
        name: 'Chef Julien',
        email: 'julien@restaurant.com',
        role: 'RestaurantOwner',
        restaurant: {
          id: 42,
          name: 'Maison Laurent',
          address: '18 Rue Royale',
          city: 'Paris'
        },
        accessToken: 'mock-jwt-token-xyz',
        tokenType: 'Bearer',
        expiresIn: 3600
      }
    };

    service.registerRestaurantOwner(request).subscribe((res) => {
      expect(res.statusCode).toBe(200);
      expect(res.data.accessToken).toBe('mock-jwt-token-xyz');
      expect(res.data.name).toBe('Chef Julien');
      expect(res.data.role).toBe('RestaurantOwner');
    });

    const req = httpTesting.expectOne(`${environment.apiUrl}/auth/register-restaurant-owner`);
    expect(req.request.method).toBe('POST');
    // Ensure no manual Content-Type is overridden so the browser sets boundary
    expect(req.request.headers.has('Content-Type')).toBe(false);
    expect(req.request.body instanceof FormData).toBe(true);

    req.flush(mockResponse);
  });

  it('should handle API validation failure response', () => {
    const request: OwnerRegisterRequest = {
      ownerName: '',
      ownerEmail: 'invalid-email',
      password: '',
      restaurantName: '',
      address: '',
      city: '',
      description: '',
      phone: '',
      restaurantEmail: '',
      cuisineIds: []
    };

    let errorResponse: any;
    service.registerRestaurantOwner(request).subscribe({
      next: () => expect.unreachable('Should have failed with 400 Bad Request'),
      error: (err) => {
        errorResponse = err;
      }
    });

    const req = httpTesting.expectOne(`${environment.apiUrl}/auth/register-restaurant-owner`);
    expect(req.request.method).toBe('POST');

    req.flush(
      {
        statusCode: 400,
        message: 'Validation failed for one or more fields.',
        errors: {
          OwnerEmail: ['The OwnerEmail field is not a valid e-mail address.']
        }
      },
      { status: 400, statusText: 'Bad Request' }
    );

    expect(errorResponse.status).toBe(400);
    expect(errorResponse.error.message).toBe('Validation failed for one or more fields.');
  });

  it('should post JSON login request to /auth/login with email and password', () => {
    const loginRequest: OwnerLoginRequest = {
      email: '  chef.julien@legabriel.fr  ',
      password: 'SecurePassword2026!'
    };

    const mockLoginResponse: ApiResponse<OwnerLoginResponseData> = {
      statusCode: 200,
      message: 'Login successful.',
      data: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummyPayload.signature',
        tokenType: 'Bearer',
        expiresIn: 1800
      }
    };

    service.login(loginRequest).subscribe((res) => {
      expect(res.statusCode).toBe(200);
      expect(res.message).toBe('Login successful.');
      expect(res.data.accessToken).toBe(mockLoginResponse.data.accessToken);
      expect(res.data.tokenType).toBe('Bearer');
      expect(res.data.expiresIn).toBe(1800);
    });

    const req = httpTesting.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    // Ensure email is trimmed
    expect(req.request.body.email).toBe('chef.julien@legabriel.fr');
    expect(req.request.body.password).toBe('SecurePassword2026!');

    req.flush(mockLoginResponse);
  });

  it('should handle 401 Unauthorized for invalid credentials', () => {
    let errorResponse: any;
    service.login({ email: 'wrong@owner.com', password: 'WrongPassword!' }).subscribe({
      next: () => expect.unreachable('Should have failed with 401'),
      error: (err) => {
        errorResponse = err;
      }
    });

    const req = httpTesting.expectOne(`${environment.apiUrl}/auth/login`);
    req.flush(
      { statusCode: 401, message: 'Invalid email or password.', data: null },
      { status: 401, statusText: 'Unauthorized' }
    );

    expect(errorResponse.status).toBe(401);
    expect(errorResponse.error.message).toBe('Invalid email or password.');
  });

  it('parseJwtClaims should decode standard claims and Microsoft schema URIs correctly', () => {
    // Generate valid test JWT payload with Microsoft ClaimTypes schemas
    const payload = {
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier': '101',
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name': 'Chef Julien Laurent',
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress': 'chef.julien@legabriel.fr',
      'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': 'RestaurantOwner'
    };

    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = btoa(JSON.stringify(payload));
    const token = `${header}.${body}.mock-signature`;

    const claims = parseJwtClaims(token);
    expect(claims).toBeTruthy();
    expect(claims?.id).toBe('101');
    expect(claims?.name).toBe('Chef Julien Laurent');
    expect(claims?.email).toBe('chef.julien@legabriel.fr');
    expect(claims?.role).toBe('RestaurantOwner');

    // Invalid tokens should return null
    expect(parseJwtClaims('')).toBeNull();
    expect(parseJwtClaims('invalid-token')).toBeNull();
  });
});
