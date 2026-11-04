import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CustomerAuthService } from './customer-auth.service';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/cuisine.model';
import {
  CustomerRegisterRequest,
  CustomerRegisterResponseData,
  CustomerLoginRequest,
  CustomerLoginResponseData
} from '../models/customer-auth.model';

describe('CustomerAuthService', () => {
  let service: CustomerAuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CustomerAuthService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(CustomerAuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('register', () => {
    it('should send POST request to /auth/register with trimmed payload', () => {
      const requestPayload: CustomerRegisterRequest = {
        name: '  Ishika  ',
        email: '  ishika@example.com  ',
        password: 'Password@123'
      };

      const mockResponse: ApiResponse<CustomerRegisterResponseData> = {
        statusCode: 200,
        message: 'User registered successfully.',
        data: {
          id: 1001,
          name: 'Ishika',
          email: 'ishika@example.com'
        }
      };

      service.register(requestPayload).subscribe(response => {
        expect(response.statusCode).toBe(200);
        expect(response.message).toBe('User registered successfully.');
        expect(response.data.id).toBe(1001);
        expect(response.data.name).toBe('Ishika');
        expect(response.data.email).toBe('ishika@example.com');
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/register`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        name: 'Ishika',
        email: 'ishika@example.com',
        password: 'Password@123'
      });

      req.flush(mockResponse);
    });

    it('should handle registration error response', () => {
      const requestPayload: CustomerRegisterRequest = {
        name: 'Ishika',
        email: 'ishika@example.com',
        password: 'Password@123'
      };

      service.register(requestPayload).subscribe({
        next: () => expect.unreachable('Should have failed'),
        error: error => {
          expect(error.status).toBe(400);
          expect(error.error.message).toBe('Email already registered.');
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/register`);
      req.flush({ message: 'Email already registered.' }, { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('login', () => {
    it('should send POST request to /auth/login with trimmed email', () => {
      const requestPayload: CustomerLoginRequest = {
        email: '  ishika@example.com  ',
        password: 'Password@123'
      };

      const mockResponse: ApiResponse<CustomerLoginResponseData> = {
        statusCode: 200,
        message: 'Login successful.',
        data: {
          accessToken: 'MOCK_CUSTOMER_JWT_TOKEN',
          tokenType: 'Bearer',
          expiresIn: 1800
        }
      };

      service.login(requestPayload).subscribe(response => {
        expect(response.statusCode).toBe(200);
        expect(response.message).toBe('Login successful.');
        expect(response.data.accessToken).toBe('MOCK_CUSTOMER_JWT_TOKEN');
        expect(response.data.tokenType).toBe('Bearer');
        expect(response.data.expiresIn).toBe(1800);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        email: 'ishika@example.com',
        password: 'Password@123'
      });

      req.flush(mockResponse);
    });

    it('should handle login unauthorized error response', () => {
      const requestPayload: CustomerLoginRequest = {
        email: 'ishika@example.com',
        password: 'WrongPassword'
      };

      service.login(requestPayload).subscribe({
        next: () => expect.unreachable('Should have failed'),
        error: error => {
          expect(error.status).toBe(401);
          expect(error.error.message).toBe('Invalid email or password.');
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush({ message: 'Invalid email or password.' }, { status: 401, statusText: 'Unauthorized' });
    });
  });
});

