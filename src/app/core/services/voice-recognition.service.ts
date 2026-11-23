import {
  Injectable,
  InjectionToken,
  PLATFORM_ID,
  OnDestroy,
  inject,
  signal
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, Subject } from 'rxjs';
import {
  VoiceLanguage,
  VoiceRecognitionError,
  DEFAULT_VOICE_LANGUAGE,
  SpeechRecognitionConstructor,
  SpeechRecognitionLike,
  SpeechRecognitionEventLike,
  SpeechRecognitionErrorEventLike,
  WindowWithSpeechRecognition
} from '../models/voice-search.model';

/**
 * Injection token for resolving the browser's SpeechRecognition constructor.
 * Facilitates strict unit testing and graceful SSR execution without referencing global window.
 */
export const SPEECH_RECOGNITION = new InjectionToken<SpeechRecognitionConstructor | null>(
  'SPEECH_RECOGNITION',
  {
    providedIn: 'root',
    factory: () => {
      const platformId = inject(PLATFORM_ID);
      if (!isPlatformBrowser(platformId)) {
        return null;
      }
      if (typeof window === 'undefined') {
        return null;
      }
      const win = window as unknown as WindowWithSpeechRecognition;
      return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
    }
  }
);

/**
 * Core Voice Recognition Service
 *
 * Wraps the browser Web Speech API (SpeechRecognition / webkitSpeechRecognition)
 * with Angular Signals for reactive UI bindings and RxJS Observable for final transcript emission.
 *
 * Architecture highlights:
 * - Angular Signals for lightweight, reactive state tracking
 * - SSR safe: Guards all DOM / audio APIs behind isPlatformBrowser(PLATFORM_ID)
 * - Single-query recognition (continuous = false) with live interim feedback
 * - Strict session token guarding against stale async events after cancel or destruction
 * - Automatic cleanup of browser resources and event listeners
 */
