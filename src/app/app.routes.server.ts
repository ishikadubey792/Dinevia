import { RenderMode, ServerRoute } from '@angular/ssr';
import { ROUTE_PATH } from './route-path';

export const serverRoutes: ServerRoute[] = [
  {
    path: ROUTE_PATH.RESTAURANT_DETAILS,
    renderMode: RenderMode.Server
  },
  {
    path: ROUTE_PATH.RESTAURANT_DETAILS_ALIAS,
    renderMode: RenderMode.Client
  },
  {
    path: ROUTE_PATH.BOOKING,
    renderMode: RenderMode.Client
  },
  {
    path: ROUTE_PATH.BOOKING_ALIAS,
    renderMode: RenderMode.Client
  },
  {
    path: ROUTE_PATH.PAYMENT,
    renderMode: RenderMode.Client
  },
  {
    path: ROUTE_PATH.PAYMENT_ALIAS,
    renderMode: RenderMode.Client
  },
  {
    path: ROUTE_PATH.BOOKING_CONFIRMATION,
    renderMode: RenderMode.Client
  },
  {
    path: ROUTE_PATH.BOOKING_CONFIRMATION_ALIAS,
    renderMode: RenderMode.Client
  },
  {
    path: ROUTE_PATH.LOGIN,
    renderMode: RenderMode.Client
  },
  {
    path: ROUTE_PATH.SIGNUP,
    renderMode: RenderMode.Client
  },
  {
    path: ROUTE_PATH.REGISTER_ALIAS,
    renderMode: RenderMode.Client
  },
  {
    path: ROUTE_PATH.FORGOT_PASSWORD,
    renderMode: RenderMode.Client
  },
  {
    path: ROUTE_PATH.PROFILE,
    renderMode: RenderMode.Client
  },
  {
    path: ROUTE_PATH.BOOKINGS,
    renderMode: RenderMode.Client
  },
  {
    path: ROUTE_PATH.MY_BOOKINGS_ALIAS,
    renderMode: RenderMode.Client
  },
  {
    path: ROUTE_PATH.PAYMENTS,
    renderMode: RenderMode.Client
  },
  {
    path: ROUTE_PATH.PAYMENT_HISTORY_ALIAS,
    renderMode: RenderMode.Client
  },
  {
    path: ROUTE_PATH.WISHLIST,
    renderMode: RenderMode.Client
  },
  {
    path: ROUTE_PATH.SAVED_ALIAS,
    renderMode: RenderMode.Client
  },
  {
    path: ROUTE_PATH.PARTNER_WITH_US,
    renderMode: RenderMode.Prerender
  },
  {
    path: ROUTE_PATH.ADMIN,
    renderMode: RenderMode.Client
  },
  {
    path: ROUTE_PATH.ADMIN_WILDCARD,
    renderMode: RenderMode.Client
  },
  {
    path: ROUTE_PATH.WILDCARD,
    renderMode: RenderMode.Prerender
  }
];
