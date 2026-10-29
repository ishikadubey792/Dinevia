import { Component, Input, Output, EventEmitter, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Restaurant } from '../../../core/models/restaurant.model';
import { RestaurantService } from '../../../core/services/restaurant.service';

@Component({
  selector: 'app-restaurant-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './restaurant-card.component.html',
  styleUrl: './restaurant-card.component.scss'
})
export class RestaurantCardComponent {
  private readonly restaurantService = inject(RestaurantService);

  @Input({ required: true }) restaurant!: Restaurant;
  @Output() viewDetails = new EventEmitter<Restaurant>();
  @Output() reserveSlot = new EventEmitter<{ restaurant: Restaurant; slot: string }>();

  readonly imgLoaded = signal<boolean>(false);
  readonly imgError = signal<boolean>(false);

  // Fallback image in case external URL fails
  readonly fallbackImage = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80';

  isSaved(): boolean {
    return this.restaurant ? this.restaurantService.isSaved(this.restaurant.id) : false;
  }

  toggleSave(event: MouseEvent): void {
    event.stopPropagation();
    if (this.restaurant) {
      this.restaurantService.toggleSaved(this.restaurant.id);
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
