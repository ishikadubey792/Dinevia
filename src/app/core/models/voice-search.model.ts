/**
 * Dinevia Voice Search Core Models
 *
 * Defines the contracts, supported languages, error codes, and typed abstractions
 * for the browser Web Speech API.
 */

/**
 * Supported BCP-47 language codes for speech recognition in Dinevia.
 */
export type VoiceLanguage = 'en-IN' | 'hi-IN' | 'ta-IN';

/**
 * Normalized voice recognition error codes handled across Dinevia.
 */
export type VoiceRecognitionError =
  | 'not-supported'
  | 'not-allowed'
  | 'service-not-allowed'
  | 'no-speech'
  | 'audio-capture'
  | 'network'
  | 'aborted'
  | 'unknown';

/**
 * Metadata descriptor for language selection UI.
 */
export interface VoiceLanguageOption {
  readonly code: VoiceLanguage;
  readonly label: string;
  readonly nativeLabel: string;
}

/**
 * Default fallback language for voice search in India.
 */
export const DEFAULT_VOICE_LANGUAGE: VoiceLanguage = 'en-IN';

/**
 * Immutable catalog of supported voice languages in Dinevia.
 */
export const SUPPORTED_VOICE_LANGUAGES: readonly VoiceLanguageOption[] = [
  { code: 'en-IN', label: 'English (India)', nativeLabel: 'English' },
  { code: 'hi-IN', label: 'Hindi (India)', nativeLabel: 'हिन्दी' },
  { code: 'ta-IN', label: 'Tamil (India)', nativeLabel: 'தமிழ்' }
] as const;

// ── Web Speech API Typed Abstractions ──

export interface SpeechRecognitionAlternativeLike {
  readonly transcript: string;
  readonly confidence: number;
}

export interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

export interface SpeechRecognitionResultListLike {
  readonly length: number;
  item?(index: number): SpeechRecognitionResultLike;
  [index: number]: SpeechRecognitionResultLike;
}

export interface SpeechRecognitionEventLike {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultListLike;
}

export interface SpeechRecognitionErrorEventLike {
  readonly error: string;
  readonly message?: string;
}

export interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

export type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export interface WindowWithSpeechRecognition {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

/**
 * Normalizes speech recognition transcripts for search consumption.
 * - Trims leading and trailing whitespace
 * - Strips unnecessary trailing sentence punctuation (.,!?;: and Indic dandas । ॥)
 * - Preserves internal punctuation, spacing, and Unicode characters
 */
export function normalizeVoiceTranscript(transcript: string | null | undefined): string {
  if (!transcript || typeof transcript !== 'string') {
    return '';
  }
  let clean = transcript.trim();
  // Strip trailing punctuation marks and any surrounding whitespace
  clean = clean.replace(/[.,!?;:।॥\s]+$/u, '').trim();
  return clean;
}
