import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { QuoteService } from '../../services/quote.service';
import { ToastService } from '../../services/toast.service';

interface OrderConfirmState {
  quoteId: string;
  payload: any;
  returnUrl?: string;
}

@Component({
  selector: 'app-order-confirm',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './order-confirm.component.html',
  styleUrl: './order-confirm.component.scss'
})
export class OrderConfirmComponent implements OnInit {
  private router = inject(Router);
  private location = inject(Location);
  private quoteService = inject(QuoteService);
  private toastService = inject(ToastService);

  loading = signal(false);
  errorMessage = signal('');

  state = signal<OrderConfirmState | null>(null);

  ngOnInit(): void {
    const nav = this.router.getCurrentNavigation();
    const state = (nav?.extras?.state as OrderConfirmState) || (window as any).history?.state as OrderConfirmState;

    if (!state || !state.quoteId || !state.payload) {
      this.errorMessage.set('Order confirmation data not found. Please return to the quote and try again.');
      return;
    }

    this.state.set(state);
  }

  get origin(): any {
    return this.state()?.payload?.Origin || {};
  }

  get destination(): any {
    return this.state()?.payload?.Destination || {};
  }

  get appointmentDetails(): any {
    return this.state()?.payload || {};
  }

  goBack(): void {
    const returnUrl = this.state()?.returnUrl;
    if (returnUrl) {
      this.router.navigateByUrl(returnUrl);
      return;
    }
    this.location.back();
  }

  saveOrder(): void {
    const state = this.state();
    if (!state) return;

    this.loading.set(true);
    this.errorMessage.set('');

    this.quoteService.createOrderFromQuote(state.quoteId, state.payload).subscribe({
      next: (response) => {
        this.loading.set(false);
        this.toastService.show('Order created', 3000);

        if (response && response.order) {
          this.router.navigate(['/customer/order', response.orderId], { state: { order: response.order } });
        } else {
          this.router.navigate(['/customer/order', response.orderId]);
        }
      },
      error: (err) => {
        console.error('Error creating order:', err);
        this.loading.set(false);
        this.errorMessage.set('Failed to create order. Please try again.');
      }
    });
  }
}
