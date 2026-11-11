import { FormControl, Validators } from '@angular/forms';
import {
  dineviaEmailValidator,
  getDineviaEmailErrorMessage,
  getIndianPhoneErrorMessage,
  indianPhoneValidator,
  standardEmailValidator
} from './auth-validators';

describe('Auth Validators (Indian Phone & .com/.in Email)', () => {
  describe('indianPhoneValidator', () => {
    it('should accept valid 10-digit Indian mobile numbers starting with 6, 7, 8, or 9', () => {
      const validNumbers = ['9876543210', '8765432109', '7123456789', '6000000001'];

      for (const phone of validNumbers) {
        const control = new FormControl(phone, [Validators.required, indianPhoneValidator()]);
        expect(control.valid).toBe(true);
        expect(control.errors).toBeNull();
      }
    });

    it('should reject numbers not starting with 6-9 such as 1234567890', () => {
      const control = new FormControl('1234567890', [Validators.required, indianPhoneValidator()]);
      expect(control.valid).toBe(false);
      expect(control.errors?.['invalidStartDigit']).toBe(true);
      expect(getIndianPhoneErrorMessage(control.errors)).toContain('start with digit 6, 7, 8, or 9');
    });

    it('should reject numbers shorter than 10 digits such as 987654321', () => {
      const control = new FormControl('987654321', [Validators.required, indianPhoneValidator()]);
      expect(control.valid).toBe(false);
      expect(control.errors?.['tooShort']).toBe(true);
      expect(getIndianPhoneErrorMessage(control.errors)).toContain('exactly 10 digits');
    });

    it('should reject numbers longer than 10 digits such as 98765432101', () => {
      const control = new FormControl('98765432101', [Validators.required, indianPhoneValidator()]);
      expect(control.valid).toBe(false);
      expect(control.errors?.['tooLong']).toBe(true);
      expect(getIndianPhoneErrorMessage(control.errors)).toContain('cannot exceed 10 digits');
    });

    it('should reject inputs with letters or special characters such as 98765abc10 and +919876543210', () => {
      const invalidInputs = ['98765abc10', '+919876543210', '98765-43210', '98765 43210'];

      for (const phone of invalidInputs) {
        const control = new FormControl(phone, [Validators.required, indianPhoneValidator()]);
        expect(control.valid).toBe(false);
        expect(control.errors?.['nonNumeric']).toBe(true);
        expect(getIndianPhoneErrorMessage(control.errors)).toContain('only digits');
      }
    });
  });

  describe('dineviaEmailValidator (.com and .in only)', () => {
    it('should accept valid emails ending with .com or .in', () => {
      const validEmails = [
        'user@gmail.com',
        'ishika@yahoo.in',
        'person@example.com',
        'first.last+tag@dinevia.in'
      ];

      for (const email of validEmails) {
        const control = new FormControl(email, [Validators.required, dineviaEmailValidator()]);
        expect(control.valid).toBe(true);
        expect(control.errors).toBeNull();
      }
    });

    it('should reject unsupported TLDs, malformed strings, and compound .com.in domains', () => {
      const invalidEmails = [
        'user@gmail.org',
        'user@gmail.net',
        'user@example.co',
        'user@university.edu',
        'invalid-email',
        'user@gmail.com.in',
        'user@.com',
        '@gmail.com',
        'user@gmail..com'
      ];

      for (const email of invalidEmails) {
        const control = new FormControl(email, [Validators.required, dineviaEmailValidator()]);
        expect(control.valid).toBe(false);
        expect(control.errors?.['invalidEmailDomain']).toBe(true);
        expect(getDineviaEmailErrorMessage(control.errors)).toContain('.com or .in');
      }
    });
  });

  describe('standardEmailValidator', () => {
    it('should validate complete standard email syntax across international TLDs and reject incomplete ones', () => {
      expect(new FormControl('chef.julien@legabriel.fr', [standardEmailValidator()]).valid).toBe(true);
      expect(new FormControl('user@gmail.com', [standardEmailValidator()]).valid).toBe(true);
      expect(new FormControl('invalid-email', [standardEmailValidator()]).valid).toBe(false);
      expect(new FormControl('user@localhost', [standardEmailValidator()]).valid).toBe(false);
    });
  });
});

