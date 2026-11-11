import { Component, Output, EventEmitter, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SearchCriteria } from '../../../../core/models/search-filter.model';
import { RestaurantService } from '../../../../core/services/restaurant.service';

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

  readonly timeSlots = [
    '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM',
    '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM',
    '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM'
  ];

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
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    this.minDate = `${yyyy}-${mm}-${dd}`;

    this.searchForm = this.fb.group({
      location: [''],
      cuisine: ['all'],
      date: [this.minDate, Validators.required],
      time: ['7:30 PM', Validators.required],
      guests: [2, [Validators.required, Validators.min(1)]]
    });
  }

  onSubmit(): void {
    if (this.searchForm.valid) {
      const criteria: SearchCriteria = this.searchForm.value;
      this.searchSubmitted.emit(criteria);
    } else {
      this.searchForm.markAllAsTouched();
    }
  }
}
