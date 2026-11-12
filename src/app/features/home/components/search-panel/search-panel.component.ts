import { Component, Output, EventEmitter, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { SearchCriteria } from '../../../../core/models/search-filter.model';
import { RestaurantService } from '../../../../core/services/restaurant.service';
import { compareTimes, getTodayDateString } from '../../../../core/models/booking.model';

@Component({
  selector: 'app-search-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './search-panel.component.html',
  styleUrl: './search-panel.component.scss'
})
export class SearchPanelComponent implements OnInit {
  private readonly restaurantService = inject(RestaurantService);

  @Output() searchSubmitted = new EventEmitter<SearchCriteria>();

  searchForm!: FormGroup;
  minDate: string = '';

  readonly locations = computed(() => {
    const citySet = new Set<string>();
    for (const r of this.restaurantService.restaurants()) {
      if (r.city && r.city.trim().length > 0) {
        citySet.add(r.city.trim());
      }
    }
    const dynamicCities = Array.from(citySet)
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
      .map(city => ({ label: city, value: city }));
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

  constructor(private fb: FormBuilder) {}

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
      const criteria: SearchCriteria = {
        location: val.location || '',
        cuisine: val.cuisine || 'all',
        date: val.date,
        startTime: val.startTime,
        endTime: val.endTime,
        guests: Number(val.guests),
        time: val.startTime
      };
      this.searchSubmitted.emit(criteria);
    } else {
      this.searchForm.markAllAsTouched();
    }
  }
}
