import { RenderMode, ServerRoute } from '@angular/ssr';
import { MOCK_RESTAURANTS } from './core/data/mock-restaurants';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'restaurants/:id',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => MOCK_RESTAURANTS.map(r => ({ id: r.id }))
  },
  {
    path: 'restaurant/:id',
    renderMode: RenderMode.Client
  },
  {
    path: 'book/:id',
    renderMode: RenderMode.Client
  },
  {
    path: 'booking/:id',
    renderMode: RenderMode.Client
  },
  {
    path: 'booking/confirmation',
    renderMode: RenderMode.Client
  },
  {
    path: 'booking-confirmation',
    renderMode: RenderMode.Client
  },
  {
    path: 'login',
    renderMode: RenderMode.Client
  },
  {
    path: 'signup',
    renderMode: RenderMode.Client
  },
  {
    path: 'register',
    renderMode: RenderMode.Client
  },
  {
    path: 'forgot-password',
    renderMode: RenderMode.Client
  },
  {
    path: 'profile',
    renderMode: RenderMode.Client
  },
  {
    path: 'bookings',
    renderMode: RenderMode.Client
  },
  {
    path: 'my-bookings',
    renderMode: RenderMode.Client
  },
  {
    path: 'wishlist',
    renderMode: RenderMode.Client
  },
  {
    path: 'saved',
    renderMode: RenderMode.Client
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
