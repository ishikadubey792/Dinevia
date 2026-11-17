import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirm-modal.component.html',
  styleUrl: './confirm-modal.component.scss'
})
export class ConfirmModalComponent {
  @Input() isOpen: boolean = false;
  @Input() kicker: string = 'CONFIRM ACTION';
  @Input() title: string = 'Are you sure?';
  @Input() message?: string;
  @Input() subtext?: string;
  @Input() confirmLabel: string = 'Confirm';
  @Input() cancelLabel: string = 'Cancel';
  @Input() confirmVariant: 'danger' | 'primary' | 'terracotta' = 'danger';
  @Input() isProcessing: boolean = false;
  @Input() processingLabel: string = 'Processing...';
  @Input() errorMessage?: string | null;

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  onCancel(): void {
    if (!this.isProcessing) {
      this.cancel.emit();
    }
  }

  onConfirm(): void {
    if (!this.isProcessing) {
      this.confirm.emit();
    }
  }
}
