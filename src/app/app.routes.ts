import { Routes } from '@angular/router';
import { ROUTE_PATH } from './route-path';

// Customer & Public Components
import { HomeComponent } from './features/home/home.component';
import { ExploreComponent } from './features/explore/explore.component';
import { RestaurantDetailComponent } from './features/restaurant-detail/restaurant-detail.component';
import { BookingComponent } from './features/booking/booking.component';
import { BookingConfirmationComponent } from './features/booking-confirmation/booking-confirmation.component';
import { ProfileComponent } from './features/profile/profile.component';
import { BookingsComponent } from './features/bookings/bookings.component';
import { WishlistComponent } from './features/wishlist/wishlist.component';
import { PlaceholderComponent } from './features/placeholder/placeholder.component';
import { PartnerWithUsComponent } from './features/partner-with-us/partner-with-us.component';

// Authentication Components
import { LoginComponent } from './features/auth/login/login.component';
import { SignupComponent } from './features/auth/signup/signup.component';
import { ForgotPasswordComponent } from './features/auth/forgot-password/forgot-password.component';

// Restaurant Owner Portal Components
import { AdminLayoutComponent } from './features/admin/layout/admin-layout.component';
import { AdminDashboardComponent } from './features/admin/dashboard/admin-dashboard.component';
import { AdminRestaurantsComponent } from './features/admin/restaurants/admin-restaurants.component';
import { OwnerBookingsComponent } from './features/admin/bookings/owner-bookings.component';
import { AdminTablesComponent } from './features/admin/tables/admin-tables.component';
import { AdminOperatingHoursComponent } from './features/admin/operating-hours/admin-operating-hours.component';
import { AdminLoginComponent } from './features/admin/auth/admin-login/admin-login.component';
import { AdminRegisterComponent } from './features/admin/auth/admin-register/admin-register.component';

// Route Guards
import { customerAuthGuard } from './core/guards/customer-auth.guard';
import { ownerAuthGuard } from './core/guards/owner-auth.guard';

/**
 * Restaurant Owner Portal Child Routes
 */
export const ADMIN_ROUTES: Routes = [
  {
    path: ROUTE_PATH.ADMIN_LOGIN,
    component: AdminLoginComponent,
    title: 'Restaurant Owner Login — Dinevia Owner Portal'
  },
  {
    path: ROUTE_PATH.ADMIN_REGISTER,
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
        redirectTo: ROUTE_PATH.ADMIN_DASHBOARD
      },
      {
        path: ROUTE_PATH.ADMIN_DASHBOARD,
        component: AdminDashboardComponent,
        title: 'Dashboard — Dinevia Owner Portal'
      },
      {
        path: ROUTE_PATH.ADMIN_RESTAURANTS,
        component: AdminRestaurantsComponent,
        title: 'My Restaurants — Dinevia Owner Portal'
      },
      {
        path: ROUTE_PATH.ADMIN_BOOKINGS,
        component: OwnerBookingsComponent,
        title: 'Bookings Ledger — Dinevia Owner Portal'
      },
      {
        path: ROUTE_PATH.ADMIN_TABLES,
        component: AdminTablesComponent,
        title: 'Table Management — Dinevia Owner Portal'
      },
      {
        path: ROUTE_PATH.ADMIN_OPERATING_HOURS,
        component: AdminOperatingHoursComponent,
        title: 'Operating Hours — Dinevia Owner Portal'
      },
      {
        path: '**',
        redirectTo: ROUTE_PATH.ADMIN_DASHBOARD
      }
    ]
  }
];

/**
 * Complete Application Routes Configuration
 */