@Injectable({
  providedIn: 'root'
})
export class VoiceRecognitionService implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly recognitionConstructor = inject(SPEECH_RECOGNITION, { optional: true });

  // ── Reactive State Signals ──
  private readonly isSupportedSignal = signal<boolean>(false);
  private readonly isListeningSignal = signal<boolean>(false);
  private readonly interimTranscriptSignal = signal<string>('');
  private readonly currentLanguageSignal = signal<VoiceLanguage>(DEFAULT_VOICE_LANGUAGE);
  private readonly errorCodeSignal = signal<VoiceRecognitionError | null>(null);

  // Readonly public signal accessors
  readonly isSupported = this.isSupportedSignal.asReadonly();
  readonly isListening = this.isListeningSignal.asReadonly();
  readonly interimTranscript = this.interimTranscriptSignal.asReadonly();
  readonly currentLanguage = this.currentLanguageSignal.asReadonly();
  readonly errorCode = this.errorCodeSignal.asReadonly();

  // ── Transcript Emission Pipeline ──
  private readonly finalTranscriptSubject = new Subject<string>();
  readonly finalTranscript$: Observable<string> = this.finalTranscriptSubject.asObservable();
  /** Alias for consumer convenience */
  readonly transcript$: Observable<string> = this.finalTranscript$;

  // ── Session & Lifecycle State ──
  private recognition: SpeechRecognitionLike | null = null;
  private activeSessionId = 0;
  private isStartPending = false;
  private isDestroyed = false;

  constructor() {
    this.initSupport();
  }

  /**
   * Initializes browser capability detection.
   */
  private initSupport(): void {
    if (!isPlatformBrowser(this.platformId) || !this.recognitionConstructor) {
      this.isSupportedSignal.set(false);
      return;
    }
    this.isSupportedSignal.set(true);
  }

  /**
   * Switches recognition language (en-IN, hi-IN, ta-IN).
   * If recognition is currently active, the language will apply to subsequent or active queries.
   */
  setLanguage(lang: VoiceLanguage): void {
    this.currentLanguageSignal.set(lang);
    if (this.recognition) {
      this.recognition.lang = lang;
    }
  }

  /**
   * Clears any active error code.
   */
  clearError(): void {
    this.errorCodeSignal.set(null);
  }

  /**
   * Begins voice listening session.
   * Protects against repeated calls, unsupported platforms, and destroyed states.
   */
  start(): void {
    if (!this.isSupportedSignal() || !this.recognitionConstructor) {
      this.errorCodeSignal.set('not-supported');
      return;
    }

    if (this.isListeningSignal() || this.isStartPending || this.isDestroyed) {
      return; // Repeated start protection
    }

    this.isStartPending = true;

    // Begin a new session generation to invalidate any stale pending callbacks
    const currentSession = ++this.activeSessionId;

    this.errorCodeSignal.set(null);
    this.interimTranscriptSignal.set('');

    try {
      // Create a fresh recognition instance per session to avoid browser state corruption
      const instance = new this.recognitionConstructor();
      instance.continuous = false;
      instance.interimResults = true;
      instance.maxAlternatives = 1;
      instance.lang = this.currentLanguageSignal();

      this.recognition = instance;
      this.attachSessionListeners(instance, currentSession);

      instance.start();
    } catch {
      this.activeSessionId++;
      this.isStartPending = false;
      this.isListeningSignal.set(false);
      this.interimTranscriptSignal.set('');
      if (this.recognition) {
        this.detachListeners(this.recognition);
        this.recognition = null;
      }
      this.errorCodeSignal.set('unknown');
    }
  }

  /**
   * Stops listening gracefully, allowing the recognition service to finish processing
   * speech captured so far and emit a final transcript.
   */
  stop(): void {
    if ((!this.isListeningSignal() && !this.isStartPending) || !this.recognition) {
      return;
    }

    try {
      this.recognition.stop();
    } catch {
      // Browser stop exceptions are swallowed safely
    }
  }

  /**
   * Immediately aborts listening without emitting any incomplete transcripts.
   */
  abort(): void {
    if (!this.isListeningSignal() && !this.isStartPending && !this.recognition) {
      return;
    }

    // Invalidate active session so trailing onresult / onerror events are discarded
    this.activeSessionId++;
    this.isStartPending = false;
    this.isListeningSignal.set(false);
    this.interimTranscriptSignal.set('');

    if (this.recognition) {
      const activeInstance = this.recognition;
      this.recognition = null;
      try {
        activeInstance.abort();
      } catch {
        // Browser abort exceptions are swallowed safely
      }
      this.detachListeners(activeInstance);
    }
  }

  /**
   * Maps native SpeechRecognitionErrorEvent codes to application-level VoiceRecognitionError.
   */
  private mapRecognitionError(error: string): VoiceRecognitionError {
    switch (error) {
      case 'not-allowed':
        return 'not-allowed';
      case 'service-not-allowed':
        return 'service-not-allowed';
      case 'no-speech':
        return 'no-speech';
      case 'audio-capture':
        return 'audio-capture';
      case 'network':
        return 'network';
      case 'aborted':
        return 'aborted';
      default:
        return 'unknown';
    }
  }

  /**
   * Attaches session-guarded event listeners to the active SpeechRecognition instance.
   */
  private attachSessionListeners(
    instance: SpeechRecognitionLike,
    sessionId: number
  ): void {
    instance.onstart = () => {
      if (this.isDestroyed || sessionId !== this.activeSessionId) {
        return;
      }
      this.isStartPending = false;
      this.isListeningSignal.set(true);
    };

    instance.onresult = (event: SpeechRecognitionEventLike) => {
      if (this.isDestroyed || sessionId !== this.activeSessionId) {
        return;
      }

      let interim = '';
      let finalTranscript = '';

      const length = event.results?.length ?? 0;
      for (let i = event.resultIndex; i < length; i++) {
        const result = event.results[i];
        if (!result || result.length === 0) continue;

        const text = result[0]?.transcript || '';
        if (result.isFinal) {
          finalTranscript += text;
        } else {
          interim += text;
        }
      }

      if (interim) {
        this.interimTranscriptSignal.set(interim.trim());
      }

      const cleanFinal = finalTranscript.trim();
      if (cleanFinal) {
        this.interimTranscriptSignal.set('');
        this.finalTranscriptSubject.next(cleanFinal);
      }
    };

    instance.onerror = (event: SpeechRecognitionErrorEventLike) => {
      if (this.isDestroyed || sessionId !== this.activeSessionId) {
        return;
      }
      this.isStartPending = false;
      const mapped = this.mapRecognitionError(event.error);
      this.errorCodeSignal.set(mapped);
      this.interimTranscriptSignal.set('');
    };

    instance.onend = () => {
      if (this.isDestroyed || sessionId !== this.activeSessionId) {
        return;
      }
      this.isStartPending = false;
      this.isListeningSignal.set(false);
      this.interimTranscriptSignal.set('');
      if (this.recognition === instance) {
        this.detachListeners(instance);
        this.recognition = null;
      }
    };
  }

  /**
   * Nullifies event callbacks to prevent memory leaks.
   */
  private detachListeners(instance: SpeechRecognitionLike): void {
    instance.onstart = null;
    instance.onresult = null;
    instance.onerror = null;
    instance.onend = null;
  }

  /**
   * Lifecycle cleanup on service destruction.
   */
  ngOnDestroy(): void {
    this.isDestroyed = true;
    this.abort();
    this.finalTranscriptSubject.complete();
  }
}
