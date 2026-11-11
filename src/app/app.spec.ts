import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthModalService } from './core/services/auth-modal.service';
import { AuthService } from './core/services/auth.service';
import { App } from './app';

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    document.body.style.overflow = '';
    localStorage.clear();
  });

  it('should create the app and open auth modal on initial unauthenticated load', async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const app = fixture.componentInstance;
    const authModalService = TestBed.inject(AuthModalService);
    expect(app).toBeTruthy();
    expect(authModalService.isOpen()).toBe(true);
    expect(fixture.nativeElement.querySelector('.auth-modal-backdrop')).toBeTruthy();
  });

  it('should not open auth modal when a Customer session is active', async () => {
    const customerAuth = signal(true);
    const ownerAuth = signal(false);

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            isCustomerAuthenticated: customerAuth.asReadonly(),
            isOwnerAuthenticated: ownerAuth.asReadonly(),
            isOwnerSessionExpired: () => false
          }
        }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const authModalService = TestBed.inject(AuthModalService);
    expect(authModalService.isOpen()).toBe(false);
    expect(fixture.nativeElement.querySelector('.auth-modal-backdrop')).toBeNull();
  });

  it('should not open auth modal when a RestaurantOwner session is active', async () => {
    const customerAuth = signal(false);
    const ownerAuth = signal(true);

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            isCustomerAuthenticated: customerAuth.asReadonly(),
            isOwnerAuthenticated: ownerAuth.asReadonly(),
            isOwnerSessionExpired: () => false
          }
        }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const authModalService = TestBed.inject(AuthModalService);
    expect(authModalService.isOpen()).toBe(false);
    expect(fixture.nativeElement.querySelector('.auth-modal-backdrop')).toBeNull();
  });
});
