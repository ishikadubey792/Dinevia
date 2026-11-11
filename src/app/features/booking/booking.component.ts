import { Component, DestroyRef, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { RestaurantService } from '../../core/services/restaurant.service';
import { BookingService } from '../../core/services/booking.service';
import { AuthService } from '../../core/services/auth.service';
import { Restaurant } from '../../core/models/restaurant.model';
import {
  AvailabilityQuery,
  AvailableTable,
  CreateBookingRequest,
  formatBookingDateParam,
  formatTimeSpanParam,
  formatDisplayTime,
  getTodayDateString,
  normalizeToTimeInput,
  prepareAvailabilityRequest
} from '../../core/models/booking.model';
import {
  dineviaEmailValidator,
  getDineviaEmailErrorMessage,
  getIndianPhoneErrorMessage,
  indianPhoneValidator
} from '../../core/validators/auth-validators';

type BookingAvailabilityTrigger =
  | { kind: 'clear' }
  | {
      kind: 'fetch';
      restaurantId: string;
      isActive: boolean;
      query: AvailabilityQuery;
      key: string;
      seq: number;
    };

@Component({
  selector: 'app-booking',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    NavbarComponent,
    FooterComponent
  ],
  templateUrl: './booking.component.html',
  styleUrl: './booking.component.scss'
})
export class BookingComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly restaurantService = inject(RestaurantService);
  private readonly bookingService = inject(BookingService);
  private readonly authService = inject(AuthService);

  private readonly rawRestaurant = signal<Restaurant | null>(null);
  readonly restaurant = computed<Restaurant | null>(() => {
    const detail = this.rawRestaurant();
    return detail ? this.restaurantService.enrichFromLoadedList(detail) : null;
  });
  readonly isLoadingRestaurant = signal<boolean>(true);
  readonly restaurantLoadError = signal<string | null>(null);
  readonly isNotFound = signal<boolean>(false);
  readonly submissionError = signal<string | null>(null);
  readonly isSubmitting = signal<boolean>(false);

  private currentRestaurantId: string | null = null;
  private readonly restaurantLoadTrigger$ = new Subject<{ id: string }>();

  // Real-Time Table Availability state (GET /api/bookings/availability)
  private readonly availabilityTrigger$ = new Subject<BookingAvailabilityTrigger>();
  private availabilitySeq = 0;
  private activeAvailabilityKey: string | null = null;
  private lastSuccessAvailabilityKey: string | null = null;
  private lastObservedAvailabilitySignature = '';

  readonly availableTables = signal<AvailableTable[]>([]);
  readonly selectedTableId = signal<number | null>(null);
  readonly selectedTable = computed<AvailableTable | null>(() => {
    const id = this.selectedTableId();
    return this.availableTables().find(t => t.id === id) ?? null;
  });
  readonly isLoadingAvailability = signal<boolean>(false);
  readonly availabilityError = signal<string | null>(null);
  readonly availabilityValidationError = signal<string | null>(null);
  readonly hasCheckedAvailability = signal<boolean>(false);
  readonly slotNotice = signal<string | null>(null);

  // Reactive summary mirror signals kept in sync with bookingForm
  readonly currentDateValue = signal<string>('');
  readonly currentStartTimeValue = signal<string>('18:30');
  readonly currentEndTimeValue = signal<string>('20:00');
  readonly currentGuestsValue = signal<number>(2);

  // Minimum allowed date (Today formatted as YYYY-MM-DD)
  readonly minDate = signal<string>('');

  // Selected dietary tags
  readonly selectedDietary = signal<string[]>([]);

  // Fallback image
  readonly fallbackImage = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80';

  // Booking Form
  bookingForm!: FormGroup;

  // Seating options
  readonly seatingAreas = [
    "Chef's Counter",
    "Main Dining Room",
    "Window Alcove",
    "Private Wine Vault",
    "Outdoor Garden Terrace"
  ];

  // Occasions list
  readonly occasions = [
    { label: 'Standard Dining', value: 'Standard Dining' },
    { label: 'Romantic Date Night', value: 'Romantic Date Night' },
    { label: 'Anniversary Celebration', value: 'Anniversary Celebration' },
    { label: 'Birthday Gathering', value: 'Birthday Gathering' },
    { label: 'Executive / Business Dinner', value: 'Executive / Business Dinner' },
    { label: 'Special Milestone', value: 'Special Milestone' }
  ];

  // Quick dietary options
  readonly dietaryOptions = [
    'Vegetarian',
    'Gluten-Free',
    'Vegan',
    'Dairy-Free',
    'Nut Allergy',
    'Pescatarian',
    'Shellfish-Free',
    'Halal'
  ];

  // Guest options
  readonly guestOptions = [
    { count: 1, label: '1 Guest (Solo Tasting)' },
    { count: 2, label: '2 Guests (Couple / Duo)' },
    { count: 3, label: '3 Guests' },
    { count: 4, label: '4 Guests (Small Party)' },
    { count: 5, label: '5 Guests' },
    { count: 6, label: '6 Guests (Celebration)' },
    { count: 7, label: '7 Guests' },
    { count: 8, label: '8 Guests (Private Salon)' },
    { count: 10, label: '10 Guests (Large Group)' },
    { count: 12, label: '12 Guests (Full Vault)' },
    { count: 20, label: '20 Guests (Maximum Party)' }
  ];

  readonly formattedTimeWindow = computed(() => {
    const start = formatDisplayTime(this.currentStartTimeValue());
    const end = formatDisplayTime(this.currentEndTimeValue());
    return `${start} – ${end}`;
  });

  // Formatted selected date string for live summary
  readonly formattedSelectedDate = computed(() => {
    const raw = this.currentDateValue() || this.bookingForm?.get('date')?.value;
    if (!raw) return 'Date not selected';
    try {
      const parts = raw.split('-');
      if (parts.length === 3) {
        const d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
        return d.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
      }
    } catch {
      return raw;
    }
    return raw;
  });

  ngOnInit(): void {
    const todayStr = getTodayDateString();
    this.minDate.set(todayStr);
    this.currentDateValue.set(todayStr);

    const authenticatedUser = this.authService.isCustomerAuthenticated()
      ? this.authService.currentCustomerSession()?.user
      : null;

    this.bookingForm = this.fb.group({
      date: [todayStr, [Validators.required]],
      startTime: ['18:30', [Validators.required]],
      endTime: ['20:00', [Validators.required]],
      guests: [2, [Validators.required, Validators.min(1), Validators.max(20)]],
      seatingArea: ["Chef's Counter", [Validators.required]],
      occasion: ['Romantic Date Night'],
      fullName: [authenticatedUser?.name || '', [Validators.required, Validators.minLength(2)]],
      email: [authenticatedUser?.email || '', [Validators.required, dineviaEmailValidator()]],
      phone: ['', [Validators.required, indianPhoneValidator()]],
      specialRequests: [''],
      agreeTerms: [false, [Validators.requiredTrue]]
    });

    this.setupRestaurantStream();
    this.setupAvailabilityStream();
    this.lastObservedAvailabilitySignature = this.getAvailabilityInputSignature();

    // Hydrate query parameters first (so initial paramMap load fetches availability once with hydrated inputs)
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(queryParams => {
        const patch: Record<string, unknown> = {};
        let availabilityInputChanged = false;

        const qDate = queryParams.get('date');
        if (qDate && qDate !== this.bookingForm.get('date')?.value) {
          patch['date'] = qDate;
          this.currentDateValue.set(qDate);
          availabilityInputChanged = true;
        }

        const qStart = queryParams.get('startTime') || queryParams.get('time');
        if (qStart) {
          const normalizedStart = normalizeToTimeInput(qStart);
          if (normalizedStart && normalizedStart !== this.bookingForm.get('startTime')?.value) {
            patch['startTime'] = normalizedStart;
            this.currentStartTimeValue.set(normalizedStart);
            availabilityInputChanged = true;
          }
        }

        const qEnd = queryParams.get('endTime');
        if (qEnd) {
          const normalizedEnd = normalizeToTimeInput(qEnd);
          if (normalizedEnd && normalizedEnd !== this.bookingForm.get('endTime')?.value) {
            patch['endTime'] = normalizedEnd;
            this.currentEndTimeValue.set(normalizedEnd);
            availabilityInputChanged = true;
          }
        }

        const qGuests = queryParams.get('guests');
        if (qGuests && !Number.isNaN(+qGuests) && +qGuests !== +this.bookingForm.get('guests')?.value) {
          patch['guests'] = +qGuests;
          this.currentGuestsValue.set(+qGuests);
          availabilityInputChanged = true;
        }

        const qSeating = queryParams.get('seating');
        if (qSeating) {
          patch['seatingArea'] = qSeating;
        }

        if (Object.keys(patch).length > 0) {
          this.bookingForm.patchValue(patch, { emitEvent: false });
          this.lastObservedAvailabilitySignature = this.getAvailabilityInputSignature();
          if (availabilityInputChanged && this.rawRestaurant()) {
            this.requestAvailabilityRefresh(false);
          }
        }
      });

    // Refresh availability atomically when date, startTime, endTime, or guests changes
    this.bookingForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.syncAvailabilityMirrorSignals();
        const nextSignature = this.getAvailabilityInputSignature();
        if (nextSignature !== this.lastObservedAvailabilitySignature) {
          this.lastObservedAvailabilitySignature = nextSignature;
          if (this.rawRestaurant()) {
            this.requestAvailabilityRefresh(false);
          }
        }
      });

    // Load restaurant details from GET /api/restaurants/{id}
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const id = params.get('id');
        if (id) {
          this.loadRestaurant(id);
        } else {
          this.isLoadingRestaurant.set(false);
          this.isNotFound.set(true);
        }
      });
  }

  private setupRestaurantStream(): void {
    this.restaurantLoadTrigger$
      .pipe(
        switchMap(({ id }) => {
          this.currentRestaurantId = id;
          this.isLoadingRestaurant.set(true);
          this.restaurantLoadError.set(null);
          this.isNotFound.set(false);
          this.rawRestaurant.set(null);
          this.resetAvailabilityState();

          return this.restaurantService.fetchRestaurantById(id);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(result => {
        this.isLoadingRestaurant.set(false);

        if (result.status === 'found' && result.restaurant) {
          this.rawRestaurant.set(result.restaurant);
          this.isNotFound.set(false);
          this.restaurantLoadError.set(null);
          this.syncAvailabilityMirrorSignals();
          this.requestAvailabilityRefresh(true);

          if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        } else if (result.status === 'not-found') {
          this.rawRestaurant.set(null);
          this.isNotFound.set(true);
          this.restaurantLoadError.set(null);
        } else {
          this.rawRestaurant.set(null);
          this.isNotFound.set(false);
          this.restaurantLoadError.set(
            result.errorMessage || 'Unable to load restaurant details right now. Please try again.'
          );
        }
      });
  }

  private setupAvailabilityStream(): void {
    this.availabilityTrigger$
      .pipe(
        switchMap(payload => {
          if (payload.kind === 'clear') {
            this.activeAvailabilityKey = null;
            this.isLoadingAvailability.set(false);
            return EMPTY;
          }

          this.activeAvailabilityKey = payload.key;
          this.isLoadingAvailability.set(true);
          this.availabilityError.set(null);

          return this.bookingService
            .getAvailableTablesForRestaurant(payload.restaurantId, payload.query, payload.isActive)
            .pipe(
              map(tables => ({ status: 'success' as const, tables, payload })),
              catchError(() =>
                of({
                  status: 'error' as const,
                  message: 'Unable to check real-time table availability right now. Please try again.',
                  payload
                })
              )
            );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(res => {
        if (res.payload.seq !== this.availabilitySeq) {
          return;
        }

        if (this.activeAvailabilityKey === res.payload.key) {
          this.activeAvailabilityKey = null;
        }
        this.isLoadingAvailability.set(false);
        this.hasCheckedAvailability.set(true);

        if (res.status === 'success') {
          this.lastSuccessAvailabilityKey = res.payload.key;
          this.availableTables.set(res.tables);
          this.availabilityError.set(null);

          const currentId = this.selectedTableId();
          if (currentId !== null && !res.tables.some(t => t.id === currentId)) {
            this.selectedTableId.set(null);
          }
        } else {
          this.lastSuccessAvailabilityKey = null;
          this.availableTables.set([]);
          this.selectedTableId.set(null);
          this.availabilityError.set(res.message);
        }
      });
  }

  private syncAvailabilityMirrorSignals(): void {
    this.currentDateValue.set(this.bookingForm.get('date')?.value || '');
    this.currentStartTimeValue.set(this.bookingForm.get('startTime')?.value || '');
    this.currentEndTimeValue.set(this.bookingForm.get('endTime')?.value || '');
    this.currentGuestsValue.set(Number(this.bookingForm.get('guests')?.value || 0));
  }

  private getAvailabilityInputSignature(): string {
    const d = String(this.bookingForm.get('date')?.value ?? '');
    const s = String(this.bookingForm.get('startTime')?.value ?? '');
    const e = String(this.bookingForm.get('endTime')?.value ?? '');
    const g = String(this.bookingForm.get('guests')?.value ?? '');
    return `${d}|${s}|${e}|${g}`;
  }

  loadRestaurant(id: string): void {
    this.restaurantLoadTrigger$.next({ id });
  }

  retryRestaurantLoad(): void {
    if (this.currentRestaurantId) {
      this.restaurantLoadTrigger$.next({ id: this.currentRestaurantId });
    }
  }

  private resetAvailabilityState(): void {
    ++this.availabilitySeq;
    this.activeAvailabilityKey = null;
    this.lastSuccessAvailabilityKey = null;
    this.availableTables.set([]);
    this.selectedTableId.set(null);
    this.isLoadingAvailability.set(false);
    this.availabilityError.set(null);
    this.availabilityValidationError.set(null);
    this.hasCheckedAvailability.set(false);
    this.slotNotice.set(null);
    this.availabilityTrigger$.next({ kind: 'clear' });
  }

  requestAvailabilityRefresh(force = false): void {
    const rest = this.rawRestaurant();
    if (!rest) return;

    const prepared = prepareAvailabilityRequest(rest.id, {
      bookingDate: this.bookingForm.get('date')?.value,
      startTime: this.bookingForm.get('startTime')?.value,
      endTime: this.bookingForm.get('endTime')?.value,
      numberOfGuests: Number(this.bookingForm.get('guests')?.value)
    });

    if (!prepared.valid) {
      ++this.availabilitySeq;
      this.activeAvailabilityKey = null;
      this.lastSuccessAvailabilityKey = null;
      this.availableTables.set([]);
      this.selectedTableId.set(null);
      this.availabilityError.set(null);
      this.availabilityValidationError.set(prepared.error);
      this.availabilityTrigger$.next({ kind: 'clear' });
      return;
    }

    this.availabilityValidationError.set(null);

    if (
      !force &&
      (prepared.key === this.activeAvailabilityKey ||
        prepared.key === this.lastSuccessAvailabilityKey)
    ) {
      return;
    }

    this.lastSuccessAvailabilityKey = null;
    const seq = ++this.availabilitySeq;
    this.availabilityTrigger$.next({
      kind: 'fetch',
      restaurantId: rest.id,
      isActive: rest.isActive !== false,
      query: prepared.query,
      key: prepared.key,
      seq
    });
  }

  retryAvailability(): void {
    this.requestAvailabilityRefresh(true);
  }

  selectTable(table: AvailableTable): void {
    this.selectedTableId.set(table.id);
    this.slotNotice.set(
      `Table #${table.tableNumber} (Seats ${table.capacity}) selected for ${this.formattedTimeWindow()}. Online reservation submission opens in Phase 3.`
    );
  }

  setQuickDate(offsetDays: number): void {
    const target = new Date();
    target.setDate(target.getDate() + offsetDays);
    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, '0');
    const dd = String(target.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    this.bookingForm.patchValue({ date: dateStr });
  }

  toggleDietary(tag: string): void {
    const current = [...this.selectedDietary()];
    const index = current.indexOf(tag);
    if (index >= 0) {
      current.splice(index, 1);
    } else {
      current.push(tag);
    }
    this.selectedDietary.set(current);
  }

  // Phase 3: Real booking creation via POST /api/bookings
  onSubmit(): void {
    this.submissionError.set(null);

    // 1. Guard: must have a restaurant loaded
    const rest = this.restaurant();
    if (!rest) {
      this.submissionError.set('Restaurant information could not be loaded. Please refresh and try again.');
      return;
    }

    // 2. Guard: customer authentication required
    if (!this.authService.isCustomerAuthenticated()) {
      this.submissionError.set('Please log in with your customer account to complete this reservation.');
      return;
    }

    // Guard: reject if logged in as a Restaurant Owner, not a Customer
    if (this.authService.isOwnerAuthenticated() && !this.authService.isCustomerAuthenticated()) {
      this.submissionError.set('Restaurant owner accounts cannot create customer bookings. Please log in with a customer account.');
      return;
    }

    // 3. Guard: form must be valid
    this.bookingForm.markAllAsTouched();
    if (this.bookingForm.invalid) {
      this.submissionError.set('Please complete all required fields before submitting your reservation.');
      return;
    }

    // 4. Guard: a table must be selected
    const tableId = this.selectedTableId();
    if (!tableId) {
      this.submissionError.set('Please select an available table before confirming your reservation.');
      return;
    }

    // 5. Build CreateBookingRequest — backend fields only, no customer PII
    const fv = this.bookingForm.value;
    let bookingDateParam: string;
    let startTimeParam: string;
    let endTimeParam: string;
    try {
      bookingDateParam = formatBookingDateParam(fv.date);
      startTimeParam = formatTimeSpanParam(fv.startTime);
      endTimeParam = formatTimeSpanParam(fv.endTime);
    } catch {
      this.submissionError.set('Invalid date or time values. Please check your selection.');
      return;
    }

    const specialReq = (fv.specialRequests ?? '').trim().slice(0, 1000) || null;

    const payload: CreateBookingRequest = {
      restaurantTableId: tableId,
      bookingDate: bookingDateParam,
      startTime: startTimeParam,
      endTime: endTimeParam,
      numberOfGuests: Number(fv.guests),
      specialRequest: specialReq
    };

    // 6. Build frontend-only context for confirmation page
    const selectedTbl = this.selectedTable();
    const customerContext = {
      restaurantId: String(rest.id),
      restaurantName: rest.name,
      restaurantImage: rest.imageUrl ?? this.fallbackImage,
      restaurantCuisine: rest.cuisine ?? 'Fine Dining',
      restaurantLocation: rest.neighborhood ? `${rest.neighborhood}, ${rest.city ?? ''}` : (rest.city ?? ''),
      restaurantAddress: rest.address ?? rest.location,
      restaurantPhone: rest.phone,
      seatingArea: fv.seatingArea ?? 'Chef-Curated Table',
      customer: {
        fullName: fv.fullName ?? '',
        email: fv.email ?? '',
        phone: fv.phone ?? '',
        occasion: fv.occasion ?? undefined,
        specialRequests: specialReq ?? undefined,
        dietaryPreferences: [...this.selectedDietary()]
      }
    };

    // 7. Submit
    this.isSubmitting.set(true);
    this.bookingService.createBooking(payload, customerContext)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.router.navigate(['/booking/confirmation']);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.submissionError.set(this.extractBookingErrorMessage(err));
        }
      });
  }

  /** Extract a user-friendly error message from an HTTP error response */
  private extractBookingErrorMessage(err: unknown): string {
    if (err && typeof err === 'object' && 'status' in err) {
      const httpErr = err as { status: number; error?: unknown };
      if (httpErr.status === 401) {
        return 'Your session has expired. Please log in again to complete your reservation.';
      }
      if (httpErr.status === 403) {
        return 'You are not authorized to make this reservation. Please log in with a valid customer account.';
      }
      if (httpErr.status === 409) {
        return 'This table is no longer available for the selected date and time. Please check availability again and select another table.';
      }
      if (httpErr.status === 400) {
        // Try to extract validation message
        const body = httpErr.error;
        if (body && typeof body === 'object') {
          const msg = (body as Record<string, unknown>)['message'] ??
                      (body as Record<string, unknown>)['detail'] ??
                      (body as Record<string, unknown>)['title'];
          if (typeof msg === 'string' && msg.trim()) {
            return msg.trim();
          }
        }
        return 'Your reservation details are invalid. Please review your inputs and try again.';
      }
      if (httpErr.status === 0) {
        return 'Unable to reach the reservation system. Please check your connection and try again.';
      }
    }
    return 'An unexpected error occurred while processing your reservation. Please try again.';
  }

  // Field validation helpers
  getEmailErrorMessage(): string {
    return getDineviaEmailErrorMessage(this.bookingForm.get('email')?.errors);
  }

  getPhoneErrorMessage(): string {
    return getIndianPhoneErrorMessage(this.bookingForm.get('phone')?.errors);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.bookingForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }
}
