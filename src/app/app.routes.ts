import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { PlaceholderComponent } from './features/placeholder/placeholder.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    title: 'Dinevia — Discover, Reserve, Dine | Premium Table Reservations'
  },
  {
    path: 'explore',
    component: PlaceholderComponent,
    title: 'Explore Restaurants — Dinevia'
  },
  {
    path: 'bookings',
    component: PlaceholderComponent,
    title: 'My Bookings — Dinevia'
  },
  {
    path: 'about',
    component: PlaceholderComponent,
    title: 'About Dinevia — Our Philosophy'
  },
  {
    path: 'login',
    component: PlaceholderComponent,
    title: 'Member Access — Dinevia'
  },
  {
    path: '**',
    redirectTo: ''
  }
];
