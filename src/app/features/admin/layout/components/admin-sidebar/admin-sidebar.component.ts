import { Component, inject, computed, HostListener } from '@angular/core';
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

  readonly ownerName = computed(() => this.authService.currentUser()?.fullName || 'Chef Julien Laurent');
  readonly ownerInitials = computed(() => {
    const name = this.ownerName();
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  });

  readonly navSections: NavSection[] = [
    {
      title: 'Restaurant Operations',
      items: [
        {
          label: 'Dashboard',
          route: '/admin/dashboard',
          icon: 'dashboard'
        },
        {
          label: 'My Restaurants',
          route: '/admin/restaurants',
          icon: 'restaurants'
        },
        {
          label: 'Bookings',
          route: '/admin/bookings',
          icon: 'bookings',
          badge: 'Live',
          badgeType: 'sage'
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

