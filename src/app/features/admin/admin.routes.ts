import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './layout/admin-layout.component';
import { AdminDashboardComponent } from './dashboard/admin-dashboard.component';
import { AdminRestaurantsComponent } from './restaurants/admin-restaurants.component';
import { AdminPlaceholderComponent } from './placeholder/admin-placeholder.component';
import { AdminLoginComponent } from './auth/admin-login/admin-login.component';
import { AdminRegisterComponent } from './auth/admin-register/admin-register.component';

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
        component: AdminPlaceholderComponent,
        title: 'Bookings — Dinevia Owner Portal',
        data: {
          title: 'Guest Table Bookings Ledger',
          kicker: 'RESTAURANT OPERATIONS',
          badge: 'Live Reservations',
          description: 'Review confirmed and seated reservations, party details, and special guest requests across your dining rooms.',
          stats: [
            { label: 'Active Reservations', value: '148' },
            { label: 'Confirmed Today', value: '38' },
            { label: 'Average Party', value: '3.4 Guests' }
          ],
          upcomingFeatures: [
            'Real-time SMS & email guest confirmation notifications',
            'Table assignment and turn pacing manager',
            'Direct reservation synchronization with POS',
            'Guest arrival status check-in'
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
