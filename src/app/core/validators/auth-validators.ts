import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Strictly 10-digit Indian mobile number starting with 6, 7, 8, or 9.
 */
export const INDIAN_PHONE_REGEX = /^[6-9][0-9]{9}$/;

/**
 * General complete email format accepting single and multi-level domain extensions (.com, .in, .co.in, .org.in, .edu.in, etc.).
 * Accepts local parts starting with letters or digits (e.g. 1user@example.com).
 * Rejects malformed email structures (missing '@', missing TLD, consecutive dots, leading/trailing invalid chars).
 */
export const GENERAL_EMAIL_REGEX =
  /^[a-zA-Z0-9]+(?:[._%+-][a-zA-Z0-9]+)*@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/;

/**
 * Standard complete email format alias.
 */
export const STANDARD_EMAIL_REGEX = GENERAL_EMAIL_REGEX;

/**
 * Backwards-compatibility alias for legacy imports.
 * Previously restricted to .com/.in only, now supports all valid domain extensions.
 */
export const COM_IN_EMAIL_REGEX = GENERAL_EMAIL_REGEX;

/**
 * Validates Indian mobile numbers:
 * - Exactly 10 digits
 * - Digits only (no letters, spaces, or special characters)
 * - First digit must be between 6 and 9
 */
export function indianPhoneValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = control.value;
    if (raw === null || raw === undefined || raw === '') {
      return null;
    }

    const value = String(raw);
    if (!/^[0-9]+$/.test(value)) {
      return { nonNumeric: true, indianPhone: true };
    }

    if (value.length > 10) {
      return { tooLong: true, indianPhone: true };
    }

    if (!/^[6-9]/.test(value)) {
      return { invalidStartDigit: true, indianPhone: true };
    }

    if (value.length < 10) {
      return { tooShort: true, indianPhone: true };
    }

    return null;
  };
}

/**
 * Validates complete email syntax across general single and multi-level TLDs.
 * Backward-compatible alias for existing consumers.
 */
export function isValidComOrInEmail(val: unknown): boolean {
  return isValidStandardEmail(val);
}

/**
 * Validates complete standard email syntax regardless of TLD.
 */
export function isValidStandardEmail(val: unknown): boolean {
  if (typeof val !== 'string') {
    return false;
  }
  const trimmed = val.trim();
  if (trimmed.length === 0) {
    return false;
  }
  return GENERAL_EMAIL_REGEX.test(trimmed);
}

/**
 * Angular Reactive Forms validator enforcing general valid email syntax.
 * Supports multi-level domains (.co.in, .org.in, .edu.in) and numbers in local parts.
 */
export function dineviaEmailValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = control.value;
    if (raw === null || raw === undefined || String(raw).trim() === '') {
      return null;
    }

    const value = String(raw).trim();
    if (!isValidStandardEmail(value)) {
      return { invalidEmail: true, invalidEmailDomain: true };
    }

    return null;
  };
}

/**
 * Angular Reactive Forms validator enforcing complete email format (used where existing accounts may use any valid TLD).
 */
export function standardEmailValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = control.value;
    if (raw === null || raw === undefined || String(raw).trim() === '') {
      return null;
    }

    const value = String(raw).trim();
    if (!isValidStandardEmail(value)) {
      return { invalidEmail: true };
    }

    return null;
  };
}

/**
 * Returns a descriptive user-facing error message for Indian phone validation errors.
 */
export function getIndianPhoneErrorMessage(errors: ValidationErrors | null | undefined): string {
  if (!errors) {
    return '';
  }
  if (errors['required']) {
    return 'Mobile phone number is required.';
  }
  if (errors['nonNumeric']) {
    return 'Phone number must contain only digits (no letters, spaces, or special characters).';
  }
  if (errors['tooLong']) {
    return 'Phone number cannot exceed 10 digits.';
  }
  if (errors['invalidStartDigit']) {
    return 'Indian mobile numbers must start with digit 6, 7, 8, or 9.';
  }
  if (errors['tooShort']) {
    return 'Phone number must be exactly 10 digits (e.g. 9876543210).';
  }
  return 'Please enter a valid 10-digit Indian mobile number starting with 6–9.';
}

/**
 * Returns a descriptive user-facing error message for email validation errors.
 */
export function getDineviaEmailErrorMessage(errors: ValidationErrors | null | undefined): string {
  if (!errors) {
    return '';
  }
  if (errors['required']) {
    return 'Email address is required.';
  }
  return 'Please enter a valid email address (e.g. user@example.com or user@example.co.in).';
}

