import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './status-badge.component.html',
  styleUrl: './status-badge.component.scss'
})
export class StatusBadgeComponent {
  @Input({ required: true }) status!: string;
  @Input() size: 'sm' | 'md' = 'md';
  @Input() showDot: boolean = true;
  @Input() customLabel?: string;

  get normalizedStatus(): string {
    return (this.status || '').trim().toLowerCase();
  }

  get badgeClass(): string {
    const s = this.normalizedStatus;
    if (s === 'confirmed') return 'badge-confirmed';
    if (s === 'pending') return 'badge-pending';
    if (s === 'completed') return 'badge-completed';
    if (s === 'cancelled' || s === 'canceled') return 'badge-cancelled';
    if (s === 'success' || s === 'successful') return 'badge-success';
    if (s === 'failed') return 'badge-failed';
    if (s === 'available' || s === 'open') return 'badge-available';
    if (s === 'occupied' || s === 'closed') return 'badge-occupied';
    return `badge-${s}`;
  }

  get displayLabel(): string {
    if (this.customLabel) return this.customLabel;
    const s = this.normalizedStatus;
    if (!s) return 'Unknown';
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
}
