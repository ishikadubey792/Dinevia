import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { AuthService } from '../../core/services/auth.service';
import { BookingService } from '../../core/services/booking.service';
import { RestaurantService } from '../../core/services/restaurant.service';
import { ProfileComponent } from './profile.component';

describe('ProfileComponent Form Validation & Clean Defaults', () => {
  let component: ProfileComponent;
  let fixture: ComponentFixture<ProfileComponent>;
  let isCustomerAuthSig: ReturnType<typeof signal<boolean>>;

  beforeEach(async () => {
    isCustomerAuthSig = signal(false);

    await TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            isCustomerAuthenticated: isCustomerAuthSig.asReadonly(),
            isOwnerAuthenticated: () => false,
            isOwnerSessionExpired: () => false,
            currentCustomerSession: () => null,
            currentOwner: () => null,
            currentUser: () => ({
              id: 'mock-id',
              fullName: 'Alexander Wright',
              email: 'a.wright@epicuredining.com',
              phone: '+1 (555) 234-5678',
              memberSince: '2026',
              memberTier: 'Guest',
              reservationsCompleted: 0,
              dietaryPreferences: [],
              favoriteCuisines: []
            }),
            updateProfile: vi.fn(),
            logout: vi.fn(),
            logoutOwner: vi.fn()
          }
        },
        {
          provide: BookingService,
          useValue: {
            bookingHistory: () => []
          }
        },
        {
          provide: RestaurantService,
          useValue: {
            savedIds: () => new Set<string>()
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('initializes edit form without pre-filled sample values when visitor is not an authenticated customer', () => {
    expect(component.profileForm.get('fullName')?.value).toBe('');
    expect(component.profileForm.get('email')?.value).toBe('');
    expect(component.profileForm.get('phone')?.value).toBe('');
    expect(component.profileForm.get('preferredCity')?.value).toBe('');
    expect(component.profileForm.get('preferredSeating')?.value).toBe('');
  });

  it('enforces .com/.in email validation and strict Indian mobile validation', () => {
    const emailCtrl = component.profileForm.get('email');
    const phoneCtrl = component.profileForm.get('phone');

    emailCtrl?.setValue('member@yahoo.in');
    expect(emailCtrl?.valid).toBe(true);

    emailCtrl?.setValue('member@company.org');
    expect(emailCtrl?.valid).toBe(false);
    expect(component.getEmailErrorMessage()).toContain('.com or .in');

    phoneCtrl?.setValue('9876543210');
    expect(phoneCtrl?.valid).toBe(true);

    phoneCtrl?.setValue('1234567890');
    expect(phoneCtrl?.valid).toBe(false);
    expect(component.getPhoneErrorMessage()).toContain('start with digit 6, 7, 8, or 9');
  });
});

