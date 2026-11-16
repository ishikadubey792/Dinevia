import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './layout/admin-layout.component';
import { AdminDashboardComponent } from './dashboard/admin-dashboard.component';
import { AdminRestaurantsComponent } from './restaurants/admin-restaurants.component';
import { OwnerBookingsComponent } from './bookings/owner-bookings.component';
import { AdminPlaceholderComponent } from './placeholder/admin-placeholder.component';
import { AdminLoginComponent } from './auth/admin-login/admin-login.component';
import { AdminRegisterComponent } from './auth/admin-register/admin-register.component';
import { ownerAuthGuard } from '../../core/guards/owner-auth.guard';

export const ADMIN_ROUTES: Routes = [
  {
    path: 'login',
    component: AdminLoginComponent,
    title: 'Restaurant Owner Login — Dinevia Owner Portal'
  },
  {
    path: 'register',
    component: AdminRegisterComponent,
    title: 'Register Restaurant — Dinevia Owner Portal'
  },
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [ownerAuthGuard],
    canActivateChild: [ownerAuthGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      },
      {
        path: 'dashboard',
        component: AdminDashboardComponent,
        title: 'Dashboard — Dinevia Owner Portal'
      },
      {
        path: 'restaurants',
        component: AdminRestaurantsComponent,
        title: 'My Restaurants — Dinevia Owner Portal'
      },
      {
        path: 'bookings',
        component: OwnerBookingsComponent,
        title: 'Bookings Ledger — Dinevia Owner Portal'
      },
      {
        path: 'tables',
        component: AdminPlaceholderComponent,
        title: 'Table Management — Dinevia Owner Portal',
        data: {
          title: 'Table Management & Dining Room Layout',
          kicker: 'OPERATIONAL SEATING',
          badge: 'Dining Rooms',
          description: 'Configure dining room floor plans, table numbers, guest capacities, and active seating sections across your restaurants.',
          stats: [
            { label: 'Active Zones', value: 'Main Hall, Patio, PDR' },
            { label: 'Table Capacity', value: 'Configurable' },
            { label: 'Status', value: 'Operational' }
          ],
          upcomingFeatures: [
            'Visual floor plan layout drag & drop designer',
            'Dynamic table combination for large banquets',
            'Table turn pace timing alerts',
            'Service section waitstaff assignment'
          ]
        }
      },
      {
        path: 'operating-hours',
        component: AdminPlaceholderComponent,
        title: 'Operating Hours — Dinevia Owner Portal',
        data: {
          title: 'Operating Hours & Service Shifts',
          kicker: 'OPERATIONAL TIMINGS',
          badge: 'Service Shifts',
          description: 'Define daily operating hours, lunch and dinner service shifts, and special festival or holiday schedules.',
          stats: [
            { label: 'Lunch Service', value: '12:00 PM – 3:30 PM' },
            { label: 'Dinner Service', value: '7:00 PM – 11:30 PM' },
            { label: 'Weekly Shifts', value: '7 Days Active' }
          ],
          upcomingFeatures: [
            'Custom holiday and festive blackout calendars',
            'Split-shift timing with afternoon kitchen reset',
            'Last reservation seating buffer control',
            'Temporary closure broadcast to customer explore'
          ]
        }
      },
      {
        path: '**',
        redirectTo: 'dashboard'
      }
    ]
  }
];
