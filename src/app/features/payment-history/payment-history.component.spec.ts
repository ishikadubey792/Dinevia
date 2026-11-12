import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { PaymentHistoryComponent } from './payment-history.component';
import { PaymentService } from '../../core/services/payment.service';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';
import { PaymentRecord } from '../../core/models/payment.model';

describe('PaymentHistoryComponent Customer Financial Records & Filtering', () => {
  let fixture: ComponentFixture<PaymentHistoryComponent>;
  let component: PaymentHistoryComponent;
  let httpTesting: HttpTestingController;
  let authService: AuthService;

  const mockPayments: PaymentRecord[] = [
    {
      id: 101,
      bookingId: 401,
      amount: 200,
      paymentMethod: 'Demo Payment Guarantee',
      status: 'Success',
      transactionId: 'TXN-401-SUCCESS',
      createdAt: '2026-11-12T10:00:00Z',
      paidAt: '2026-11-12T10:05:00Z'
    },
    {
      id: 102,
      bookingId: 402,
      amount: 400,
      paymentMethod: 'Demo Payment Guarantee',
      status: 'Pending',
      transactionId: null,
      createdAt: '2026-11-12T11:00:00Z',
      paidAt: null
    },
    {
      id: 103,
      bookingId: 403,
      amount: 100,
      paymentMethod: 'Demo Payment Guarantee',
      status: 'Failed',
      transactionId: null,
      createdAt: '2026-11-12T12:00:00Z',
      paidAt: null
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentHistoryComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PaymentHistoryComponent);
    component = fixture.componentInstance;
    httpTesting = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
  });

  afterEach(() => {
    httpTesting.verify();
    authService.clearCustomerSession();
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }
  });

  function loginCustomer(id = 88): void {
    authService.setCustomerSession({
      id,
      name: 'Ishika Guest',
      email: 'ishika@test.com',
      accessToken:
        'header.' +
        btoa(JSON.stringify({ role: 'Customer', exp: Math.floor(Date.now() / 1000) + 3600 })) +
        '.sig'
    });
  }

  it('should not query backend if customer is unauthenticated', () => {
    authService.clearCustomerSession();
    fixture.detectChanges();

    expect(component.payments()).toEqual([]);
    expect(component.isLoading()).toBe(false);
    expect(component.errorMessage()).toContain('Please log in with your customer account');
    httpTesting.expectNone(`${environment.apiUrl}/payments/history`);
  });

  it('should load real customer payment records from backend and render fields', () => {
    loginCustomer(88);
    fixture.detectChanges();

    const histReq = httpTesting.expectOne(`${environment.apiUrl}/payments/history`);
    expect(histReq.request.method).toBe('GET');
    histReq.flush({
      statusCode: 200,
      message: 'OK',
      data: mockPayments
    });
    fixture.detectChanges();

    expect(component.isLoading()).toBe(false);
    expect(component.payments().length).toBe(3);
    expect(component.totalPaidAmount()).toBe(200);

    expect(component.tabCounts()).toEqual({
      all: 3,
      success: 1,
      pending: 1,
      failed: 1
    });

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Payment #101');
    expect(text).toContain('DV-401');
    expect(text).toContain('TXN-401-SUCCESS');
    expect(text).toContain('₹200');
    expect(text).toContain('₹400');
    expect(text).toContain('₹100');
  });

  it('should filter payments by status tabs', () => {
    loginCustomer(88);
    fixture.detectChanges();

    const histReq = httpTesting.expectOne(`${environment.apiUrl}/payments/history`);
    histReq.flush({ statusCode: 200, message: 'OK', data: mockPayments });
    fixture.detectChanges();

    // All tab
    expect(component.filteredPayments().length).toBe(3);

    // Success tab
    component.setTab('success');
    expect(component.filteredPayments().map(p => p.id)).toEqual([101]);

    // Pending tab
    component.setTab('pending');
    expect(component.filteredPayments().map(p => p.id)).toEqual([102]);

    // Failed tab
    component.setTab('failed');
    expect(component.filteredPayments().map(p => p.id)).toEqual([103]);
  });

  it('should render action links according to payment status', () => {
    loginCustomer(88);
    fixture.detectChanges();

    httpTesting.expectOne(`${environment.apiUrl}/payments/history`).flush({
      statusCode: 200,
      message: 'OK',
      data: mockPayments
    });
    fixture.detectChanges();

    const successCard = fixture.nativeElement.querySelector('.payment-card-success');
    expect(successCard.textContent).toContain('View Booking Receipt');

    const pendingCard = fixture.nativeElement.querySelector('.payment-card-pending');
    expect(pendingCard.textContent).toContain('Complete Payment');
    expect(pendingCard.textContent).toContain('View Booking Details');

    const failedCard = fixture.nativeElement.querySelector('.payment-card-failed');
    expect(failedCard.textContent).toContain('Retry Payment');
  });

  it('should handle API error gracefully and allow retrying', () => {
    loginCustomer(88);
    fixture.detectChanges();

    const histReq = httpTesting.expectOne(`${environment.apiUrl}/payments/history`);
    histReq.flush(
      { message: 'Internal Server Error' },
      { status: 500, statusText: 'Server Error' }
    );
    fixture.detectChanges();

    expect(component.isLoading()).toBe(false);
    expect(component.errorMessage()).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.error-stage')).toBeTruthy();

    // Retry
    component.loadPaymentHistory();
    const retryReq = httpTesting.expectOne(`${environment.apiUrl}/payments/history`);
    retryReq.flush({ statusCode: 200, message: 'OK', data: [mockPayments[0]] });
    fixture.detectChanges();

    expect(component.errorMessage()).toBeNull();
    expect(component.payments().length).toBe(1);
    expect(component.isLoading()).toBe(false);
  });

  it('should render empty state when payment records array is empty', () => {
    loginCustomer(88);
    fixture.detectChanges();

    httpTesting.expectOne(`${environment.apiUrl}/payments/history`).flush({
      statusCode: 200,
      message: 'OK',
      data: []
    });
    fixture.detectChanges();

    expect(component.payments().length).toBe(0);
    const emptyCard = fixture.nativeElement.querySelector('.empty-payments-card');
    expect(emptyCard).toBeTruthy();
    expect(emptyCard.textContent).toContain('No Payment Records on File');
  });
});
