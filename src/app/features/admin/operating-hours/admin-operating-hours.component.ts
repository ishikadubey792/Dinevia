import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ScrollRevealDirective } from '../../../shared/directives/scroll-reveal.directive';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ConfirmModalComponent } from '../../../shared/components/confirm-modal/confirm-modal.component';
import { OperatingHourService } from '../../../core/services/operating-hour.service';
import { AdminDataService } from '../../../core/services/admin-data.service';
import {
  OperatingHour,
  CreateOperatingHourDto,
  UpdateOperatingHourDto,
  DAYS_OF_WEEK,
  DayOfWeek
} from '../../../core/models/operating-hour.model';
import { OwnerRestaurant } from '../../../core/models/admin.model';

export interface DayScheduleViewModel {
  dayOfWeek: DayOfWeek;
  operatingHour: OperatingHour | null;
  isConfigured: boolean;
  isClosed: boolean;
  displayHours: string;
}

@Component({
  selector: 'app-admin-operating-hours',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ScrollRevealDirective,
    LoadingSpinnerComponent,
    EmptyStateComponent,
    StatusBadgeComponent,
    ConfirmModalComponent
  ],
  templateUrl: './admin-operating-hours.component.html',
  styleUrl: './admin-operating-hours.component.scss'
})
export class AdminOperatingHoursComponent implements OnInit {
  private readonly operatingHourService = inject(OperatingHourService);
  readonly adminData = inject(AdminDataService);

  readonly daysOfWeek = DAYS_OF_WEEK;

  // Owner restaurants list and selected restaurant
  readonly restaurants = signal<OwnerRestaurant[]>([]);
  readonly selectedRestaurantId = signal<number | null>(null);
  readonly isLoadingRestaurants = signal<boolean>(true);
  readonly restaurantsError = signal<string | null>(null);

  // Operating hours list from backend
  readonly operatingHours = signal<OperatingHour[]>([]);
  readonly isLoadingHours = signal<boolean>(true);
  readonly hoursError = signal<string | null>(null);

  // Feedback notifications
  readonly toastMessage = signal<string | null>(null);

  // Active restaurant entity
  readonly activeRestaurant = computed(() => {
    const id = this.selectedRestaurantId();
    if (!id) return null;
    return this.restaurants().find(r => Number(r.id) === id) || null;
  });

  // Weekly Schedule View Model: Monday through Sunday
  readonly weeklySchedule = computed<DayScheduleViewModel[]>(() => {
    const rawHours = this.operatingHours();
    return this.daysOfWeek.map(day => {
      const match = rawHours.find(h =>
        h.dayOfWeek?.trim().toLowerCase() === day.toLowerCase()
      ) || null;

      if (!match) {
        return {
          dayOfWeek: day,
          operatingHour: null,
          isConfigured: false,
          isClosed: false,
          displayHours: 'Not Configured'
        };
      }

      if (match.isClosed) {
        return {
          dayOfWeek: day,
          operatingHour: match,
          isConfigured: true,
          isClosed: true,
          displayHours: 'Closed All Day'
        };
      }

      const openFormatted = this.formatTimeString(match.openTime);
      const closeFormatted = this.formatTimeString(match.closeTime);

      return {
        dayOfWeek: day,
        operatingHour: match,
        isConfigured: true,
        isClosed: false,
        displayHours: `${openFormatted} – ${closeFormatted}`
      };
    });
  });

  // Metrics computed for weekly schedule
  readonly configuredDaysCount = computed(() =>
    this.weeklySchedule().filter(d => d.isConfigured).length
  );
  readonly openDaysCount = computed(() =>
    this.weeklySchedule().filter(d => d.isConfigured && !d.isClosed).length
  );
  readonly closedDaysCount = computed(() =>
    this.weeklySchedule().filter(d => d.isConfigured && d.isClosed).length
  );

