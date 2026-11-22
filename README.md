# Dinevia — Luxury Fine Dining & Restaurant Reservation Platform

> A premier restaurant discovery, reservation, and management platform built with modern Angular, featuring reactive signals, server-side rendering (SSR), and seamless ASP.NET Core REST API integration.

---

## ✦ Overview

**Dinevia** (code name `savoria`) connects discerning diners with Michelin-starred sanctuaries and trending culinary destinations while offering restaurant proprietors a comprehensive management console. The application comprises two core ecosystems:

1. **Customer Dining Portal**: Immersive restaurant exploration, faceted search, interactive table booking, account management, and dynamic legal document compliance.
2. **Restaurant Owner Portal (`/admin`)**: Dedicated partner onboarding, multi-cuisine configuration, real-time booking ledger, table inventory management, and operating schedules.

---

## ✦ Key Features

### 1. Customer Dining Portal
- **Exploration & Discovery (`/explore`)**:
  - Two-column responsive desktop layout (250px sticky sidebar with 32px separation).
  - Mobile filter drawer with horizontal active-filter chips and sticky action strip.
  - Multi-facet filtering: dynamic cuisines, price tiers, dining schedules, and dietary preferences.
  - Case-insensitive search with keyboard-accessible autocomplete (Arrow keys, Enter, Escape, outside click) for restaurant names, cuisines, and cities.
- **Restaurant Details (`/restaurants/:id`)**:
  - Editorial photography galleries, menus, and verified patron reviews.
  - Dynamic reservation widget with real-time party size, date selection, and meal session slot booking.
- **Reservation Workflow (`/booking/:id` & `/booking-confirmation/:id`)**:
  - Streamlined guest detail collection, dietary/seating preferences, and instant booking vouchers.
- **Patron Account (`/profile`, `/bookings`, `/wishlist`, `/payment-history`)**:
  - View upcoming and historical dining itineraries.
  - Curate wishlist favorites and monitor billing summaries.
- **Customer Authentication (`/login`, `/signup`, `/forgot-password`)**:
  - Standalone route and embedded modal experiences (`AuthModalComponent`).
  - Strict Indian phone (`^[6-9]\d{9}$`) and email validation.
  - Password complexity meter (uppercase, lowercase, digit, special character, 8–128 chars).
  - Dynamic backend-driven Terms & Conditions integration (`POST /api/auth/register` with `acceptedTerms` and `legalDocumentId`).

### 2. Restaurant Owner Portal (`/admin`)
- **Partner Onboarding (`/admin/register`)**:
  - Multi-cuisine selection from live API with resilient fallback catalogs.
  - High-resolution cover photo upload with instant image preview.
  - Multipart `FormData` submission sending `AcceptedTerms` and `LegalDocumentId`.
- **Owner Authentication (`/admin/login`)**:
  - Protected by `ownerAuthGuard` verifying JWT identity and `RestaurantOwner` role claims.
- **Owner Dashboard (`/admin/dashboard`)**:
  - Operational KPI cards: Total reservations, covers, revenue, and active listings.
- **Restaurant Portfolio (`/admin/restaurants`)**:
  - Restaurant profile editing, gallery modal, and structured menu management.
- **Bookings Ledger (`/admin/bookings`)**:
  - Manage reservation lifecycle statuses (`Confirmed`, `Completed`, `Cancelled`).
- **Table & Shift Management (`/admin/tables`, `/admin/operating-hours`)**:
  - Table capacities and layout management.
  - Operating days, shift windows, and dining interval scheduling.

### 3. Backend-Driven Terms & Conditions Compliance
- Centralized `LegalDocumentService` consuming `GET /api/legal-documents/terms`.
- In-memory caching and in-flight request deduplication with Angular Signals.
- Accessible modal (`TermsModalComponent`) with keyboard trap, escape dismissal, and sanitization.
- Automatic stale-terms detection: resets checkbox, prompts patron/owner with latest terms, and refreshes document cache.

---

## ✦ Architecture & Technology Stack

| Domain | Technology / Specification |
| :--- | :--- |
| **Framework** | **Angular 22** (Standalone Components, zero `NgModule` overhead) |
| **State & Reactivity** | **Angular Signals** (`signal`, `computed`, `effect`) & RxJS |
| **Rendering** | **Server-Side Rendering (SSR)** via `@angular/ssr` and Node.js |
| **Styling** | **Modular SCSS** utilizing the Dinevia Luxury Design System |
| **Forms & Validation** | **Reactive Forms** with strict custom validators |
| **Testing** | **Vitest 5**, `@angular/build:unit-test`, and `jsdom` |
| **Language & Tooling** | **TypeScript 6.0**, ECMAScript 2022, Angular CLI |
| **Backend Contract** | ASP.NET Core REST API (`https://localhost:7033/api`) with JWT Bearer Authentication |

