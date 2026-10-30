import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './layout/admin-layout.component';
import { AdminDashboardComponent } from './dashboard/admin-dashboard.component';
import { AdminPlaceholderComponent } from './placeholder/admin-placeholder.component';

export const ADMIN_ROUTES: Routes = [
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
        title: 'Dinevia Admin — Executive Dashboard'
      },
      {
        path: 'restaurants',
        component: AdminPlaceholderComponent,
        title: 'Dinevia Admin — Dining Sanctuaries',
        data: {
          title: 'Dining Sanctuaries & Restaurant Directory',
          kicker: 'ESTABLISHMENT PORTFOLIO',
          badge: '18 Live Sanctuaries',
          description: 'Oversee the portfolio of 18 Michelin-accredited dining rooms, chef biographies, operating hours, and photography catalogs.',
          stats: [
            { label: 'Live Sanctuaries', value: '18' },
            { label: 'Pending Inspection', value: '2' },
            { label: 'Cities Represented', value: '8 Metropolises' }
          ],
          upcomingFeatures: [
            'Direct reservation synchronization with POS and Maître D\' systems',
            'Live table availability and dining room blackout scheduler',
            'Chef tasting profile and Michelin accolade editor',
            'High-resolution multi-angle photography CDN uploader'
          ]
        }
      },
      {
        path: 'menus',
        component: AdminPlaceholderComponent,
        title: 'Dinevia Admin — Menu Management',
        data: {
          title: 'Tasting Menus & Sommelier Cellars',
          kicker: 'CULINARY OFFERINGS',
          badge: 'Pre-Service Staging',
          description: 'Curate seasonal multi-course tasting menus, wine cellar pairings, dietary accreditations, and daily chef specials.',
          stats: [
            { label: 'Active Menus', value: '34' },
            { label: 'Wine Pairings', value: '82 Flights' },
            { label: 'Dietary Badges', value: '100% Verified' }
          ],
          upcomingFeatures: [
            'Multi-vintage wine cellar bottle inventory tracker',
            'Allergen matrix verification with culinary kitchen tags',
            'Dynamic seasonal course scheduler with automated release dates',
            'Sommelier pairing booklet PDF generator for printed menus'
          ]
        }
      },
      {
        path: 'tables',
        component: AdminPlaceholderComponent,
        title: 'Dinevia Admin — Tables & Seating',
        data: {
          title: 'Table Seating & Floor Plan Matrix',
          kicker: 'SANCTUARY SEATING',
          badge: 'Floor Plan Active',
          description: 'Configure dining room table matrices, private dining salons, chef counter seat allocation, and turnover pacing.',
          stats: [
            { label: 'Total Dining Tables', value: '246' },
            { label: 'Chef Counter Seats', value: '48' },
            { label: 'Private Wine Vaults', value: '14' }
          ],
          upcomingFeatures: [
            'Interactive 2D floor plan drag-and-drop table designer',
            'Pacing algorithm to prevent simultaneous kitchen seating rushes',
            'VIP high-value patron priority table locks',
            'Walk-in reservation hold and real-time release toggle'
          ]
        }
      },
      {
        path: 'bookings',
        component: AdminPlaceholderComponent,
        title: 'Dinevia Admin — Bookings Ledger',
        data: {
          title: 'Comprehensive Table Bookings Ledger',
          kicker: 'GUEST OPERATIONS',
          badge: '38 Bookings Today',
          description: 'Search, filter, confirm, seat, or re-schedule table reservations across all Dinevia partner dining rooms.',
          stats: [
            { label: 'Reservations This Month', value: '1,428' },
            { label: 'Confirmed Today', value: '38' },
            { label: 'Average Party Size', value: '3.4 Guests' }
          ],
          upcomingFeatures: [
            'Real-time SMS & email guest confirmation notifications',
            'Deposit ledger reconciliation and cancellation refund processor',
            'Maître d\' seating notes synchronization with mobile tablets',
            'Automated waitlist seat release upon party cancellation'
          ]
        }
      },
      {
        path: 'customers',
        component: AdminPlaceholderComponent,
        title: 'Dinevia Admin — Customers & VIPs',
        data: {
          title: 'Epicurean Members & VIP Patron Ledger',
          kicker: 'EPICUREAN COMMUNITY',
          badge: '3,890 Members',
          description: 'Maintain detailed guest gastronomic profiles, champagne preferences, dietary restrictions, and historical visit memoirs.',
          stats: [
            { label: 'Gastronomic Members', value: '3,890' },
            { label: 'VIP Club Patrons', value: '540' },
            { label: 'Average Spend', value: '$284 / visit' }
          ],
          upcomingFeatures: [
            'Personalized sommelier vintage recommendation engine',
            'Anniversary and milestone dining radar alerts for concierge',
            'Direct private communication with head hosts',
            'Gastronomic tier upgrade calculations and priority seating access'
          ]
        }
      },
      {
        path: 'reviews',
        component: AdminPlaceholderComponent,
        title: 'Dinevia Admin — Reviews & Memoirs',
        data: {
          title: 'Guest Reviews & Critical Memoirs',
          kicker: 'CULINARY REPUTATION',
          badge: '4.94★ Average Score',
          description: 'Moderate verified diner feedback, respond to food critic memoirs, and track sentiment metrics across all dining sanctuaries.',
          stats: [
            { label: 'Verified Reviews', value: '1,280' },
            { label: '5-Star Ratings', value: '96.2%' },
            { label: 'Response Rate', value: '98.5%' }
          ],
          upcomingFeatures: [
            'AI-assisted executive response drafts honoring culinary etiquette',
            'Sentiment analysis across wine, ambiance, and service dimensions',
            'Michelin inspector critical memoir recognition badge',
            'High-priority dissatisfaction alert webhooks for immediate recovery'
          ]
        }
      },
      {
        path: 'reports',
        component: AdminPlaceholderComponent,
        title: 'Dinevia Admin — Reports & Analytics',
        data: {
          title: 'Executive Financial & Operational Reports',
          kicker: 'FINANCIAL & ANALYTICS',
          badge: '$284.5K Monthly GMV',
          description: 'Generate audit-ready gastronomic reports, cover occupancy analytics, average check breakdown, and revenue pacing.',
          stats: [
            { label: 'Monthly GMV', value: '$284,500' },
            { label: 'Table Utilization', value: '94.2%' },
            { label: 'No-Show Rate', value: '< 1.2%' }
          ],
          upcomingFeatures: [
            'Automated weekly executive digest delivered via PDF',
            'Custom KPI builder with CSV and Excel accounting exports',
            'Year-over-year seasonal culinary volume comparison graphs',
            'Labor cost vs cover throughput efficiency projections'
          ]
        }
      },
      {
        path: 'settings',
        component: AdminPlaceholderComponent,
        title: 'Dinevia Admin — Platform Settings',
        data: {
          title: 'Platform Governance & Operational Settings',
          kicker: 'SYSTEM ADMINISTRATION',
          badge: 'Enterprise Security',
          description: 'Manage Dinevia platform configurations, webhook endpoints, booking deposit rules, staff credentials, and branding parameters.',
          stats: [
            { label: 'Active Admins', value: '4' },
            { label: 'API Integrations', value: '6 Connected' },
            { label: 'Platform Version', value: 'v2.4.0-lux' }
          ],
          upcomingFeatures: [
            'Role-based access control (Maître D\', Sommelier, Executive Admin)',
            'Stripe & luxury payment gateway deposit policy configuration',
            'Customized luxury email & SMS notification templates',
            'Audit logging with IP geolocation and credential security'
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