  // Modal State: Configure / Edit Operating Hours
  readonly isModalOpen = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly modalError = signal<string | null>(null);

  modalForm = {
    dayOfWeek: 'Monday' as DayOfWeek,
    isClosed: false,
    openTime: '10:00',
    closeTime: '22:00',
    existingId: null as number | null
  };

  // Modal State: Delete Confirmation
  readonly deletingSchedule = signal<DayScheduleViewModel | null>(null);
  readonly isDeleting = signal<boolean>(false);
  readonly deleteError = signal<string | null>(null);

  ngOnInit(): void {
    this.loadOwnerRestaurants();
  }

  loadOwnerRestaurants(): void {
    this.isLoadingRestaurants.set(true);
    this.restaurantsError.set(null);

    this.adminData.loadOwnerRestaurants().subscribe({
      next: (data) => {
        const owned = Array.isArray(data) ? data : [];
        this.restaurants.set(owned);
        this.isLoadingRestaurants.set(false);

        if (owned.length > 0) {
          const currentId = this.selectedRestaurantId();
          const match = owned.find(r => Number(r.id) === currentId);
          const targetId = match ? Number(match.id) : Number(owned[0].id);
          this.selectedRestaurantId.set(targetId);
          this.loadOperatingHours(targetId);
        } else {
          this.operatingHours.set([]);
          this.isLoadingHours.set(false);
        }
      },
      error: (err) => {
        this.isLoadingRestaurants.set(false);
        this.isLoadingHours.set(false);
        const msg = err?.error?.message || err?.statusText || 'Failed to load your restaurants.';
        this.restaurantsError.set(msg);
      }
    });
  }

  onRestaurantChange(restaurantIdVal: string | number): void {
    const numId = Number(restaurantIdVal);
    const exists = this.restaurants().some(r => Number(r.id) === numId);
    if (!exists) return;

    this.selectedRestaurantId.set(numId);
    this.hoursError.set(null);
    this.loadOperatingHours(numId);
  }

  loadOperatingHours(restaurantId: number): void {
    this.isLoadingHours.set(true);
    this.hoursError.set(null);

    this.operatingHourService.getOperatingHoursByRestaurant(restaurantId).subscribe({
      next: (data) => {
        this.operatingHours.set(Array.isArray(data) ? data : []);
        this.isLoadingHours.set(false);
      },
      error: (err) => {
        this.isLoadingHours.set(false);
        const msg = err?.error?.message || 'Failed to load operating hours. Please try again.';
        this.hoursError.set(msg);
      }
    });
  }

  /**
   * Opens modal to configure or edit hours for a specific day
   */
  openConfigureModal(dayModel?: DayScheduleViewModel): void {
    const day = dayModel?.dayOfWeek || 'Monday';
    const existing = dayModel?.operatingHour ||
      this.operatingHours().find(h => h.dayOfWeek?.toLowerCase() === day.toLowerCase()) || null;

    if (existing) {
      this.modalForm = {
        dayOfWeek: day,
        isClosed: existing.isClosed,
        openTime: this.extractTimeInput(existing.openTime) || '10:00',
        closeTime: this.extractTimeInput(existing.closeTime) || '22:00',
        existingId: existing.id
      };
    } else {
      this.modalForm = {
        dayOfWeek: day,
        isClosed: false,
        openTime: '10:00',
        closeTime: '22:00',
        existingId: null
      };
    }

    this.modalError.set(null);
    this.isModalOpen.set(true);
  }

  /**
   * Automatically updates form state when user changes day in modal dropdown
   */
  onModalDayChange(newDay: DayOfWeek): void {
    this.modalForm.dayOfWeek = newDay;
    const existing = this.operatingHours().find(h =>
      h.dayOfWeek?.toLowerCase() === newDay.toLowerCase()
    );

    if (existing) {
      this.modalForm.existingId = existing.id;
      this.modalForm.isClosed = existing.isClosed;
      this.modalForm.openTime = this.extractTimeInput(existing.openTime) || '10:00';
      this.modalForm.closeTime = this.extractTimeInput(existing.closeTime) || '22:00';
    } else {
      this.modalForm.existingId = null;
    }
    this.modalError.set(null);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.modalError.set(null);
  }