### Design System Palette
- **Forest Green** (`#234637`): Primary brand color and active highlights.
- **Terracotta** (`#C8795A`): Warm accent and call-to-action color.
- **Ivory & Cream** (`#FBF9F5` / `#F3EFE6`): Background sanctuaries and card containers.
- **Charcoal** (`#262824`): High-legibility typography and structure.

---

## ✦ Project Structure

```
src/
├── app/
│   ├── core/                        # Singleton core infrastructure
│   │   ├── data/                    # Static fallbacks and initial state
│   │   ├── guards/                  # customerAuthGuard, ownerAuthGuard
│   │   ├── interceptors/            # Auth token and error handling interceptors
│   │   ├── models/                  # TypeScript contracts (customer, owner, legal, cuisine)
│   │   ├── services/                # AuthService, CustomerAuthService, OwnerAuthService,
│   │   │                            # LegalDocumentService, CuisineService, AdminDataService
│   │   └── validators/              # Strict email, phone, and password validators
│   ├── features/                    # Feature modules & route views
│   │   ├── admin/                   # Restaurant Owner Portal
│   │   │   ├── auth/                # admin-login, admin-register
│   │   │   ├── bookings/            # owner-bookings ledger
│   │   │   ├── dashboard/           # owner-dashboard metrics
│   │   │   ├── layout/              # admin-header, admin-sidebar, layout container
│   │   │   ├── operating-hours/     # operating hours & shifts
│   │   │   ├── restaurants/         # restaurant listing, menu & gallery modals
│   │   │   └── tables/              # table inventory management
│   │   ├── auth/                    # Customer login, signup, forgot-password
│   │   ├── booking/                 # Reservation flow & confirmation
│   │   ├── explore/                 # Customer exploration, filters & search
│   │   ├── home/                    # Landing page & hero search panel
│   │   ├── partner-with-us/         # Owner marketing landing page
│   │   ├── profile/                 # Customer profile & account details
│   │   ├── restaurant-detail/       # Detail page, menu & review displays
│   │   └── wishlist/                # Saved restaurants
│   └── shared/                      # Reusable UI components & directives
│       ├── components/              # terms-modal, auth-modal, navbar, footer,
│       │                            # restaurant-card, loading-spinner, status-badge
│       └── directives/              # Custom UI directives
├── environments/                    # Environment configurations (API URL: https://localhost:7033/api)
└── styles/                          # Global SCSS tokens, reset, typography, and utility classes
```

---

## ✦ Getting Started

### Prerequisites
- **Node.js**: `v20.x` or `v22.x` (LTS recommended)
- **npm**: `v10.x` or `v11.x`
- **Backend API**: ASP.NET Core API running at `https://localhost:7033` (or configure via environment files)

### Installation
Clone the repository and install dependencies:

```bash
git clone https://github.com/your-username/dinevia.git
cd dinevia
npm install
```

---

## ✦ Development & Build Commands

### Development Server
Starts the client application with hot-module replacement on port `4200`:

```bash
npm start
# Navigate to http://localhost:4200/
```

### Dedicated Owner Portal Dev Server
Starts the server on port `4201` and opens the browser:

```bash
npm run start:admin
# Navigate to http://localhost:4201/admin/login
```

### Production Build
Compiles the application with Angular Ahead-of-Time (AoT) optimizations and outputs to `dist/savoria`:

```bash
npm run build
```

### Server-Side Rendering (SSR)
Run the Node.js production server hosting the SSR bundle:

```bash
npm run serve:ssr:savoria
```

---

## ✦ Testing

Dinevia uses **Vitest** for blazing-fast unit tests and DOM verification:

```bash
# Run all unit tests once
npm test -- --watch=false

# Run specific feature tests (e.g. Terms & Conditions and Auth)
npm test -- --include="src/app/core/services/legal-document.service.spec.ts" --watch=false
npm test -- --include="src/app/shared/components/terms-modal/**/*.spec.ts" --watch=false
npm test -- --include="src/app/features/auth/signup/**/*.spec.ts" --watch=false
npm test -- --include="src/app/features/admin/auth/admin-register/**/*.spec.ts" --watch=false
```

---

## ✦ API Integration Reference

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/legal-documents/terms` | Fetch active terms & conditions | No |
| `POST` | `/api/auth/register` | Customer account registration (`JSON`) | No |
| `POST` | `/api/auth/register-restaurant-owner` | Restaurant owner registration (`multipart/form-data`) | No |
| `POST` | `/api/auth/login` | Authenticate customer or restaurant owner | No |
| `GET` | `/api/cuisines` | Fetch active cuisine categories | No |
| `GET` | `/api/restaurants` | Filtered & paginated restaurant discovery | No |
| `GET` | `/api/restaurants/:id` | Full restaurant details, hours, and menus | No |
| `POST` | `/api/bookings` | Create new table reservation | Yes (Customer) |
| `GET` | `/api/owner/bookings` | Retrieve owner reservation ledger | Yes (Owner) |

---

## ✦ License

This project is proprietary and confidential. &copy; 2026 Dinevia Hospitality Group. All rights reserved.
