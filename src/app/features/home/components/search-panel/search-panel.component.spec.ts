import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { SearchPanelComponent } from './search-panel.component';
import { RestaurantService } from '../../../../core/services/restaurant.service';
import { SearchCriteria } from '../../../../core/models/search-filter.model';
import { environment } from '../../../../../environments/environment';

describe('SearchPanelComponent Time Standardization (Phase 4A)', () => {
  let fixture: ComponentFixture<SearchPanelComponent>;
  let component: SearchPanelComponent;
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchPanelComponent],
      providers: [
        RestaurantService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);

    // RestaurantService constructor fetches /api/restaurants
    fixture = TestBed.createComponent(SearchPanelComponent);
    component = fixture.componentInstance;

    const restReq = httpTesting.expectOne(`${environment.apiUrl}/restaurants`);
    restReq.flush({ statusCode: 200, message: 'OK', data: [] });

    fixture.detectChanges();
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should initialize form with separate Start Time and End Time defaults and today as minDate', () => {
    expect(component.searchForm).toBeTruthy();
    expect(component.searchForm.get('startTime')?.value).toBe('18:30');
    expect(component.searchForm.get('endTime')?.value).toBe('20:00');
    expect(component.searchForm.get('guests')?.value).toBe(2);
    expect(component.searchForm.valid).toBe(true);
    expect(component.timeRangeInvalid).toBe(false);
  });

  it('should flag form as invalid when End Time is earlier than or equal to Start Time', () => {
    component.searchForm.patchValue({
      startTime: '20:00',
      endTime: '18:30'
    });
    component.searchForm.get('startTime')?.markAsTouched();
    component.searchForm.get('endTime')?.markAsTouched();

    expect(component.searchForm.errors?.['invalidTimeRange']).toBe(true);
    expect(component.searchForm.valid).toBe(false);
    expect(component.timeRangeInvalid).toBe(true);
  });

  it('should flag form as invalid when End Time is equal to Start Time', () => {
    component.searchForm.patchValue({
      startTime: '19:00',
      endTime: '19:00'
    });
    component.searchForm.get('endTime')?.markAsTouched();

    expect(component.searchForm.errors?.['invalidTimeRange']).toBe(true);
    expect(component.searchForm.valid).toBe(false);
    expect(component.timeRangeInvalid).toBe(true);
  });

  it('should emit SearchCriteria with both startTime and endTime on valid submit', () => {
    let emittedCriteria: SearchCriteria | null = null;
    component.searchSubmitted.subscribe(c => {
      emittedCriteria = c;
    });

    component.searchForm.patchValue({
      location: 'Rome',
      cuisine: 'italian',
      date: '2026-11-20',
      startTime: '19:00',
      endTime: '21:30',
      guests: 4
    });

    component.onSubmit();

    expect(emittedCriteria).toBeTruthy();
    expect(emittedCriteria!.startTime).toBe('19:00');
    expect(emittedCriteria!.endTime).toBe('21:30');
    expect(emittedCriteria!.date).toBe('2026-11-20');
    expect(emittedCriteria!.guests).toBe(4);
    expect(emittedCriteria!.location).toBe('Rome');
    expect(emittedCriteria!.cuisine).toBe('italian');
    expect(emittedCriteria!.time).toBe('19:00'); // Backwards compatibility
  });

  it('should mark all controls as touched and not emit when submitting an invalid time interval', () => {
    let emitted = false;
    component.searchSubmitted.subscribe(() => {
      emitted = true;
    });

    component.searchForm.patchValue({
      startTime: '21:00',
      endTime: '19:00'
    });

    component.onSubmit();

    expect(emitted).toBe(false);
    expect(component.searchForm.get('startTime')?.touched).toBe(true);
    expect(component.searchForm.get('endTime')?.touched).toBe(true);
    expect(component.timeRangeInvalid).toBe(true);
  });
});

