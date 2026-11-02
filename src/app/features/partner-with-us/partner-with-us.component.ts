import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';

interface PartnerBenefit {
  icon: string;
  title: string;
  description: string;
  badge: string;
}

interface OnboardingStep {
  step: string;
  title: string;
  description: string;
  timeline: string;
}

interface PartnerMetric {
  value: string;
  label: string;
  sub: string;
}

@Component({
  selector: 'app-partner-with-us',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './partner-with-us.component.html',
  styleUrl: './partner-with-us.component.scss'
})
export class PartnerWithUsComponent {
  readonly metrics: PartnerMetric[] = [
    {
      value: '94%',
      label: 'Average Table Occupancy',
      sub: 'Consistent prime seating fill rates'
    },
    {
      value: '$198',
      label: 'Average Spend / Cover',
      sub: 'High-caliber tasting menu selections'
    },
    {
      value: '< 1.2%',
      label: 'No-Show Rate',
      sub: 'Protected with credit card deposits'
    },
    {
      value: '3,890+',
      label: 'Curated Diners',
      sub: 'Verified gastronomy enthusiasts'
    }
  ];

  readonly benefits: PartnerBenefit[] = [
    {
      icon: 'visibility',
      title: 'Elevated Online Visibility',
      description: 'Present your dining sanctuary, chef vision, and seasonal tasting menus to an affluent global audience seeking destination dining.',
      badge: 'Discovery & Prestige'
    },
    {
      icon: 'reservation',
      title: 'Intelligent Reservation Management',
      description: 'Streamline party bookings, tasting menu deposits, dietary preferences, and automated reminders with zero friction.',
      badge: 'Protected Covers'
    },
    {
      icon: 'table',
      title: 'Precision Table & Floor Management',
      description: 'Manage salon floor plans, chef counter shifts, turnover pacing, and VIP priority locks directly from your Admin Console.',
      badge: 'Operational Harmony'
    },
    {
      icon: 'customers',
      title: 'Affluent Customer Reach',
      description: 'Connect directly with verified epicureans, private corporate event hosts, and repeat fine dining patrons with proven loyalty.',
      badge: 'Verified Patrons'
    }
  ];

  readonly onboardingSteps: OnboardingStep[] = [
    {
      step: '01',
      title: 'Register Your Sanctuary',
      description: 'Submit your establishment profile, cuisine philosophy, location, and culinary accolades through our streamlined onboarding application.',
      timeline: 'Takes ~5 minutes'
    },
    {
      step: '02',
      title: 'Configure Menus & Seating',
      description: 'Set up your dining salon layout, chef counter availability, tasting menu offerings, wine pairing flights, and service hours.',
      timeline: 'Guided by our team'
    },
    {
      step: '03',
      title: 'Culinary Curation Review',
      description: 'Dinevia\'s hospitality review board verifies your details to ensure alignment with our global fine dining and pacing standards.',
      timeline: 'Within 24-48 hours'
    },
    {
      step: '04',
      title: 'Go Live & Welcome Guests',
      description: 'Start receiving guaranteed reservations, manage service in real time, and welcome discerning diners to your tables.',
      timeline: 'Immediate booking access'
    }
  ];
}

