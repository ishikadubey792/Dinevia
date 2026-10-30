import { Component, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { AdminDataService } from '../../../../../core/services/admin-data.service';
import { AuthService } from '../../../../../core/services/auth.service';

interface NavSection {
  title: string;
  items: NavItem[];
}

interface NavItem {
  label: string;
  route: string;
  icon: string;
  badge?: string;
  badgeType?: 'primary' | 'gold' | 'sage';
}

@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './admin-sidebar.component.html',
  styleUrl: './admin-sidebar.component.scss'
})
export class AdminSidebarComponent {
  readonly adminData = inject(AdminDataService);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly routerSub: Subscription;

  readonly navSections: NavSection[] = [
    {
      title: 'Executive Overview',
      items: [
        {
          label: 'Dashboard',
          route: '/admin/dashboard',
          icon: 'dashboard'
        }
      ]
    },
    {
      title: 'Sanctuary Management',
      items: [
        {
          label: 'Restaurants',
          route: '/admin/restaurants',
          icon: 'restaurants',
          badge: '18 Live'
        },
        {
          label: 'Menu Management',
          route: '/admin/menus',
          icon: 'menu'
        },
        {
          label: 'Tables & Seating',
          route: '/admin/tables',
          icon: 'tables'
        }
      ]
    },
    {
      title: 'Guest Operations',
      items: [
        {
          label: 'Bookings',
          route: '/admin/bookings',
          icon: 'bookings',
          badge: '38 Today',
          badgeType: 'gold'
        },
        {
          label: 'Customers',
          route: '/admin/customers',
          icon: 'customers'
        },
        {
          label: 'Reviews & Feedback',
          route: '/admin/reviews',
          icon: 'reviews',
          badge: '4.9★'
        }
      ]
    },
    {
      title: 'Platform Control',
      items: [
        {
          label: 'Reports & Analytics',
          route: '/admin/reports',
          icon: 'reports'
        },
        {
          label: 'Settings',
          route: '/admin/settings',
          icon: 'settings'
        }
      ]
    }
  ];

  constructor() {
    this.routerSub = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        this.adminData.closeSidebar();
      });
  }

  @HostListener('window:resize')
  onResize(): void {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024 && this.adminData.isSidebarOpen()) {
      this.adminData.closeSidebar();
    }
  }

  @HostListener('window:keydown.escape')
  onEscape(): void {
    this.adminData.closeSidebar();
  }

  logout(): void {
    this.adminData.closeSidebar();
    this.authService.logout();
    this.router.navigate(['/']);
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }
}

