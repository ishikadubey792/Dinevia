import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { CuisineService } from './cuisine.service';
import { ApiCuisine, ApiResponse } from '../models/cuisine.model';
import { environment } from '../../../environments/environment';

describe('CuisineService', () => {
  let service: CuisineService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CuisineService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(CuisineService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch cuisines from GET /api/cuisines', () => {
    const mockResponse: ApiResponse<ApiCuisine[]> = {
      statusCode: 200,
      message: 'Cuisines fetched successfully.',
      data: [
        { id: 1, name: 'Italian', isActive: true },
        { id: 2, name: 'French Haute', isActive: true },
        { id: 3, name: 'Japanese', isActive: false }
      ]
    };

    service.getCuisines().subscribe((res) => {
      expect(res.statusCode).toBe(200);
      expect(res.message).toBe('Cuisines fetched successfully.');
      expect(res.data.length).toBe(3);
      expect(res.data[0].id).toBe(1);
      expect(res.data[0].name).toBe('Italian');
    });

    const req = httpTesting.expectOne(`${environment.apiUrl}/cuisines`);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should filter active cuisines cleanly, share cached/in-flight state without duplicate calls, and support forceRefresh', () => {
    const activeResults: ApiCuisine[][] = [];

    // Concurrent calls should trigger only one HTTP GET /api/cuisines
    service.loadCuisines().subscribe(list => activeResults.push(list));
    service.loadCuisines().subscribe(list => activeResults.push(list));

    expect(service.isLoadingCuisines()).toBe(true);
    const req = httpTesting.expectOne(`${environment.apiUrl}/cuisines`);
    req.flush({
      statusCode: 200,
      message: 'OK',
      data: [
        { id: 1, name: 'Italian', isActive: true },
        { id: 2, name: '  Italian  ', isActive: true },
        { id: 3, name: 'Inactive Cuisine', isActive: false },
        { id: 4, name: 'Japanese', isActive: true }
      ]
    });

    expect(service.isLoadingCuisines()).toBe(false);
    expect(service.isCuisinesLoaded()).toBe(true);
    expect(service.cuisinesLoadError()).toBeNull();
    expect(service.apiCuisines().map(c => c.name)).toEqual(['Italian', 'Japanese']);
    expect(activeResults.length).toBe(2);

    // Subsequent loadCuisines() call reuses cached state with 0 extra HTTP requests
    let cachedResult: ApiCuisine[] = [];
    service.loadCuisines().subscribe(list => (cachedResult = list));
    httpTesting.expectNone(`${environment.apiUrl}/cuisines`);
    expect(cachedResult.map(c => c.name)).toEqual(['Italian', 'Japanese']);

    // forceRefresh triggers a fresh HTTP request
    service.loadCuisines(true).subscribe();
    const refreshReq = httpTesting.expectOne(`${environment.apiUrl}/cuisines`);
    refreshReq.flush({ statusCode: 200, message: 'OK', data: [{ id: 5, name: 'French', isActive: true }] });
    expect(service.apiCuisines().map(c => c.name)).toEqual(['French']);
  });

  it('should clear cuisines without mock fallback and expose error state when /api/cuisines fails', () => {
    service.loadCuisines().subscribe(list => {
      expect(list).toEqual([]);
    });

    const req = httpTesting.expectOne(`${environment.apiUrl}/cuisines`);
    req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

    expect(service.isLoadingCuisines()).toBe(false);
    expect(service.isCuisinesLoaded()).toBe(false);
    expect(service.apiCuisines()).toEqual([]);
    expect(service.cuisinesLoadError()).toBeTruthy();
  });
});

