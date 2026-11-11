import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthModalService } from './auth-modal.service';
import { AuthService } from './auth.service';

describe('AuthModalService', () => {
  let service: AuthModalService;
  let customerAuthSig: ReturnType<typeof signal<boolean>>;
  let ownerAuthSig: ReturnType<typeof signal<boolean>>;
  let ownerExpired: boolean;

  beforeEach(() => {
    customerAuthSig = signal(false);
    ownerAuthSig = signal(false);
    ownerExpired = false;

    const mockAuthService = {
      isCustomerAuthenticated: customerAuthSig.asReadonly(),
      isOwnerAuthenticated: ownerAuthSig.asReadonly(),
      isOwnerSessionExpired: () => ownerExpired
    };

    TestBed.configureTestingModule({
      providers: [
        AuthModalService,
        { provide: AuthService, useValue: mockAuthService }
      ]
    });

    service = TestBed.inject(AuthModalService);
  });

  it('auto-opens in login mode on initial load when visitor is unauthenticated on home route', () => {
    const opened = service.evaluateInitialLoad('/');
    expect(opened).toBe(true);
    expect(service.isOpen()).toBe(true);
    expect(service.activeMode()).toBe('login');
  });

  it('does not auto-open when an active Customer session exists', () => {
    customerAuthSig.set(true);
    const opened = service.evaluateInitialLoad('/');
    expect(opened).toBe(false);
    expect(service.isOpen()).toBe(false);
  });

  it('does not auto-open when an active non-expired RestaurantOwner session exists', () => {
    ownerAuthSig.set(true);
    ownerExpired = false;
    const opened = service.evaluateInitialLoad('/');
    expect(opened).toBe(false);
    expect(service.isOpen()).toBe(false);
  });

  it('auto-opens when owner session signal exists but is expired', () => {
    ownerAuthSig.set(true);
    ownerExpired = true;
    const opened = service.evaluateInitialLoad('/');
    expect(opened).toBe(true);
    expect(service.isOpen()).toBe(true);
  });

  it('does not auto-open on excluded auth or admin routes', () => {
    for (const url of ['/login', '/signup', '/forgot-password', '/admin/login', '/admin/dashboard']) {
      TestBed.resetTestingModule();
      const cs = signal(false);
      const os = signal(false);
      TestBed.configureTestingModule({
        providers: [
          AuthModalService,
          {
            provide: AuthService,
            useValue: {
              isCustomerAuthenticated: cs.asReadonly(),
              isOwnerAuthenticated: os.asReadonly(),
              isOwnerSessionExpired: () => false
            }
          }
        ]
      });
      const freshService = TestBed.inject(AuthModalService);
      expect(freshService.evaluateInitialLoad(url)).toBe(false);
      expect(freshService.isOpen()).toBe(false);
    }
  });

  it('supports switching between login and signup and dismissing permanently for initial load', () => {
    service.evaluateInitialLoad('/');
    service.switchMode('signup');
    expect(service.activeMode()).toBe('signup');

    service.close(true);
    expect(service.isOpen()).toBe(false);
    expect(service.hasDismissed()).toBe(true);

    expect(service.evaluateInitialLoad('/')).toBe(false);
    expect(service.isOpen()).toBe(false);
  });

  it('auto-closes reactively when a customer authenticates', () => {
    service.open('login');
    expect(service.isOpen()).toBe(true);

    customerAuthSig.set(true);
    TestBed.flushEffects();

    expect(service.isOpen()).toBe(false);
  });

  it('closes when route navigates to an excluded auth route', () => {
    service.open('login');
    service.handleRouteChange('/forgot-password');
    expect(service.isOpen()).toBe(false);
    expect(service.hasDismissed()).toBe(false);
  });
});
