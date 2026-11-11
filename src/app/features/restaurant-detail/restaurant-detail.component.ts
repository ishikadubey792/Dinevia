import { Component, DestroyRef, inject, signal, computed, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { RestaurantCardComponent } from '../../shared/components/restaurant-card/restaurant-card.component';
import { RestaurantService } from '../../core/services/restaurant.service';
import { BookingService } from '../../core/services/booking.service';
import { AuthService } from '../../core/services/auth.service';
import { Restaurant, MenuItem, DayHours, RestaurantReview } from '../../core/models/restaurant.model';
import {
  AvailabilityQuery,
  AvailableTable,
  formatDisplayTime,
  getTodayDateString,
  prepareAvailabilityRequest
} from '../../core/models/booking.model';

type AvailabilityTriggerPayload =
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
  selector: 'app-restaurant-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    NavbarComponent,
    FooterComponent,
    RestaurantCardComponent
  ],
  templateUrl: './restaurant-detail.component.html',
  styleUrl: './restaurant-detail.component.scss'
})
export class RestaurantDetailComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly restaurantService = inject(RestaurantService);
  private readonly bookingService = inject(BookingService);
  private readonly authService = inject(AuthService);

  // Restaurant & Routing state
  private readonly rawRestaurant = signal<Restaurant | null>(null);
  readonly restaurant = computed<Restaurant | null>(() => {
    const detail = this.rawRestaurant();
    return detail ? this.restaurantService.enrichFromLoadedList(detail) : null;
  });
  readonly isNotFound = signal<boolean>(false);
  readonly isLoading = signal<boolean>(true);
  readonly loadError = signal<string | null>(null);
  readonly similarRestaurants = computed<Restaurant[]>(() => {
    const found = this.restaurant();
    if (!found) return [];
    const all = this.restaurantService.restaurants();
    const similar = all
      .filter(r => r.id !== found.id && (Boolean(found.cuisine) && r.cuisine === found.cuisine || r.city === found.city))
      .slice(0, 3);
    return similar.length > 0 ? similar : all.filter(r => r.id !== found.id).slice(0, 3);
  });
  private currentRestaurantId: string | null = null;
  private readonly restaurantLoadTrigger$ = new Subject<{ id: string }>();

  // Real-time table availability state
  private readonly availabilityTrigger$ = new Subject<AvailabilityTriggerPayload>();
  private availabilitySeq = 0;
  private activeAvailabilityKey: string | null = null;
  private lastSuccessAvailabilityKey: string | null = null;

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

  // Gallery state
  readonly activeImageIndex = signal<number>(0);
  readonly isLightboxOpen = signal<boolean>(false);
  readonly imgErrorOccurred = signal<boolean>(false);

  // Menu Category Filter state
  readonly selectedMenuCategory = signal<'all' | 'starter' | 'main' | 'dessert' | 'beverage'>('all');

  // Reservation availability filter signals (submission disabled until Phase 3)
  readonly minDate = signal<string>(getTodayDateString());
  readonly bookingDate = signal<string>(getTodayDateString());
  readonly bookingStartTime = signal<string>('18:30');
  readonly bookingEndTime = signal<string>('20:00');
  readonly bookingPartySize = signal<number>(2);
  readonly seatingPreference = signal<string>('Chef-Curated Table');
  readonly guestName = signal<string>(
    this.authService.isCustomerAuthenticated()
      ? (this.authService.currentCustomerSession()?.user.name ?? '')
      : ''
  );
  readonly guestEmail = signal<string>(
    this.authService.isCustomerAuthenticated()
      ? (this.authService.currentCustomerSession()?.user.email ?? '')
      : ''
  );
  readonly guestPhone = signal<string>('');
  readonly specialRequests = signal<string>('');
  readonly bookingError = signal<string | null>(null);

  readonly formattedTimeWindow = computed(() => {
    return `${formatDisplayTime(this.bookingStartTime())} – ${formatDisplayTime(this.bookingEndTime())}`;
  });

  readonly formattedBookingDate = computed(() => {
    const raw = this.bookingDate();
    if (!raw) return 'Date not selected';
    const parts = raw.split('-');
    if (parts.length === 3) {
      const d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
      }
    }
    return raw;
  });

  // UI state
  readonly toastMessage = signal<string | null>(null);
  readonly showStickyMobileBar = signal<boolean>(false);

  // Reliable fallback image URL
  readonly fallbackImage = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80';

  // Seating options
  readonly seatingOptions = [
    'Chef-Curated Table',
    'Main Dining Room',
    'Window Alcove',
    'Private Wine Vault',
    'Outdoor Garden Terrace'
  ];

  // Party size options
  readonly partySizeOptions = [
    { label: '1 Guest (Solo Tasting)', value: 1 },
    { label: '2 Guests (Date Night / Duo)', value: 2 },
    { label: '3 Guests', value: 3 },
    { label: '4 Guests (Small Group)', value: 4 },
    { label: '6 Guests (Celebration)', value: 6 },
    { label: '8+ Guests (Private Salon)', value: 8 }
  ];

  // Menu category filter tabs
  readonly menuCategoryTabs: { id: 'all' | 'starter' | 'main' | 'dessert' | 'beverage'; label: string }[] = [
    { id: 'all', label: 'Complete Menu' },
    { id: 'starter', label: 'Starters & Crudo' },
    { id: 'main', label: 'Main Entrées' },
    { id: 'dessert', label: 'Desserts' },
    { id: 'beverage', label: 'Cellar & Pairings' }
  ];

  // Today's day name for hours highlight
  readonly currentDayName = computed(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  });

  // Computed: Wishlist status
  readonly isSaved = computed<boolean>(() => {
    const r = this.restaurant();
    return r ? this.restaurantService.isSaved(r.id) : false;
  });

  // Computed: Weekly opening hours schedule (only when supplied by backend)
  readonly weeklySchedule = computed<DayHours[]>(() => {
    const r = this.restaurant();
    if (!r || !r.weeklyHours || r.weeklyHours.length === 0) return [];
    return r.weeklyHours.map(item => ({
      ...item,
      isToday: item.day.toLowerCase() === this.currentDayName().toLowerCase()
    }));
  });

  // Computed: Gallery images array with fallback protection
  readonly galleryImages = computed<string[]>(() => {
    const r = this.restaurant();
    if (!r) return [];
    if (r.galleryImages && r.galleryImages.length > 0) {
      return r.galleryImages;
    }
    return [r.imageUrl];
  });

  // Computed: Filtered menu items (only actual restaurant menu items)
  readonly filteredMenu = computed<MenuItem[]>(() => {
    const r = this.restaurant();
    if (!r || !r.menuHighlights || r.menuHighlights.length === 0) return [];
    const items = r.menuHighlights;
    const cat = this.selectedMenuCategory();
    if (cat === 'all') return items;
    return items.filter(i => i.category === cat);
  });

  // Computed: Customer reviews
  readonly reviewsList = computed<RestaurantReview[]>(() => {
    const r = this.restaurant();
    if (!r) return [];
    return this.restaurantService.getReviewsForRestaurant(r);
  });

  // Computed: Review score distribution metrics
  readonly reviewMetrics = computed(() => {
    const r = this.restaurant();
    const score = r && typeof r.rating === 'number' && r.rating > 0 ? r.rating : 0;
    if (score <= 0) {
      return {
        overall: 'New',
        food: '—',
        service: '—',
        ambiance: '—',
        cleanliness: '—',
        recommendRate: '—'
      };
    }
    return {
      overall: score.toFixed(1),
      food: Math.min(5.0, score + 0.05).toFixed(1),
      service: '5.0',
      ambiance: Math.min(5.0, score).toFixed(1),
      cleanliness: '5.0',
      recommendRate: '99%'
    };
  });

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (typeof window !== 'undefined') {
      // Show mobile sticky bottom reservation trigger when scrolled past hero
      this.showStickyMobileBar.set(window.scrollY > 420);
    }
  }

  @HostListener('window:keydown.escape')
  onEscapeKey(): void {
    if (this.isLightboxOpen()) {
      this.closeLightbox();
    }
  }

  ngOnInit(): void {
    const todayStr = getTodayDateString();
    this.minDate.set(todayStr);
    this.bookingDate.set(todayStr);

    this.restaurantLoadTrigger$
      .pipe(
        switchMap(({ id }) => {
          this.currentRestaurantId = id;
          this.isLoading.set(true);
          this.loadError.set(null);
          this.isNotFound.set(false);
          this.rawRestaurant.set(null);
          this.resetAvailabilityState();

          return this.restaurantService.fetchRestaurantById(id);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(result => {
        this.isLoading.set(false);

        if (result.status === 'found' && result.restaurant) {
          this.populateRestaurant(result.restaurant);
        } else if (result.status === 'not-found') {
          this.rawRestaurant.set(null);
          this.isNotFound.set(true);
          this.loadError.set(null);
        } else {
          this.rawRestaurant.set(null);
          this.isNotFound.set(false);
          this.loadError.set(
            result.errorMessage || 'Unable to load restaurant details right now. Please try again.'
          );
        }
      });

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
                  message: 'Unable to check table availability right now. Please try again.',
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

    // Subscribe to route parameter changes
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const id = params.get('id');
        if (id) {
          this.loadRestaurantData(id);
        } else {
          this.isLoading.set(false);
          this.isNotFound.set(true);
        }
      });
  }

  loadRestaurantData(id: string): void {
    this.restaurantLoadTrigger$.next({ id });
  }

  retryLoad(): void {
    if (this.currentRestaurantId) {
      this.restaurantLoadTrigger$.next({ id: this.currentRestaurantId });
    }
    if (this.restaurantService.restaurantLoadError()) {
      this.restaurantService.fetchRestaurants().subscribe();
    }
  }

  private populateRestaurant(found: Restaurant): void {
    this.rawRestaurant.set(found);
    this.isNotFound.set(false);
    this.loadError.set(null);
    this.activeImageIndex.set(0);
    this.imgErrorOccurred.set(false);
    this.bookingError.set(null);
    this.selectedMenuCategory.set('all');

    // Fetch availability immediately once restaurant details resolve
    this.requestAvailabilityRefresh(true);

    // Scroll to top
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
    this.availabilityTrigger$.next({ kind: 'clear' });
  }

  requestAvailabilityRefresh(force = false): void {
    const rest = this.rawRestaurant();
    if (!rest) return;

    const prepared = prepareAvailabilityRequest(rest.id, {
      bookingDate: this.bookingDate(),
      startTime: this.bookingStartTime(),
      endTime: this.bookingEndTime(),
      numberOfGuests: this.bookingPartySize()
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

  onDateChange(value: string): void {
    this.bookingDate.set(value);
    this.requestAvailabilityRefresh(false);
  }

  onStartTimeChange(value: string): void {
    this.bookingStartTime.set(value);
    this.requestAvailabilityRefresh(false);
  }

  onEndTimeChange(value: string): void {
    this.bookingEndTime.set(value);
    this.requestAvailabilityRefresh(false);
  }

  onPartySizeChange(value: number | string): void {
    this.bookingPartySize.set(Number(value));
    this.requestAvailabilityRefresh(false);
  }

  // Gallery methods
  selectImage(index: number): void {
    this.activeImageIndex.set(index);
    this.imgErrorOccurred.set(false);
  }

  nextImage(): void {
    const imgs = this.galleryImages();
    if (imgs.length <= 1) return;
    this.activeImageIndex.update(idx => (idx + 1) % imgs.length);
  }

  prevImage(): void {
    const imgs = this.galleryImages();
    if (imgs.length <= 1) return;
    this.activeImageIndex.update(idx => (idx - 1 + imgs.length) % imgs.length);
  }

  openLightbox(): void {
    this.isLightboxOpen.set(true);
  }

  closeLightbox(): void {
    this.isLightboxOpen.set(false);
  }

  onImageError(): void {
    this.imgErrorOccurred.set(true);
  }

  // Wishlist toggle
  toggleWishlist(): void {
    const r = this.restaurant();
    if (!r) return;
    const isNowSaved = this.restaurantService.toggleSaved(r.id);
    this.showToast(isNowSaved ? `Added ${r.name} to your wishlist.` : `Removed ${r.name} from your wishlist.`);
  }

  // Menu Category Filter
  setMenuCategory(cat: 'all' | 'starter' | 'main' | 'dessert' | 'beverage'): void {
    this.selectedMenuCategory.set(cat);
  }

  // Verified Table Selection (Phase 2: real availability selection only; no booking submission)
  selectTable(table: AvailableTable): void {
    this.selectedTableId.set(table.id);
    this.bookingError.set(null);
    this.showToast(
      `Table #${table.tableNumber} (${table.capacity} seats) is available for ${this.formattedTimeWindow()}. Online booking opens in Phase 3.`
    );
  }

  // Smooth scroll to reservation card
  scrollToReservation(): void {
    if (typeof document !== 'undefined') {
      const el = document.getElementById('reservationCard');
      if (el) {
        el.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      }
    }
  }

  // Navigate to Table Booking Page
  navigateToBooking(): void {
    const r = this.restaurant();
    if (!r) return;
    this.router.navigate(['/book', r.id], {
      queryParams: {
        date: this.bookingDate(),
        startTime: this.bookingStartTime(),
        endTime: this.bookingEndTime(),
        guests: this.bookingPartySize(),
        seating: this.seatingPreference()
      }
    });
  }

  // Phase 2: Booking submission intentionally disabled (no mock booking or POST /api/bookings)
  submitBooking(): void {
    this.bookingError.set(
      'Online reservation submission is disabled in Phase 2. Real table availability is live; booking creation opens in Phase 3.'
    );
  }

  // Similar restaurant card click
  onSimilarRestaurantClick(item: Restaurant): void {
    this.router.navigate(['/restaurants', item.id]);
  }

  private showToast(message: string): void {
    this.toastMessage.set(message);
    setTimeout(() => {
      if (this.toastMessage() === message) {
        this.toastMessage.set(null);
      }
    }, 4000);
  }
}
