import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { RestaurantCardComponent } from '../../shared/components/restaurant-card/restaurant-card.component';
import { SearchPanelComponent } from './components/search-panel/search-panel.component';
import { RestaurantService } from '../../core/services/restaurant.service';
import { Restaurant } from '../../core/models/restaurant.model';
import { SearchCriteria } from '../../core/models/search-filter.model';

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
    SearchPanelComponent
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  readonly restaurantService = inject(RestaurantService);

  // Read data from service signals
  readonly cuisines = this.restaurantService.cuisines;
  readonly testimonials = this.restaurantService.testimonials;
  readonly restaurants = this.restaurantService.filteredRestaurants;
  readonly currentCategory = this.restaurantService.selectedCategory;
  readonly currentCuisine = this.restaurantService.selectedCuisine;

  // Filter Categories
  readonly categoryTabs = [
    { id: 'all', label: 'All Curated Tables' },
    { id: 'michelin', label: 'Michelin Starred' },
    { id: 'chef', label: "Chef's Counter" },
    { id: 'trending', label: 'Trending & Celebrated' }
  ];

  // UI Interactive States
  readonly toastMessage = signal<string | null>(null);
  readonly selectedRestaurant = signal<Restaurant | null>(null);
  readonly isReservationModalOpen = signal<boolean>(false);
  readonly bookingConfirmed = signal<boolean>(false);
  readonly bookingRefCode = signal<string>('');

  // Booking Modal Form State
  bookingPartySize = 2;
  bookingTime = '7:30 PM';
  bookingDate = '';
  guestName = 'Alexander Wright';
  specialRequests = '';

  constructor() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    this.bookingDate = `${yyyy}-${mm}-${dd}`;
  }

  onSearch(criteria: SearchCriteria): void {
    this.restaurantService.searchRestaurants(criteria);
    const locText = criteria.location ? criteria.location : 'all destinations';
    this.showToast(`Updated tables for ${criteria.guests} guests in ${locText}.`);
    this.scrollTo('featured-section');
  }

  onSelectCuisine(slug: string): void {
    if (this.currentCuisine() === slug) {
      this.restaurantService.setCuisineFilter('all');
      this.showToast('Showing all world cuisines.');
    } else {
      this.restaurantService.setCuisineFilter(slug);
      this.showToast(`Filtering by ${slug.toUpperCase()} cuisine.`);
    }
    this.scrollTo('featured-section');
  }

  onCategoryChange(catId: string): void {
    this.restaurantService.setCategoryFilter(catId);
  }

  resetAllFilters(): void {
    this.restaurantService.resetFilters();
    this.showToast('Filters cleared.');
  }

  openReservation(restaurant: Restaurant, slot?: string): void {
    this.selectedRestaurant.set(restaurant);
    if (slot) {
      this.bookingTime = slot;
    }
    this.bookingConfirmed.set(false);
    this.isReservationModalOpen.set(true);
  }

  onReserveSlot(event: { restaurant: Restaurant; slot: string }): void {
    this.openReservation(event.restaurant, event.slot);
  }

  closeModal(): void {
    this.isReservationModalOpen.set(false);
    this.selectedRestaurant.set(null);
    this.bookingConfirmed.set(false);
  }

  submitReservation(): void {
    const rest = this.selectedRestaurant();
    if (!rest) return;

    const result = this.restaurantService.reserveTable(rest.id, {
      date: this.bookingDate,
      time: this.bookingTime,
      guests: this.bookingPartySize,
      name: this.guestName
    });

    this.bookingRefCode.set(result.bookingRef);
    this.bookingConfirmed.set(true);
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
