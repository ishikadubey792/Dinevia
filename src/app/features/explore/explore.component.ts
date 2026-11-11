import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { RestaurantCardComponent } from '../../shared/components/restaurant-card/restaurant-card.component';
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

export type SortOption = 'name-asc' | 'name-desc' | 'rating-desc' | 'reviews-desc' | 'recommended';

@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    NavbarComponent,
    FooterComponent,
    RestaurantCardComponent
  ],
  templateUrl: './explore.component.html',
  styleUrl: './explore.component.scss'
})
export class ExploreComponent implements OnInit {
  private readonly restaurantService = inject(RestaurantService);
  private readonly cuisineService = inject(CuisineService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

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

  private lastRouteCuisineParam: string | null | undefined = undefined;

  // Interactive UI Signals
  readonly isServiceLoading = this.restaurantService.isLoadingRestaurants;
  readonly localLoading = signal<boolean>(false);
  readonly isLoading = computed(() => this.isServiceLoading() || this.localLoading());
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

  // Quick Table Booking Modal State
  readonly isBookingModalOpen = signal<boolean>(false);
  readonly selectedRestaurant = signal<Restaurant | null>(null);
  readonly bookingTime = signal<string>('7:30 PM');
  readonly bookingDate = signal<string>('');
  readonly bookingPartySize = signal<number>(2);
  readonly guestName = signal<string>(
    this.authService.isCustomerAuthenticated()
      ? (this.authService.currentCustomerSession()?.user.name ?? '')
      : ''
  );
  readonly bookingConfirmed = signal<boolean>(false);
  readonly bookingRefCode = signal<string>('');

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
    return count;
  });

  ngOnInit(): void {
    // Reuse shared live restaurants & active cuisines state without duplicate API requests
    this.restaurantService.ensureRestaurantsLoaded().subscribe();
    this.cuisineService.loadCuisines().subscribe();

    // Initialize default booking date to today
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    this.bookingDate.set(`${yyyy}-${mm}-${dd}`);

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

      if (searchParam) {
        this.searchQuery.set(searchParam);
      }
      if (cityParam) {
        this.selectedCity.set(cityParam);
      }
      if (badgeParam) {
        this.selectedBadge.set(badgeParam.toLowerCase());
      }
    });
  }

  // Filter setters
  onSearchChange(query: string): void {
    this.searchQuery.set(query);
  }

  clearSearch(): void {
    this.searchQuery.set('');
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

  setSort(sort: SortOption): void {
    this.sortBy.set(sort);
  }

  setViewMode(mode: 'grid' | 'compact'): void {
    this.viewMode.set(mode);
  }

  resetAllFilters(): void {
    this.searchQuery.set('');
    this.selectedCuisine.set('all');
    this.selectedRating.set(0);
    this.selectedBadge.set('all');
    this.selectedCity.set('all');
    this.sortBy.set('name-asc');
    this.syncCuisineQueryParam('all');
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

  toggleMobileFilters(): void {
    this.isMobileFilterOpen.update(open => !open);
  }

  closeMobileFilters(): void {
    this.isMobileFilterOpen.set(false);
  }

  // Navigation to restaurant details page
  onViewDetails(restaurant: Restaurant): void {
    this.router.navigate(['/restaurants', restaurant.id]);
  }

  // Reservation handling
  onReserveSlot(event: { restaurant: Restaurant; slot: string }): void {
    this.selectedRestaurant.set(event.restaurant);
    this.bookingTime.set(event.slot);
    this.bookingConfirmed.set(false);
    this.isBookingModalOpen.set(true);
  }

  closeModal(): void {
    this.isBookingModalOpen.set(false);
    this.selectedRestaurant.set(null);
    this.bookingConfirmed.set(false);
  }

  submitReservation(): void {
    const rest = this.selectedRestaurant();
    if (!rest) return;

    const result = this.restaurantService.reserveTable(rest.id, {
      date: this.bookingDate(),
      time: this.bookingTime(),
      guests: this.bookingPartySize(),
      name: this.guestName()
    });

    this.bookingRefCode.set(result.bookingRef);
    this.bookingConfirmed.set(true);
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
