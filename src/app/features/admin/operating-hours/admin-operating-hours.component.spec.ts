import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AdminOperatingHoursComponent } from './admin-operating-hours.component';
import { OperatingHourService } from '../../../core/services/operating-hour.service';
import { AdminDataService } from '../../../core/services/admin-data.service';
import { OperatingHour } from '../../../core/models/operating-hour.model';
import { OwnerRestaurant } from '../../../core/models/admin.model';
import { createMockOwnerRestaurant } from '../../../core/testing/mock-restaurant.factory';

describe('AdminOperatingHoursComponent', () => {
  let component: AdminOperatingHoursComponent;
  let fixture: ComponentFixture<AdminOperatingHoursComponent>;
  let hourServiceSpy: any;
  let adminDataSpy: any;

  const mockRestaurants: OwnerRestaurant[] = [
    createMockOwnerRestaurant({
      id: '10',
      name: 'Le Gabriel Paris',
      address: 'Avenue Gabriel',
      city: 'Paris',
      description: 'Haute cuisine',
      phone: '+33 1 44 31',
      email: 'contact@legabriel.fr',
      cuisines: ['French Haute Cuisine'],
      coverImageUrl: 'https://example.com/cover.jpg',
      status: 'active',
      isActive: true,
      createdAt: '2026-01-01'
    }),
    createMockOwnerRestaurant({
      id: '20',
      name: 'Mirazur Menton',
      address: 'Route de Menton',
      city: 'Menton',
      description: 'Coastal gastronomy',
      phone: '+33 4 93 57',
      email: 'contact@mirazur.fr',
      cuisines: ['Mediterranean'],
      coverImageUrl: 'https://example.com/cover2.jpg',
      status: 'active',
      isActive: true,
      createdAt: '2026-01-01'
    })
  ];

  const mockHours: OperatingHour[] = [
    { id: 1, restaurantId: 10, dayOfWeek: 'Monday', openTime: '10:00:00', closeTime: '22:00:00', isClosed: false },
    { id: 2, restaurantId: 10, dayOfWeek: 'Tuesday', openTime: '11:00:00', closeTime: '23:00:00', isClosed: false },
    { id: 3, restaurantId: 10, dayOfWeek: 'Sunday', openTime: null, closeTime: null, isClosed: true }
  ];

  beforeEach(async () => {
    hourServiceSpy = {
      getOperatingHoursByRestaurant: vi.fn().mockReturnValue(of(mockHours)),
      createOperatingHour: vi.fn().mockReturnValue(of({ id: 4, restaurantId: 10, dayOfWeek: 'Wednesday', openTime: '10:00:00', closeTime: '22:00:00', isClosed: false })),
      updateOperatingHour: vi.fn().mockReturnValue(of({ id: 1 })),
      deleteOperatingHour: vi.fn().mockReturnValue(of({ id: 1 }))
    };

    adminDataSpy = {
      loadOwnerRestaurants: vi.fn().mockReturnValue(of(mockRestaurants)),
      ownerRestaurants: vi.fn().mockReturnValue(mockRestaurants)
    };

    await TestBed.configureTestingModule({
      imports: [AdminOperatingHoursComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: OperatingHourService, useValue: hourServiceSpy },
        { provide: AdminDataService, useValue: adminDataSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminOperatingHoursComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize and load restaurants and operating hours for first owner restaurant', () => {
    expect(adminDataSpy.loadOwnerRestaurants).toHaveBeenCalled();
    expect(component.restaurants().length).toBe(2);
    expect(component.selectedRestaurantId()).toBe(10);
    expect(hourServiceSpy.getOperatingHoursByRestaurant).toHaveBeenCalledWith(10);
    expect(component.operatingHours().length).toBe(3);
    expect(component.configuredDaysCount()).toBe(3);
    expect(component.openDaysCount()).toBe(2);
    expect(component.closedDaysCount()).toBe(1);
  });

  it('should compute 7-day weekly schedule with Monday through Sunday', () => {
    const schedule = component.weeklySchedule();
    expect(schedule.length).toBe(7);
    expect(schedule[0].dayOfWeek).toBe('Monday');
    expect(schedule[0].isConfigured).toBe(true);
    expect(schedule[0].isClosed).toBe(false);
    expect(schedule[0].displayHours).toContain('10:00 AM – 10:00 PM');

    expect(schedule[1].dayOfWeek).toBe('Tuesday');
    expect(schedule[1].isConfigured).toBe(true);

    expect(schedule[2].dayOfWeek).toBe('Wednesday');
    expect(schedule[2].isConfigured).toBe(false);
    expect(schedule[2].displayHours).toBe('Not Configured');

    expect(schedule[6].dayOfWeek).toBe('Sunday');
    expect(schedule[6].isConfigured).toBe(true);
    expect(schedule[6].isClosed).toBe(true);
    expect(schedule[6].displayHours).toBe('Closed All Day');
  });

  it('should switch restaurant and load hours for selected owned restaurant', () => {
    component.onRestaurantChange('20');
    expect(component.selectedRestaurantId()).toBe(20);
    expect(hourServiceSpy.getOperatingHoursByRestaurant).toHaveBeenCalledWith(20);
  });

  it('should reject selecting restaurant ID not owned by authenticated owner', () => {
    component.onRestaurantChange('999'); // Non-owned ID
    expect(component.selectedRestaurantId()).toBe(10); // remains unchanged
  });

  it('should handle operating hour loading errors gracefully', () => {
    hourServiceSpy.getOperatingHoursByRestaurant.mockReturnValue(throwError(() => ({
      error: { message: 'Server unavailable' }
    })));
    component.loadOperatingHours(10);
    fixture.detectChanges();

    expect(component.hoursError()).toBe('Server unavailable');
    expect(component.isLoadingHours()).toBe(false);
  });

  it('should open configure modal for an unconfigured day with defaults', () => {
    const wednesday = component.weeklySchedule()[2]; // Wednesday (unconfigured)
    component.openConfigureModal(wednesday);

    expect(component.isModalOpen()).toBe(true);
    expect(component.modalForm.dayOfWeek).toBe('Wednesday');
    expect(component.modalForm.existingId).toBeNull();
    expect(component.modalForm.isClosed).toBe(false);
    expect(component.modalForm.openTime).toBe('10:00');
    expect(component.modalForm.closeTime).toBe('22:00');
  });

  it('should open configure modal for an existing configured day and populate hours and ID', () => {
    const monday = component.weeklySchedule()[0]; // Monday (configured with ID 1)
    component.openConfigureModal(monday);

    expect(component.isModalOpen()).toBe(true);
    expect(component.modalForm.dayOfWeek).toBe('Monday');
    expect(component.modalForm.existingId).toBe(1);
    expect(component.modalForm.openTime).toBe('10:00');
    expect(component.modalForm.closeTime).toBe('22:00');
  });

  it('should validate time requirements: closing must be later than opening', () => {
    component.openConfigureModal();
    component.modalForm.openTime = '22:00';
    component.modalForm.closeTime = '10:00'; // Earlier than opening!
    component.submitOperatingHours();

    expect(component.modalError()).toBe('Open time must be earlier than close time.');
    expect(hourServiceSpy.createOperatingHour).not.toHaveBeenCalled();
  });

  it('should dynamically calculate minCloseTime as opening time + 60 minutes', () => {
    component.openConfigureModal();
    component.modalForm.openTime = '10:00';
    expect(component.minCloseTime).toBe('11:00');

    component.modalForm.openTime = '14:30';
    expect(component.minCloseTime).toBe('15:30');

    component.modalForm.openTime = '22:00';
    expect(component.minCloseTime).toBe('23:00');

    component.modalForm.openTime = '23:30';
    expect(component.minCloseTime).toBe('23:59');
  });

  it('should enforce minimum 1-hour duration: reject 59 minutes and less than 60 minutes', () => {
    component.openConfigureModal();

    // 59 minutes: 10:00 to 10:59
    component.modalForm.openTime = '10:00';
    component.modalForm.closeTime = '10:59';
    expect(component.isDurationInvalid()).toBe(true);
    expect(component.isFormInvalid()).toBe(true);

    component.submitOperatingHours();
    expect(component.modalError()).toBe('Operating hours must be at least 1 hour.');
    expect(hourServiceSpy.createOperatingHour).not.toHaveBeenCalled();

    // 30 minutes: 10:00 to 10:30
    component.modalForm.openTime = '10:00';
    component.modalForm.closeTime = '10:30';
    expect(component.isDurationInvalid()).toBe(true);
    expect(component.isFormInvalid()).toBe(true);

    component.submitOperatingHours();
    expect(component.modalError()).toBe('Operating hours must be at least 1 hour.');
    expect(hourServiceSpy.createOperatingHour).not.toHaveBeenCalled();
  });

  it('should accept exactly 60 minutes and greater than 60 minutes duration', () => {
    const wednesday = component.weeklySchedule()[2];
    component.openConfigureModal(wednesday);

    // Exactly 60 minutes: 10:00 to 11:00
    component.modalForm.openTime = '10:00';
    component.modalForm.closeTime = '11:00';
    expect(component.isDurationInvalid()).toBe(false);
    expect(component.isFormInvalid()).toBe(false);

    component.submitOperatingHours();
    expect(hourServiceSpy.createOperatingHour).toHaveBeenCalledWith({
      restaurantId: 10,
      dayOfWeek: 'Wednesday',
      openTime: '10:00:00',
      closeTime: '11:00:00',
      isClosed: false
    });
    expect(component.isModalOpen()).toBe(false);
  });

  it('should display inline error message and disable Save button when duration is invalid', async () => {
    component.openConfigureModal();
    component.modalForm.openTime = '10:00';
    component.modalForm.closeTime = '10:30'; // 30 minutes < 60 minutes
    fixture.detectChanges();
    await fixture.whenStable();

    const inlineError = fixture.nativeElement.querySelector('.duration-error-hint .error-hint');
    expect(inlineError).toBeTruthy();
    expect(inlineError.textContent).toContain('Operating hours must be at least 1 hour.');

    const saveButton = fixture.nativeElement.querySelector('.modal-footer button[type="submit"]') as HTMLButtonElement;
    expect(saveButton).toBeTruthy();
    expect(saveButton.disabled).toBe(true);

    // Now update input element to valid duration: 10:00 to 11:30 (90 minutes)
    const closeInput = fixture.nativeElement.querySelector('#modal-close-time') as HTMLInputElement;
    closeInput.value = '11:30';
    closeInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const inlineErrorAfter = fixture.nativeElement.querySelector('.duration-error-hint');
    expect(inlineErrorAfter).toBeNull();
    expect(saveButton.disabled).toBe(false);
  });

  it('should not apply 1-hour duration validation to closed days and allow saving', () => {
    component.openConfigureModal();
    component.modalForm.isClosed = true;
    component.modalForm.openTime = '10:00';
    component.modalForm.closeTime = '10:15'; // 15 mins, but day is closed!
    fixture.detectChanges();

    expect(component.isDurationInvalid()).toBe(false);
    expect(component.isFormInvalid()).toBe(false);

    const inlineError = fixture.nativeElement.querySelector('.duration-error-hint');
    expect(inlineError).toBeNull();

    const saveButton = fixture.nativeElement.querySelector('.modal-footer button[type="submit"]') as HTMLButtonElement;
    expect(saveButton.disabled).toBe(false);
  });

  it('should allow saving when day is marked Closed without requiring times', () => {
    const wednesday = component.weeklySchedule()[2];
    component.openConfigureModal(wednesday);
    component.modalForm.isClosed = true;

    component.submitOperatingHours();

    expect(hourServiceSpy.createOperatingHour).toHaveBeenCalledWith({
      restaurantId: 10,
      dayOfWeek: 'Wednesday',
      openTime: null,
      closeTime: null,
      isClosed: true
    });
    expect(component.isModalOpen()).toBe(false);
    expect(component.toastMessage()).toContain('Wednesday');
  });

  it('should submit POST when creating hours for unconfigured day', () => {
    const wednesday = component.weeklySchedule()[2];
    component.openConfigureModal(wednesday);
    component.modalForm.openTime = '09:30';
    component.modalForm.closeTime = '21:30';

    component.submitOperatingHours();

    expect(hourServiceSpy.createOperatingHour).toHaveBeenCalledWith({
      restaurantId: 10,
      dayOfWeek: 'Wednesday',
      openTime: '09:30:00',
      closeTime: '21:30:00',
      isClosed: false
    });
    expect(component.isModalOpen()).toBe(false);
  });

  it('should submit PUT when updating hours for existing day', () => {
    const monday = component.weeklySchedule()[0]; // existing ID 1
    component.openConfigureModal(monday);
    component.modalForm.openTime = '11:00';
    component.modalForm.closeTime = '23:00';

    component.submitOperatingHours();

    expect(hourServiceSpy.updateOperatingHour).toHaveBeenCalledWith(1, {
      restaurantId: 10,
      dayOfWeek: 'Monday',
      openTime: '11:00:00',
      closeTime: '23:00:00',
      isClosed: false
    });
    expect(component.isModalOpen()).toBe(false);
  });

  it('should open delete confirmation and execute DELETE on confirm', () => {
    const monday = component.weeklySchedule()[0];
    component.openDeleteModal(monday);

    expect(component.deletingSchedule()).toEqual(monday);

    component.confirmDeleteSchedule();

    expect(hourServiceSpy.deleteOperatingHour).toHaveBeenCalledWith(1);
    expect(component.deletingSchedule()).toBeNull();
    expect(component.toastMessage()).toContain('Monday deleted');
  });
});