  /**
   * Submits Create or Update operating hours form
   */
  submitOperatingHours(): void {
    const restId = this.selectedRestaurantId();
    if (!restId) {
      this.modalError.set('Please select a restaurant first.');
      return;
    }

    const { dayOfWeek, isClosed, openTime, closeTime, existingId } = this.modalForm;

    let normalizedOpen: string | null = null;
    let normalizedClose: string | null = null;

    if (!isClosed) {
      if (!openTime) {
        this.modalError.set('Open time is required when restaurant is open.');
        return;
      }
      if (!closeTime) {
        this.modalError.set('Close time is required when restaurant is open.');
        return;
      }

      normalizedOpen = this.ensureTimeFormat(openTime);
      normalizedClose = this.ensureTimeFormat(closeTime);

      const openMins = this.timeToMinutes(openTime);
      const closeMins = this.timeToMinutes(closeTime);

      if (openMins === null || closeMins === null) {
        this.modalError.set('Please enter valid opening and closing times.');
        return;
      }

      // Validation 1: Open time must be earlier than close time
      if (closeMins <= openMins) {
        this.modalError.set('Open time must be earlier than close time.');
        return;
      }

      // Validation 2: Duration must be at least 60 minutes
      if (closeMins - openMins < 60) {
        this.modalError.set('Operating hours must be at least 1 hour.');
        return;
      }
    }

    this.isSaving.set(true);
    this.modalError.set(null);

    if (existingId) {
      // Existing record -> PUT /api/operating-hours/{id}
      const updateDto: UpdateOperatingHourDto = {
        restaurantId: restId,
        dayOfWeek: dayOfWeek,
        openTime: isClosed ? null : normalizedOpen,
        closeTime: isClosed ? null : normalizedClose,
        isClosed: isClosed
      };

      this.operatingHourService.updateOperatingHour(existingId, updateDto).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.closeModal();
          this.showToast(`Operating hours for ${dayOfWeek} updated successfully.`);
          this.loadOperatingHours(restId);
        },
        error: (err) => {
          this.isSaving.set(false);
          const msg = err?.error?.message ||
            (Array.isArray(err?.error?.errors) ? err.error.errors.join(' ') : 'Failed to update operating hours.');
          this.modalError.set(msg);
        }
      });
    } else {
      // New record -> POST /api/operating-hours
      const createDto: CreateOperatingHourDto = {
        restaurantId: restId,
        dayOfWeek: dayOfWeek,
        openTime: isClosed ? null : normalizedOpen,
        closeTime: isClosed ? null : normalizedClose,
        isClosed: isClosed
      };

      this.operatingHourService.createOperatingHour(createDto).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.closeModal();
          this.showToast(`Operating hours for ${dayOfWeek} saved successfully.`);
          this.loadOperatingHours(restId);
        },
        error: (err) => {
          this.isSaving.set(false);
          const msg = err?.error?.message ||
            (Array.isArray(err?.error?.errors) ? err.error.errors.join(' ') : 'Failed to save operating hours.');
          this.modalError.set(msg);
        }
      });
    }
  }

  /**
   * Opens Delete Operating Hours confirmation modal
   */
  openDeleteModal(dayModel: DayScheduleViewModel): void {
    if (!dayModel.operatingHour) return;
    this.deletingSchedule.set(dayModel);
    this.deleteError.set(null);
  }

  closeDeleteModal(): void {
    this.deletingSchedule.set(null);
    this.deleteError.set(null);
  }

  /**
   * Confirms and deletes operating hour record
   */
  confirmDeleteSchedule(): void {
    const item = this.deletingSchedule();
    const restId = this.selectedRestaurantId();
    if (!item?.operatingHour || !restId) return;

    this.isDeleting.set(true);
    this.deleteError.set(null);

    this.operatingHourService.deleteOperatingHour(item.operatingHour.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.closeDeleteModal();
        this.showToast(`Schedule for ${item.dayOfWeek} deleted successfully.`);
        this.loadOperatingHours(restId);
      },
      error: (err) => {
        this.isDeleting.set(false);
        const msg = err?.error?.message || 'Failed to delete operating hours. Please try again.';
        this.deleteError.set(msg);
      }
    });
  }

  /**
   * Converts "HH:mm" or "HH:mm:ss" string to minutes from midnight (0 - 1439).
   */
  timeToMinutes(timeStr: string | null | undefined): number | null {
    if (!timeStr) return null;
    const parts = timeStr.trim().split(':');
    if (parts.length < 2) return null;
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    if (isNaN(hours) || isNaN(minutes)) return null;
    return hours * 60 + minutes;
  }

  /**
   * Computes dynamic minimum closing-time string "HH:mm" based on opening time (opening time + 60 minutes).
   */
  get minCloseTime(): string {
    if (!this.modalForm.openTime) return '00:00';
    const openMins = this.timeToMinutes(this.modalForm.openTime);
    if (openMins === null) return '00:00';
    const minMins = openMins + 60;
    if (minMins >= 24 * 60) return '23:59';
    const h = Math.floor(minMins / 60);
    const m = minMins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  /**
   * Validates whether duration between opening and closing time is less than 60 minutes.
   * Returns true when open day has invalid duration (< 60 minutes).
   */
  isDurationInvalid(): boolean {
    if (this.modalForm.isClosed) return false;
    if (!this.modalForm.openTime || !this.modalForm.closeTime) return false;
    const openMins = this.timeToMinutes(this.modalForm.openTime);
    const closeMins = this.timeToMinutes(this.modalForm.closeTime);
    if (openMins === null || closeMins === null) return false;
    return (closeMins - openMins) < 60;
  }

  /**
   * Determines if the modal form cannot be saved due to missing times or invalid duration.
   */
  isFormInvalid(): boolean {
    if (this.modalForm.isClosed) return false;
    if (!this.modalForm.openTime || !this.modalForm.closeTime) return true;
    return this.isDurationInvalid();
  }

  /**
   * Formats time input string "HH:mm" to backend TimeSpan format "HH:mm:ss"
   */
  private ensureTimeFormat(time: string): string {
    const trimmed = time.trim();
    if (trimmed.length === 5) {
      return `${trimmed}:00`;
    }
    return trimmed;
  }

  /**
   * Extracts "HH:mm" for <input type="time"> from backend TimeSpan string "HH:mm:ss"
   */
  private extractTimeInput(timeStr: string | null): string {
    if (!timeStr) return '';
    const parts = timeStr.trim().split(':');
    if (parts.length >= 2) {
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
    }
    return timeStr;
  }

  /**
   * Converts TimeSpan string to 12-hour formatted string (e.g. "09:00:00" -> "9:00 AM")
   */
  private formatTimeString(timeStr: string | null): string {
    if (!timeStr) return 'N/A';
    const parts = timeStr.trim().split(':');
    if (parts.length < 2) return timeStr;

    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    if (isNaN(hours) || isNaN(minutes)) return timeStr;

    const period = hours >= 12 ? 'PM' : 'AM';
    const formattedHour = hours % 12 === 0 ? 12 : hours % 12;
    const formattedMinute = minutes < 10 ? `0${minutes}` : `${minutes}`;

    return `${formattedHour}:${formattedMinute} ${period}`;
  }

  private showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => {
      if (this.toastMessage() === msg) {
        this.toastMessage.set(null);
      }
    }, 4000);
  }
}

