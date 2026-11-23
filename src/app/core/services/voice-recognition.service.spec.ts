import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  VoiceRecognitionService,
  SPEECH_RECOGNITION
} from './voice-recognition.service';
import {
  SpeechRecognitionLike,
  SpeechRecognitionEventLike,
  SpeechRecognitionErrorEventLike,
  SpeechRecognitionResultListLike,
  SpeechRecognitionResultLike
} from '../models/voice-search.model';

/**
 * Test double implementing SpeechRecognitionLike to mock Web Speech API in Node/jsdom environments.
 */
class MockSpeechRecognition implements SpeechRecognitionLike {
  continuous = false;
  interimResults = false;
  lang = 'en-IN';
  maxAlternatives = 1;

  onstart: (() => void) | null = null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null = null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null = null;
  onend: (() => void) | null = null;

  readonly startSpy = vi.fn();
  readonly stopSpy = vi.fn();
  readonly abortSpy = vi.fn();

  static latestInstance: MockSpeechRecognition | null = null;

  constructor() {
    MockSpeechRecognition.latestInstance = this;
  }

  start(): void {
    this.startSpy();
  }

  stop(): void {
    this.stopSpy();
  }

  abort(): void {
    this.abortSpy();
  }

  // ── Test helper triggers ──
  triggerStart(): void {
    this.onstart?.();
  }

  triggerResult(items: Array<{ transcript: string; isFinal: boolean }>, resultIndex = 0): void {
    const resultsArray: SpeechRecognitionResultLike[] = items.map(item => {
      const res: any = [{ transcript: item.transcript, confidence: 0.98 }];
      res.isFinal = item.isFinal;
      res.length = 1;
      return res;
    });

    const resultList: SpeechRecognitionResultListLike = {
      length: resultsArray.length,
      item: (i: number) => resultsArray[i]
    };
    resultsArray.forEach((r, idx) => {
      resultList[idx] = r;
    });

    this.onresult?.({
      resultIndex,
      results: resultList
    });
  }

  triggerError(error: string): void {
    this.onerror?.({ error });
  }

  triggerEnd(): void {
    this.onend?.();
  }
}

