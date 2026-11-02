import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AdminLayoutComponent } from './layout/admin-layout.component';
import { AdminSidebarComponent } from './layout/components/admin-sidebar/admin-sidebar.component';
import { AdminHeaderComponent } from './layout/components/admin-header/admin-header.component';
import { AdminDashboardComponent } from './dashboard/admin-dashboard.component';
import { AdminRestaurantsComponent } from './restaurants/admin-restaurants.component';
import { AdminPlaceholderComponent } from './placeholder/admin-placeholder.component';
import { AdminDataService } from '../../core/services/admin-data.service';
import { AuthService } from '../../core/services/auth.service';
import { ADMIN_ROUTES } from './admin.routes';

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
        AdminPlaceholderComponent
      ],
      providers: [
        provideRouter([
          { path: 'admin', children: ADMIN_ROUTES },
          { path: '', component: AdminDashboardComponent }
        ]),
        {
          provide: AuthService,
          useValue: {
            currentUser: () => ({ fullName: 'Chef Julien Laurent', email: 'owner@legabriel.fr' }),
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

    it('should display the 3 core navigation destinations (Dashboard, My Restaurants, Bookings)', () => {
      const links = fixture.nativeElement.querySelectorAll('.nav-link');
      const labels = Array.from(links).map((l: any) => l.querySelector('.nav-label')?.textContent.trim());

      expect(labels.length).toBe(3);
      expect(labels).toContain('Dashboard');
      expect(labels).toContain('My Restaurants');
      expect(labels).toContain('Bookings');

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

    beforeEach(() => {
      fixture = TestBed.createComponent(AdminDashboardComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should render greeting for restaurant owner', () => {
      const title = fixture.nativeElement.querySelector('.welcome-title');
      expect(title.textContent).toContain('Chef Julien Laurent');
    });

    it('should render 4 owner-focused KPI metrics', () => {
      const metricCards = fixture.nativeElement.querySelectorAll('.metric-card');
      expect(metricCards.length).toBe(4);

      const text = fixture.nativeElement.textContent;
      expect(text).toContain('My Restaurants');
      expect(text).toContain('Total Bookings');
      expect(text).toContain("Today's Guests / Covers");
      expect(text).toContain('Average Rating');
    });

    it('should toggle booking trend chart timeframe', () => {
      expect(component.trendView()).toBe('weekly');
      expect(component.currentChartData().length).toBe(7);

      component.setTrendView('monthly');
      fixture.detectChanges();

      expect(component.trendView()).toBe('monthly');
      expect(component.currentChartData().length).toBe(6);
    });

    it('should filter recent bookings table by status', () => {
      expect(component.bookingStatusFilter()).toBe('all');
      const allCount = component.filteredBookings().length;

      component.setBookingFilter('seated');
      fixture.detectChanges();
      expect(component.bookingStatusFilter()).toBe('seated');
      expect(component.filteredBookings().every(b => b.status === 'seated')).toBe(true);
      expect(component.filteredBookings().length).toBeLessThanOrEqual(allCount);
    });

    it('should inspect booking details in modal', () => {
      expect(component.selectedBooking()).toBeNull();

      const inspectBtn = fixture.nativeElement.querySelector('.btn-inspect');
      expect(inspectBtn).toBeTruthy();

      inspectBtn.click();
      fixture.detectChanges();

      expect(component.selectedBooking()).not.toBeNull();
      const modal = fixture.nativeElement.querySelector('.admin-modal');
      expect(modal).toBeTruthy();

      component.closeBookingDetails();
      fixture.detectChanges();
      expect(component.selectedBooking()).toBeNull();
    });

    it('should provide direct link to Add Restaurant (/admin/register)', () => {
      const addBtn = fixture.nativeElement.querySelector('.welcome-actions a[routerLink="/admin/register"]');
      expect(addBtn).toBeTruthy();
      expect(addBtn.textContent).toContain('Add Restaurant');
    });
  });
});
