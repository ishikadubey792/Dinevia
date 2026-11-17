import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loading-spinner.component.html',
  styleUrl: './loading-spinner.component.scss'
})
export class LoadingSpinnerComponent {
  @Input() message: string = 'Loading culinary experiences...';
  @Input() subtitle?: string;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() inline: boolean = false;
  @Input() containerClass: string = '';
}