describe('VoiceRecognitionService', () => {
  let service: VoiceRecognitionService;

  beforeEach(() => {
    MockSpeechRecognition.latestInstance = null;
    TestBed.configureTestingModule({
      providers: [
        VoiceRecognitionService,
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: SPEECH_RECOGNITION, useValue: MockSpeechRecognition }
      ]
    });

    service = TestBed.inject(VoiceRecognitionService);
  });

  afterEach(() => {
    service.ngOnDestroy();
  });

  // ── 1. SSR & Browser Platform Safety ──

  describe('SSR Safety & Capability Detection', () => {
    it('should be created and report isSupported as true in supported browser context', () => {
      expect(service).toBeTruthy();
      expect(service.isSupported()).toBe(true);
      expect(service.isListening()).toBe(false);
      expect(service.currentLanguage()).toBe('en-IN');
      expect(service.errorCode()).toBeNull();
      expect(service.interimTranscript()).toBe('');
    });

    it('should report isSupported as false when platform is server (SSR)', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          VoiceRecognitionService,
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: SPEECH_RECOGNITION, useValue: MockSpeechRecognition }
        ]
      });

      const ssrService = TestBed.inject(VoiceRecognitionService);
      expect(ssrService.isSupported()).toBe(false);

      // Calling start in SSR must not throw, and should set error to not-supported
      ssrService.start();
      expect(ssrService.errorCode()).toBe('not-supported');
      expect(ssrService.isListening()).toBe(false);
    });

    it('should report isSupported as false when SPEECH_RECOGNITION is null (unsupported browser)', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          VoiceRecognitionService,
          { provide: PLATFORM_ID, useValue: 'browser' },
          { provide: SPEECH_RECOGNITION, useValue: null }
        ]
      });

      const unsupportedService = TestBed.inject(VoiceRecognitionService);
      expect(unsupportedService.isSupported()).toBe(false);

      unsupportedService.start();
      expect(unsupportedService.errorCode()).toBe('not-supported');
      expect(unsupportedService.isListening()).toBe(false);
    });
  });

  // ── 2. Recognition Lifecycle: Start, Stop & Repeated Calls ──

  describe('Lifecycle: Start & Stop', () => {
    it('should start listening session and set isListening on onstart event', () => {
      service.start();

      const instance = MockSpeechRecognition.latestInstance;
      expect(instance).toBeTruthy();
      expect(instance?.startSpy).toHaveBeenCalledTimes(1);
      expect(instance?.continuous).toBe(false);
      expect(instance?.interimResults).toBe(true);
      expect(instance?.lang).toBe('en-IN');

      // Before onstart fires, isListening is not yet true
      expect(service.isListening()).toBe(false);

      instance?.triggerStart();
      expect(service.isListening()).toBe(true);
      expect(service.errorCode()).toBeNull();
    });

    it('should prevent repeated start calls when already listening', () => {
      service.start();
      const instance = MockSpeechRecognition.latestInstance;
      instance?.triggerStart();
      expect(service.isListening()).toBe(true);

      // Second start call while listening
      service.start();
      expect(instance?.startSpy).toHaveBeenCalledTimes(1); // No additional start call
    });

    it('should create only one recognition instance when start() is called twice consecutively before onstart', () => {
      let createdCount = 0;
      class CountingMockSpeechRecognition extends MockSpeechRecognition {
        constructor() {
          super();
          createdCount++;
        }
      }

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          VoiceRecognitionService,
          { provide: PLATFORM_ID, useValue: 'browser' },
          { provide: SPEECH_RECOGNITION, useValue: CountingMockSpeechRecognition }
        ]
      });

      const testService = TestBed.inject(VoiceRecognitionService);
      testService.start();
      testService.start(); // Second call while start is pending (before onstart)

      expect(createdCount).toBe(1);
      const instance = MockSpeechRecognition.latestInstance;
      expect(instance?.startSpy).toHaveBeenCalledTimes(1);

      // Now trigger onstart
      instance?.triggerStart();
      expect(testService.isListening()).toBe(true);
    });

    it('should stop listening session when stop() is called', () => {
      service.start();
      const instance = MockSpeechRecognition.latestInstance;
      instance?.triggerStart();
      expect(service.isListening()).toBe(true);

      service.stop();
      expect(instance?.stopSpy).toHaveBeenCalledTimes(1);

      instance?.triggerEnd();
      expect(service.isListening()).toBe(false);
      expect(service.interimTranscript()).toBe('');
    });

    it('should safely handle stop() called during a pending start', () => {
      service.start();
      const instance = MockSpeechRecognition.latestInstance;
      // onstart has NOT fired yet (start is pending)

      expect(() => service.stop()).not.toThrow();
      expect(instance?.stopSpy).toHaveBeenCalledTimes(1);

      // When onend fires after stop
      instance?.triggerEnd();
      expect(service.isListening()).toBe(false);

      // A subsequent start() works normally
      service.start();
      const secondInstance = MockSpeechRecognition.latestInstance;
      expect(secondInstance?.startSpy).toHaveBeenCalledTimes(1);
    });

    it('should do nothing when stop() is called while not listening', () => {
      service.stop();
      expect(MockSpeechRecognition.latestInstance).toBeNull();
    });
  });

  // ── 3. Abort Behavior & Incomplete Transcript Protection ──

  describe('Abort Behavior', () => {
    it('should abort active recognition immediately and clear interim transcript', () => {
      service.start();
      const instance = MockSpeechRecognition.latestInstance;
      instance?.triggerStart();

      instance?.triggerResult([{ transcript: 'Incomplete...', isFinal: false }]);
      expect(service.interimTranscript()).toBe('Incomplete...');

      service.abort();
      expect(instance?.abortSpy).toHaveBeenCalledTimes(1);
      expect(service.isListening()).toBe(false);
      expect(service.interimTranscript()).toBe('');
    });

    it('should ignore subsequent stale events after abort has been called', () => {
      let emittedTranscript = '';
      service.finalTranscript$.subscribe(t => {
        emittedTranscript = t;
      });

      service.start();
      const instance = MockSpeechRecognition.latestInstance;
      instance?.triggerStart();

      // User cancels / aborts
      service.abort();
      expect(service.isListening()).toBe(false);

      // Browser asynchronously delivers delayed result or error after abort
      instance?.triggerResult([{ transcript: 'Stale final words', isFinal: true }]);
      instance?.triggerError('aborted');
      instance?.triggerEnd();

      // Nothing should have leaked to subscriber or state
      expect(emittedTranscript).toBe('');
      expect(service.errorCode()).toBeNull();
      expect(service.isListening()).toBe(false);
    });

    it('should prevent stale callbacks when abort() is called while start is pending', () => {
      let transcriptEmitted = false;
      service.finalTranscript$.subscribe(() => {
        transcriptEmitted = true;
      });

      service.start();
      const instance = MockSpeechRecognition.latestInstance;
      // start() was called, but onstart has NOT fired yet (start is pending)

      service.abort();
      expect(instance?.abortSpy).toHaveBeenCalledTimes(1);
      expect(service.isListening()).toBe(false);

      // Stale callbacks fire on the abandoned instance
      instance?.triggerStart();
      instance?.triggerResult([{ transcript: 'Ghost transcript', isFinal: true }]);
      instance?.triggerError('aborted');
      instance?.triggerEnd();

      expect(service.isListening()).toBe(false);
      expect(transcriptEmitted).toBe(false);
      expect(service.errorCode()).toBeNull();
      expect(service.interimTranscript()).toBe('');
    });
  });

  // ── 4. Language Switching ──

  describe('Language Selection', () => {
    it('should initialize with default language en-IN', () => {
      expect(service.currentLanguage()).toBe('en-IN');
    });

    it('should update currentLanguage signal and propagate to speech recognition instance', () => {
      service.setLanguage('hi-IN');
      expect(service.currentLanguage()).toBe('hi-IN');

      service.start();
      const instance = MockSpeechRecognition.latestInstance;
      expect(instance?.lang).toBe('hi-IN');

      // Change while listening
      service.setLanguage('ta-IN');
      expect(service.currentLanguage()).toBe('ta-IN');
      expect(instance?.lang).toBe('ta-IN');
    });
  });

  // ── 5. Transcript Extraction & Interim Handling ──

  describe('Transcript Extraction', () => {
    it('should handle live interim transcript without emitting to finalTranscript$', () => {
      let emittedFinal = '';
      service.finalTranscript$.subscribe(t => {
        emittedFinal = t;
      });

      service.start();
      const instance = MockSpeechRecognition.latestInstance;
      instance?.triggerStart();

      instance?.triggerResult([{ transcript: 'Tandoori chick', isFinal: false }]);
      expect(service.interimTranscript()).toBe('Tandoori chick');
      expect(emittedFinal).toBe('');

      instance?.triggerResult([{ transcript: 'Tandoori chicken', isFinal: true }]);
      expect(service.interimTranscript()).toBe('');
      expect(emittedFinal).toBe('Tandoori chicken');
    });

    it('should emit only final transcripts and trim whitespace', async () => {
      const transcriptPromise = firstValueFrom(service.finalTranscript$);

      service.start();
      const instance = MockSpeechRecognition.latestInstance;
      instance?.triggerStart();

      instance?.triggerResult([{ transcript: '   Chettinad Fish Curry   ', isFinal: true }]);

      const transcript = await transcriptPromise;
      expect(transcript).toBe('Chettinad Fish Curry');
    });

    it('should emit on both finalTranscript$ and transcript$ aliases', () => {
      let emissionCount = 0;
      service.finalTranscript$.subscribe(() => emissionCount++);
      service.transcript$.subscribe(() => emissionCount++);

      service.start();
      const instance = MockSpeechRecognition.latestInstance;
      instance?.triggerStart();

      instance?.triggerResult([{ transcript: 'Dum Biryani', isFinal: true }]);
      expect(emissionCount).toBe(2);
    });
  });

  // ── 6. Error Handling & Mapping ──

  describe('Error Handling', () => {
    const errorMatrix = [
      { browserError: 'not-allowed', expected: 'not-allowed' },
      { browserError: 'service-not-allowed', expected: 'service-not-allowed' },
      { browserError: 'no-speech', expected: 'no-speech' },
      { browserError: 'audio-capture', expected: 'audio-capture' },
      { browserError: 'network', expected: 'network' },
      { browserError: 'aborted', expected: 'aborted' },
      { browserError: 'bad-grammar', expected: 'unknown' },
      { browserError: 'language-not-supported', expected: 'unknown' }
    ] as const;

    errorMatrix.forEach(({ browserError, expected }) => {
      it(`should map browser error '${browserError}' to '${expected}' without throwing`, () => {
        service.start();
        const instance = MockSpeechRecognition.latestInstance;
        instance?.triggerStart();

        instance?.triggerError(browserError);
        expect(service.errorCode()).toBe(expected);
        expect(service.interimTranscript()).toBe('');
      });
    });

    it('should clear error code when clearError() is called or when start() is called again', () => {
      service.start();
      const instance = MockSpeechRecognition.latestInstance;
      instance?.triggerStart();
      instance?.triggerError('no-speech');
      expect(service.errorCode()).toBe('no-speech');

      service.clearError();
      expect(service.errorCode()).toBeNull();

      // Trigger error again
      instance?.triggerError('network');
      expect(service.errorCode()).toBe('network');

      // Starting next session clears previous error
      instance?.triggerEnd();
      service.start();
      expect(service.errorCode()).toBeNull();
    });

    it('should safely handle synchronous browser start() throws', () => {
      // Create a recognition mock whose start() throws InvalidStateError
      class ThrowingSpeechRecognition extends MockSpeechRecognition {
        override start(): void {
          throw new DOMException('The SpeechRecognition is already active.', 'InvalidStateError');
        }
      }

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          VoiceRecognitionService,
          { provide: PLATFORM_ID, useValue: 'browser' },
          { provide: SPEECH_RECOGNITION, useValue: ThrowingSpeechRecognition }
        ]
      });

      const throwingService = TestBed.inject(VoiceRecognitionService);
      expect(() => throwingService.start()).not.toThrow();
      expect(throwingService.isListening()).toBe(false);
      expect(throwingService.errorCode()).toBe('unknown');
    });

    it('should clean up listeners and instance references when recognition.start() throws synchronously', () => {
      let failedInstance: any = null;
      class ThrowingSpeechRecognition extends MockSpeechRecognition {
        constructor() {
          super();
          failedInstance = this;
        }
        override start(): void {
          throw new DOMException('Already started', 'InvalidStateError');
        }
      }

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          VoiceRecognitionService,
          { provide: PLATFORM_ID, useValue: 'browser' },
          { provide: SPEECH_RECOGNITION, useValue: ThrowingSpeechRecognition }
        ]
      });

      const throwingService = TestBed.inject(VoiceRecognitionService);
      throwingService.start();

      expect(throwingService.isListening()).toBe(false);
      expect(throwingService.errorCode()).toBe('unknown');
      expect(failedInstance?.onstart).toBeNull();
      expect(failedInstance?.onresult).toBeNull();
      expect(failedInstance?.onerror).toBeNull();
      expect(failedInstance?.onend).toBeNull();
    });

    it('should allow a new start() to succeed after a synchronous start() failure', () => {
      let shouldThrow = true;
      class FlakySpeechRecognition extends MockSpeechRecognition {
        override start(): void {
          if (shouldThrow) {
            throw new DOMException('Failure', 'InvalidStateError');
          }
          super.start();
        }
      }

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          VoiceRecognitionService,
          { provide: PLATFORM_ID, useValue: 'browser' },
          { provide: SPEECH_RECOGNITION, useValue: FlakySpeechRecognition }
        ]
      });

      const testService = TestBed.inject(VoiceRecognitionService);
      testService.start(); // Fails synchronously
      expect(testService.errorCode()).toBe('unknown');

      // Next attempt should succeed
      shouldThrow = false;
      testService.start();
      const instance = MockSpeechRecognition.latestInstance;
      expect(instance?.startSpy).toHaveBeenCalledTimes(1);
      instance?.triggerStart();
      expect(testService.isListening()).toBe(true);
      expect(testService.errorCode()).toBeNull();
    });

    it('should preserve error state and reset lifecycle correctly when onerror is followed by onend', () => {
      service.start();
      const instance = MockSpeechRecognition.latestInstance;
      instance?.triggerStart();
      expect(service.isListening()).toBe(true);

      instance?.triggerError('no-speech');
      expect(service.errorCode()).toBe('no-speech');

      instance?.triggerEnd();
      expect(service.isListening()).toBe(false);
      expect(service.errorCode()).toBe('no-speech'); // Error state preserved

      // Next start resets error and starts cleanly
      service.start();
      const nextInstance = MockSpeechRecognition.latestInstance;
      expect(nextInstance).not.toBe(instance);
      expect(service.errorCode()).toBeNull();
      nextInstance?.triggerStart();
      expect(service.isListening()).toBe(true);
    });
  });

  // ── 7. Cleanup & Destruction ──

  describe('Cleanup on Destruction', () => {
    it('should abort recognition and complete subjects on ngOnDestroy', () => {
      let isCompleted = false;
      service.finalTranscript$.subscribe({
        complete: () => {
          isCompleted = true;
        }
      });

      service.start();
      const instance = MockSpeechRecognition.latestInstance;
      instance?.triggerStart();

      service.ngOnDestroy();

      expect(instance?.abortSpy).toHaveBeenCalledTimes(1);
      expect(service.isListening()).toBe(false);
      expect(isCompleted).toBe(true);

      // Further start calls after destruction are ignored
      service.start();
      expect(service.isListening()).toBe(false);
    });
  });
});
