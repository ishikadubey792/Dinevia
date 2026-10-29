import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { ExploreComponent } from './features/explore/explore.component';
import { RestaurantDetailComponent } from './features/restaurant-detail/restaurant-detail.component';
import { BookingComponent } from './features/booking/booking.component';
import { BookingConfirmationComponent } from './features/booking-confirmation/booking-confirmation.component';
import { LoginComponent } from './features/auth/login/login.component';
import { SignupComponent } from './features/auth/signup/signup.component';
import { ForgotPasswordComponent } from './features/auth/forgot-password/forgot-password.component';
import { ProfileComponent } from './features/profile/profile.component';
import { BookingsComponent } from './features/bookings/bookings.component';
import { WishlistComponent } from './features/wishlist/wishlist.component';
import { PlaceholderComponent } from './features/placeholder/placeholder.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    title: 'Dinevia — Discover, Reserve, Dine | Premium Table Reservations'
  },
  {
    path: 'explore',
    component: ExploreComponent,
    title: 'Explore Restaurants — Dinevia | Curated Fine Dining'
  },
  {
    path: 'restaurants/:id',
    component: RestaurantDetailComponent,
    title: 'Restaurant Details — Dinevia'
  },
  {
    path: 'restaurant/:id',
    redirectTo: 'restaurants/:id'
  },
  {
    path: 'book/:id',
    component: BookingComponent,
    title: 'Reserve a Table — Dinevia'
  },
  {
    path: 'booking/:id',
    redirectTo: 'book/:id'
  },
  {
    path: 'booking/confirmation',
    component: BookingConfirmationComponent,
    title: 'Reservation Confirmed — Dinevia'
  },
  {
    path: 'booking-confirmation',
    redirectTo: 'booking/confirmation'
  },
  {
    path: 'login',
    component: LoginComponent,
    title: 'Member Access & Log In — Dinevia'
  },
  {
    path: 'signup',
    component: SignupComponent,
    title: 'Create Gastronomic Membership — Dinevia'
  },
  {
    path: 'register',
    redirectTo: 'signup'
  },
  {
    path: 'forgot-password',
    component: ForgotPasswordComponent,
    title: 'Reset Member Password — Dinevia'
  },
  {
    path: 'profile',
    component: ProfileComponent,
    title: 'Member Profile & Preferences — Dinevia'
  },
  {
    path: 'bookings',
    component: BookingsComponent,
    title: 'My Table Reservations — Dinevia'
  },
  {
    path: 'my-bookings',
    redirectTo: 'bookings'
  },
  {
    path: 'wishlist',
    component: WishlistComponent,
    title: 'Saved Dining Sanctuaries — Dinevia'
  },
  {
    path: 'saved',
    redirectTo: 'wishlist'
  },
  {
    path: 'about',
    component: PlaceholderComponent,
    title: 'About Dinevia — Our Philosophy'
  },
  {
    path: '**',
    redirectTo: ''
  }
];
