import { Component, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { PaymentService } from '../../core/services/payment.service';
import { AuthService } from '../../core/services/auth.service';
import { PaymentRecord } from '../../core/models/payment.model';

export type PaymentFilterTab = 'all' | 'success' | 'pending' | 'failed';

@Component({
  selector: 'app-payment-history',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    NavbarComponent,
    FooterComponent
  ],
  templateUrl: './payment-history.component.html',
  styleUrl: './payment-history.component.scss'
})
export class PaymentHistoryComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly paymentService = inject(PaymentService);
  private readonly authService = inject(AuthService);

  readonly payments = signal<PaymentRecord[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);
  readonly activeTab = signal<PaymentFilterTab>('all');

  // Filtered payments list
  readonly filteredPayments = computed(() => {
    const list = this.payments();
    const tab = this.activeTab();

    if (tab === 'all') return list;
    if (tab === 'success') return list.filter(p => p.status === 'Success');
    if (tab === 'pending') return list.filter(p => p.status === 'Pending');
    if (tab === 'failed') return list.filter(p => p.status === 'Failed');
    return list;
  });

  // Tab counts
  readonly tabCounts = computed(() => {
    const list = this.payments();
    return {
      all: list.length,
      success: list.filter(p => p.status === 'Success').length,
      pending: list.filter(p => p.status === 'Pending').length,
      failed: list.filter(p => p.status === 'Failed').length
    };
  });

  // Summary Metrics
  readonly totalPaidAmount = computed(() => {
    return this.payments()
      .filter(p => p.status === 'Success')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  });

  ngOnInit(): void {
    this.loadPaymentHistory();
  }

  loadPaymentHistory(): void {
    if (!this.authService.isCustomerAuthenticated()) {
      this.payments.set([]);
      this.isLoading.set(false);
      this.errorMessage.set('Please log in with your customer account to view payment history.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.paymentService.getPaymentHistory()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          // Sort payments newest first (by id descending or createdAt descending)
          const sorted = [...(data || [])].sort((a, b) => {
            const timeA = new Date(a.createdAt).getTime() || 0;
            const timeB = new Date(b.createdAt).getTime() || 0;
            return timeB - timeA || (b.id - a.id);
          });
          this.payments.set(sorted);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.isLoading.set(false);
          if (err && typeof err === 'object' && 'status' in err) {
            const status = (err as { status: number }).status;
            if (status === 401) {
              this.errorMessage.set('Your session has expired. Please log in again to view your payments.');
              return;
            }
            if (status === 403) {
              this.errorMessage.set('You are not authorized to view customer payment records.');
              return;
            }
            if (status === 0) {
              this.errorMessage.set('Unable to reach payment records service. Please check your network connection.');
              return;
            }
          }
          this.errorMessage.set('Failed to retrieve payment records. Please try again.');
        }
      });
  }

  setTab(tab: PaymentFilterTab): void {
    this.activeTab.set(tab);
  }
}

