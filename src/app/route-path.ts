/**
* Dinevia Centralized Route Path Constants
*/

export const ROUTE_PATH = {
  // ── Customer Portal & Public Dining Exploration ──
  HOME: '',
  EXPLORE: 'explore',
  RESTAURANT_DETAILS: 'restaurants/:id',
  RESTAURANT_DETAILS_ALIAS: 'restaurant/:id',
  BOOKING: 'book/:id',
  BOOKING_ALIAS: 'booking/:id',
  PAYMENT: 'booking/payment/:paymentId',
  PAYMENT_ALIAS: 'payment/:paymentId',
  BOOKING_CONFIRMATION: 'booking/confirmation',
  BOOKING_CONFIRMATION_ALIAS: 'booking-confirmation',
  PROFILE: 'profile',
  BOOKINGS: 'bookings',
  MY_BOOKINGS_ALIAS: 'my-bookings',
  PAYMENTS: 'payments',
  PAYMENT_HISTORY_ALIAS: 'payment-history',
  WISHLIST: 'wishlist',
  SAVED_ALIAS: 'saved',
  ABOUT: 'about',
  PARTNER_WITH_US: 'partner-with-us',

  // ── Member Authentication ──
  LOGIN: 'login',
  SIGNUP: 'signup',
  REGISTER_ALIAS: 'register',
  FORGOT_PASSWORD: 'forgot-password',

  // ── Restaurant Owner Portal ──
  ADMIN: 'admin',
  ADMIN_LOGIN: 'login',
  ADMIN_REGISTER: 'register',
  ADMIN_DASHBOARD: 'dashboard',
  ADMIN_RESTAURANTS: 'restaurants',
  ADMIN_BOOKINGS: 'bookings',
  ADMIN_TABLES: 'tables',
  ADMIN_OPERATING_HOURS: 'operating-hours',
  ADMIN_WILDCARD: 'admin/**',

  // ── General Wildcard ──
  WILDCARD: '**'
} as const;

// Alias export for backwards compatibility
export const ROUTE_PATHS = ROUTE_PATH;

/**
 * Type-safe absolute route path generators for programmatic navigation and links
 */
export const APP_LINKS = {
  home: () => '/',
  explore: () => '/explore',
  restaurantDetails: (id: string | number) => `/restaurants/${id}`,
  booking: (id: string | number) => `/book/${id}`,
  payment: (paymentId: string | number) => `/booking/payment/${paymentId}`,
  bookingConfirmation: () => '/booking/confirmation',
  login: () => '/login',
  signup: () => '/signup',
  forgotPassword: () => '/forgot-password',
  profile: () => '/profile',
  bookings: () => '/bookings',
  payments: () => '/payments',
  wishlist: () => '/wishlist',
  about: () => '/about',
  partnerWithUs: () => '/partner-with-us',
  admin: {
    root: () => '/admin',
    login: () => '/admin/login',
    register: () => '/admin/register',
    dashboard: () => '/admin/dashboard',
    restaurants: () => '/admin/restaurants',
    bookings: () => '/admin/bookings',
    tables: () => '/admin/tables',
    operatingHours: () => '/admin/operating-hours'
  }
} as const;
