import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminLayoutComponent } from './layout/admin-layout.component';
import { AdminSidebarComponent } from './layout/components/admin-sidebar/admin-sidebar.component';
import { AdminHeaderComponent } from './layout/components/admin-header/admin-header.component';
import { AdminDashboardComponent } from './dashboard/admin-dashboard.component';
import { AdminRestaurantsComponent } from './restaurants/admin-restaurants.component';
import { OwnerBookingsComponent } from './bookings/owner-bookings.component';
import { AdminPlaceholderComponent } from './placeholder/admin-placeholder.component';
import { AdminTablesComponent } from './tables/admin-tables.component';
import { AdminOperatingHoursComponent } from './operating-hours/admin-operating-hours.component';
import { AdminDataService } from '../../core/services/admin-data.service';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';
import { ADMIN_ROUTES } from '../../app.routes';

describe('Dinevia Restaurant Owner Portal', () => {
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        AdminLayoutComponent,
        AdminSidebarComponent,
        AdminHeaderComponent,
        AdminDashboardComponent,
        AdminRestaurantsComponent,
        OwnerBookingsComponent,
        AdminTablesComponent,
        AdminOperatingHoursComponent,
        AdminPlaceholderComponent
      ],
      providers: [
        provideRouter([
          { path: 'admin', children: ADMIN_ROUTES },
          { path: '', component: AdminDashboardComponent }
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            currentUser: () => ({ fullName: 'Chef Julien Laurent', email: 'owner@legabriel.fr' }),
            currentOwner: () => ({ name: 'Chef Julien Laurent', email: 'owner@legabriel.fr', role: 'RestaurantOwner' }),
            isOwnerAuthenticated: () => true,
            getOwnerAccessToken: () => 'mock-jwt-token',
            isOwnerSessionExpired: () => false,
            clearOwnerSession: () => {},
            logout: () => {}
          }
        },
        AdminDataService
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
  });

  describe('AdminLayoutComponent', () => {
    let fixture: ComponentFixture<AdminLayoutComponent>;
    let component: AdminLayoutComponent;

    beforeEach(() => {
      fixture = TestBed.createComponent(AdminLayoutComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should create the admin layout shell', () => {
      expect(component).toBeTruthy();
      const sidebar = fixture.nativeElement.querySelector('app-admin-sidebar');
      const header = fixture.nativeElement.querySelector('app-admin-header');
      const routerOutlet = fixture.nativeElement.querySelector('router-outlet');

      expect(sidebar).toBeTruthy();
      expect(header).toBeTruthy();
      expect(routerOutlet).toBeTruthy();
    });
  });

  describe('AdminSidebarComponent', () => {
    let fixture: ComponentFixture<AdminSidebarComponent>;
    let component: AdminSidebarComponent;
    let adminData: AdminDataService;

    beforeEach(() => {
      fixture = TestBed.createComponent(AdminSidebarComponent);
      component = fixture.componentInstance;
      adminData = TestBed.inject(AdminDataService);
      fixture.detectChanges();
    });

    it('should render Dinevia owner brand', () => {
      const brandName = fixture.nativeElement.querySelector('.brand-name');
      const brandBadge = fixture.nativeElement.querySelector('.brand-badge');

      expect(brandName.textContent.trim()).toBe('Dinevia');
      expect(brandBadge.textContent.trim()).toBe('OWNER PORTAL');
    });

    it('should display the core navigation destinations (Dashboard, My Restaurants, Bookings, Table Management, Operating Hours)', () => {
      const links = fixture.nativeElement.querySelectorAll('.nav-link');
      const labels = Array.from(links).map((l: any) => l.querySelector('.nav-label')?.textContent.trim());

      expect(labels.length).toBe(5);
      expect(labels).toContain('Dashboard');
      expect(labels).toContain('My Restaurants');
      expect(labels).toContain('Bookings');
      expect(labels).toContain('Table Management');
      expect(labels).toContain('Operating Hours');

      // Ensure out-of-scope items are removed
      expect(labels).not.toContain('Menu Management');
      expect(labels).not.toContain('Tables & Seating');
      expect(labels).not.toContain('Customers');
      expect(labels).not.toContain('Reviews & Feedback');
      expect(labels).not.toContain('Reports & Analytics');
      expect(labels).not.toContain('Settings');
    });

    it('should render customer portal switch and owner user profile', () => {
      const portalLink = fixture.nativeElement.querySelector('.portal-switch-link');
      const profileName = fixture.nativeElement.querySelector('.profile-name');
      const profileRole = fixture.nativeElement.querySelector('.profile-role');

      expect(portalLink).toBeTruthy();
      expect(profileName.textContent.trim()).toBe('Chef Julien Laurent');
      expect(profileRole.textContent.trim()).toBe('Restaurant Owner');
    });

    it('should handle mobile sidebar toggle and backdrop', () => {
      expect(adminData.isSidebarOpen()).toBe(false);

      adminData.openSidebar();
      fixture.detectChanges();

      expect(adminData.isSidebarOpen()).toBe(true);
      const backdrop = fixture.nativeElement.querySelector('.sidebar-backdrop');
      expect(backdrop).toBeTruthy();

      backdrop.click();
      fixture.detectChanges();

      expect(adminData.isSidebarOpen()).toBe(false);
    });

    it('should close mobile sidebar on Escape key', () => {
      adminData.openSidebar();
      fixture.detectChanges();
      expect(adminData.isSidebarOpen()).toBe(true);

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      fixture.detectChanges();

      expect(adminData.isSidebarOpen()).toBe(false);
    });
  });

  describe('AdminHeaderComponent', () => {
    let fixture: ComponentFixture<AdminHeaderComponent>;
    let component: AdminHeaderComponent;
    let adminData: AdminDataService;

    beforeEach(() => {
      fixture = TestBed.createComponent(AdminHeaderComponent);
      component = fixture.componentInstance;
      adminData = TestBed.inject(AdminDataService);
      fixture.detectChanges();
    });

    it('should render owner breadcrumb title and live service indicator', () => {
      const title = fixture.nativeElement.querySelector('.page-title');
      const pulseText = fixture.nativeElement.querySelector('.pulse-text');

      expect(title.textContent.trim()).toBe('Owner Command Console');
      expect(pulseText.textContent.trim()).toBe('Live Service');
    });

    it('should toggle notifications dropdown panel', () => {
      expect(component.isNotificationOpen()).toBe(false);

      component.toggleNotifications();
      fixture.detectChanges();

      expect(component.isNotificationOpen()).toBe(true);
      const popover = fixture.nativeElement.querySelector('.notifications-popover');
      expect(popover).toBeTruthy();

      component.toggleNotifications();
      fixture.detectChanges();
      expect(component.isNotificationOpen()).toBe(false);
    });

    it('should toggle profile menu dropdown with owner info', () => {
      expect(component.isProfileMenuOpen()).toBe(false);

      component.toggleProfileMenu();
      fixture.detectChanges();

      expect(component.isProfileMenuOpen()).toBe(true);
      const profilePopover = fixture.nativeElement.querySelector('.profile-popover');
      expect(profilePopover).toBeTruthy();
      expect(profilePopover.textContent).toContain('Chef Julien Laurent');
      expect(profilePopover.textContent).toContain('Restaurant Owner');
    });

    it('should toggle sidebar when mobile hamburger is clicked', () => {
      const mobileBtn = fixture.nativeElement.querySelector('.mobile-menu-btn');
      expect(adminData.isSidebarOpen()).toBe(false);

      mobileBtn.click();
      fixture.detectChanges();

      expect(adminData.isSidebarOpen()).toBe(true);
    });
  });

  describe('AdminDashboardComponent', () => {
    let fixture: ComponentFixture<AdminDashboardComponent>;
    let component: AdminDashboardComponent;
    let httpMock: HttpTestingController;

    const mockDashboardMetrics = {
      totalRestaurants: 1,
      totalBookings: 14,
      pendingBookings: 3,
      confirmedBookings: 7,
      cancelledBookings: 1,
      completedBookings: 3,
      upcomingBookings: 4,
      restaurantSummaries: [
        {
          restaurantId: 1,
          restaurantName: 'Le Gabriel Paris',
          totalBookings: 14,
          pendingBookings: 3,
          confirmedBookings: 7,
          cancelledBookings: 1,
          completedBookings: 3
        }
      ],
      paymentSummaries: [
        { status: 'Success', count: 10, totalAmount: 25000 },
        { status: 'Pending', count: 3, totalAmount: 7500 }
      ],
      totalSuccessfulPaymentAmount: 25000,
      paymentNote: 'Payments are recorded in demo mode and do not represent actual settled bank funds.'
    };

    beforeEach(() => {
      httpMock = TestBed.inject(HttpTestingController);
      fixture = TestBed.createComponent(AdminDashboardComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      const restReq = httpMock.match(`${environment.apiUrl}/restaurants/my-restaurants`);
      if (restReq.length > 0) {
        restReq[0].flush({
          statusCode: 200,
          message: 'Success',
          data: []
        });
      }

      const dashReq = httpMock.match(`${environment.apiUrl}/owner/dashboard`);
      if (dashReq.length > 0) {
        dashReq[0].flush({
          statusCode: 200,
          message: 'Success',
          data: mockDashboardMetrics
        });
        fixture.detectChanges();
      }
    });

    afterEach(() => {
      const pending = httpMock.match(() => true);
      pending.forEach(r => {
        if (!r.cancelled) {
          r.flush({ statusCode: 200, message: 'Success', data: mockDashboardMetrics });
        }
      });
    });

    it('should render greeting for restaurant owner using session name', () => {
      const title = fixture.nativeElement.querySelector('.welcome-title');
      expect(title.textContent).toContain('Chef Julien Laurent');
    });

    it('should render 7 live KPI metric cards from API', () => {
      const metricCards = fixture.nativeElement.querySelectorAll('.metric-card');
      expect(metricCards.length).toBe(7);

      const text = fixture.nativeElement.textContent;
      expect(text).toContain('Total Restaurants');
      expect(text).toContain('Total Bookings');
      expect(text).toContain('Pending Bookings');
      expect(text).toContain('Confirmed Bookings');
      expect(text).toContain('Upcoming Bookings');
      expect(text).toContain('Completed Bookings');
      expect(text).toContain('Cancelled Bookings');

      const cardValues = Array.from(metricCards).map((c: any) => c.querySelector('.card-val')?.textContent.trim());
      expect(cardValues).toContain('1');  // Total Restaurants
      expect(cardValues).toContain('14'); // Total Bookings
      expect(cardValues).toContain('3');  // Pending Bookings
      expect(cardValues).toContain('7');  // Confirmed Bookings
    });

    it('should render restaurant summaries table and payment breakdown', () => {
      const restTable = fixture.nativeElement.querySelector('.analytics-table');
      expect(restTable).toBeTruthy();
      expect(restTable.textContent).toContain('Le Gabriel Paris');

      const paymentPanel = fixture.nativeElement.querySelector('.payment-analytics-panel');
      expect(paymentPanel).toBeTruthy();
      expect(paymentPanel.textContent).toContain('₹');
      expect(paymentPanel.textContent).toContain('Demonstration Mode Notice');
    });

    it('should provide direct links to Register Restaurant, My Restaurants, and Bookings Ledger', () => {
      const registerLink = fixture.nativeElement.querySelector('.welcome-actions a[routerLink="/admin/register"]');
      const restLink = fixture.nativeElement.querySelector('.welcome-actions a[routerLink="/admin/restaurants"]');
      const bookingsLink = fixture.nativeElement.querySelector('.welcome-actions a[routerLink="/admin/bookings"]');

      expect(registerLink).toBeTruthy();
      expect(restLink).toBeTruthy();
      expect(bookingsLink).toBeTruthy();
    });

    it('should render loading banner when isLoading is true', () => {
      component.isLoading.set(true);
      fixture.detectChanges();

      const loadingBanner = fixture.nativeElement.querySelector('.loading-banner');
      expect(loadingBanner).toBeTruthy();
      expect(loadingBanner.textContent).toContain('Aggregating Owner Analytics');

      component.isLoading.set(false);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.loading-banner')).toBeNull();
    });

    it('should render error banner and handle retry button click', () => {
      component.loadError.set('Network connection timed out');
      fixture.detectChanges();

      const errorBanner = fixture.nativeElement.querySelector('.error-banner');
      expect(errorBanner).toBeTruthy();
      expect(errorBanner.textContent).toContain('Network connection timed out');

      const retryBtn = fixture.nativeElement.querySelector('.retry-btn');
      expect(retryBtn).toBeTruthy();

      const retrySpy = vi.spyOn(component, 'retryLoad');
      retryBtn.click();
      expect(retrySpy).toHaveBeenCalled();
    });
  });
});
