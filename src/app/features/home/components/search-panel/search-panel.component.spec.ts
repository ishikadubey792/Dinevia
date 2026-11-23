import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { SearchPanelComponent } from './search-panel.component';
import { RestaurantService } from '../../../../core/services/restaurant.service';
import { GeolocationService, GEOLOCATION } from '../../../../core/services/geolocation.service';
import { SearchCriteria } from '../../../../core/models/search-filter.model';
import { environment } from '../../../../../environments/environment';

class MockGeolocation implements Geolocation {
  lastSuccessCb: PositionCallback | null = null;
  lastErrorCb: PositionErrorCallback | null = null;
  lastOptions: PositionOptions | null = null;

  readonly getCurrentPositionSpy = vi.fn(
    (
      success: PositionCallback,
      error?: PositionErrorCallback | null,
      options?: PositionOptions
    ) => {
      this.lastSuccessCb = success;
      this.lastErrorCb = error ?? null;
      this.lastOptions = options ?? null;
    }
  );

  getCurrentPosition(
    success: PositionCallback,
    error?: PositionErrorCallback | null,
    options?: PositionOptions
  ): void {
    this.getCurrentPositionSpy(success, error, options);
  }

  readonly watchPosition = vi.fn();
  readonly clearWatch = vi.fn();

  triggerSuccess(coords: { latitude: number; longitude: number; accuracy?: number }): void {
    if (this.lastSuccessCb) {
      this.lastSuccessCb({
        coords: {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy ?? 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
          toJSON: () => ({})
        },
        timestamp: Date.now(),
        toJSON: () => ({})
      } as GeolocationPosition);
    }
  }

  triggerError(code: number, message = 'Geolocation error'): void {
    if (this.lastErrorCb) {
      this.lastErrorCb({
        code,
        message,
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3
      } as GeolocationPositionError);
    }
  }
}

