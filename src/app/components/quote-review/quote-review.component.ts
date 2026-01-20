import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { QuoteService } from '../../services/quote.service';
import { OrderService } from '../../services/order.service';
import { Quote, Order } from '../../models/order.model';

@Component({
  selector: 'app-quote-review',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quote-review.component.html',
  styleUrls: ['./quote-review.component.scss']
})
export class QuoteReviewComponent implements OnInit {
  quote = signal<Quote | null>(null);
  loading = signal(false);

  constructor(
    private quoteService: QuoteService,
    private orderService: OrderService,
    private router: Router
  ) {
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state) {
      this.quote.set(navigation.extras.state['quote']);
    }
  }

  ngOnInit(): void {
    if (!this.quote()) {
      this.router.navigate(['/new-quote']);
    }
  }

  acceptQuote(): void {
    const currentQuote = this.quote();
    if (!currentQuote) return;

    this.loading.set(true);
    const newOrder: Order = {
      id: `ORD-${Date.now()}`,
      customerId: 'CUST-001',
      status: 'Active',
      createdDate: new Date().toISOString().split('T')[0],
      totalPrice: currentQuote.price,
      moves: currentQuote.moves
    };

    this.orderService.createOrder(newOrder).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/']);
      },
      error: (err) => {
        console.error('Error creating order:', err);
        this.loading.set(false);
      }
    });
  }

  rejectQuote(): void {
    const currentQuote = this.quote();
    if (!currentQuote) return;

    this.loading.set(true);
    this.quoteService.createMissedOpportunity(currentQuote).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/']);
      },
      error: (err) => {
        console.error('Error creating missed opportunity:', err);
        this.loading.set(false);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/new-quote']);
  }
}