import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-error-alert',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './error-alert.component.html',
  styleUrl: './error-alert.component.scss'
})
export class ErrorAlertComponent {
  @Input() title: string = 'Connection Notice';
  @Input() message: string = 'Unable to reach servers. Please try again.';
  @Input() retryLabel: string = 'Retry Connection';
  @Input() showRetry: boolean = true;
  @Input() variant: 'card' | 'banner' | 'inline' = 'card';
  @Input() containerClass: string = '';

  @Output() retry = new EventEmitter<void>();

  onRetryClick(): void {
    this.retry.emit();
  }
}
