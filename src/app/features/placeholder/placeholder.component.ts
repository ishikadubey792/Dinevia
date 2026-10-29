import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';

@Component({
  selector: 'app-placeholder',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent],
  template: `
    <app-navbar></app-navbar>
    <main class="placeholder-main">
      <div class="container text-center">
        <span class="badge badge-terracotta">{{ pageBadge }}</span>
        <h1 class="placeholder-title">{{ pageTitle }}</h1>
        <p class="placeholder-desc">{{ pageDesc }}</p>
        <div class="action-row">
          <a routerLink="/" class="btn btn-primary">Return to Home</a>
          <button type="button" class="btn btn-outline" (click)="notifyMe()">Get Notified at Launch</button>
        </div>
        @if (subscribed) {
          <p class="notification-success">Thank you. You will be notified as soon as this feature goes live.</p>
        }
      </div>
    </main>
    <app-footer></app-footer>
  `,
  styles: [`
    .placeholder-main {
      min-height: 60vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 6rem 1rem;
      background: radial-gradient(circle at 50% 20%, rgba(220, 229, 218, 0.4) 0%, transparent 60%);
    }
    .text-center {
      text-align: center;
      max-width: 640px;
      margin: 0 auto;
    }
    .placeholder-title {
      font-family: var(--font-serif);
      font-size: 2.75rem;
      color: var(--color-forest-dark);
      margin: 1.25rem 0 1rem 0;
      line-height: 1.2;
    }
    .placeholder-desc {
      font-size: 1.1rem;
      color: var(--color-charcoal-muted);
      margin-bottom: 2.25rem;
      line-height: 1.6;
    }
    .action-row {
      display: flex;
      justify-content: center;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .notification-success {
      margin-top: 1.5rem;
      font-size: 0.95rem;
      color: var(--color-forest);
      font-weight: 600;
    }
  `]
})
export class PlaceholderComponent implements OnInit {
  pageTitle = 'Page Under Culinary Preparation';
  pageBadge = 'Coming Soon';
  pageDesc = 'This section is currently being crafted to deliver an extraordinary dining experience. In the meantime, explore our curated selection on the home page.';
  subscribed = false;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    const path = this.route.snapshot.routeConfig?.path;
    if (path === 'explore') {
      this.pageTitle = 'Explore All Restaurants';
      this.pageBadge = 'Interactive Discovery';
      this.pageDesc = 'Our complete restaurant directory with multi-city GPS filtering, real-time table grid, and sommelier pairing recommendations is arriving shortly.';
    } else if (path === 'bookings') {
      this.pageTitle = 'My Dining Reservations';
      this.pageBadge = 'Guest Sanctuary';
      this.pageDesc = 'Manage your upcoming table reservations, modify seating party sizes, and review your past culinary memoirs in one seamless dashboard.';
    } else if (path === 'about') {
      this.pageTitle = 'The Dinevia Philosophy';
      this.pageBadge = 'Our Heritage';
      this.pageDesc = 'Born from a devotion to hospitality, Dinevia bridges discerning epicures with world-class kitchens that treat dining as high art.';
    } else if (path === 'login') {
      this.pageTitle = 'Member Access';
      this.pageBadge = 'Exclusive Privileges';
      this.pageDesc = 'Sign in to access priority reservations, private chef rooms, and personalized dining preferences.';
    }
  }

  notifyMe(): void {
    this.subscribed = true;
  }
}
