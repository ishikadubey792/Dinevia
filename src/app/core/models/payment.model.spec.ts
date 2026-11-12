import { unwrapPaymentResponse, normalizePaymentStatus, PaymentRecord, PaymentApiResponse } from './payment.model';

describe('Payment Model Helpers', () => {
  describe('unwrapPaymentResponse', () => {
    it('should unwrap data from an ApiResponse envelope', () => {
      const envelope: PaymentApiResponse = {
        statusCode: 200,
        message: 'Success',
        data: {
          id: 55,
          bookingId: 12,
          amount: 200,
          paymentMethod: 'Demo',
          status: 'Pending',
          transactionId: null,
          createdAt: '2026-11-12T00:00:00Z',
          paidAt: null
        }
      };

      const unwrapped = unwrapPaymentResponse(envelope);
      expect(unwrapped).toEqual(envelope.data);
      expect(unwrapped.id).toBe(55);
      expect(unwrapped.amount).toBe(200);
      expect(unwrapped.paymentMethod).toBe('Demo');
    });

    it('should return a bare PaymentRecord if not in an envelope', () => {
      const bare: PaymentRecord = {
        id: 77,
        bookingId: 19,
        amount: 500,
        paymentMethod: 'Demo',
        status: 'Success',
        transactionId: 'DEMO-12345',
        createdAt: '2026-11-12T00:00:00Z',
        paidAt: '2026-11-12T00:05:00Z'
      };

      const unwrapped = unwrapPaymentResponse(bare);
      expect(unwrapped).toEqual(bare);
      expect(unwrapped.id).toBe(77);
      expect(unwrapped.paidAt).toBe('2026-11-12T00:05:00Z');
    });

    it('should unwrap array from an ApiResponse<PaymentRecord[]> envelope', () => {
      const envelope = {
        statusCode: 200,
        message: 'History',
        data: [
          {
            id: 1,
            bookingId: 2,
            amount: 100,
            paymentMethod: 'Demo',
            status: 'Success' as const,
            createdAt: '2026-11-12T00:00:00Z'
          }
        ]
      };

      const unwrapped = unwrapPaymentResponse(envelope);
      expect(unwrapped).toEqual(envelope.data);
      expect(Array.isArray(unwrapped)).toBe(true);
      expect(unwrapped.length).toBe(1);
    });

    it('should return bare array if direct array is returned', () => {
      const bareArray = [
        {
          id: 2,
          bookingId: 3,
          amount: 200,
          paymentMethod: 'Demo',
          status: 'Failed' as const,
          createdAt: '2026-11-12T00:00:00Z'
        }
      ];

      const unwrapped = unwrapPaymentResponse(bareArray);
      expect(unwrapped).toEqual(bareArray);
    });

    it('should return null or non-object as-is', () => {
      expect(unwrapPaymentResponse(null as any)).toBeNull();
      expect(unwrapPaymentResponse(undefined as any)).toBeUndefined();
    });
  });

  describe('normalizePaymentStatus', () => {
    it('should normalize valid Success variants', () => {
      expect(normalizePaymentStatus('Success')).toBe('Success');
      expect(normalizePaymentStatus('success')).toBe('Success');
      expect(normalizePaymentStatus(' SUCCESS ')).toBe('Success');
    });

    it('should normalize valid Failed variants', () => {
      expect(normalizePaymentStatus('Failed')).toBe('Failed');
      expect(normalizePaymentStatus('failed')).toBe('Failed');
      expect(normalizePaymentStatus('failure')).toBe('Failed');
      expect(normalizePaymentStatus(' FAILED ')).toBe('Failed');
    });

    it('should normalize Pending and fallback to Pending for unknown strings or empty values', () => {
      expect(normalizePaymentStatus('Pending')).toBe('Pending');
      expect(normalizePaymentStatus('pending')).toBe('Pending');
      expect(normalizePaymentStatus('')).toBe('Pending');
      expect(normalizePaymentStatus(null)).toBe('Pending');
      expect(normalizePaymentStatus(undefined)).toBe('Pending');
      expect(normalizePaymentStatus('unknown_status')).toBe('Pending');
    });
  });
});

