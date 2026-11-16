import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { OperatingHourService } from './operating-hour.service';
import { environment } from '../../../environments/environment';
import { OperatingHour, CreateOperatingHourDto, UpdateOperatingHourDto } from '../models/operating-hour.model';

describe('OperatingHourService', () => {
  let service: OperatingHourService;
  let httpTesting: HttpTestingController;

  const mockHours: OperatingHour[] = [
    { id: 1, restaurantId: 10, dayOfWeek: 'Monday', openTime: '09:00:00', closeTime: '22:00:00', isClosed: false },
    { id: 2, restaurantId: 10, dayOfWeek: 'Tuesday', openTime: null, closeTime: null, isClosed: true }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        OperatingHourService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(OperatingHourService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should fetch operating hours by restaurant ID', () => {
    let result: OperatingHour[] | undefined;

    service.getOperatingHoursByRestaurant(10).subscribe(hours => {
      result = hours;
    });

    const req = httpTesting.expectOne(`${environment.apiUrl}/operating-hours/restaurant/10`);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, message: 'Operating hours fetched', data: mockHours });

    expect(result).toEqual(mockHours);
  });

  it('should fetch single operating hour by ID', () => {
    let result: OperatingHour | undefined;

    service.getOperatingHourById(1).subscribe(hour => {
      result = hour;
    });

    const req = httpTesting.expectOne(`${environment.apiUrl}/operating-hours/1`);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, message: 'Operating hour fetched', data: mockHours[0] });

    expect(result).toEqual(mockHours[0]);
  });

  it('should create operating hour via POST', () => {
    const dto: CreateOperatingHourDto = {
      restaurantId: 10,
      dayOfWeek: 'Wednesday',
      openTime: '10:00:00',
      closeTime: '23:00:00',
      isClosed: false
    };
    const created: OperatingHour = { id: 3, ...dto };

    let result: OperatingHour | undefined;
    service.createOperatingHour(dto).subscribe(res => {
      result = res;
    });

    const req = httpTesting.expectOne(`${environment.apiUrl}/operating-hours`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush({ success: true, message: 'Operating hour created', data: created });

    expect(result).toEqual(created);
  });

  it('should update operating hour via PUT', () => {
    const dto: UpdateOperatingHourDto = {
      restaurantId: 10,
      dayOfWeek: 'Tuesday',
      openTime: '11:00:00',
      closeTime: '21:00:00',
      isClosed: false
    };

    let result: { id: number } | undefined;
    service.updateOperatingHour(2, dto).subscribe(res => {
      result = res;
    });

    const req = httpTesting.expectOne(`${environment.apiUrl}/operating-hours/2`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(dto);
    req.flush({ success: true, message: 'Operating hour updated', data: { id: 2 } });

    expect(result).toEqual({ id: 2 });
  });

  it('should delete operating hour via DELETE', () => {
    let result: { id: number } | undefined;
    service.deleteOperatingHour(2).subscribe(res => {
      result = res;
    });

    const req = httpTesting.expectOne(`${environment.apiUrl}/operating-hours/2`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ success: true, message: 'Operating hour deleted', data: { id: 2 } });

    expect(result).toEqual({ id: 2 });
  });
});

