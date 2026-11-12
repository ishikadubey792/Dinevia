import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PaymentService } from './payment.service';
import { environment } from '../../../environments/environment';
import { PaymentRecord, PaymentApiResponse, PaymentHistoryApiResponse } from '../models/payment.model';

describe('PaymentService', () => {
  let service: PaymentService;
  let httpTesting: HttpTestingController;
  const apiUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PaymentService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(PaymentService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  describe('initiatePayment', () => {
    it('should send POST to /api/payments/initiate/{bookingId} with empty body and unwrap ApiResponse envelope', () => {
      const mockResponse: PaymentApiResponse = {
        statusCode: 200,
        message: 'Payment initiated successfully.',
        data: {
          id: 101,
          bookingId: 42,
          amount: 200,
          paymentMethod: 'Demo',
          status: 'Pending',
          transactionId: null,
          createdAt: '2026-11-12T12:00:00Z',
          paidAt: null
        }
      };

      let result: PaymentRecord | undefined;
      service.initiatePayment(42).subscribe({
        next: (data) => (result = data)
      });

      const req = httpTesting.expectOne(`${apiUrl}/payments/initiate/42`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush(mockResponse);

      expect(result).toBeDefined();
      expect(result?.id).toBe(101);
      expect(result?.bookingId).toBe(42);
      expect(result?.amount).toBe(200);
      expect(result?.paymentMethod).toBe('Demo');
      expect(result?.status).toBe('Pending');
      expect(result?.transactionId).toBeNull();
      expect(result?.paidAt).toBeNull();
    });

    it('should handle direct PaymentRecord response without data envelope', () => {
      const bareRecord: PaymentRecord = {
        id: 102,
        bookingId: 43,
        amount: 300,
        paymentMethod: 'Demo',
        status: 'Pending',
        transactionId: null,
        createdAt: '2026-11-12T12:00:00Z',
        paidAt: null
      };

      let result: PaymentRecord | undefined;
      service.initiatePayment(43).subscribe({
        next: (data) => (result = data)
      });

      const req = httpTesting.expectOne(`${apiUrl}/payments/initiate/43`);
      req.flush(bareRecord);

      expect(result?.id).toBe(102);
      expect(result?.amount).toBe(300);
      expect(result?.status).toBe('Pending');
    });

    it('should reject invalid booking IDs without making HTTP requests', () => {
      let errorReceived: Error | undefined;

      service.initiatePayment(0).subscribe({
        next: () => expect.unreachable('Should have failed on bookingId = 0'),
        error: (err) => (errorReceived = err)
      });

      httpTesting.expectNone(`${apiUrl}/payments/initiate/0`);
      expect(errorReceived?.message).toContain('Invalid booking ID');
    });

    it('should reject negative booking IDs', () => {
      let errorReceived: Error | undefined;

      service.initiatePayment(-5).subscribe({
        next: () => expect.unreachable('Should have failed on bookingId < 0'),
        error: (err) => (errorReceived = err)
      });

      httpTesting.expectNone(`${apiUrl}/payments/initiate/-5`);
      expect(errorReceived?.message).toContain('Invalid booking ID');
    });

    it('should propagate HTTP error when backend fails', () => {
      let errorReceived: any;

      service.initiatePayment(99).subscribe({
        next: () => expect.unreachable('Should fail on 404'),
        error: (err) => (errorReceived = err)
      });

      const req = httpTesting.expectOne(`${apiUrl}/payments/initiate/99`);
      req.flush({ message: 'Booking not found' }, { status: 404, statusText: 'Not Found' });

      expect(errorReceived.status).toBe(404);
    });
  });

  describe('processDemoPayment', () => {
    it('should send POST to /api/payments/{paymentId}/process-demo?simulateSuccess=true and return success status and paidAt', () => {
      const mockResponse: PaymentApiResponse = {
        statusCode: 200,
        message: 'Demo payment succeeded.',
        data: {
          id: 101,
          bookingId: 42,
          amount: 200,
          paymentMethod: 'Demo',
          status: 'Success',
          transactionId: 'DEMO-998877665544',
          createdAt: '2026-11-12T12:00:00Z',
          paidAt: '2026-11-12T12:05:00Z'
        }
      };

      let result: PaymentRecord | undefined;
      service.processDemoPayment(101, true).subscribe({
        next: (data) => (result = data)
      });

      const req = httpTesting.expectOne((r) =>
        r.url === `${apiUrl}/payments/101/process-demo` && r.params.get('simulateSuccess') === 'true'
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush(mockResponse);

      expect(result?.status).toBe('Success');
      expect(result?.transactionId).toBe('DEMO-998877665544');
      expect(result?.paidAt).toBe('2026-11-12T12:05:00Z');
    });

    it('should send POST with simulateSuccess=false when simulation fails with null paidAt and null transactionId', () => {
      const mockResponse: PaymentApiResponse = {
        statusCode: 200,
        message: 'Demo payment failed.',
        data: {
          id: 101,
          bookingId: 42,
          amount: 200,
          paymentMethod: 'Demo',
          status: 'Failed',
          transactionId: null,
          createdAt: '2026-11-12T12:00:00Z',
          paidAt: null
        }
      };

      let result: PaymentRecord | undefined;
      service.processDemoPayment(101, false).subscribe({
        next: (data) => (result = data)
      });

      const req = httpTesting.expectOne((r) =>
        r.url === `${apiUrl}/payments/101/process-demo` && r.params.get('simulateSuccess') === 'false'
      );
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);

      expect(result?.status).toBe('Failed');
      expect(result?.transactionId).toBeNull();
      expect(result?.paidAt).toBeNull();
    });

    it('should reject invalid payment IDs without HTTP calls', () => {
      let errorReceived: Error | undefined;

      service.processDemoPayment(NaN, true).subscribe({
        next: () => expect.unreachable('Should have failed on NaN paymentId'),
        error: (err) => (errorReceived = err)
      });

      expect(errorReceived?.message).toContain('Invalid payment ID');
    });

    it('should propagate backend 500 error during demo payment processing', () => {
      let errorReceived: any;

      service.processDemoPayment(101, true).subscribe({
        next: () => expect.unreachable('Should fail on 500'),
        error: (err) => (errorReceived = err)
      });

      const req = httpTesting.expectOne((r) => r.url === `${apiUrl}/payments/101/process-demo`);
      req.flush({ message: 'Internal Server Error' }, { status: 500, statusText: 'Server Error' });

      expect(errorReceived.status).toBe(500);
    });
  });

  describe('getPayment', () => {
    it('should send GET to /api/payments/{paymentId} and unwrap response', () => {
      const mockResponse: PaymentApiResponse = {
        statusCode: 200,
        message: 'Payment details fetched successfully.',
        data: {
          id: 205,
          bookingId: 88,
          amount: 400,
          paymentMethod: 'Demo',
          status: 'Pending',
          transactionId: null,
          createdAt: '2026-11-12T12:00:00Z',
          paidAt: null
        }
      };

      let result: PaymentRecord | undefined;
      service.getPayment(205).subscribe({
        next: (data) => (result = data)
      });

      const req = httpTesting.expectOne(`${apiUrl}/payments/205`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);

      expect(result?.id).toBe(205);
      expect(result?.bookingId).toBe(88);
      expect(result?.amount).toBe(400);
      expect(result?.paymentMethod).toBe('Demo');
      expect(result?.status).toBe('Pending');
    });

    it('should reject invalid payment IDs without making HTTP requests', () => {
      let errorReceived: Error | undefined;

      service.getPayment(-1).subscribe({
        next: () => expect.unreachable('Should have failed on negative payment ID'),
        error: (err) => (errorReceived = err)
      });

      httpTesting.expectNone(`${apiUrl}/payments/-1`);
      expect(errorReceived?.message).toContain('Invalid payment ID');
    });
  });

  describe('getPaymentHistory', () => {
    it('should send GET to /api/payments/history and return array from envelope', () => {
      const mockResponse: PaymentHistoryApiResponse = {
        statusCode: 200,
        message: 'Payment history fetched successfully.',
        data: [
          {
            id: 1,
            bookingId: 10,
            amount: 200,
            paymentMethod: 'Demo',
            status: 'Success',
            transactionId: 'DEMO-11112222',
            createdAt: '2026-11-12T10:00:00Z',
            paidAt: '2026-11-12T10:05:00Z'
          },
          {
            id: 2,
            bookingId: 11,
            amount: 400,
            paymentMethod: 'Demo',
            status: 'Failed',
            transactionId: null,
            createdAt: '2026-11-12T11:00:00Z',
            paidAt: null
          }
        ]
      };

      let result: PaymentRecord[] | undefined;
      service.getPaymentHistory().subscribe({
        next: (data) => (result = data)
      });

      const req = httpTesting.expectOne(`${apiUrl}/payments/history`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);

      expect(result?.length).toBe(2);
      expect(result?.[0].id).toBe(1);
      expect(result?.[0].paidAt).toBe('2026-11-12T10:05:00Z');
      expect(result?.[1].status).toBe('Failed');
      expect(result?.[1].paidAt).toBeNull();
    });

    it('should return empty array if data envelope is empty', () => {
      const mockResponse: PaymentHistoryApiResponse = {
        statusCode: 200,
        message: 'Payment history fetched successfully.',
        data: []
      };

      let result: PaymentRecord[] | undefined;
      service.getPaymentHistory().subscribe({
        next: (data) => (result = data)
      });

      const req = httpTesting.expectOne(`${apiUrl}/payments/history`);
      req.flush(mockResponse);

      expect(result).toEqual([]);
    });

    it('should propagate 401 error when customer is unauthenticated', () => {
      let errorReceived: any;

      service.getPaymentHistory().subscribe({
        next: () => expect.unreachable('Should have failed on 401'),
        error: (err) => (errorReceived = err)
      });

      const req = httpTesting.expectOne(`${apiUrl}/payments/history`);
      req.flush({ statusCode: 401 }, { status: 401, statusText: 'Unauthorized' });

      expect(errorReceived.status).toBe(401);
    });
  });

  describe('recoverOrInitiatePayment', () => {
    it('should reject invalid booking IDs without making HTTP requests', () => {
      let errorReceived: Error | undefined;

      service.recoverOrInitiatePayment(0).subscribe({
        next: () => expect.unreachable('Should have rejected bookingId = 0'),
        error: (err) => (errorReceived = err)
      });

      httpTesting.expectNone(`${apiUrl}/payments/history`);
      expect(errorReceived?.message).toContain('Invalid booking ID');
    });

    it('should recover existing pending/failed payment from history without calling initiatePayment', () => {
      const mockHistory: PaymentRecord[] = [
        {
          id: 201,
          bookingId: 88,
          amount: 200,
          paymentMethod: 'Demo',
          status: 'Failed',
          transactionId: null,
          createdAt: '2026-11-12T10:00:00Z',
          paidAt: null
        }
      ];

      let recovered: PaymentRecord | undefined;
      service.recoverOrInitiatePayment(88).subscribe({
        next: (p) => (recovered = p)
      });

      const histReq = httpTesting.expectOne(`${apiUrl}/payments/history`);
      histReq.flush({ statusCode: 200, message: 'OK', data: mockHistory });

      // Must NOT call initiate endpoint
      httpTesting.expectNone(`${apiUrl}/payments/initiate/88`);

      expect(recovered?.id).toBe(201);
      expect(recovered?.status).toBe('Failed');
      expect(service.activePayment()?.id).toBe(201);
    });

    it('should prefer Success payment from history if multiple exist', () => {
      const mockHistory: PaymentRecord[] = [
        {
          id: 201,
          bookingId: 88,
          amount: 200,
          paymentMethod: 'Demo',
          status: 'Failed',
          transactionId: null,
          createdAt: '2026-11-12T10:00:00Z',
          paidAt: null
        },
        {
          id: 202,
          bookingId: 88,
          amount: 200,
          paymentMethod: 'Demo',
          status: 'Success',
          transactionId: 'TXN-88',
          createdAt: '2026-11-12T10:05:00Z',
          paidAt: '2026-11-12T10:06:00Z'
        }
      ];

      let recovered: PaymentRecord | undefined;
      service.recoverOrInitiatePayment(88).subscribe({
        next: (p) => (recovered = p)
      });

      const histReq = httpTesting.expectOne(`${apiUrl}/payments/history`);
      histReq.flush({ statusCode: 200, message: 'OK', data: mockHistory });

      expect(recovered?.id).toBe(202);
      expect(recovered?.status).toBe('Success');
      expect(service.activePayment()?.id).toBe(202);
    });

    it('should initiate payment if not found in history', () => {
      let created: PaymentRecord | undefined;
      service.recoverOrInitiatePayment(89).subscribe({
        next: (p) => (created = p)
      });

      const histReq = httpTesting.expectOne(`${apiUrl}/payments/history`);
      histReq.flush({ statusCode: 200, message: 'OK', data: [] });

      const initReq = httpTesting.expectOne(`${apiUrl}/payments/initiate/89`);
      expect(initReq.request.method).toBe('POST');
      initReq.flush({
        statusCode: 200,
        message: 'Payment initiated.',
        data: {
          id: 305,
          bookingId: 89,
          amount: 400,
          paymentMethod: 'Demo',
          status: 'Pending',
          transactionId: null,
          createdAt: '2026-11-12T11:00:00Z',
          paidAt: null
        }
      });

      expect(created?.id).toBe(305);
      expect(created?.bookingId).toBe(89);
      expect(service.activePayment()?.id).toBe(305);
    });

    it('should recover from initiation conflict/error by re-checking history', () => {
      let recovered: PaymentRecord | undefined;
      service.recoverOrInitiatePayment(90).subscribe({
        next: (p) => (recovered = p)
      });

      // 1. Initial history check: empty
      const histReq1 = httpTesting.expectOne(`${apiUrl}/payments/history`);
      histReq1.flush({ statusCode: 200, message: 'OK', data: [] });

      // 2. Initiate fails with 400 (already exists)
      const initReq = httpTesting.expectOne(`${apiUrl}/payments/initiate/90`);
      initReq.flush({ message: 'Payment already exists' }, { status: 400, statusText: 'Bad Request' });

      // 3. Fallback history check finds the record
      const histReq2 = httpTesting.expectOne(`${apiUrl}/payments/history`);
      histReq2.flush({
        statusCode: 200,
        message: 'OK',
        data: [
          {
            id: 309,
            bookingId: 90,
            amount: 200,
            paymentMethod: 'Demo',
            status: 'Pending',
            transactionId: null,
            createdAt: '2026-11-12T11:05:00Z',
            paidAt: null
          }
        ]
      });

      expect(recovered?.id).toBe(309);
      expect(service.activePayment()?.id).toBe(309);
    });
  });
});
