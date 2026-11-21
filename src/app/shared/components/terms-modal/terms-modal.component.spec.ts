import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SimpleChange } from '@angular/core';
import { TermsModalComponent } from './terms-modal.component';
import { LegalDocument } from '../../../core/models/legal-document.model';

describe('TermsModalComponent', () => {
  let component: TermsModalComponent;
  let fixture: ComponentFixture<TermsModalComponent>;

  const mockLegalDocument: LegalDocument = {
    id: 1,
    title: 'Dinevia Terms and Conditions',
    content: '<h2>Membership Charter</h2><p>Dinevia reservation terms and guidelines.</p>',
    version: '1.0',
    effectiveDate: '2026-11-21'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TermsModalComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TermsModalComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    // Ensure document.body overflow is restored
    document.body.style.overflow = '';
  });

  it('should create the component', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should not render modal DOM when isOpen is false', () => {
    component.isOpen = false;
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('.terms-modal-dialog');
    const backdrop = fixture.nativeElement.querySelector('.terms-modal-backdrop');
    expect(dialog).toBeNull();
    expect(backdrop).toBeNull();
  });

  it('should render modal dialog, title, version, effective date, and HTML content when isOpen is true', () => {
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('document', mockLegalDocument);
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('.terms-modal-dialog');
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('termsModalTitle');

    const titleEl = fixture.nativeElement.querySelector('#termsModalTitle');
    expect(titleEl.textContent.trim()).toBe('Dinevia Terms and Conditions');

    const badgeEl = fixture.nativeElement.querySelector('.terms-meta-badge');
    expect(badgeEl.textContent).toContain('Version 1.0');

    const dateEl = fixture.nativeElement.querySelector('.terms-meta-date');
    expect(dateEl.textContent).toContain('Effective: 2026-11-21');

    const htmlContent = fixture.nativeElement.querySelector('.terms-html-content');
    expect(htmlContent).toBeTruthy();
    expect(htmlContent.innerHTML).toContain('<h2>Membership Charter</h2>');
    expect(htmlContent.innerHTML).toContain('Dinevia reservation terms and guidelines.');
  });

  it('should emit close event when close icon button is clicked', () => {
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('document', mockLegalDocument);
    fixture.detectChanges();

    const closeSpy = vi.spyOn(component.close, 'emit');
    const closeBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.terms-close-btn');
    expect(closeBtn).toBeTruthy();

    closeBtn.click();
    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it('should emit close event when footer acknowledge button is clicked', () => {
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('document', mockLegalDocument);
    fixture.detectChanges();

    const closeSpy = vi.spyOn(component.close, 'emit');
    const ackBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.terms-acknowledge-btn');
    expect(ackBtn).toBeTruthy();

    ackBtn.click();
    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it('should emit close event when backdrop is clicked', () => {
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('document', mockLegalDocument);
    fixture.detectChanges();

    const closeSpy = vi.spyOn(component.close, 'emit');
    const backdrop: HTMLElement = fixture.nativeElement.querySelector('.terms-modal-backdrop');
    expect(backdrop).toBeTruthy();

    backdrop.click();
    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it('should emit close event when Escape key is pressed while open', () => {
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('document', mockLegalDocument);
    fixture.detectChanges();

    const closeSpy = vi.spyOn(component.close, 'emit');
    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
    document.dispatchEvent(escapeEvent);

    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it('should not emit close event on Escape key when modal is not open', () => {
    fixture.componentRef.setInput('isOpen', false);
    fixture.detectChanges();

    const closeSpy = vi.spyOn(component.close, 'emit');
    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
    document.dispatchEvent(escapeEvent);

    expect(closeSpy).not.toHaveBeenCalled();
  });

  it('should handle null or missing document gracefully', () => {
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('document', null);
    fixture.detectChanges();

    const titleEl = fixture.nativeElement.querySelector('#termsModalTitle');
    expect(titleEl.textContent.trim()).toBe('Terms and Conditions');

    const emptyState = fixture.nativeElement.querySelector('.terms-empty-state');
    expect(emptyState).toBeTruthy();
    expect(emptyState.textContent).toContain('No document content is currently available.');
  });

  it('should lock body scroll when opened and restore previous overflow on close and on destroy', () => {
    document.body.style.overflow = 'auto';

    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();
    expect(document.body.style.overflow).toBe('hidden');

    fixture.componentRef.setInput('isOpen', false);
    fixture.detectChanges();
    expect(document.body.style.overflow).toBe('auto');

    // Test ngOnDestroy restoration
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();
    expect(document.body.style.overflow).toBe('hidden');

    component.ngOnDestroy();
    expect(document.body.style.overflow).toBe('auto');
  });

  it('should trap focus when Tab and Shift+Tab are pressed', () => {
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('document', mockLegalDocument);
    fixture.detectChanges();

    const closeBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.terms-close-btn');
    const footerBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.terms-acknowledge-btn');

    // When focus is on the close button (first focusable) and Shift+Tab is pressed, focus wraps to footer button
    closeBtn.focus();
    const shiftTabEvent = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, cancelable: true });
    const shiftTabSpy = vi.spyOn(shiftTabEvent, 'preventDefault');
    document.dispatchEvent(shiftTabEvent);

    expect(shiftTabSpy).toHaveBeenCalled();
    expect(document.activeElement).toBe(footerBtn);

    // When focus is on the footer button (last focusable) and Tab is pressed, focus wraps to close button
    footerBtn.focus();
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: false, cancelable: true });
    const tabSpy = vi.spyOn(tabEvent, 'preventDefault');
    document.dispatchEvent(tabEvent);

    expect(tabSpy).toHaveBeenCalled();
    expect(document.activeElement).toBe(closeBtn);
  });
});
