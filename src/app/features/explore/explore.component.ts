import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { RestaurantCardComponent } from '../../shared/components/restaurant-card/restaurant-card.component';
import { RestaurantService } from '../../core/services/restaurant.service';
import { Restaurant } from '../../core/models/restaurant.model';

export type SortOption = 'recommended' | 'rating-desc' | 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc' | 'reviews-desc';

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
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // Raw data from service
  readonly allRestaurants = this.restaurantService.restaurants;
  readonly allCuisines = this.restaurantService.cuisines;

  // Filter & Search Signals
  readonly searchQuery = signal<string>('');
  readonly selectedCuisine = signal<string>('all');
  readonly selectedPrice = signal<string>('all');
  readonly selectedRating = signal<number>(0);
  readonly selectedBadge = signal<string>('all');
  readonly selectedCity = signal<string>('all');
  readonly sortBy = signal<SortOption>('recommended');
  readonly viewMode = signal<'grid' | 'compact'>('grid');

  // Interactive UI Signals
  readonly isLoading = signal<boolean>(false);
  readonly isMobileFilterOpen = signal<boolean>(false);
  readonly toastMessage = signal<string | null>(null);

  // Quick Table Booking Modal State
  readonly isBookingModalOpen = signal<boolean>(false);
  readonly selectedRestaurant = signal<Restaurant | null>(null);
  readonly bookingTime = signal<string>('7:30 PM');
  readonly bookingDate = signal<string>('');
  readonly bookingPartySize = signal<number>(2);
  readonly guestName = signal<string>('Alexander Wright');
  readonly bookingConfirmed = signal<boolean>(false);
  readonly bookingRefCode = signal<string>('');

  // Price tier filter options
  readonly priceOptions = [
    { label: 'All Tiers', value: 'all' },
    { label: '$$ Casual Fine', value: '$$' },
    { label: '$$$ Upscale', value: '$$$' },
    { label: '$$$$ High Luxury', value: '$$$$' }
  ];

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

  // Sort options list
  readonly sortOptions: { label: string; value: SortOption }[] = [
    { label: 'Curated & Featured', value: 'recommended' },
    { label: 'Highest Rated (5.0 → 1.0)', value: 'rating-desc' },
    { label: 'Most Reviewed', value: 'reviews-desc' },
    { label: 'Price: Low to High', value: 'price-asc' },
    { label: 'Price: High to Low', value: 'price-desc' },
    { label: 'Name (A to Z)', value: 'name-asc' },
    { label: 'Name (Z to A)', value: 'name-desc' }
  ];

  // Distinct cities extracted from mock data
  readonly availableCities = computed(() => {
    const cities = new Set<string>();
    this.allRestaurants().forEach(r => {
      if (r.city) cities.add(r.city);
    });
    return Array.from(cities).sort();
  });

  // Filtered and Sorted Restaurant List
  readonly filteredRestaurants = computed(() => {
    let list = [...this.allRestaurants()];
    const query = this.searchQuery().trim().toLowerCase();
    const cuisine = this.selectedCuisine().toLowerCase();
    const price = this.selectedPrice();
    const minRating = this.selectedRating();
    const badge = this.selectedBadge().toLowerCase();
    const city = this.selectedCity().toLowerCase();
    const sort = this.sortBy();

    // 1. Search Query Filter
    if (query) {
      list = list.filter(r => 
        r.name.toLowerCase().includes(query) ||
        r.cuisine.toLowerCase().includes(query) ||
        r.neighborhood.toLowerCase().includes(query) ||
        r.city.toLowerCase().includes(query) ||
        r.location.toLowerCase().includes(query) ||
        r.tagline.toLowerCase().includes(query) ||
        r.description.toLowerCase().includes(query) ||
        r.highlights.some(h => h.toLowerCase().includes(query))
      );
    }

    // 2. Cuisine Filter
    if (cuisine !== 'all') {
      list = list.filter(r => r.cuisine.toLowerCase() === cuisine);
    }

    // 3. Price Filter
    if (price !== 'all') {
      list = list.filter(r => r.priceRange === price);
    }

    // 4. Minimum Rating Filter
    if (minRating > 0) {
      list = list.filter(r => r.rating >= minRating);
    }

    // 5. Badge / Vibe Filter
    if (badge !== 'all') {
      if (badge === 'michelin') {
        list = list.filter(r => r.badge?.toLowerCase().includes('michelin'));
      } else if (badge === 'chef') {
        list = list.filter(r => r.badge?.toLowerCase().includes('chef'));
      } else if (badge === 'trending') {
        list = list.filter(r => r.badge?.toLowerCase().includes('trending') || r.rating >= 4.9);
      } else if (badge === 'gem') {
        list = list.filter(r => r.badge?.toLowerCase().includes('gem') || r.badge?.toLowerCase().includes('cozy') || r.badge?.toLowerCase().includes('popular'));
      }
    }

    // 6. City Filter
    if (city !== 'all') {
      list = list.filter(r => r.city.toLowerCase() === city);
    }

    // 7. Sorting
    switch (sort) {
      case 'rating-desc':
        list.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
        break;
      case 'reviews-desc':
        list.sort((a, b) => b.reviewCount - a.reviewCount);
        break;
      case 'price-asc':
        list.sort((a, b) => a.priceRange.length - b.priceRange.length);
        break;
      case 'price-desc':
        list.sort((a, b) => b.priceRange.length - a.priceRange.length);
        break;
      case 'name-asc':
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        list.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'recommended':
      default:
        list.sort((a, b) => {
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          return b.rating - a.rating;
        });
        break;
    }

    return list;
  });

  // Count active non-default filters
  readonly activeFilterCount = computed(() => {
    let count = 0;
    if (this.searchQuery().trim().length > 0) count++;
    if (this.selectedCuisine() !== 'all') count++;
    if (this.selectedPrice() !== 'all') count++;
    if (this.selectedRating() > 0) count++;
    if (this.selectedBadge() !== 'all') count++;
    if (this.selectedCity() !== 'all') count++;
    return count;
  });

  ngOnInit(): void {
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

      if (cuisineParam) {
        this.selectedCuisine.set(cuisineParam.toLowerCase());
      }
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
    if (this.selectedCuisine() === slug) {
      this.selectedCuisine.set('all');
    } else {
      this.selectedCuisine.set(slug);
    }
    this.simulateBriefLoading();
  }

  setPrice(price: string): void {
    this.selectedPrice.set(price);
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
    this.selectedPrice.set('all');
    this.selectedRating.set(0);
    this.selectedBadge.set('all');
    this.selectedCity.set('all');
    this.sortBy.set('recommended');
    this.showToast('All filters have been reset.');
    this.simulateBriefLoading();
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
    this.isLoading.set(true);
    setTimeout(() => {
      this.isLoading.set(false);
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
