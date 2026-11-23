import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  ElementRef,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { VoiceRecognitionService } from '../../../core/services/voice-recognition.service';
import {
  VoiceLanguage,
  SUPPORTED_VOICE_LANGUAGES,
  VoiceLanguageOption,
  normalizeVoiceTranscript
} from '../../../core/models/voice-search.model';

@Component({
  selector: 'app-voice-search',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './voice-search.component.html',
  styleUrl: './voice-search.component.scss'
})
export class VoiceSearchComponent implements OnInit, OnDestroy {
  private readonly voiceService = inject(VoiceRecognitionService);
  private readonly elementRef = inject(ElementRef);

  // ── Inputs & Outputs ──
  private _disabled = false;

  @Input()
  get disabled(): boolean {
    return this._disabled;
  }
  set disabled(value: boolean) {
    const shouldAbort = Boolean(value) && !this._disabled;
    this._disabled = Boolean(value);
    if (shouldAbort) {
      this.voiceService.abort();
      this.isLangMenuOpen.set(false);
    }
  }

  @Input() showLanguageSelector: boolean = true;
  @Output() transcriptChange = new EventEmitter<string>();

  // ── Service State Signals ──
  readonly isSupported = this.voiceService.isSupported;
  readonly isListening = this.voiceService.isListening;
  readonly interimTranscript = this.voiceService.interimTranscript;
  readonly currentLanguage = this.voiceService.currentLanguage;
  readonly errorCode = this.voiceService.errorCode;

  // ── Local Component Signals ──
  readonly isLangMenuOpen = signal<boolean>(false);
  readonly languages: readonly VoiceLanguageOption[] = SUPPORTED_VOICE_LANGUAGES;

  // ── Computed Descriptors ──
  readonly currentLangOption = computed<VoiceLanguageOption>(() => {
    const code = this.currentLanguage();
    const match = this.languages.find(l => l.code === code);
    return match || this.languages[0];
  });

  readonly currentLangLabel = computed(() => this.currentLangOption().label);
  readonly currentLangNativeLabel = computed(() => this.currentLangOption().nativeLabel);

  readonly currentLangShortCode = computed(() => {
    const code = this.currentLanguage();
    switch (code) {
      case 'hi-IN':
        return 'हिन्दी';
      case 'ta-IN':
        return 'தமிழ்';
      case 'en-IN':
      default:
        return 'EN';
    }
  });

  readonly canRetry = computed(() => {
    const code = this.errorCode();
    return code === 'no-speech' || code === 'network' || code === 'unknown';
  });

  readonly errorMessage = computed<string | null>(() => {
    const code = this.errorCode();
    if (!code || code === 'aborted') {
      return null;
    }

    switch (code) {
      case 'not-supported':
        return 'Voice search is not supported in this browser. Please use Chrome, Edge, or Safari.';
      case 'not-allowed':
        return 'Microphone access was blocked. Please enable microphone permissions in your browser settings to search by voice.';
      case 'service-not-allowed':
        return 'Speech recognition service is restricted or unavailable on this device.';
      case 'no-speech':
        return 'No speech was detected. Tap the microphone and try speaking again.';
      case 'audio-capture':
        return 'No microphone was detected. Please check your audio input hardware.';
      case 'network':
        return 'Network issue encountered while recognizing speech. Please check your internet or type your search.';
      case 'unknown':
      default:
        return 'Voice recognition was interrupted. Please try again or type your search.';
    }
  });

  // ── Subscriptions ──
  private transcriptSubscription?: Subscription;

  ngOnInit(): void {
    this.transcriptSubscription = this.voiceService.finalTranscript$.subscribe(transcript => {
      const clean = normalizeVoiceTranscript(transcript);
      if (clean) {
        this.transcriptChange.emit(clean);
      }
    });
  }

  // ── Actions ──
  onMicClick(): void {
    if (this.disabled || !this.isSupported()) {
      return;
    }

    this.isLangMenuOpen.set(false);

    if (this.isListening()) {
      this.voiceService.stop();
    } else {
      this.voiceService.clearError();
      this.voiceService.start();
    }
  }

  onStop(): void {
    this.voiceService.stop();
  }

  onCancel(): void {
    this.voiceService.abort();
  }

  onRetry(): void {
    this.voiceService.clearError();
    this.voiceService.start();
  }

  onDismissError(): void {
    this.voiceService.clearError();
  }

  toggleLangMenu(): void {
    if (this.disabled || !this.isSupported() || this.isListening()) {
      return;
    }
    this.isLangMenuOpen.update(v => !v);
  }

  onSelectLanguage(lang: VoiceLanguage): void {
    if (this.disabled || this.isListening()) {
      return;
    }
    this.voiceService.setLanguage(lang);
    this.isLangMenuOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    if (this.isLangMenuOpen() && !this.elementRef.nativeElement.contains(target)) {
      this.isLangMenuOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.isLangMenuOpen()) {
      this.isLangMenuOpen.set(false);
    } else if (this.isListening()) {
      this.onCancel();
    } else if (this.errorCode()) {
      this.onDismissError();
    }
  }

  ngOnDestroy(): void {
    this.voiceService.abort();
    this.transcriptSubscription?.unsubscribe();
  }
}
