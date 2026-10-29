import { Component, inject, signal, computed, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { RestaurantCardComponent } from '../../shared/components/restaurant-card/restaurant-card.component';
import { RestaurantService } from '../../core/services/restaurant.service';
import { BookingService } from '../../core/services/booking.service';
import { Restaurant, MenuItem, DayHours, RestaurantReview } from '../../core/models/restaurant.model';

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
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly restaurantService = inject(RestaurantService);
  private readonly bookingService = inject(BookingService);

  // Restaurant & Routing state
  readonly restaurant = signal<Restaurant | null>(null);
  readonly isNotFound = signal<boolean>(false);
  readonly similarRestaurants = signal<Restaurant[]>([]);

  // Gallery state
  readonly activeImageIndex = signal<number>(0);
  readonly isLightboxOpen = signal<boolean>(false);
  readonly imgErrorOccurred = signal<boolean>(false);

  // Menu Category Filter state
  readonly selectedMenuCategory = signal<'all' | 'starter' | 'main' | 'dessert' | 'beverage'>('all');

  // Reservation form signals
  readonly bookingDate = signal<string>('');
  readonly bookingTime = signal<string>('7:30 PM');
  readonly bookingPartySize = signal<number>(2);
  readonly seatingPreference = signal<string>('Chef-Curated Table');
  readonly guestName = signal<string>('Alexander Wright');
  readonly guestEmail = signal<string>('a.wright@epicuredining.com');
  readonly guestPhone = signal<string>('+1 (555) 234-5678');
  readonly specialRequests = signal<string>('');
  readonly bookingConfirmed = signal<boolean>(false);
  readonly bookingRefCode = signal<string>('');

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

  // Computed: Weekly opening hours schedule
  readonly weeklySchedule = computed<DayHours[]>(() => {
    const r = this.restaurant();
    if (!r) return [];
    if (r.weeklyHours && r.weeklyHours.length > 0) {
      return r.weeklyHours.map(item => ({
        ...item,
        isToday: item.day.toLowerCase() === this.currentDayName().toLowerCase()
      }));
    }

    // Default authentic weekly fine dining schedule
    const defaultDays = [
      { day: 'Monday', hours: 'Closed (Private Salon Events Only)' },
      { day: 'Tuesday', hours: '5:30 PM – 11:00 PM' },
      { day: 'Wednesday', hours: '5:30 PM – 11:00 PM' },
      { day: 'Thursday', hours: '5:30 PM – 11:00 PM' },
      { day: 'Friday', hours: '5:00 PM – 11:30 PM' },
      { day: 'Saturday', hours: '5:00 PM – 11:30 PM' },
      { day: 'Sunday', hours: '5:00 PM – 10:00 PM' }
    ];

    return defaultDays.map(item => ({
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
    return [r.imageUrl, this.fallbackImage];
  });

  // Computed: Filtered menu items
  readonly filteredMenu = computed<MenuItem[]>(() => {
    const r = this.restaurant();
    if (!r) return [];
    let items = r.menuHighlights || [];

    // If restaurant has no items in 'beverage', inject pairing items
    const hasBeverage = items.some(i => i.category === 'beverage');
    if (!hasBeverage) {
      const pairings: MenuItem[] = [
        {
          name: 'Grand Cru Sommelier Pairing',
          description: 'Five vintage reserve selections specifically harmonized with seasonal courses.',
          price: '$95',
          category: 'beverage',
          tag: 'Cellar Selection'
        },
        {
          name: 'Botanical Agave & Zero-Proof Flight',
          description: 'Cold-extracted herbals, house bitters, clarified citrus, and artisanal tonic.',
          price: '$45',
          category: 'beverage',
          tag: 'Non-Alcoholic'
        }
      ];
      items = [...items, ...pairings];
    }

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
    const score = r ? r.rating : 4.9;
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
    // Set default booking date to today
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    this.bookingDate.set(`${yyyy}-${mm}-${dd}`);

    // Subscribe to route parameter changes
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.loadRestaurantData(id);
      } else {
        this.isNotFound.set(true);
      }
    });
  }

  loadRestaurantData(id: string): void {
    const found = this.restaurantService.getRestaurantById(id);
    if (found) {
      this.restaurant.set(found);
      this.isNotFound.set(false);
      this.activeImageIndex.set(0);
      this.imgErrorOccurred.set(false);
      this.bookingConfirmed.set(false);
      this.selectedMenuCategory.set('all');

      if (found.availableSlots && found.availableSlots.length > 0) {
        this.bookingTime.set(found.availableSlots[0]);
      }

      // Find 3 similar restaurants (same cuisine, neighborhood, or city, excluding current)
      const all = this.restaurantService.restaurants();
      const similar = all
        .filter(r => r.id !== found.id && (r.cuisine === found.cuisine || r.city === found.city))
        .slice(0, 3);
      this.similarRestaurants.set(similar.length > 0 ? similar : all.filter(r => r.id !== found.id).slice(0, 3));

      // Scroll to top
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else {
      this.restaurant.set(null);
      this.isNotFound.set(true);
    }
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

  // Seating & Slot Selection
  selectSlot(slot: string): void {
    this.bookingTime.set(slot);
  }

  // Smooth scroll to reservation card
  scrollToReservation(): void {
    if (typeof document !== 'undefined') {
      const el = document.getElementById('reservationCard');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
        time: this.bookingTime(),
        guests: this.bookingPartySize(),
        seating: this.seatingPreference()
      }
    });
  }

  // Submit Table Reservation
  submitBooking(): void {
    const r = this.restaurant();
    if (!r) return;

    // Register with booking service
    const booking = this.bookingService.createBooking({
      restaurantId: r.id,
      date: this.bookingDate(),
      time: this.bookingTime(),
      guests: this.bookingPartySize(),
      seatingArea: this.seatingPreference(),
      customer: {
        fullName: this.guestName(),
        email: this.guestEmail(),
        phone: this.guestPhone(),
        specialRequests: this.specialRequests()
      }
    });

    this.bookingRefCode.set(booking.bookingRef);
    this.bookingConfirmed.set(true);
    this.showToast('Your table has been reserved with verified confirmation!');
  }

  resetBooking(): void {
    this.bookingConfirmed.set(false);
  }

  // Navigate to Dedicated Booking Confirmation Page
  goToConfirmation(): void {
    this.router.navigate(['/booking/confirmation'], {
      queryParams: { ref: this.bookingRefCode() }
    });
  }

  // Navigate to My Bookings
  goToMyBookings(): void {
    const r = this.restaurant();
    const queryParams = r ? { restaurantId: r.id, ref: this.bookingRefCode() } : {};
    this.router.navigate(['/bookings'], { queryParams });
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
