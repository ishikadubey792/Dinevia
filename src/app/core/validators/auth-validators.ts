import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Strictly 10-digit Indian mobile number starting with 6, 7, 8, or 9.
 */
export const INDIAN_PHONE_REGEX = /^[6-9][0-9]{9}$/;

/**
 * Complete email format accepting strictly `.com` or `.in` single-level domains.
 * Rejects other TLDs (.org, .net, .edu, .co, etc.) as well as compound `.com.in`.
 */
export const COM_IN_EMAIL_REGEX =
  /^[a-zA-Z0-9]+(?:[._%+-][a-zA-Z0-9]+)*@[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*\.(?:com|in)$/i;

/**
 * Standard complete email format (requires a valid TLD, without restricting TLD to .com/.in).
 */
export const STANDARD_EMAIL_REGEX =
  /^[a-zA-Z0-9]+(?:[._%+-][a-zA-Z0-9]+)*@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/;

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
 * Validates email addresses strictly ending in `.com` or `.in`.
 */
export function isValidComOrInEmail(val: unknown): boolean {
  if (typeof val !== 'string') {
    return false;
  }
  const trimmed = val.trim();
  if (trimmed.length === 0) {
    return false;
  }
  return COM_IN_EMAIL_REGEX.test(trimmed);
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
  return STANDARD_EMAIL_REGEX.test(trimmed);
}

/**
 * Angular Reactive Forms validator accepting only complete email addresses ending in `.com` or `.in`.
 */
export function dineviaEmailValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = control.value;
    if (raw === null || raw === undefined || String(raw).trim() === '') {
      return null;
    }

    const value = String(raw).trim();
    if (!isValidComOrInEmail(value)) {
      return { invalidEmailDomain: true };
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
 * Returns a descriptive user-facing error message for .com / .in email validation errors.
 */
export function getDineviaEmailErrorMessage(errors: ValidationErrors | null | undefined): string {
  if (!errors) {
    return '';
  }
  if (errors['required']) {
    return 'Email address is required.';
  }
  return 'Please enter a valid email address ending with .com or .in (e.g. user@gmail.com or name@yahoo.in).';
}

