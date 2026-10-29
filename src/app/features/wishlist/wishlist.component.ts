import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { RestaurantService } from '../../core/services/restaurant.service';
import { Restaurant } from '../../core/models/restaurant.model';

@Component({
  selector: 'app-wishlist',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    NavbarComponent,
    FooterComponent
  ],
  templateUrl: './wishlist.component.html',
  styleUrl: './wishlist.component.scss'
})
export class WishlistComponent {
  readonly restaurantService = inject(RestaurantService);
  private readonly router = inject(Router);

  readonly savedList = this.restaurantService.savedRestaurants;
  readonly toastMessage = signal<string | null>(null);

  removeRestaurant(rest: Restaurant, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.restaurantService.removeFromSaved(rest.id);
    this.showToast(`Removed ${rest.name} from your saved wishlist.`);
  }

  goToDetails(rest: Restaurant): void {
    this.router.navigate(['/restaurants', rest.id]);
  }

  goToBooking(rest: Restaurant, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.router.navigate(['/book', rest.id]);
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
