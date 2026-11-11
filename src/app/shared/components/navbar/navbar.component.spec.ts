import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { CustomerAuthSession } from '../../../core/models/customer-auth.model';
import { OwnerUser } from '../../../core/models/owner-auth.model';
import { AuthService } from '../../../core/services/auth.service';
import { NavbarComponent } from './navbar.component';

describe('NavbarComponent Responsive & Auth-Aware Navigation', () => {
  let component: NavbarComponent;
  let fixture: ComponentFixture<NavbarComponent>;
  let router: Router;

  let isCustomerAuthSig: ReturnType<typeof signal<boolean>>;
  let customerSessionSig: ReturnType<typeof signal<CustomerAuthSession | null>>;
  let isOwnerAuthSig: ReturnType<typeof signal<boolean>>;
  let currentOwnerSig: ReturnType<typeof signal<OwnerUser | null>>;
  let ownerExpired: boolean;
  let logoutSpy: ReturnType<typeof vi.fn>;
  let logoutOwnerSpy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    isCustomerAuthSig = signal(false);
    customerSessionSig = signal<CustomerAuthSession | null>(null);
    isOwnerAuthSig = signal(false);
    currentOwnerSig = signal<OwnerUser | null>(null);
    ownerExpired = false;
    logoutSpy = vi.fn();
    logoutOwnerSpy = vi.fn();

    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [
        provideRouter([
          { path: '', component: NavbarComponent },
          { path: 'explore', component: NavbarComponent },
          { path: 'bookings', component: NavbarComponent },
          { path: 'wishlist', component: NavbarComponent },
          { path: 'profile', component: NavbarComponent },
          { path: 'partner-with-us', component: NavbarComponent },
          { path: 'login', component: NavbarComponent },
          { path: 'signup', component: NavbarComponent },
          { path: 'admin/login', component: NavbarComponent },
          { path: 'admin/dashboard', component: NavbarComponent }
        ]),
        {
          provide: AuthService,
          useValue: {
            currentUser: () => null,
            isCustomerAuthenticated: isCustomerAuthSig.asReadonly(),
            currentCustomerSession: customerSessionSig.asReadonly(),
            isOwnerAuthenticated: isOwnerAuthSig.asReadonly(),
            isOwnerSessionExpired: () => ownerExpired,
            currentOwner: currentOwnerSig.asReadonly(),
            logout: logoutSpy,
            logoutOwner: logoutOwnerSpy
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NavbarComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  afterEach(() => {
    document.body.style.overflow = '';
  });

  it('should create the navbar component with clean initial state', () => {
    expect(component).toBeTruthy();
    expect(component.isMobileMenuOpen()).toBe(false);
    expect(component.isUserMenuOpen()).toBe(false);
    expect(component.isCartNoticeOpen()).toBe(false);
    expect(document.body.style.overflow).toBe('');
  });

  it('should render redesigned desktop links and utility icons in left-to-right order', () => {
    const desktopLinks = fixture.nativeElement.querySelectorAll('.nav-links .nav-link');
    expect(desktopLinks.length).toBe(3);

    const linkTexts = Array.from(desktopLinks).map((el: any) => el.textContent.trim());
    expect(linkTexts).toEqual(['Home', 'My Bookings', 'For Restaurant Owners']);

    const searchLink = fixture.nativeElement.querySelector('.nav-actions a[routerLink="/explore"]');
    const wishlistLink = fixture.nativeElement.querySelector('.nav-actions a[routerLink="/wishlist"]');
    const cartBtn = fixture.nativeElement.querySelector('.nav-actions button.cart-icon-btn');
    const profileBtn = fixture.nativeElement.querySelector('.nav-actions button.profile-trigger-btn');

    expect(searchLink).toBeTruthy();
    expect(wishlistLink).toBeTruthy();
    expect(cartBtn).toBeTruthy();
    expect(profileBtn).toBeTruthy();
  });

  it('should toggle honest Cart unavailable notice when Cart icon is clicked', () => {
    const cartBtn = fixture.nativeElement.querySelector('.cart-icon-btn') as HTMLButtonElement;
    cartBtn.click();
    fixture.detectChanges();

    expect(component.isCartNoticeOpen()).toBe(true);
    const notice = fixture.nativeElement.querySelector('.cart-notice-popover');
    expect(notice?.textContent).toContain('Cart feature is not implemented yet.');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(component.isCartNoticeOpen()).toBe(false);
  });

  describe('Profile Dropdown Authentication States', () => {
    it('shows Log In and Sign Up options (no Profile/Logout) for unauthenticated visitors', () => {
      component.toggleUserMenu();
      fixture.detectChanges();

      const dropdown = fixture.nativeElement.querySelector('.user-dropdown');
      expect(dropdown).toBeTruthy();
      expect(dropdown.textContent).toContain('Log In');
      expect(dropdown.textContent).toContain('Sign Up');
      expect(dropdown.querySelector('a[routerLink="/profile"]')).toBeNull();
      expect(dropdown.textContent).not.toContain('Alexander Wright');
      expect(dropdown.textContent).not.toContain('Logout');
    });

    it('shows Profile and isolated Customer Logout for authenticated Customers', () => {
      const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

      isCustomerAuthSig.set(true);
      customerSessionSig.set({
        user: {
          id: 42,
          name: 'Ishika Customer',
          email: 'ishika@gmail.com',
          role: 'Customer'
        },
        accessToken: 'jwt-cust',
        tokenType: 'Bearer',
        expiresIn: 1800,
        authenticatedAt: Date.now()
      });
      fixture.detectChanges();

      expect(component.userInitials()).toBe('IC');

      component.toggleUserMenu();
      fixture.detectChanges();

      const dropdown = fixture.nativeElement.querySelector('.user-dropdown');
      expect(dropdown.textContent).toContain('Ishika Customer');
      expect(dropdown.querySelector('a[routerLink="/profile"]')).toBeTruthy();

      const logoutBtn = dropdown.querySelector('.dropdown-item-danger') as HTMLButtonElement;
      expect(logoutBtn.textContent?.trim()).toBe('Logout');
      logoutBtn.click();

      expect(logoutSpy).toHaveBeenCalledTimes(1);
      expect(logoutOwnerSpy).not.toHaveBeenCalled();
      expect(navigateSpy).toHaveBeenCalledWith(['/login']);
    });

    it('shows Owner Console, Customer Log In/Sign Up, and isolated Owner Logout for RestaurantOwners', () => {
      const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

      isOwnerAuthSig.set(true);
      currentOwnerSig.set({
        id: 7,
        name: 'Chef Julien',
        email: 'owner@dinevia.com',
        role: 'RestaurantOwner'
      });
      fixture.detectChanges();

      expect(component.userInitials()).toBe('CJ');

      component.toggleUserMenu();
      fixture.detectChanges();

      const dropdown = fixture.nativeElement.querySelector('.user-dropdown');
      expect(dropdown.textContent).toContain('Chef Julien');
      expect(dropdown.querySelector('a[routerLink="/admin/dashboard"]')).toBeTruthy();
      expect(dropdown.querySelector('a[routerLink="/login"]')).toBeTruthy();
      expect(dropdown.querySelector('a[routerLink="/signup"]')).toBeTruthy();

      const logoutBtn = dropdown.querySelector('.dropdown-item-danger') as HTMLButtonElement;
      logoutBtn.click();

      expect(logoutOwnerSpy).toHaveBeenCalledTimes(1);
      expect(logoutSpy).not.toHaveBeenCalled();
      expect(navigateSpy).toHaveBeenCalledWith(['/admin/login']);
    });
  });

  describe('Mobile Drawer & Responsive Breakpoints', () => {
    it('should toggle mobile menu open and lock body scroll', () => {
      component.toggleMobileMenu();
      fixture.detectChanges();

      expect(component.isMobileMenuOpen()).toBe(true);
      expect(document.body.style.overflow).toBe('hidden');
      expect(fixture.nativeElement.querySelector('.mobile-drawer')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.mobile-backdrop')).toBeTruthy();
    });

    it('should close mobile menu with closeMobileMenu() and unlock body scroll', () => {
      component.toggleMobileMenu();
      fixture.detectChanges();

      component.closeMobileMenu();
      fixture.detectChanges();

      expect(component.isMobileMenuOpen()).toBe(false);
      expect(document.body.style.overflow).toBe('');
      expect(fixture.nativeElement.querySelector('.mobile-drawer')).toBeNull();
      expect(fixture.nativeElement.querySelector('.mobile-backdrop')).toBeNull();
    });

    it('should close mobile drawer when X close button or backdrop is clicked', () => {
      component.toggleMobileMenu();
      fixture.detectChanges();

      const closeBtn = fixture.nativeElement.querySelector('.drawer-close-btn') as HTMLButtonElement;
      closeBtn.click();
      fixture.detectChanges();
      expect(component.isMobileMenuOpen()).toBe(false);

      component.toggleMobileMenu();
      fixture.detectChanges();
      const backdrop = fixture.nativeElement.querySelector('.mobile-backdrop') as HTMLDivElement;
      backdrop.click();
      fixture.detectChanges();
      expect(component.isMobileMenuOpen()).toBe(false);
    });

    it('should close mobile drawer when Escape key is pressed', () => {
      component.toggleMobileMenu();
      fixture.detectChanges();

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      fixture.detectChanges();

      expect(component.isMobileMenuOpen()).toBe(false);
      expect(document.body.style.overflow).toBe('');
    });

    it('should close mobile drawer after Router navigation completes', async () => {
      component.toggleMobileMenu();
      fixture.detectChanges();

      await router.navigate(['/explore']);
      fixture.detectChanges();

      expect(component.isMobileMenuOpen()).toBe(false);
      expect(document.body.style.overflow).toBe('');
    });

    it('should render mobile drawer navigation links and guest buttons', () => {
      component.toggleMobileMenu();
      fixture.detectChanges();

      const mobileLinks = fixture.nativeElement.querySelectorAll('.mobile-nav-list .mobile-nav-link');
      const mobileLinkTexts = Array.from(mobileLinks).map((el: any) => el.textContent.trim());

      expect(mobileLinkTexts).toEqual([
        'Home',
        'My Bookings',
        'For Restaurant Owners',
        'Search Restaurants',
        'Wishlist'
      ]);

      expect(fixture.nativeElement.querySelector('.mobile-drawer-footer a[routerLink="/login"]')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.mobile-drawer-footer a[routerLink="/signup"]')).toBeTruthy();
    });

    it('should unlock body scroll on ngOnDestroy', () => {
      component.toggleMobileMenu();
      fixture.detectChanges();
      expect(document.body.style.overflow).toBe('hidden');

      component.ngOnDestroy();
      expect(document.body.style.overflow).toBe('');
    });

    it('1440px Desktop: should auto-close mobile drawer on resize', () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1440 });
      component.isMobileMenuOpen.set(true);
      window.dispatchEvent(new Event('resize'));
      fixture.detectChanges();

      expect(component.isMobileMenuOpen()).toBe(false);
      expect(document.body.style.overflow).toBe('');
    });

    it('1024px Laptop: should auto-close mobile drawer on resize', () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
      component.isMobileMenuOpen.set(true);
      window.dispatchEvent(new Event('resize'));
      fixture.detectChanges();

      expect(component.isMobileMenuOpen()).toBe(false);
    });

    it('768px Tablet, 390px Mobile, and 360px Mobile: allow drawer toggle with scroll lock', () => {
      for (const width of [768, 390, 360]) {
        Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
        component.toggleMobileMenu();
        fixture.detectChanges();
        expect(component.isMobileMenuOpen()).toBe(true);
        expect(document.body.style.overflow).toBe('hidden');

        component.closeMobileMenu();
        fixture.detectChanges();
        expect(component.isMobileMenuOpen()).toBe(false);
        expect(document.body.style.overflow).toBe('');
      }
    });
  });
});
