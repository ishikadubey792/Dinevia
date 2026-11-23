import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { RestaurantCardComponent } from '../../shared/components/restaurant-card/restaurant-card.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { ErrorAlertComponent } from '../../shared/components/error-alert/error-alert.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { SearchPanelComponent } from './components/search-panel/search-panel.component';
import { ScrollRevealDirective } from '../../shared/directives/scroll-reveal.directive';
import { RestaurantService } from '../../core/services/restaurant.service';
import { CuisineService } from '../../core/services/cuisine.service';
import { AuthService } from '../../core/services/auth.service';
import { Restaurant } from '../../core/models/restaurant.model';
import { SearchCriteria } from '../../core/models/search-filter.model';
import {
  getTodayDateString,
  normalizeToTimeInput,
  compareTimes,
  parseTimeToParts
} from '../../core/models/booking.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    NavbarComponent,
    FooterComponent,
    RestaurantCardComponent,
    LoadingSpinnerComponent,
    ErrorAlertComponent,
    EmptyStateComponent,
    SearchPanelComponent,
    ScrollRevealDirective
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  readonly restaurantService = inject(RestaurantService);
  private readonly cuisineService = inject(CuisineService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  // Shared live cuisines and restaurants API state (deduplicated at service layer)
  readonly isLoadingCuisines = computed(() =>
    this.cuisineService.isLoadingCuisines() || (!this.cuisineService.isCuisinesLoaded() && !this.cuisineService.cuisinesLoadError())
  );
  readonly cuisinesLoadError = this.cuisineService.cuisinesLoadError;
  readonly cuisines = this.restaurantService.cuisines;

  readonly testimonials = this.restaurantService.testimonials;
  readonly restaurants = this.restaurantService.filteredRestaurants;
  readonly currentCategory = this.restaurantService.selectedCategory;
  readonly currentCuisine = this.restaurantService.selectedCuisine;
  readonly isLoading = computed(() =>
    this.restaurantService.isLoadingRestaurants() || (!this.restaurantService.isApiLoaded() && !this.restaurantService.restaurantLoadError())
  );
  readonly loadError = this.restaurantService.restaurantLoadError;

  // Filter Categories
  readonly categoryTabs = [
    { id: 'all', label: 'All Curated Tables' },
    { id: 'michelin', label: 'Michelin Starred' },
    { id: 'chef', label: "Chef's Counter" },
    { id: 'trending', label: 'Trending & Celebrated' }
  ];

  // UI Interactive States
  readonly toastMessage = signal<string | null>(null);

  // Booking schedule state synchronized with search panel
  bookingPartySize = 2;
  bookingStartTime = '18:30';
  bookingEndTime = '20:00';
  bookingDate = getTodayDateString();

  ngOnInit(): void {
    this.restaurantService.ensureRestaurantsLoaded().subscribe();
    this.loadLiveCuisines();
  }

  loadLiveCuisines(forceRefresh = false): void {
    this.cuisineService.loadCuisines(forceRefresh).subscribe();
  }

  onSearch(criteria: SearchCriteria): void {
    this.bookingDate = criteria.date;
    this.bookingStartTime = criteria.startTime || '18:30';
    this.bookingEndTime = criteria.endTime || '20:00';
    this.bookingPartySize = criteria.guests;

    this.restaurantService.searchRestaurants(criteria);

    const queryParams: Record<string, string | number> = {};

    if (criteria.useCurrentLocation) {
      queryParams['nearMe'] = 'true';
      queryParams['sort'] = 'nearest';
      if (criteria.latitude != null && criteria.longitude != null) {
        queryParams['lat'] = criteria.latitude;
        queryParams['lng'] = criteria.longitude;
      }
    } else if (criteria.location && criteria.location !== 'all' && criteria.location.trim().length > 0) {
      queryParams['city'] = criteria.location.trim();
    }

    if (criteria.cuisine && criteria.cuisine !== 'all') {
      queryParams['cuisine'] = criteria.cuisine;
    }

    if (criteria.date) {
      queryParams['date'] = criteria.date;
    }

    if (criteria.startTime) {
      queryParams['startTime'] = criteria.startTime;
    }

    if (criteria.endTime) {
      queryParams['endTime'] = criteria.endTime;
    }

    if (criteria.guests) {
      queryParams['guests'] = criteria.guests;
    }

    this.router.navigate(['/explore'], { queryParams });
  }

  retryLoad(): void {
    this.restaurantService.loadLiveRestaurants(true);
    this.loadLiveCuisines(true);
  }

  retryCuisines(): void {
    this.loadLiveCuisines(true);
  }

  onSelectCuisine(slug: string): void {
    this.router.navigate(['/explore'], {
      queryParams: { cuisine: slug }
    });
  }

  onCategoryChange(catId: string): void {
    this.restaurantService.setCategoryFilter(catId);
  }

  resetAllFilters(): void {
    this.restaurantService.resetFilters();
    this.showToast('Filters cleared.');
  }

  onViewDetails(restaurant: Restaurant): void {
    this.router.navigate(['/restaurants', restaurant.id]);
  }

  onReserveSlot(event: { restaurant: Restaurant; slot: string }): void {
    const startTime = normalizeToTimeInput(event.slot) || this.bookingStartTime;
    let endTime = this.bookingEndTime;

    if (compareTimes(startTime, endTime) >= 0) {
      const parts = parseTimeToParts(startTime);
      if (parts) {
        const endHours = Math.min(23, parts.hours + 2);
        endTime = `${String(endHours).padStart(2, '0')}:${String(parts.minutes).padStart(2, '0')}`;
      }
    }

    this.router.navigate(['/book', event.restaurant.id], {
      queryParams: {
        date: this.bookingDate,
        startTime,
        endTime,
        guests: this.bookingPartySize
      }
    });
  }

  showToast(message: string): void {
    this.toastMessage.set(message);
    setTimeout(() => {
      if (this.toastMessage() === message) {
        this.toastMessage.set(null);
      }
    }, 4000);
  }

  scrollTo(elementId: string): void {
    if (typeof document !== 'undefined') {
      const el = document.getElementById(elementId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }
}
