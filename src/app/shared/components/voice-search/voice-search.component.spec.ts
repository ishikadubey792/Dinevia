import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { signal } from '@angular/core';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VoiceSearchComponent } from './voice-search.component';
import { VoiceRecognitionService } from '../../../core/services/voice-recognition.service';
import {
  VoiceLanguage,
  VoiceRecognitionError,
  normalizeVoiceTranscript
} from '../../../core/models/voice-search.model';

class MockVoiceRecognitionService {
  readonly isSupported = signal<boolean>(true);
  readonly isListening = signal<boolean>(false);
  readonly interimTranscript = signal<string>('');
  readonly currentLanguage = signal<VoiceLanguage>('en-IN');
  readonly errorCode = signal<VoiceRecognitionError | null>(null);

  readonly finalTranscriptSubject = new Subject<string>();
  readonly finalTranscript$ = this.finalTranscriptSubject.asObservable();
  readonly transcript$ = this.finalTranscript$;

  readonly start = vi.fn();
  readonly stop = vi.fn();
  readonly abort = vi.fn();
  readonly setLanguage = vi.fn((lang: VoiceLanguage) => {
    this.currentLanguage.set(lang);
  });
  readonly clearError = vi.fn(() => {
    this.errorCode.set(null);
  });
}

describe('VoiceSearchComponent', () => {
  let component: VoiceSearchComponent;
  let fixture: ComponentFixture<VoiceSearchComponent>;
  let mockVoiceService: MockVoiceRecognitionService;

  beforeEach(async () => {
    mockVoiceService = new MockVoiceRecognitionService();

    await TestBed.configureTestingModule({
      imports: [VoiceSearchComponent],
      providers: [
        { provide: VoiceRecognitionService, useValue: mockVoiceService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(VoiceSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  // ── 1. Idle UI & Accessibility ──

  describe('Idle State & Accessibility', () => {
    it('should create the component and render idle microphone button', () => {
      expect(component).toBeTruthy();
      const micBtn = fixture.nativeElement.querySelector('.mic-btn');
      expect(micBtn).toBeTruthy();
      expect(micBtn.getAttribute('aria-pressed')).toBe('false');
      expect(micBtn.getAttribute('aria-label')).toBe('Start voice search');
      expect(micBtn.getAttribute('type')).toBe('button');
      expect(micBtn.classList.contains('listening')).toBe(false);
    });

    it('should render default language pill as English (EN)', () => {
      const langPill = fixture.nativeElement.querySelector('.lang-pill');
      expect(langPill).toBeTruthy();
      expect(langPill.textContent).toContain('EN');
      expect(langPill.getAttribute('aria-expanded')).toBe('false');
    });

    it('should hide listening popover and error popover in idle state', () => {
      expect(fixture.nativeElement.querySelector('.listening-popover')).toBeNull();
      expect(fixture.nativeElement.querySelector('.error-popover')).toBeNull();
    });
  });

  // ── 2. Start & Stop Recognition ──

  describe('Start & Stop Interaction', () => {
    it('should call voiceService.start() when mic button is clicked while idle', () => {
      const micBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.mic-btn');
      micBtn.click();

      expect(mockVoiceService.clearError).toHaveBeenCalledTimes(1);
      expect(mockVoiceService.start).toHaveBeenCalledTimes(1);
    });

    it('should call voiceService.stop() when mic button is clicked while listening', () => {
      mockVoiceService.isListening.set(true);
      fixture.detectChanges();

      const micBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.mic-btn');
      expect(micBtn.getAttribute('aria-pressed')).toBe('true');
      expect(micBtn.getAttribute('aria-label')).toBe('Stop voice listening');

      micBtn.click();
      expect(mockVoiceService.stop).toHaveBeenCalledTimes(1);
    });

    it('should call voiceService.stop() when Done button in listening popover is clicked', () => {
      mockVoiceService.isListening.set(true);
      fixture.detectChanges();

      const doneBtn: HTMLButtonElement | null = fixture.nativeElement.querySelector('.btn-stop');
      expect(doneBtn).toBeTruthy();

      doneBtn?.click();
      expect(mockVoiceService.stop).toHaveBeenCalledTimes(1);
    });
  });

  // ── 3. Cancel Recognition ──

  describe('Cancel Action', () => {
    it('should call voiceService.abort() when Cancel button in listening popover is clicked', () => {
      mockVoiceService.isListening.set(true);
      mockVoiceService.interimTranscript.set('Incomplete speech...');
      fixture.detectChanges();

      const cancelBtn: HTMLButtonElement | null = fixture.nativeElement.querySelector('.btn-cancel');
      expect(cancelBtn).toBeTruthy();

      cancelBtn?.click();
      expect(mockVoiceService.abort).toHaveBeenCalledTimes(1);
    });

    it('should abort and close listening when Escape key is pressed', () => {
      mockVoiceService.isListening.set(true);
      fixture.detectChanges();

      component.onEscapeKey();
      expect(mockVoiceService.abort).toHaveBeenCalledTimes(1);
    });
  });

  // ── 4. Language Selection ──

  describe('Language Selector', () => {
    it('should toggle language dropdown on pill button click', () => {
      const pill: HTMLButtonElement = fixture.nativeElement.querySelector('.lang-pill');
      expect(component.isLangMenuOpen()).toBe(false);

      pill.click();
      fixture.detectChanges();
      expect(component.isLangMenuOpen()).toBe(true);
      expect(fixture.nativeElement.querySelector('.lang-dropdown')).toBeTruthy();

      pill.click();
      fixture.detectChanges();
      expect(component.isLangMenuOpen()).toBe(false);
    });

    it('should call voiceService.setLanguage() when selecting Hindi or Tamil', () => {
      component.isLangMenuOpen.set(true);
      fixture.detectChanges();

      const options: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.lang-option'));
      expect(options.length).toBe(3);

      // Click Hindi (hi-IN)
      options[1].click();
      expect(mockVoiceService.setLanguage).toHaveBeenCalledWith('hi-IN');
      expect(component.isLangMenuOpen()).toBe(false);

      // Open and click Tamil (ta-IN)
      component.isLangMenuOpen.set(true);
      fixture.detectChanges();
      const updatedOptions: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.lang-option'));
      updatedOptions[2].click();
      expect(mockVoiceService.setLanguage).toHaveBeenCalledWith('ta-IN');
    });

    it('should close language menu on Escape key press or document click outside', () => {
      component.isLangMenuOpen.set(true);
      fixture.detectChanges();

      component.onEscapeKey();
      expect(component.isLangMenuOpen()).toBe(false);

      // Outside click
      component.isLangMenuOpen.set(true);
      fixture.detectChanges();
      document.body.click();
      expect(component.isLangMenuOpen()).toBe(false);
    });

    it('should hide language selector when showLanguageSelector input is false', () => {
      fixture.componentRef.setInput('showLanguageSelector', false);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.lang-selector-wrapper')).toBeNull();
    });
  });

  // ── 5. Listening UI & Interim Transcript ──

  describe('Listening UI & Interim Feedback', () => {
    it('should render pulse rings and soundwave animation while listening', () => {
      mockVoiceService.isListening.set(true);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.pulse-ring')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.listening-wave-anim')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.mic-btn.listening')).toBeTruthy();
    });

    it('should display interim speech text in the transcript box without emitting transcriptChange', () => {
      const transcriptSpy = vi.fn();
      component.transcriptChange.subscribe(transcriptSpy);

      mockVoiceService.isListening.set(true);
      mockVoiceService.interimTranscript.set('Tandoori Chicken');
      fixture.detectChanges();

      const interimText = fixture.nativeElement.querySelector('.transcript-interim');
      expect(interimText).toBeTruthy();
      expect(interimText.textContent).toContain('Tandoori Chicken');
      expect(transcriptSpy).not.toHaveBeenCalled();
    });
  });

  // ── 6. Final Transcript Emission ──

  describe('Final Transcript Emission', () => {
    it('should emit transcriptChange when voiceService emits a non-empty final transcript', () => {
      const transcriptSpy = vi.fn();
      component.transcriptChange.subscribe(transcriptSpy);

      mockVoiceService.finalTranscriptSubject.next('Chettinad Fish Curry');
      expect(transcriptSpy).toHaveBeenCalledWith('Chettinad Fish Curry');
    });

    it('should NOT emit transcriptChange when transcript is empty or whitespace only', () => {
      const transcriptSpy = vi.fn();
      component.transcriptChange.subscribe(transcriptSpy);

      mockVoiceService.finalTranscriptSubject.next('');
      mockVoiceService.finalTranscriptSubject.next('   ');
      expect(transcriptSpy).not.toHaveBeenCalled();
    });
  });

  // ── 7. Error Handling ──

  describe('Error Messages & Recovery', () => {
    const errorScenarios: Array<{ code: VoiceRecognitionError; expectedText: string }> = [
      {
        code: 'not-supported',
        expectedText: 'Voice search is not supported in this browser. Please use Chrome, Edge, or Safari.'
      },
      {
        code: 'not-allowed',
        expectedText: 'Microphone access was blocked. Please enable microphone permissions in your browser settings'
      },
      {
        code: 'service-not-allowed',
        expectedText: 'Speech recognition service is restricted or unavailable on this device.'
      },
      {
        code: 'no-speech',
        expectedText: 'No speech was detected. Tap the microphone and try speaking again.'
      },
      {
        code: 'audio-capture',
        expectedText: 'No microphone was detected. Please check your audio input hardware.'
      },
      {
        code: 'network',
        expectedText: 'Network issue encountered while recognizing speech.'
      },
      {
        code: 'unknown',
        expectedText: 'Voice recognition was interrupted. Please try again or type your search.'
      }
    ];

    errorScenarios.forEach(({ code, expectedText }) => {
      it(`should display customer-friendly message for error code '${code}'`, () => {
        mockVoiceService.isListening.set(false);
        mockVoiceService.errorCode.set(code);
        fixture.detectChanges();

        const errorPanel = fixture.nativeElement.querySelector('.error-popover');
        expect(errorPanel).toBeTruthy();
        expect(errorPanel.textContent).toContain(expectedText);
        // Ensure raw technical error codes are not displayed
        expect(errorPanel.textContent).not.toContain(`'${code}'`);
      });
    });

    it('should allow retry on retryable errors (no-speech)', () => {
      mockVoiceService.errorCode.set('no-speech');
      fixture.detectChanges();

      const retryBtn: HTMLButtonElement | null = fixture.nativeElement.querySelector('.btn-retry');
      expect(retryBtn).toBeTruthy();

      retryBtn?.click();
      expect(mockVoiceService.clearError).toHaveBeenCalledTimes(1);
      expect(mockVoiceService.start).toHaveBeenCalledTimes(1);
    });

    it('should dismiss error on close button click or onDismissError()', () => {
      mockVoiceService.errorCode.set('network');
      fixture.detectChanges();

      const closeBtn: HTMLButtonElement | null = fixture.nativeElement.querySelector('.error-close-btn');
      closeBtn?.click();

      expect(mockVoiceService.clearError).toHaveBeenCalledTimes(1);
    });
  });

  // ── 8. Disabled State ──

  describe('Disabled State', () => {
    it('should disable mic button and lang pill when disabled input is true', () => {
      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();

      const micBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.mic-btn');
      const langPill: HTMLButtonElement = fixture.nativeElement.querySelector('.lang-pill');

      expect(micBtn.disabled).toBe(true);
      expect(langPill.disabled).toBe(true);

      micBtn.click();
      expect(mockVoiceService.start).not.toHaveBeenCalled();
    });

    it('should disable mic button and lang pill when isSupported() is false', () => {
      mockVoiceService.isSupported.set(false);
      fixture.detectChanges();

      const micBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.mic-btn');
      const langPill: HTMLButtonElement = fixture.nativeElement.querySelector('.lang-pill');

      expect(micBtn.disabled).toBe(true);
      expect(langPill.disabled).toBe(true);

      micBtn.click();
      expect(mockVoiceService.start).not.toHaveBeenCalled();
    });
  });

  // ── 9. Subscription Cleanup ──

  describe('Lifecycle Cleanup', () => {
    it('should unsubscribe from finalTranscript$ on component destruction', () => {
      const transcriptSpy = vi.fn();
      component.transcriptChange.subscribe(transcriptSpy);

      fixture.destroy();

      // Emit after destruction
      mockVoiceService.finalTranscriptSubject.next('After Destroy');
      expect(transcriptSpy).not.toHaveBeenCalled();
    });
  });

  // ── 10. Phase 2.1 Lifecycle & Guarding ──

  describe('Phase 2.1 Lifecycle & Language Guarding', () => {
    it('should call voiceService.abort() when the component is destroyed', () => {
      mockVoiceService.isListening.set(true);
      fixture.detectChanges();

      fixture.destroy();

      expect(mockVoiceService.abort).toHaveBeenCalled();
    });

    it('should call voiceService.abort() and close dropdown when disabled changes from false to true during recognition', () => {
      mockVoiceService.isListening.set(true);
      component.isLangMenuOpen.set(true);
      fixture.detectChanges();

      mockVoiceService.abort.mockClear();

      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();

      expect(mockVoiceService.abort).toHaveBeenCalledTimes(1);
      expect(component.isLangMenuOpen()).toBe(false);
    });

    it('should disable the language selector pill button while listening', () => {
      mockVoiceService.isListening.set(true);
      fixture.detectChanges();

      const langPill: HTMLButtonElement = fixture.nativeElement.querySelector('.lang-pill');
      expect(langPill.disabled).toBe(true);

      // Attempting to toggle dropdown while listening should do nothing
      langPill.click();
      fixture.detectChanges();
      expect(component.isLangMenuOpen()).toBe(false);
    });

    it('should not call voiceService.setLanguage() when onSelectLanguage is invoked while listening', () => {
      mockVoiceService.isListening.set(true);
      fixture.detectChanges();

      component.onSelectLanguage('hi-IN');

      expect(mockVoiceService.setLanguage).not.toHaveBeenCalled();
    });

    it('should allow language selection to work normally when idle', () => {
      mockVoiceService.isListening.set(false);
      component.disabled = false;
      fixture.detectChanges();

      component.onSelectLanguage('ta-IN');

      expect(mockVoiceService.setLanguage).toHaveBeenCalledWith('ta-IN');
      expect(component.isLangMenuOpen()).toBe(false);
    });

    it('should safely destroy an idle component without throwing errors', () => {
      mockVoiceService.isListening.set(false);
      fixture.detectChanges();

      expect(() => fixture.destroy()).not.toThrow();
      expect(mockVoiceService.abort).toHaveBeenCalled();
    });
  });

  // ── 11. Phase 4: Transcript Normalization ──

  describe('Phase 4: Transcript Normalization', () => {
    it('should normalize "Shree Mithai." to "Shree Mithai"', () => {
      expect(normalizeVoiceTranscript('Shree Mithai.')).toBe('Shree Mithai');

      const spy = vi.fn();
      component.transcriptChange.subscribe(spy);
      mockVoiceService.finalTranscriptSubject.next('Shree Mithai.');
      expect(spy).toHaveBeenCalledWith('Shree Mithai');
    });

    it('should normalize "South Indian!" to "South Indian"', () => {
      expect(normalizeVoiceTranscript('South Indian!')).toBe('South Indian');

      const spy = vi.fn();
      component.transcriptChange.subscribe(spy);
      mockVoiceService.finalTranscriptSubject.next('South Indian!');
      expect(spy).toHaveBeenCalledWith('South Indian');
    });

    it('should normalize "North Indian?" to "North Indian"', () => {
      expect(normalizeVoiceTranscript('North Indian?')).toBe('North Indian');

      const spy = vi.fn();
      component.transcriptChange.subscribe(spy);
      mockVoiceService.finalTranscriptSubject.next('North Indian?');
      expect(spy).toHaveBeenCalledWith('North Indian');
    });

    it('should handle leading and trailing spaces around transcripts with punctuation', () => {
      expect(normalizeVoiceTranscript('   Shree Mithai.   ')).toBe('Shree Mithai');
      expect(normalizeVoiceTranscript('   Veg Restaurant...  ')).toBe('Veg Restaurant');

      const spy = vi.fn();
      component.transcriptChange.subscribe(spy);
      mockVoiceService.finalTranscriptSubject.next('   Shree Mithai.   ');
      expect(spy).toHaveBeenCalledWith('Shree Mithai');
    });

    it('should preserve meaningful internal punctuation', () => {
      expect(normalizeVoiceTranscript("Chef's Counter")).toBe("Chef's Counter");
      expect(normalizeVoiceTranscript('A-Z Dining.')).toBe('A-Z Dining');
      expect(normalizeVoiceTranscript('Café & Bistro, Paris.')).toBe('Café & Bistro, Paris');

      const spy = vi.fn();
      component.transcriptChange.subscribe(spy);
      mockVoiceService.finalTranscriptSubject.next("Chef's Counter.");
      expect(spy).toHaveBeenCalledWith("Chef's Counter");
    });

    it('should preserve Hindi transcript and remove trailing Devanagari punctuation', () => {
      expect(normalizeVoiceTranscript('बिरयानी।')).toBe('बिरयानी');
      expect(normalizeVoiceTranscript('शाकाहारी भोजन.')).toBe('शाकाहारी भोजन');

      const spy = vi.fn();
      component.transcriptChange.subscribe(spy);
      mockVoiceService.finalTranscriptSubject.next('बिरयानी।');
      expect(spy).toHaveBeenCalledWith('बिरयानी');
    });

    it('should preserve Tamil transcript and remove trailing punctuation', () => {
      expect(normalizeVoiceTranscript('பிரியாணி.')).toBe('பிரியாணி');
      expect(normalizeVoiceTranscript('தென்னிந்திய உணவகம்!')).toBe('தென்னிந்திய உணவகம்');

      const spy = vi.fn();
      component.transcriptChange.subscribe(spy);
      mockVoiceService.finalTranscriptSubject.next('பிரியாணி.');
      expect(spy).toHaveBeenCalledWith('பிரியாணி');
    });

    it('should not emit transcriptChange or trigger search when transcript is empty or only punctuation', () => {
      const spy = vi.fn();
      component.transcriptChange.subscribe(spy);

      mockVoiceService.finalTranscriptSubject.next('');
      mockVoiceService.finalTranscriptSubject.next('   ');
      mockVoiceService.finalTranscriptSubject.next('...');
      mockVoiceService.finalTranscriptSubject.next('!?.;:');

      expect(spy).not.toHaveBeenCalled();
    });
  });
});
