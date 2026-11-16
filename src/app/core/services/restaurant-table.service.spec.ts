import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RestaurantTableService } from './restaurant-table.service';
import { environment } from '../../../environments/environment';
import { RestaurantTable, CreateRestaurantTableDto, UpdateRestaurantTableDto } from '../models/restaurant-table.model';

describe('RestaurantTableService', () => {
  let service: RestaurantTableService;
  let httpTesting: HttpTestingController;

  const mockTables: RestaurantTable[] = [
    { id: 1, restaurantId: 10, tableNumber: 1, capacity: 2, status: 'Available' },
    { id: 2, restaurantId: 10, tableNumber: 2, capacity: 4, status: 'Occupied' },
    { id: 3, restaurantId: 10, tableNumber: 3, capacity: 6, status: 'Reserved' }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        RestaurantTableService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(RestaurantTableService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should fetch tables by restaurant ID', () => {
    let result: RestaurantTable[] | undefined;

    service.getTablesByRestaurant(10).subscribe(tables => {
      result = tables;
    });

    const req = httpTesting.expectOne(`${environment.apiUrl}/restaurant-tables/restaurant/10`);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, message: 'Tables fetched', data: mockTables });

    expect(result).toEqual(mockTables);
  });

  it('should fetch a single table by ID', () => {
    let result: RestaurantTable | undefined;

    service.getTableById(1).subscribe(table => {
      result = table;
    });

    const req = httpTesting.expectOne(`${environment.apiUrl}/restaurant-tables/1`);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, message: 'Table fetched', data: mockTables[0] });

    expect(result).toEqual(mockTables[0]);
  });

  it('should create a table via POST', () => {
    const dto: CreateRestaurantTableDto = {
      restaurantId: 10,
      tableNumber: 4,
      capacity: 4,
      status: 'Available'
    };
    const created: RestaurantTable = { id: 4, ...dto };

    let result: RestaurantTable | undefined;
    service.createTable(dto).subscribe(res => {
      result = res;
    });

    const req = httpTesting.expectOne(`${environment.apiUrl}/restaurant-tables`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush({ success: true, message: 'Table created', data: created });

    expect(result).toEqual(created);
  });

  it('should update a table via PUT', () => {
    const dto: UpdateRestaurantTableDto = {
      restaurantId: 10,
      tableNumber: 2,
      capacity: 6,
      status: 'Available'
    };

    let result: { id: number } | undefined;
    service.updateTable(2, dto).subscribe(res => {
      result = res;
    });

    const req = httpTesting.expectOne(`${environment.apiUrl}/restaurant-tables/2`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(dto);
    req.flush({ success: true, message: 'Table updated', data: { id: 2 } });

    expect(result).toEqual({ id: 2 });
  });

  it('should delete a table via DELETE', () => {
    let result: { id: number } | undefined;
    service.deleteTable(2).subscribe(res => {
      result = res;
    });

    const req = httpTesting.expectOne(`${environment.apiUrl}/restaurant-tables/2`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ success: true, message: 'Table deleted', data: { id: 2 } });

    expect(result).toEqual({ id: 2 });
  });
});

