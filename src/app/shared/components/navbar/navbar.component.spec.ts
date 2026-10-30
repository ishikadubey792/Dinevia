import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { NavbarComponent } from './navbar.component';
import { AuthService } from '../../../core/services/auth.service';

describe('NavbarComponent Responsive Navigation', () => {
  let component: NavbarComponent;
  let fixture: ComponentFixture<NavbarComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [
        provideRouter([
          { path: '', component: NavbarComponent },
          { path: 'explore', component: NavbarComponent },
          { path: 'bookings', component: NavbarComponent },
          { path: 'wishlist', component: NavbarComponent },
          { path: 'about', component: NavbarComponent },
          { path: 'login', component: NavbarComponent },
          { path: 'signup', component: NavbarComponent }
        ]),
        {
          provide: AuthService,
          useValue: {
            currentUser: () => null,
            logout: () => {}
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
    // Ensure body scroll is unlocked after each test
    document.body.style.overflow = '';
  });

  it('should create the navbar component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with mobile menu closed and body scroll unlocked', () => {
    expect(component.isMobileMenuOpen()).toBe(false);
    expect(document.body.style.overflow).toBe('');
  });

  it('should toggle mobile menu open and lock body scroll', () => {
    component.toggleMobileMenu();
    fixture.detectChanges();

    expect(component.isMobileMenuOpen()).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');

    const drawer = fixture.nativeElement.querySelector('#mobileMenu');
    expect(drawer).toBeTruthy();
    expect(drawer.classList.contains('open')).toBe(true);

    const backdrop = fixture.nativeElement.querySelector('.mobile-backdrop');
    expect(backdrop).toBeTruthy();
  });

  it('should close mobile menu with closeMobileMenu() and unlock body scroll', () => {
    component.toggleMobileMenu();
    fixture.detectChanges();
    expect(component.isMobileMenuOpen()).toBe(true);

    component.closeMobileMenu();
    fixture.detectChanges();

    expect(component.isMobileMenuOpen()).toBe(false);
    expect(document.body.style.overflow).toBe('');

    const drawer = fixture.nativeElement.querySelector('#mobileMenu');
    expect(drawer.classList.contains('open')).toBe(false);

    const backdrop = fixture.nativeElement.querySelector('.mobile-backdrop');
    expect(backdrop).toBeNull();
  });

  it('should close mobile drawer when X close button is clicked', () => {
    component.toggleMobileMenu();
    fixture.detectChanges();

    const closeBtn = fixture.nativeElement.querySelector('.close-btn') as HTMLButtonElement;
    expect(closeBtn).toBeTruthy();

    closeBtn.click();
    fixture.detectChanges();

    expect(component.isMobileMenuOpen()).toBe(false);
    expect(document.body.style.overflow).toBe('');
  });

  it('should close mobile drawer when backdrop is clicked', () => {
    component.toggleMobileMenu();
    fixture.detectChanges();

    const backdrop = fixture.nativeElement.querySelector('.mobile-backdrop') as HTMLDivElement;
    expect(backdrop).toBeTruthy();

    backdrop.click();
    fixture.detectChanges();

    expect(component.isMobileMenuOpen()).toBe(false);
    expect(document.body.style.overflow).toBe('');
  });

  it('should close mobile drawer when Escape key is pressed', () => {
    component.toggleMobileMenu();
    fixture.detectChanges();
    expect(component.isMobileMenuOpen()).toBe(true);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(component.isMobileMenuOpen()).toBe(false);
    expect(document.body.style.overflow).toBe('');
  });

  it('should close mobile drawer after Router navigation completes', async () => {
    component.toggleMobileMenu();
    fixture.detectChanges();
    expect(component.isMobileMenuOpen()).toBe(true);

    await router.navigate(['/explore']);
    fixture.detectChanges();

    expect(component.isMobileMenuOpen()).toBe(false);
    expect(document.body.style.overflow).toBe('');
  });

  it('should handle repeated open and close without state corruption', () => {
    for (let i = 0; i < 5; i++) {
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

  it('should unlock body scroll and unsubscribe on ngOnDestroy', () => {
    component.toggleMobileMenu();
    fixture.detectChanges();
    expect(document.body.style.overflow).toBe('hidden');

    fixture.destroy();
    expect(document.body.style.overflow).toBe('');
  });

  it('should close mobile menu on window resize to desktop width (>= 1024px)', () => {
    component.toggleMobileMenu();
    fixture.detectChanges();
    expect(component.isMobileMenuOpen()).toBe(true);

    // Simulate window innerWidth >= 1024
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
    window.dispatchEvent(new Event('resize'));
    fixture.detectChanges();

    expect(component.isMobileMenuOpen()).toBe(false);
    expect(document.body.style.overflow).toBe('');
  });

  it('should update isScrolled on scroll past 20px', () => {
    expect(component.isScrolled()).toBe(false);

    Object.defineProperty(window, 'scrollY', { writable: true, configurable: true, value: 50 });
    window.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();

    expect(component.isScrolled()).toBe(true);

    Object.defineProperty(window, 'scrollY', { writable: true, configurable: true, value: 5 });
    window.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();

    expect(component.isScrolled()).toBe(false);
  });

  it('should render desktop navigation links', () => {
    const desktopLinks = fixture.nativeElement.querySelectorAll('.desktop-nav .nav-item');
    expect(desktopLinks.length).toBe(5);

    const linkTexts = Array.from(desktopLinks).map((el: any) => el.textContent.trim());
    expect(linkTexts).toContain('Home');
    expect(linkTexts).toContain('Explore Restaurants');
    expect(linkTexts).toContain('My Bookings');
    expect(linkTexts).toContain('Saved');
    expect(linkTexts).toContain('About Us');
  });

  it('should render mobile drawer navigation links and buttons', () => {
    const mobileLinks = fixture.nativeElement.querySelectorAll('.mobile-nav-links .mobile-nav-item');
    expect(mobileLinks.length).toBe(5);

    const mobileLinkTexts = Array.from(mobileLinks).map((el: any) => el.textContent.trim());
    expect(mobileLinkTexts).toContain('Home');
    expect(mobileLinkTexts).toContain('Explore Restaurants');
    expect(mobileLinkTexts).toContain('My Bookings');
    expect(mobileLinkTexts).toContain('Saved');
    expect(mobileLinkTexts).toContain('About Us');

    const loginBtn = fixture.nativeElement.querySelector('.mobile-menu-footer a[routerLink="/login"]');
    const signupBtn = fixture.nativeElement.querySelector('.mobile-menu-footer a[routerLink="/signup"]');
    expect(loginBtn).toBeTruthy();
    expect(signupBtn).toBeTruthy();
  });

  describe('Breakpoint verification (1440px, 1024px, 768px, 390px, 360px)', () => {
    it('1440px Desktop: should auto-close mobile drawer and keep menu closed', () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1440 });
      component.isMobileMenuOpen.set(true);
      window.dispatchEvent(new Event('resize'));
      fixture.detectChanges();

      expect(component.isMobileMenuOpen()).toBe(false);
      expect(document.body.style.overflow).toBe('');
    });

    it('1024px Laptop: should auto-close mobile drawer and keep menu closed', () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
      component.isMobileMenuOpen.set(true);
      window.dispatchEvent(new Event('resize'));
      fixture.detectChanges();

      expect(component.isMobileMenuOpen()).toBe(false);
      expect(document.body.style.overflow).toBe('');
    });

    it('768px Tablet: should allow opening and closing mobile drawer with scroll lock', () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 768 });
      component.toggleMobileMenu();
      fixture.detectChanges();

      expect(component.isMobileMenuOpen()).toBe(true);
      expect(document.body.style.overflow).toBe('hidden');

      component.closeMobileMenu();
      fixture.detectChanges();

      expect(component.isMobileMenuOpen()).toBe(false);
      expect(document.body.style.overflow).toBe('');
    });

    it('390px Mobile: should allow opening and closing mobile drawer with scroll lock', () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 390 });
      component.toggleMobileMenu();
      fixture.detectChanges();

      expect(component.isMobileMenuOpen()).toBe(true);
      expect(document.body.style.overflow).toBe('hidden');

      component.closeMobileMenu();
      fixture.detectChanges();

      expect(component.isMobileMenuOpen()).toBe(false);
      expect(document.body.style.overflow).toBe('');
    });

    it('360px Mobile: should allow opening and closing mobile drawer with scroll lock', () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 360 });
      component.toggleMobileMenu();
      fixture.detectChanges();

      expect(component.isMobileMenuOpen()).toBe(true);
      expect(document.body.style.overflow).toBe('hidden');

      component.closeMobileMenu();
      fixture.detectChanges();

      expect(component.isMobileMenuOpen()).toBe(false);
      expect(document.body.style.overflow).toBe('');
    });
  });
});
