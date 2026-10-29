import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { RestaurantService } from '../../core/services/restaurant.service';
import { BookingService } from '../../core/services/booking.service';
import { Restaurant } from '../../core/models/restaurant.model';
import { TimeSlotAvailability } from '../../core/models/booking.model';

@Component({
  selector: 'app-booking',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    NavbarComponent,
    FooterComponent
  ],
  templateUrl: './booking.component.html',
  styleUrl: './booking.component.scss'
})
export class BookingComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly restaurantService = inject(RestaurantService);
  private readonly bookingService = inject(BookingService);

  readonly restaurant = signal<Restaurant | null>(null);
  readonly isNotFound = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);
  readonly submissionError = signal<string | null>(null);

  // Available Time Slots for chosen date
  readonly availableSlots = signal<TimeSlotAvailability[]>([]);
  readonly selectedTimeSlot = signal<string>('7:30 PM');

  // Minimum allowed date (Today formatted as YYYY-MM-DD)
  readonly minDate = signal<string>('');

  // Selected dietary tags
  readonly selectedDietary = signal<string[]>([]);

  // Fallback image
  readonly fallbackImage = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80';

  // Booking Form
  bookingForm!: FormGroup;

  // Seating options
  readonly seatingAreas = [
    "Chef's Counter",
    "Main Dining Room",
    "Window Alcove",
    "Private Wine Vault",
    "Outdoor Garden Terrace"
  ];

  // Occasions list
  readonly occasions = [
    { label: 'Standard Dining', value: 'Standard Dining' },
    { label: 'Romantic Date Night', value: 'Romantic Date Night' },
    { label: 'Anniversary Celebration', value: 'Anniversary Celebration' },
    { label: 'Birthday Gathering', value: 'Birthday Gathering' },
    { label: 'Executive / Business Dinner', value: 'Executive / Business Dinner' },
    { label: 'Special Milestone', value: 'Special Milestone' }
  ];

  // Quick dietary options
  readonly dietaryOptions = [
    'Vegetarian',
    'Gluten-Free',
    'Vegan',
    'Dairy-Free',
    'Nut Allergy',
    'Pescatarian',
    'Shellfish-Free',
    'Halal'
  ];

  // Guest options
  readonly guestOptions = [
    { count: 1, label: '1 Guest (Solo Tasting)' },
    { count: 2, label: '2 Guests (Couple / Duo)' },
    { count: 3, label: '3 Guests' },
    { count: 4, label: '4 Guests (Small Party)' },
    { count: 5, label: '5 Guests' },
    { count: 6, label: '6 Guests (Celebration)' },
    { count: 7, label: '7 Guests' },
    { count: 8, label: '8 Guests (Private Salon)' },
    { count: 10, label: '10 Guests (Large Group)' },
    { count: 12, label: '12 Guests (Full Vault)' }
  ];

  // Computed lunch & dinner slots
  readonly lunchSlots = computed(() => 
    this.availableSlots().filter(s => s.period === 'lunch')
  );

  readonly dinnerSlots = computed(() => 
    this.availableSlots().filter(s => s.period === 'dinner')
  );

  // Formatted selected date string for live summary
  readonly formattedSelectedDate = computed(() => {
    const raw = this.bookingForm?.get('date')?.value;
    if (!raw) return 'Date not selected';
    try {
      const parts = raw.split('-');
      if (parts.length === 3) {
        const d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
        return d.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
      }
    } catch {
      return raw;
    }
    return raw;
  });

  ngOnInit(): void {
    // Determine today's date formatted as YYYY-MM-DD
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    this.minDate.set(todayStr);

    // Initialize Reactive Form with strict validation
    this.bookingForm = this.fb.group({
      date: [todayStr, [Validators.required]],
      guests: [2, [Validators.required, Validators.min(1), Validators.max(20)]],
      seatingArea: ["Chef's Counter", [Validators.required]],
      occasion: ['Romantic Date Night'],
      fullName: ['Alexander Wright', [Validators.required, Validators.minLength(2)]],
      email: ['a.wright@epicuredining.com', [Validators.required, Validators.email]],
      phone: ['+1 (555) 234-5678', [Validators.required, Validators.pattern(/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{7,15}$/)]],
      specialRequests: [''],
      agreeTerms: [true, [Validators.requiredTrue]]
    });

    // Handle Route parameters & Query parameters
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.loadRestaurant(id);
      } else {
        this.isNotFound.set(true);
      }
    });

    // Listen to query parameters for pre-filling (e.g. from Restaurant Details page)
    this.route.queryParamMap.subscribe(queryParams => {
      const qDate = queryParams.get('date');
      const qTime = queryParams.get('time');
      const qGuests = queryParams.get('guests');
      const qSeating = queryParams.get('seating');

      if (qDate) {
        this.bookingForm.patchValue({ date: qDate });
      }
      if (qGuests) {
        this.bookingForm.patchValue({ guests: +qGuests });
      }
      if (qSeating) {
        this.bookingForm.patchValue({ seatingArea: qSeating });
      }
      if (qTime) {
        this.selectedTimeSlot.set(qTime);
      }
    });

    // Re-evaluate slots when date changes
    this.bookingForm.get('date')?.valueChanges.subscribe(newDate => {
      if (newDate && this.restaurant()) {
        this.refreshTimeSlots(this.restaurant()!.id, newDate);
      }
    });
  }

  loadRestaurant(id: string): void {
    const found = this.restaurantService.getRestaurantById(id);
    if (found) {
      this.restaurant.set(found);
      this.isNotFound.set(false);

      const currentDate = this.bookingForm.get('date')?.value || this.minDate();
      this.refreshTimeSlots(found.id, currentDate);

      // Scroll to top
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else {
      this.restaurant.set(null);
      this.isNotFound.set(true);
    }
  }

  refreshTimeSlots(restaurantId: string, dateStr: string): void {
    const slots = this.bookingService.getTimeSlotsForDate(restaurantId, dateStr);
    this.availableSlots.set(slots);

    // If currently selected slot is not available in the new date, pick first available
    const isCurrentValid = slots.some(s => s.time === this.selectedTimeSlot() && s.available);
    if (!isCurrentValid) {
      const firstAvail = slots.find(s => s.available);
      if (firstAvail) {
        this.selectedTimeSlot.set(firstAvail.time);
      }
    }
  }

  selectTimeSlot(slot: TimeSlotAvailability): void {
    if (!slot.available) return;
    this.selectedTimeSlot.set(slot.time);
  }

  setQuickDate(offsetDays: number): void {
    const target = new Date();
    target.setDate(target.getDate() + offsetDays);
    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, '0');
    const dd = String(target.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    this.bookingForm.patchValue({ date: dateStr });
  }

  toggleDietary(tag: string): void {
    const current = [...this.selectedDietary()];
    const index = current.indexOf(tag);
    if (index >= 0) {
      current.splice(index, 1);
    } else {
      current.push(tag);
    }
    this.selectedDietary.set(current);
  }

  // Submit Booking Form
  onSubmit(): void {
    this.submissionError.set(null);

    if (this.bookingForm.invalid) {
      this.bookingForm.markAllAsTouched();
      this.submissionError.set('Please review and correct the highlighted fields before submitting.');
      if (typeof document !== 'undefined') {
        const firstErr = document.querySelector('.form-input-error, .ng-invalid');
        firstErr?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    const rest = this.restaurant();
    if (!rest) {
      this.submissionError.set('The selected restaurant could not be verified. Please return to Explore.');
      return;
    }

    const formVal = this.bookingForm.value;
    this.isSubmitting.set(true);

    // Brief simulation to display luxury reservation submission experience
    setTimeout(() => {
      try {
        const booking = this.bookingService.createBooking({
          restaurantId: rest.id,
          date: formVal.date,
          time: this.selectedTimeSlot(),
          guests: +formVal.guests,
          seatingArea: formVal.seatingArea,
          customer: {
            fullName: formVal.fullName.trim(),
            email: formVal.email.trim(),
            phone: formVal.phone.trim(),
            specialRequests: formVal.specialRequests?.trim() || '',
            occasion: formVal.occasion,
            dietaryPreferences: this.selectedDietary()
          }
        });

        this.isSubmitting.set(false);
        // Navigate to the Confirmation Page with the generated reference code
        this.router.navigate(['/booking/confirmation'], {
          queryParams: { ref: booking.bookingRef }
        });
      } catch (err) {
        this.isSubmitting.set(false);
        this.submissionError.set('An unexpected error occurred while confirming your reservation. Please try again.');
        console.error(err);
      }
    }, 700);
  }

  // Field validation helpers
  isFieldInvalid(fieldName: string): boolean {
    const field = this.bookingForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }
}
