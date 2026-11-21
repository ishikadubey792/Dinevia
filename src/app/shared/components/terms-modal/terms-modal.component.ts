import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  ViewChild,
  OnChanges,
  SimpleChanges,
  OnDestroy,
  HostListener,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LegalDocument } from '../../../core/models/legal-document.model';

@Component({
  selector: 'app-terms-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './terms-modal.component.html',
  styleUrl: './terms-modal.component.scss'
})
export class TermsModalComponent implements OnChanges, OnDestroy {
  @Input() isOpen = false;
  @Input() document: LegalDocument | null = null;
  @Output() close = new EventEmitter<void>();

  @ViewChild('closeBtn') closeBtnRef?: ElementRef<HTMLButtonElement>;
  @ViewChild('modalDialog') modalDialogRef?: ElementRef<HTMLElement>;

  private readonly elementRef = inject(ElementRef);
  private previousActiveElement: HTMLElement | null = null;
  private previousBodyOverflow: string | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']) {
      if (this.isOpen) {
        this.handleOpen();
      } else {
        this.handleClose();
      }
    }
  }

  ngOnDestroy(): void {
    this.restoreBodyOverflow();
  }

  onClose(): void {
    this.close.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event?: Event): void {
    if (this.isOpen) {
      event?.preventDefault();
      this.onClose();
    }
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeyDown(event: KeyboardEvent): void {
    if (!this.isOpen || event.key !== 'Tab') return;
    this.trapFocus(event);
  }

  private handleOpen(): void {
    if (typeof document !== 'undefined') {
      this.previousActiveElement = document.activeElement as HTMLElement | null;
      if (this.previousBodyOverflow === null) {
        this.previousBodyOverflow = document.body.style.overflow;
      }
      document.body.style.overflow = 'hidden';
    }

    setTimeout(() => {
      this.closeBtnRef?.nativeElement?.focus();
    }, 50);
  }

  private handleClose(): void {
    this.restoreBodyOverflow();
    if (this.previousActiveElement && typeof this.previousActiveElement.focus === 'function') {
      setTimeout(() => {
        this.previousActiveElement?.focus();
        this.previousActiveElement = null;
      }, 0);
    }
  }

  private restoreBodyOverflow(): void {
    if (typeof document !== 'undefined' && this.previousBodyOverflow !== null) {
      document.body.style.overflow = this.previousBodyOverflow;
      this.previousBodyOverflow = null;
    }
  }

  private trapFocus(event: KeyboardEvent): void {
    const dialogEl = this.modalDialogRef?.nativeElement ||
      this.elementRef.nativeElement.querySelector('.terms-modal-dialog') as HTMLElement | null;
    if (!dialogEl) return;

    const focusableSelectors = 'button:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusableElements = Array.from(dialogEl.querySelectorAll<HTMLElement>(focusableSelectors))
      .filter(el => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true' && el.style.display !== 'none');

    if (focusableElements.length === 0) {
      event.preventDefault();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey) {
      if (document.activeElement === firstElement || !dialogEl.contains(document.activeElement)) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement || !dialogEl.contains(document.activeElement)) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }
}
