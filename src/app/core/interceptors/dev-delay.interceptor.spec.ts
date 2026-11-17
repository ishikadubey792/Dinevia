import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { devDelayInterceptor } from './dev-delay.interceptor';
import { environment } from '../../../environments/environment';
import { vi } from 'vitest';

describe('devDelayInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([devDelayInterceptor])),
        provideHttpClientTesting()
      ]
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.removeItem('DINEVIA_SIMULATE_DELAY');
    vi.useRealTimers();
  });

  it('should pass requests through immediately when simulation is not enabled', () => {
    let responseData: any = null;

    http.get('/api/test').subscribe(data => {
      responseData = data;
    });

    const req = httpMock.expectOne('/api/test');
    req.flush({ success: true });

    expect(responseData).toEqual({ success: true });
  });

  it('should delay requests when DINEVIA_SIMULATE_DELAY session flag is active in development', () => {
    vi.useFakeTimers();
    const originalProd = environment.production;
    (environment as any).production = false;
    sessionStorage.setItem('DINEVIA_SIMULATE_DELAY', 'true');

    let responseData: any = null;
    http.get('/api/test-delayed').subscribe(data => {
      responseData = data;
    });

    const req = httpMock.expectOne('/api/test-delayed');
    req.flush({ success: true });

    // In-flight before advance
    expect(responseData).toBeNull();

    vi.advanceTimersByTime(1200);
    expect(responseData).toEqual({ success: true });

    (environment as any).production = originalProd;
  });
});
