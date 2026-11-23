import {
  Component,
  Output,
  EventEmitter,
  OnInit,
  inject,
  computed,
  signal,
  HostListener,
  ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  FormsModule,
  Validators,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';
import { SearchCriteria } from '../../../../core/models/search-filter.model';
import { RestaurantService } from '../../../../core/services/restaurant.service';
import { GeolocationService } from '../../../../core/services/geolocation.service';
import { compareTimes, getTodayDateString } from '../../../../core/models/booking.model';

@Component({
  selector: 'app-search-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './search-panel.component.html',
  styleUrl: './search-panel.component.scss'
})
export class SearchPanelComponent implements OnInit {
  private readonly restaurantService = inject(RestaurantService);
  private readonly geolocationService = inject(GeolocationService);
  private readonly elementRef = inject(ElementRef);
  private readonly fb = inject(FormBuilder);

  @Output() searchSubmitted = new EventEmitter<SearchCriteria>();

  searchForm!: FormGroup;
  minDate: string = '';

  // ── Location Selector State Signals ──
  readonly isDropdownOpen = signal<boolean>(false);
  readonly selectedLocationMode = signal<'all' | 'current' | 'city'>('all');
  readonly selectedCity = signal<string>('');
  readonly citySearchQuery = signal<string>('');

  // ── Geolocation State References from GeolocationService ──
  readonly isLocating = this.geolocationService.isLocating;
  readonly locationStatus = this.geolocationService.status;
  readonly locationError = this.geolocationService.errorMessage;
  readonly hasLocation = this.geolocationService.hasLocation;

  /**
   * Available cities derived dynamically from loaded restaurants (zero hardcoding).
   */
  readonly availableCities = computed<string[]>(() => {
    const citySet = new Set<string>();
    for (const r of this.restaurantService.restaurants()) {
      if (r.city && r.city.trim().length > 0) {
        citySet.add(r.city.trim());
      }
    }
    return Array.from(citySet).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  });

  /**
   * Filtered cities based on quick user search inside the popover.
   */
  readonly filteredCities = computed<string[]>(() => {
    const q = this.citySearchQuery().trim().toLowerCase();
    const cities = this.availableCities();
    if (!q) return cities;
    return cities.filter(c => c.toLowerCase().includes(q));
  });

  /**
   * Display text for the location selector trigger button.
   */
  readonly locationDisplayText = computed<string>(() => {
    const mode = this.selectedLocationMode();
    if (mode === 'current') {
      return 'Current Location';
    }
    if (mode === 'city') {
      return this.selectedCity() || 'All Destinations';
    }
    return 'All Destinations';
  });

  readonly locations = computed(() => {
    const dynamicCities = this.availableCities().map(city => ({ label: city, value: city }));
    return [{ label: 'All Destinations', value: '' }, ...dynamicCities];
  });

  readonly cuisines = computed(() => {
    const activeCuisines = this.restaurantService.cuisines().map(c => ({
      label: c.name,
      value: c.slug
    }));
    return [{ label: 'All Cuisines', value: 'all' }, ...activeCuisines];
  });

  readonly guestOptions = [
    { label: '1 Guest (Solo Dining)', value: 1 },
    { label: '2 Guests (Date Night / Duo)', value: 2 },
    { label: '3 Guests', value: 3 },
    { label: '4 Guests (Small Group)', value: 4 },
    { label: '6 Guests (Celebration)', value: 6 },
    { label: '8+ Guests (Private Dining)', value: 8 }
  ];

  ngOnInit(): void {
    this.minDate = getTodayDateString();

    this.searchForm = this.fb.group(
      {
        location: [''],
        cuisine: ['all'],
        date: [this.minDate, [Validators.required]],
        startTime: ['18:30', [Validators.required]],
        endTime: ['20:00', [Validators.required]],
        guests: [2, [Validators.required, Validators.min(1), Validators.max(20)]]
      },
      { validators: [this.timeRangeValidator] }
    );

    // Keep custom selector in sync if location form control is patched externally
    this.searchForm.get('location')?.valueChanges.subscribe(val => {
      if (val && val !== 'all' && val !== '') {
        this.selectedLocationMode.set('city');
        this.selectedCity.set(val);
      } else if (!val || val === 'all' || val === '') {
        if (this.selectedLocationMode() !== 'current') {
          this.selectedLocationMode.set('all');
          this.selectedCity.set('');
        }
      }
    });
  }

  // ── Dropdown Controls ──

  toggleDropdown(event?: Event): void {
    event?.stopPropagation();
    this.isDropdownOpen.update(v => !v);
  }

  closeDropdown(): void {
    this.isDropdownOpen.set(false);
  }

  /**
   * Option A: Requests user current location via GeolocationService on explicit click.
   */
  async useCurrentLocation(event?: Event): Promise<void> {
    event?.stopPropagation();
    const coords = await this.geolocationService.getCurrentLocation();
    if (coords) {
      this.selectedLocationMode.set('current');
      this.selectedCity.set('');
      this.searchForm.get('location')?.setValue('');
      this.closeDropdown();
    }
  }

  /**
   * Option B: Selects a specific manual city.
   */
  selectCity(city: string, event?: Event): void {
    event?.stopPropagation();
    this.selectedLocationMode.set('city');
    this.selectedCity.set(city);
    this.searchForm.get('location')?.setValue(city);
    this.closeDropdown();
  }

  /**
   * Option B: Resets to All Destinations.
   */
  selectAllDestinations(event?: Event): void {
    event?.stopPropagation();
    this.selectedLocationMode.set('all');
    this.selectedCity.set('');
    this.searchForm.get('location')?.setValue('');
    this.closeDropdown();
  }

  onCitySearchChange(query: string): void {
    this.citySearchQuery.set(query);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const container = this.elementRef.nativeElement.querySelector('.location-select-wrap');
    if (container && !container.contains(target)) {
      this.closeDropdown();
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.closeDropdown();
  }

  private timeRangeValidator(group: AbstractControl): ValidationErrors | null {
    const start = group.get('startTime')?.value;
    const end = group.get('endTime')?.value;
    if (!start || !end) return null;
    const diff = compareTimes(start, end);
    if (Number.isNaN(diff) || diff >= 0) {
      return { invalidTimeRange: true };
    }
    return null;
  }

  get timeRangeInvalid(): boolean {
    return !!(
      this.searchForm?.errors?.['invalidTimeRange'] &&
      (this.searchForm.get('startTime')?.touched || this.searchForm.get('endTime')?.touched)
    );
  }

  onSubmit(): void {
    if (this.searchForm.valid) {
      const val = this.searchForm.value;
      const isCurrent = this.selectedLocationMode() === 'current';
      const city = this.selectedLocationMode() === 'city' ? this.selectedCity() : (val.location || '');
      const coords = isCurrent ? this.geolocationService.coordinates() : null;

      const criteria: SearchCriteria = {
        location: isCurrent ? '' : city,
        cuisine: val.cuisine || 'all',
        date: val.date,
        startTime: val.startTime,
        endTime: val.endTime,
        guests: Number(val.guests),
        time: val.startTime,
        useCurrentLocation: isCurrent,
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null
      };
      this.searchSubmitted.emit(criteria);
    } else {
      this.searchForm.markAllAsTouched();
    }
  }
}