export const routes: Routes = [
  // ── Customer Portal & Public Dining Exploration ──
  {
    path: ROUTE_PATH.HOME,
    component: HomeComponent,
    title: 'Dinevia — Discover, Reserve, Dine | Premium Table Reservations'
  },
  {
    path: ROUTE_PATH.EXPLORE,
    component: ExploreComponent,
    title: 'Explore Restaurants — Dinevia | Curated Fine Dining'
  },
  {
    path: ROUTE_PATH.RESTAURANT_DETAILS,
    component: RestaurantDetailComponent,
    title: 'Restaurant Details — Dinevia'
  },
  {
    path: ROUTE_PATH.RESTAURANT_DETAILS_ALIAS,
    redirectTo: ROUTE_PATH.RESTAURANT_DETAILS
  },
  {
    path: ROUTE_PATH.BOOKING,
    component: BookingComponent,
    title: 'Reserve a Table — Dinevia'
  },
  {
    path: ROUTE_PATH.BOOKING_ALIAS,
    redirectTo: ROUTE_PATH.BOOKING
  },
  {
    path: ROUTE_PATH.PAYMENT,
    loadComponent: () =>
      import('./features/payment/payment.component').then(m => m.PaymentComponent),
    canActivate: [customerAuthGuard],
    title: 'Reservation Payment Guarantee — Dinevia'
  },
  {
    path: ROUTE_PATH.PAYMENT_ALIAS,
    redirectTo: ROUTE_PATH.PAYMENT
  },
  {
    path: ROUTE_PATH.BOOKING_CONFIRMATION,
    component: BookingConfirmationComponent,
    title: 'Reservation Confirmed — Dinevia'
  },
  {
    path: ROUTE_PATH.BOOKING_CONFIRMATION_ALIAS,
    redirectTo: ROUTE_PATH.BOOKING_CONFIRMATION
  },

  // ── Member Authentication ──
  {
    path: ROUTE_PATH.LOGIN,
    component: LoginComponent,
    title: 'Member Access & Log In — Dinevia'
  },
  {
    path: ROUTE_PATH.SIGNUP,
    component: SignupComponent,
    title: 'Create Gastronomic Membership — Dinevia'
  },
  {
    path: ROUTE_PATH.REGISTER_ALIAS,
    redirectTo: ROUTE_PATH.SIGNUP
  },
  {
    path: ROUTE_PATH.FORGOT_PASSWORD,
    component: ForgotPasswordComponent,
    title: 'Reset Member Password — Dinevia'
  },

  // ── Member Authenticated Portal ──
  {
    path: ROUTE_PATH.PROFILE,
    component: ProfileComponent,
    canActivate: [customerAuthGuard],
    title: 'Member Profile & Preferences — Dinevia'
  },
  {
    path: ROUTE_PATH.BOOKINGS,
    component: BookingsComponent,
    canActivate: [customerAuthGuard],
    title: 'My Table Reservations — Dinevia'
  },
  {
    path: ROUTE_PATH.MY_BOOKINGS_ALIAS,
    redirectTo: ROUTE_PATH.BOOKINGS
  },
  {
    path: ROUTE_PATH.PAYMENTS,
    loadComponent: () =>
      import('./features/payment-history/payment-history.component').then(
        m => m.PaymentHistoryComponent
      ),
    canActivate: [customerAuthGuard],
    title: 'Payment History — Dinevia'
  },
  {
    path: ROUTE_PATH.PAYMENT_HISTORY_ALIAS,
    redirectTo: ROUTE_PATH.PAYMENTS
  },
  {
    path: ROUTE_PATH.WISHLIST,
    component: WishlistComponent,
    canActivate: [customerAuthGuard],
    title: 'Saved Dining Sanctuaries — Dinevia'
  },
  {
    path: ROUTE_PATH.SAVED_ALIAS,
    redirectTo: ROUTE_PATH.WISHLIST
  },
  {
    path: ROUTE_PATH.ABOUT,
    component: PlaceholderComponent,
    title: 'About Dinevia — Our Philosophy'
  },
  {
    path: ROUTE_PATH.PARTNER_WITH_US,
    component: PartnerWithUsComponent,
    title: 'Partner With Dinevia — Grow Your Restaurant | Curated Reservations'
  },

  // ── Restaurant Owner Portal ──
  {
    path: ROUTE_PATH.ADMIN,
    children: ADMIN_ROUTES
  },

  // ── Wildcard Fallback ──
  {
    path: ROUTE_PATH.WILDCARD,
    redirectTo: ROUTE_PATH.HOME
  }
];
