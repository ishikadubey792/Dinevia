
import { Component, inject, signal, computed, OnInit, OnDestroy, HostListener, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { RestaurantCardComponent } from '../../shared/components/restaurant-card/restaurant-card.component';
import { ErrorAlertComponent } from '../../shared/components/error-alert/error-alert.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { ScrollRevealDirective } from '../../shared/directives/scroll-reveal.directive';
import { VoiceSearchComponent } from '../../shared/components/voice-search/voice-search.component';
import { RestaurantService } from '../../core/services/restaurant.service';
import { CuisineService } from '../../core/services/cuisine.service';
import { AuthService } from '../../core/services/auth.service';
import {
  Restaurant,
  matchesRestaurantSearch,
  matchesRestaurantCuisine,
  meetsMinimumRating,
  sortRestaurantsAlphabetically
} from '../../core/models/restaurant.model';
import {
  getTodayDateString,
  normalizeToTimeInput,
  compareTimes,
  parseTimeToParts,
  formatDisplayTime
} from '../../core/models/booking.model';

export type SortOption = 'name-asc' | 'name-desc' | 'rating-desc' | 'reviews-desc' | 'recommended';

export interface AutocompleteItem {
  id: string;
  label: string;
  type: 'restaurant' | 'cuisine' | 'city';
  categoryLabel: 'Restaurant' | 'Cuisine' | 'City';
  value: string;
}

@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    NavbarComponent,
    FooterComponent,
    RestaurantCardComponent,
    ErrorAlertComponent,
    LoadingSpinnerComponent,
    ScrollRevealDirective,
    VoiceSearchComponent
  ],
  templateUrl: './explore.component.html',
  styleUrl: './explore.component.scss'
})
export class ExploreComponent implements OnInit, OnDestroy {
  private readonly restaurantService = inject(RestaurantService);
  private readonly cuisineService = inject(CuisineService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly elementRef = inject(ElementRef);
  private previousBodyOverflow: string | null = null;

  @ViewChild('mobileFilterBtn') mobileFilterBtnRef?: ElementRef<HTMLButtonElement>;
  @ViewChild('drawerCloseBtn') drawerCloseBtnRef?: ElementRef<HTMLButtonElement>;

  // Raw data from service
  readonly allRestaurants = this.restaurantService.restaurants;
  readonly allCuisines = this.restaurantService.cuisines;
  readonly isLoadingCuisines = this.cuisineService.isLoadingCuisines;
  readonly cuisinesLoadError = this.cuisineService.cuisinesLoadError;

  // Filter & Search Signals
  readonly searchQuery = signal<string>('');
  readonly selectedCuisine = signal<string>('all');
  readonly selectedRating = signal<number>(0);
  readonly selectedBadge = signal<string>('all');
  readonly selectedCity = signal<string>('all');
  readonly sortBy = signal<SortOption>('name-asc');
  readonly viewMode = signal<'grid' | 'compact'>('grid');

  // Autocomplete Signals
  readonly isAutocompleteOpen = signal<boolean>(false);
  readonly highlightedIndex = signal<number>(-1);
  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private lastRouteSearchParam: string | null | undefined = undefined;

  // Booking Schedule Signals
  readonly minDate = signal<string>(getTodayDateString());
  readonly bookingDate = signal<string>(getTodayDateString());
  readonly selectedStartTime = signal<string>('18:30');
  readonly selectedEndTime = signal<string>('20:00');
  readonly selectedGuests = signal<number>(2);

  readonly timeRangeError = computed<string | null>(() => {
    const start = this.selectedStartTime();
    const end = this.selectedEndTime();
    if (!start || !end) return 'Start and end times are required.';
    const diff = compareTimes(start, end);
    if (Number.isNaN(diff) || diff >= 0) {
      return 'End time must be later than start time.';
    }
    return null;
  });

  private lastRouteCuisineParam: string | null | undefined = undefined;

  // Interactive UI Signals
  readonly isServiceLoading = this.restaurantService.isLoadingRestaurants;
  readonly localLoading = signal<boolean>(false);
  readonly isLoading = computed(() =>
    this.isServiceLoading() || this.localLoading() || (!this.restaurantService.isApiLoaded() && !this.restaurantService.restaurantLoadError())
  );
  readonly loadError = this.restaurantService.restaurantLoadError;
  readonly isMobileFilterOpen = signal<boolean>(false);
  readonly toastMessage = signal<string | null>(null);

  retryLoad(): void {
    this.restaurantService.loadLiveRestaurants(true);
    this.cuisineService.loadCuisines(true).subscribe();
  }

  retryCuisines(): void {
    this.cuisineService.loadCuisines(true).subscribe();
  }

  // Rating options
  readonly ratingOptions = [
    { label: 'Any Rating', value: 0 },
    { label: '★ 4.5 & Above', value: 4.5 },
    { label: '★ 4.8 & Above', value: 4.8 },
    { label: '★ 4.9+ World Class', value: 4.9 }
  ];

  // Badge / Vibe options
  readonly badgeOptions = [
    { label: 'All Curations', value: 'all' },
    { label: 'Michelin Starred', value: 'michelin' },
    { label: "Chef's Counter", value: 'chef' },
    { label: 'Trending Tables', value: 'trending' },
    { label: 'Neighborhood Gems', value: 'gem' }
  ];

  // Sort options list (alphabetical A–Z default)
  readonly sortOptions: { label: string; value: SortOption }[] = [
    { label: 'Name (A to Z)', value: 'name-asc' },
    { label: 'Name (Z to A)', value: 'name-desc' },
    { label: 'Highest Rated (5.0 → 1.0)', value: 'rating-desc' },
    { label: 'Most Reviewed', value: 'reviews-desc' },
    { label: 'Curated & Featured', value: 'recommended' }
  ];

  readonly guestOptions = [
    { label: '1 Guest', value: 1 },
    { label: '2 Guests', value: 2 },
    { label: '3 Guests', value: 3 },
    { label: '4 Guests', value: 4 },
    { label: '6 Guests', value: 6 },
    { label: '8+ Guests', value: 8 }
  ];

  // Human-readable active cuisine label
  readonly selectedCuisineLabel = computed(() => {
    const slug = this.selectedCuisine();
    if (slug === 'all') return 'All Cuisines';
    const match = this.allCuisines().find(
      c => c.slug.toLowerCase() === slug.toLowerCase() || c.name.toLowerCase() === slug.toLowerCase()
    );
    if (match) return match.name;
    return slug
      .split('-')
      .map(part => part ? part.charAt(0).toUpperCase() + part.slice(1) : '')
      .join(' ');
  });

  // Distinct cities extracted from restaurants data
  readonly availableCities = computed(() => {
    const cities = new Set<string>();
    this.allRestaurants().forEach(r => {
      if (r.city && r.city.trim().length > 0) {
        cities.add(r.city.trim());
      }
    });
    return Array.from(cities).sort((a, b) => a.localeCompare(b));
  });

  // Autocomplete matching score helper: 1=exact, 2=prefix, 3=word-prefix, 4=partial/substring
  private getMatchScore(label: string, query: string): number {
    const l = label.toLowerCase();
    const q = query.toLowerCase();
    if (l === q) return 1;
    if (l.startsWith(q)) return 2;
    const words = l.split(/[\s,.-]+/);
    if (words.some(w => w.startsWith(q))) return 3;
    if (l.includes(q)) return 4;
    return 0;
  }

  // Live Dynamic Autocomplete Suggestions derived from loaded restaurants, cuisines, and cities
  readonly autocompleteSuggestions = computed<AutocompleteItem[]>(() => {
    const query = this.searchQuery().trim();
    if (query.length < 1) {
      return [];
    }

    const queryLower = query.toLowerCase();
    const candidates: { item: AutocompleteItem; score: number }[] = [];
    const seenKeys = new Set<string>();

    const addCandidate = (
      label: string,
      type: 'restaurant' | 'cuisine' | 'city',
      categoryLabel: 'Restaurant' | 'Cuisine' | 'City',
      value: string
    ) => {
      const trimmed = label.trim();
      if (!trimmed) return;
      const key = `${type}:${trimmed.toLowerCase()}`;
      if (seenKeys.has(key)) return;
      seenKeys.add(key);

      const score = this.getMatchScore(trimmed, queryLower);
      if (score > 0) {
        candidates.push({
          item: {
            id: '',
            label: trimmed,
            type,
            categoryLabel,
            value
          },
          score
        });
      }
    };

    // 1. Available Cuisines
    for (const c of this.allCuisines()) {
      if (c.name) {
        addCandidate(c.name, 'cuisine', 'Cuisine', c.name);
      }
    }

    // 2. Destination Cities
    for (const city of this.availableCities()) {
      addCandidate(city, 'city', 'City', city);
    }

    // 3. Restaurant Names
    for (const r of this.allRestaurants()) {
      if (r.name) {
        addCandidate(r.name, 'restaurant', 'Restaurant', r.name);
      }
    }

    // Rank: exact match first (1), prefix match second (2), word-prefix third (3), partial fourth (4)
    candidates.sort((a, b) => {
      if (a.score !== b.score) {
        return a.score - b.score;
      }
      return a.item.label.localeCompare(b.item.label);
    });

    // Limit to sensible maximum (8) and assign stable option ids
    return candidates.slice(0, 8).map((c, index) => ({
      ...c.item,
      id: `exp-suggestion-${index}`
    }));
  });

  readonly activeDescendantId = computed<string | null>(() => {
    const index = this.highlightedIndex();
    const suggestions = this.autocompleteSuggestions();
    if (index >= 0 && index < suggestions.length) {
      return suggestions[index].id;
    }
    return null;
  });

  // Dynamic quick-search tags derived purely from loaded cuisines and cities (zero mock data)
  readonly dynamicQuickTags = computed<string[]>(() => {
    const tags: string[] = [];
    for (const c of this.allCuisines()) {
      if (c.name && tags.length < 3) {
        tags.push(c.name);
      }
    }
    for (const city of this.availableCities()) {
      if (city && !tags.includes(city) && tags.length < 5) {
        tags.push(city);
      }
    }
    return tags;
  });

  // Filtered and Sorted Restaurant List (non-mutating; A–Z by default)
  readonly filteredRestaurants = computed(() => {
    let list = [...this.allRestaurants()];
    const query = this.searchQuery().trim();
    const cuisine = this.selectedCuisine();
    const minRating = this.selectedRating();
    const badge = this.selectedBadge().toLowerCase();
    const city = this.selectedCity();
    const sort = this.sortBy();

    // 1. Search Query Filter (name, city, address, description, cuisine)
    if (query.length > 0) {
      list = list.filter(r => matchesRestaurantSearch(r, query));
    }

    // 2. Cuisine Filter
    if (cuisine !== 'all') {
      list = list.filter(r => matchesRestaurantCuisine(r, cuisine));
    }

    // 3. Minimum Actual Rating Filter (unrated/0 never satisfy positive thresholds)
    if (minRating > 0) {
      list = list.filter(r => meetsMinimumRating(r, minRating));
    }

    // 4. Badge / Vibe Filter
    if (badge !== 'all') {
      if (badge === 'michelin') {
        list = list.filter(r => r.badge?.toLowerCase().includes('michelin'));
      } else if (badge === 'chef') {
        list = list.filter(r => r.badge?.toLowerCase().includes('chef'));
      } else if (badge === 'trending') {
        list = list.filter(r => r.badge?.toLowerCase().includes('trending') || meetsMinimumRating(r, 4.9));
      } else if (badge === 'gem') {
        list = list.filter(r => r.badge?.toLowerCase().includes('gem') || r.badge?.toLowerCase().includes('cozy') || r.badge?.toLowerCase().includes('popular'));
      }
    }

    // 5. City Filter
    if (city !== 'all') {
      const cityLower = city.trim().toLowerCase();
      list = list.filter(r => r.city && r.city.trim().toLowerCase() === cityLower);
    }

    // 6. Non-mutating Sorting
    switch (sort) {
      case 'rating-desc':
        list.sort((a, b) => (b.rating || 0) - (a.rating || 0) || (b.reviewCount || 0) - (a.reviewCount || 0));
        break;
      case 'reviews-desc':
        list.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
        break;
      case 'recommended':
        list.sort((a, b) => {
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          return (b.rating || 0) - (a.rating || 0);
        });
        break;
      case 'name-desc':
        list = sortRestaurantsAlphabetically(list, 'desc');
        break;
      case 'name-asc':
      default:
        list = sortRestaurantsAlphabetically(list, 'asc');
        break;
    }

    return list;
  });

  // Count active non-default filters
  readonly activeFilterCount = computed(() => {
    let count = 0;
    if (this.searchQuery().trim().length > 0) count++;
    if (this.selectedCuisine() !== 'all') count++;
    if (this.selectedRating() > 0) count++;
    if (this.selectedBadge() !== 'all') count++;
    if (this.selectedCity() !== 'all') count++;
    if (this.bookingDate() !== this.minDate()) count++;
    if (this.selectedStartTime() !== '18:30' || this.selectedEndTime() !== '20:00') count++;
    if (this.selectedGuests() !== 2) count++;
    return count;
  });

  ngOnInit(): void {
    // Reuse shared live restaurants & active cuisines state without duplicate API requests
    this.restaurantService.ensureRestaurantsLoaded().subscribe();
    this.cuisineService.loadCuisines().subscribe();

    const todayStr = getTodayDateString();
    this.minDate.set(todayStr);
    this.bookingDate.set(todayStr);

    // Read route query parameters (e.g. /explore?cuisine=italian or ?search=sushi)
    this.route.queryParamMap.subscribe(params => {
      const cuisineParam = params.get('cuisine');
      const searchParam = params.get('search');
      const cityParam = params.get('city');
      const badgeParam = params.get('badge');

      const normalizedCuisine = cuisineParam ? cuisineParam.trim().toLowerCase() : null;
      if (normalizedCuisine) {
        this.selectedCuisine.set(normalizedCuisine);
      } else if (this.lastRouteCuisineParam !== undefined && this.lastRouteCuisineParam !== null) {
        this.selectedCuisine.set('all');
      }
      this.lastRouteCuisineParam = normalizedCuisine;

      const normalizedSearch = searchParam ? searchParam.trim() : null;
      if (normalizedSearch) {
        this.searchQuery.set(normalizedSearch);
      } else if (this.lastRouteSearchParam !== undefined && this.lastRouteSearchParam !== null) {
        this.searchQuery.set('');
      }
      this.lastRouteSearchParam = normalizedSearch;
      if (cityParam) {
        this.selectedCity.set(cityParam);
      }
      if (badgeParam) {
        this.selectedBadge.set(badgeParam.toLowerCase());
      }

      const dateParam = params.get('date');
      if (dateParam) {
        this.bookingDate.set(dateParam);
      }

      const startParam = params.get('startTime') || params.get('time');
      if (startParam) {
        const norm = normalizeToTimeInput(startParam);
        if (norm) {
          this.selectedStartTime.set(norm);
        }
      }

      const endParam = params.get('endTime');
      if (endParam) {
        const norm = normalizeToTimeInput(endParam);
        if (norm) {
          this.selectedEndTime.set(norm);
        }
      }

      const guestsParam = params.get('guests');
      if (guestsParam && !Number.isNaN(+guestsParam) && +guestsParam >= 1 && +guestsParam <= 20) {
        this.selectedGuests.set(+guestsParam);
      }
    });
  }

  // Filter setters
  onSearchChange(query: string): void {
    this.searchQuery.set(query);
    this.highlightedIndex.set(-1);
    if (query.trim().length >= 1) {
      this.isAutocompleteOpen.set(true);
    } else {
      this.isAutocompleteOpen.set(false);
    }
    this.debouncedSyncSearchParam(query);
  }

  onSearchFocus(): void {
    if (this.searchQuery().trim().length >= 1 && this.autocompleteSuggestions().length > 0) {
      this.isAutocompleteOpen.set(true);
    }
  }

  onSearchInputClick(): void {
    if (this.searchQuery().trim().length >= 1 && this.autocompleteSuggestions().length > 0) {
      this.isAutocompleteOpen.set(true);
    }
  }

  onSearchKeydown(event: KeyboardEvent): void {
    const suggestions = this.autocompleteSuggestions();
    const isOpen = this.isAutocompleteOpen() && suggestions.length > 0;

    switch (event.key) {
      case 'ArrowDown':
        if (!isOpen) {
          if (suggestions.length > 0) {
            this.isAutocompleteOpen.set(true);
            this.highlightedIndex.set(0);
            event.preventDefault();
          }
        } else {
          event.preventDefault();
          const next = this.highlightedIndex() + 1;
          this.highlightedIndex.set(next >= suggestions.length ? 0 : next);
        }
        break;

      case 'ArrowUp':
        if (isOpen) {
          event.preventDefault();
          const prev = this.highlightedIndex() - 1;
          this.highlightedIndex.set(prev < 0 ? suggestions.length - 1 : prev);
        }
        break;

      case 'Enter':
        if (isOpen && this.highlightedIndex() >= 0 && this.highlightedIndex() < suggestions.length) {
          event.preventDefault();
          this.selectSuggestion(suggestions[this.highlightedIndex()]);
        } else {
          this.closeAutocomplete();
        }
        break;

      case 'Escape':
        if (isOpen) {
          event.preventDefault();
          this.closeAutocomplete();
        }
        break;

      case 'Tab':
        this.closeAutocomplete();
        break;
    }
  }

  selectSuggestion(item: AutocompleteItem): void {
    this.searchQuery.set(item.value);
    this.closeAutocomplete();
    this.syncSearchQueryParam(item.value);
  }

  selectQuickTag(tag: string): void {
    this.onSearchChange(tag);
    this.syncSearchQueryParam(tag);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.closeAutocomplete();
    this.syncSearchQueryParam('');
  }

  closeAutocomplete(): void {
    this.isAutocompleteOpen.set(false);
    this.highlightedIndex.set(-1);
  }

  setHighlightedIndex(index: number): void {
    this.highlightedIndex.set(index);
  }

  private debouncedSyncSearchParam(query: string): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    this.searchDebounceTimer = setTimeout(() => {
      this.syncSearchQueryParam(query);
    }, 250);
  }

