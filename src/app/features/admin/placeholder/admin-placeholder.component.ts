import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

interface ModuleStat {
  label: string;
  value: string;
}

interface ModuleConfig {
  title: string;
  kicker: string;
  badge: string;
  description: string;
  icon: string;
  stats: ModuleStat[];
  upcomingFeatures: string[];
}

@Component({
  selector: 'app-admin-placeholder',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-placeholder.component.html',
  styleUrl: './admin-placeholder.component.scss'
})
export class AdminPlaceholderComponent {
  private readonly route = inject(ActivatedRoute);

  readonly config: ModuleConfig = {
    title: this.route.snapshot.data['title'] || 'Admin Management Module',
    kicker: this.route.snapshot.data['kicker'] || 'DINEVIA PLATFORM',
    badge: this.route.snapshot.data['badge'] || 'Module In Active Development',
    description: this.route.snapshot.data['description'] ||
      'This specialized management console is currently undergoing culinary calibration to deliver precision control.',
    icon: this.route.snapshot.data['icon'] || 'tool',
    stats: this.route.snapshot.data['stats'] || [
      { label: 'Platform Status', value: 'Pre-Production' },
      { label: 'Security Level', value: 'Executive' },
      { label: 'Integration', value: 'Live Connected' }
    ],
    upcomingFeatures: this.route.snapshot.data['upcomingFeatures'] || [
      'Multi-sanctuary batch operations',
      'Exportable CSV and PDF analytics',
      'Automated guest notification triggers',
      'Role-based permissions & audit log'
    ]
  };
}

