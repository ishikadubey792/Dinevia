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
});

