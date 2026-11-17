import { Component, Input, Output, EventEmitter, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Restaurant } from '../../../core/models/restaurant.model';
import { WishlistService } from '../../../core/services/wishlist.service';
import { AuthService } from '../../../core/services/auth.service';
import { AuthModalService } from '../../../core/services/auth-modal.service';

@Component({
  selector: 'app-restaurant-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './restaurant-card.component.html',
  styleUrl: './restaurant-card.component.scss'
})
export class RestaurantCardComponent {
  private readonly wishlistService = inject(WishlistService);
  private readonly authService = inject(AuthService);
  private readonly authModalService = inject(AuthModalService);

  @Input({ required: true }) restaurant!: Restaurant;
  @Output() viewDetails = new EventEmitter<Restaurant>();
  @Output() reserveSlot = new EventEmitter<{ restaurant: Restaurant; slot: string }>();

  readonly imgLoaded = signal<boolean>(false);
  readonly imgError = signal<boolean>(false);

  isSaved(): boolean {
    return this.restaurant ? this.wishlistService.isSaved(this.restaurant.id) : false;
  }

  isPending(): boolean {
    return this.restaurant ? this.wishlistService.isPending(this.restaurant.id) : false;
  }

  toggleSave(event: MouseEvent): void {
    event.stopPropagation();
    if (!this.restaurant) return;

    // Login is mandatory for wishlist actions
    if (!this.authService.isCustomerAuthenticated()) {
      this.authModalService.open('login');
      return;
    }

    if (this.authService.isOwnerAuthenticated() && !this.authService.isOwnerSessionExpired()) {
      return;
    }

    if (this.isPending()) return;

    if (this.isSaved()) {
      this.wishlistService.removeFromWishlist(this.restaurant.id).subscribe({
        error: (err) => console.error('[RestaurantCard] Wishlist remove error:', err)
      });
    } else {
      this.wishlistService.addToWishlist(this.restaurant.id).subscribe({
        error: (err) => console.error('[RestaurantCard] Wishlist add error:', err)
      });
    }
  }

  onImageError(): void {
    this.imgError.set(true);
  }

  onImageLoad(): void {
    this.imgLoaded.set(true);
  }

  onViewClick(): void {
    this.viewDetails.emit(this.restaurant);
  }

  onSlotClick(slot: string, event: MouseEvent): void {
    event.stopPropagation();
    this.reserveSlot.emit({ restaurant: this.restaurant, slot });
  }
}
