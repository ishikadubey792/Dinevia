import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { RestaurantCardComponent } from '../../shared/components/restaurant-card/restaurant-card.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { ErrorAlertComponent } from '../../shared/components/error-alert/error-alert.component';
import { WishlistService } from '../../core/services/wishlist.service';
import { Restaurant } from '../../core/models/restaurant.model';

@Component({
  selector: 'app-wishlist',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    NavbarComponent,
    FooterComponent,
    RestaurantCardComponent,
    EmptyStateComponent,
    LoadingSpinnerComponent,
    ErrorAlertComponent
  ],
  templateUrl: './wishlist.component.html',
  styleUrl: './wishlist.component.scss'
})
export class WishlistComponent implements OnInit {
  readonly wishlistService = inject(WishlistService);
  private readonly router = inject(Router);

  readonly savedList = this.wishlistService.savedRestaurants;
  readonly isLoading = this.wishlistService.isLoading;
  readonly errorMessage = this.wishlistService.error;
  readonly toastMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.loadWishlist();
  }

  loadWishlist(): void {
    this.wishlistService.loadWishlist().subscribe({
      error: () => {}
    });
  }

  removeRestaurant(rest: Restaurant, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.wishlistService.removeFromWishlist(rest.id).subscribe({
      next: () => this.showToast(`Removed ${rest.name} from your saved wishlist.`),
      error: () => this.showToast(`Failed to remove ${rest.name}. Please try again.`)
    });
  }

  goToDetails(rest: Restaurant): void {
    this.router.navigate(['/restaurants', rest.id]);
  }

  goToBooking(rest: Restaurant, event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    this.router.navigate(['/book', rest.id]);
  }

  onReserveSlot(event: { restaurant: Restaurant; slot: string }): void {
    this.router.navigate(['/book', event.restaurant.id], { queryParams: { time: event.slot } });
  }

  private showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => {
      if (this.toastMessage() === msg) {
        this.toastMessage.set(null);
      }
    }, 3500);
  }
}