  syncSearchQueryParam(query: string): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = null;
    }
    const trimmed = query.trim();
    const nextParam = trimmed.length > 0 ? trimmed : null;
    const currentParam = this.route.snapshot.queryParamMap.get('search') || this.lastRouteSearchParam || null;

    if (currentParam !== nextParam) {
      this.lastRouteSearchParam = nextParam;
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { search: nextParam },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const searchWrapper = this.elementRef.nativeElement.querySelector('.search-bar-wrapper');
    if (searchWrapper && !searchWrapper.contains(target)) {
      this.closeAutocomplete();
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event?: Event): void {
    if (this.isMobileFilterOpen()) {
      event?.preventDefault();
      this.closeMobileFilters();
    }
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeyDown(event: KeyboardEvent): void {
    if (!this.isMobileFilterOpen()) return;

    if (event.key === 'Tab') {
      this.handleDrawerFocusTrap(event);
    }
  }

  private handleDrawerFocusTrap(event: KeyboardEvent): void {
    const drawerEl = this.elementRef.nativeElement.querySelector('#mobileFilterDrawer') as HTMLElement | null;
    if (!drawerEl) return;

    const focusableSelectors = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusableElements = Array.from(drawerEl.querySelectorAll<HTMLElement>(focusableSelectors))
      .filter(el => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true' && el.style.display !== 'none');

    if (focusableElements.length === 0) {
      event.preventDefault();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey) {
      if (document.activeElement === firstElement || !drawerEl.contains(document.activeElement)) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement || !drawerEl.contains(document.activeElement)) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }

  ngOnDestroy(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = null;
    }
    if (typeof document !== 'undefined' && this.previousBodyOverflow !== null) {
      document.body.style.overflow = this.previousBodyOverflow;
      this.previousBodyOverflow = null;
    }
  }

  setCuisine(slug: string): void {
    const nextCuisine = this.selectedCuisine() === slug ? 'all' : slug;
    this.selectedCuisine.set(nextCuisine);
    this.syncCuisineQueryParam(nextCuisine);
    this.simulateBriefLoading();
  }

  toggleRating45(): void {
    const nextRating = this.selectedRating() === 4.5 ? 0 : 4.5;
    this.selectedRating.set(nextRating);
    this.simulateBriefLoading();
  }

  setRating(rating: number): void {
    this.selectedRating.set(rating);
    this.simulateBriefLoading();
  }

  setBadge(badge: string): void {
    this.selectedBadge.set(badge);
    this.simulateBriefLoading();
  }

  setCity(city: string): void {
    this.selectedCity.set(city);
    this.simulateBriefLoading();
  }

  setDate(date: string): void {
    this.bookingDate.set(date);
    this.syncScheduleQueryParams({ date });
    this.simulateBriefLoading();
  }

  setStartTime(time: string): void {
    this.selectedStartTime.set(time);
    this.syncScheduleQueryParams({ startTime: time });
    this.simulateBriefLoading();
  }

  setEndTime(time: string): void {
    this.selectedEndTime.set(time);
    this.syncScheduleQueryParams({ endTime: time });
    this.simulateBriefLoading();
  }

  setGuests(guests: number): void {
    this.selectedGuests.set(guests);
    this.syncScheduleQueryParams({ guests });
    this.simulateBriefLoading();
  }

  formatTimeDisplay(timeStr: string): string {
    return formatDisplayTime(timeStr);
  }

  setSort(sort: SortOption): void {
    this.sortBy.set(sort);
  }

  setViewMode(mode: 'grid' | 'compact'): void {
    this.viewMode.set(mode);
  }

  resetAllFilters(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = null;
    }
    this.closeAutocomplete();
    this.searchQuery.set('');
    this.selectedCuisine.set('all');
    this.selectedRating.set(0);
    this.selectedBadge.set('all');
    this.selectedCity.set('all');
    this.sortBy.set('name-asc');
    this.bookingDate.set(this.minDate());
    this.selectedStartTime.set('18:30');
    this.selectedEndTime.set('20:00');
    this.selectedGuests.set(2);
    this.lastRouteSearchParam = null;
    this.lastRouteCuisineParam = null;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {}
    });

    this.showToast('All filters have been reset.');
    this.simulateBriefLoading();
  }

  private syncCuisineQueryParam(cuisine: string): void {
    const nextParam = cuisine === 'all' ? null : cuisine;
    if (this.route.snapshot.queryParamMap.get('cuisine') !== nextParam) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { cuisine: nextParam },
        queryParamsHandling: 'merge'
      });
    }
  }

  private syncScheduleQueryParams(params: Record<string, string | number | null>): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge'
    });
  }

  openMobileFilters(): void {
    this.isMobileFilterOpen.set(true);
    if (typeof document !== 'undefined') {
      if (this.previousBodyOverflow === null) {
        this.previousBodyOverflow = document.body.style.overflow;
      }
      document.body.style.overflow = 'hidden';
    }
    setTimeout(() => {
      const closeBtn = this.drawerCloseBtnRef?.nativeElement ||
        this.elementRef.nativeElement.querySelector('.drawer-close-btn') as HTMLElement | null;
      closeBtn?.focus();
    }, 50);
  }

  toggleMobileFilters(): void {
    if (this.isMobileFilterOpen()) {
      this.closeMobileFilters();
    } else {
      this.openMobileFilters();
    }
  }

  closeMobileFilters(): void {
    this.isMobileFilterOpen.set(false);
    if (typeof document !== 'undefined' && this.previousBodyOverflow !== null) {
      document.body.style.overflow = this.previousBodyOverflow;
      this.previousBodyOverflow = null;
    }
    setTimeout(() => {
      const filterBtn = this.mobileFilterBtnRef?.nativeElement ||
        this.elementRef.nativeElement.querySelector('.mobile-filter-btn') as HTMLElement | null;
      filterBtn?.focus();
    }, 0);
  }

  // Navigation to restaurant details page
  onViewDetails(restaurant: Restaurant): void {
    this.router.navigate(['/restaurants', restaurant.id]);
  }

  // Reservation handling: redirects directly to real-time table booking
  onReserveSlot(event: { restaurant: Restaurant; slot: string }): void {
    if (this.timeRangeError()) {
      this.showToast('Please select a valid time window: End time must be later than start time.');
      return;
    }

    const startTime = normalizeToTimeInput(event.slot) || this.selectedStartTime();
    let endTime = this.selectedEndTime();

    if (compareTimes(startTime, endTime) >= 0) {
      const parts = parseTimeToParts(startTime);
      if (parts) {
        const endHours = Math.min(23, parts.hours + 2);
        endTime = `${String(endHours).padStart(2, '0')}:${String(parts.minutes).padStart(2, '0')}`;
      }
    }

    this.router.navigate(['/book', event.restaurant.id], {
      queryParams: {
        date: this.bookingDate(),
        startTime,
        endTime,
        guests: this.selectedGuests()
      }
    });
  }

  private simulateBriefLoading(): void {
    this.localLoading.set(true);
    setTimeout(() => {
      this.localLoading.set(false);
    }, 240);
  }

  private showToast(message: string): void {
    this.toastMessage.set(message);
    setTimeout(() => {
      if (this.toastMessage() === message) {
        this.toastMessage.set(null);
      }
    }, 3500);
  }
}
