import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

export type EmptyStateIcon = 
  | 'search' 
  | 'bookmark' 
  | 'calendar' 
  | 'table' 
  | 'clock' 
  | 'building' 
  | 'receipt' 
  | 'default';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.scss'
})
export class EmptyStateComponent {
  @Input() title: string = 'No results found';
  @Input() description?: string;
  @Input() icon: EmptyStateIcon = 'default';
  @Input() actionLabel?: string;
  @Input() actionRoute?: string | any[];
  @Input() containerClass: string = '';

  @Output() actionClick = new EventEmitter<void>();

  onAction(): void {
    this.actionClick.emit();
  }
}
