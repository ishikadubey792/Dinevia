import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './layout/admin-layout.component';
import { AdminDashboardComponent } from './dashboard/admin-dashboard.component';
import { AdminRestaurantsComponent } from './restaurants/admin-restaurants.component';
import { OwnerBookingsComponent } from './bookings/owner-bookings.component';
import { AdminTablesComponent } from './tables/admin-tables.component';
import { AdminOperatingHoursComponent } from './operating-hours/admin-operating-hours.component';
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
        component: AdminTablesComponent,
        title: 'Table Management — Dinevia Owner Portal'
      },
      {
        path: 'operating-hours',
        component: AdminOperatingHoursComponent,
        title: 'Operating Hours — Dinevia Owner Portal'
      },
      {
        path: '**',
        redirectTo: 'dashboard'
      }
    ]
  }
];