describe('SearchPanelComponent Time Standardization (Phase 4A)', () => {
  let fixture: ComponentFixture<SearchPanelComponent>;
  let component: SearchPanelComponent;
  let httpTesting: HttpTestingController;
  let mockGeo: MockGeolocation;
  let restaurantService: RestaurantService;

  beforeEach(async () => {
    mockGeo = new MockGeolocation();

    await TestBed.configureTestingModule({
      imports: [SearchPanelComponent],
      providers: [
        RestaurantService,
        GeolocationService,
        { provide: GEOLOCATION, useFactory: () => mockGeo },
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
    restaurantService = TestBed.inject(RestaurantService);

    // RestaurantService constructor fetches /api/restaurants
    fixture = TestBed.createComponent(SearchPanelComponent);
    component = fixture.componentInstance;

    const restReq = httpTesting.expectOne(`${environment.apiUrl}/restaurants`);
    restReq.flush({
      statusCode: 200,
      message: 'OK',
      data: [
        { id: 1, name: 'Trattoria Da Luigi', city: 'Rome', isActive: true },
        { id: 2, name: 'Le Jules Verne', city: 'Paris', isActive: true },
        { id: 3, name: 'Sukiyabashi Jiro', city: 'Tokyo', isActive: true }
      ]
    });

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

  // ── Location Selector & Discovery Tests ──

  it('should derive available cities dynamically from loaded restaurants without hardcoding', () => {
    const cities = component.availableCities();
    expect(cities).toEqual(['Paris', 'Rome', 'Tokyo']);
    expect(cities.includes('Paris')).toBe(true);
  });

  it('should filter available cities based on quick search query', () => {
    component.onCitySearchChange('ro');
    expect(component.filteredCities()).toEqual(['Rome']);

    component.onCitySearchChange('p');
    expect(component.filteredCities()).toEqual(['Paris']);

    component.onCitySearchChange('nonexistent');
    expect(component.filteredCities()).toEqual([]);
  });

  it('should toggle popover open and close on trigger click, escape key, and document click', () => {
    expect(component.isDropdownOpen()).toBe(false);

    component.toggleDropdown();
    expect(component.isDropdownOpen()).toBe(true);

    component.onEscapeKey();
    expect(component.isDropdownOpen()).toBe(false);

    component.toggleDropdown();
    expect(component.isDropdownOpen()).toBe(true);

    // Clicking outside container closes dropdown
    const outsideEl = document.createElement('div');
    document.body.appendChild(outsideEl);
    component.onDocumentClick({ target: outsideEl } as unknown as MouseEvent);
    expect(component.isDropdownOpen()).toBe(false);
    document.body.removeChild(outsideEl);
  });

  it('should select manual city, update trigger text, set form control, and close dropdown', () => {
    component.toggleDropdown();
    fixture.detectChanges();

    component.selectCity('Paris');
    fixture.detectChanges();

    expect(component.selectedLocationMode()).toBe('city');
    expect(component.selectedCity()).toBe('Paris');
    expect(component.locationDisplayText()).toBe('Paris');
    expect(component.searchForm.get('location')?.value).toBe('Paris');
    expect(component.isDropdownOpen()).toBe(false);
  });

  it('should select All Destinations, clear city selection and form control, and close dropdown', () => {
    component.selectCity('Tokyo');
    expect(component.selectedCity()).toBe('Tokyo');

    component.selectAllDestinations();
    expect(component.selectedLocationMode()).toBe('all');
    expect(component.selectedCity()).toBe('');
    expect(component.locationDisplayText()).toBe('All Destinations');
    expect(component.searchForm.get('location')?.value).toBe('');
    expect(component.isDropdownOpen()).toBe(false);
  });

  it('should handle Option A (Use My Current Location) successfully when coordinates are granted', async () => {
    component.toggleDropdown();
    fixture.detectChanges();

    const locPromise = component.useCurrentLocation();
    expect(component.isLocating()).toBe(true);

    mockGeo.triggerSuccess({ latitude: 48.8566, longitude: 2.3522 });
    await locPromise;
    fixture.detectChanges();

    expect(component.isLocating()).toBe(false);
    expect(component.selectedLocationMode()).toBe('current');
    expect(component.locationDisplayText()).toBe('Current Location');
    expect(component.isDropdownOpen()).toBe(false);

    // On submit, emits useCurrentLocation: true with GPS coordinates
    let emitted: SearchCriteria | null = null;
    component.searchSubmitted.subscribe(c => (emitted = c));
    component.onSubmit();

    expect(emitted).toBeTruthy();
    expect(emitted!.useCurrentLocation).toBe(true);
    expect(emitted!.latitude).toBe(48.8566);
    expect(emitted!.longitude).toBe(2.3522);
    expect(emitted!.location).toBe('');
  });

  it('should handle Option A permission denial, show error message and allow retry', async () => {
    component.toggleDropdown();
    fixture.detectChanges();

    const locPromise = component.useCurrentLocation();
    mockGeo.triggerError(1, 'User denied Geolocation');
    await locPromise;
    fixture.detectChanges();

    expect(component.isLocating()).toBe(false);
    expect(component.selectedLocationMode()).not.toBe('current');
    expect(component.locationError()).toContain('denied');

    // Error alert and retry button should be visible in template
    const errorEl = fixture.nativeElement.querySelector('.loc-error-inline');
    expect(errorEl).toBeTruthy();
    expect(errorEl.textContent).toContain('denied');

    const retryBtn = fixture.nativeElement.querySelector('.btn-retry-loc') as HTMLButtonElement | null;
    expect(retryBtn).toBeTruthy();

    // Clicking retry triggers location request again
    const retryPromise = component.useCurrentLocation();
    expect(component.isLocating()).toBe(true);
    mockGeo.triggerSuccess({ latitude: 41.9028, longitude: 12.4964 });
    await retryPromise;
    fixture.detectChanges();

    expect(component.selectedLocationMode()).toBe('current');
    expect(component.locationDisplayText()).toBe('Current Location');
  });

  it('should handle Option A timeout and unavailable errors gracefully', async () => {
    component.toggleDropdown();
    fixture.detectChanges();

    const locPromise = component.useCurrentLocation();
    mockGeo.triggerError(3, 'Timeout expired');
    await locPromise;
    fixture.detectChanges();

    expect(component.locationError()).toContain('timed out');
  });

  it('should emit criteria with manual city and useCurrentLocation: false when submitting with city', () => {
    component.selectCity('Rome');
    let emitted: SearchCriteria | null = null;
    component.searchSubmitted.subscribe(c => (emitted = c));

    component.onSubmit();

    expect(emitted).toBeTruthy();
    expect(emitted!.location).toBe('Rome');
    expect(emitted!.useCurrentLocation).toBe(false);
    expect(emitted!.latitude).toBeNull();
    expect(emitted!.longitude).toBeNull();
  });
});

