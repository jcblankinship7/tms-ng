import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { QuoteService, QuoteRequest } from '../../services/quote.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-quote-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quote-detail.component.html',
  styleUrl: './quote-detail.component.scss'
})
export class QuoteDetailComponent implements OnInit {
  private quoteService = inject(QuoteService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  quote = signal<QuoteRequest | null>(null);
  loading = signal(true);
  isCustomer = signal(false);
  errorMessage = signal('');

  ngOnInit(): void {
    const quoteId = this.route.snapshot.paramMap.get('id');
    const persona = this.authService.getPersona();
    
    // Check if user is a customer
    this.isCustomer.set(persona === 'Customer');

    if (quoteId) {
      this.loadQuote(quoteId);
    } else {
      this.loading.set(false);
      this.errorMessage.set('Quote ID not found');
    }
  }

  private loadQuote(quoteId: string): void {
    this.quoteService.getQuoteById(quoteId).subscribe({
      next: (quote) => {
        this.quote.set(quote || null);
        this.loading.set(false);
        if (!quote) {
          this.errorMessage.set('Quote not found');
        }
      },
      error: (err) => {
        console.error('Error loading quote:', err);
        this.errorMessage.set('Failed to load quote');
        this.loading.set(false);
      }
    });
  }

  getStatusColor(status: string): string {
    const colorMap: { [key: string]: string } = {
      'Draft': 'bg-gray-100 text-gray-800',
      'Submitted': 'bg-blue-100 text-blue-800',
      'Quoted': 'bg-yellow-100 text-yellow-800',
      'Accepted': 'bg-green-100 text-green-800',
      'Rejected': 'bg-red-100 text-red-800',
      'Expired': 'bg-orange-100 text-orange-800'
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  }

  acceptQuote(): void {
    const quote = this.quote();
    if (!quote) return;

    if (quote.quoteType === 'Spot') {
      // Navigate to order creation component for spot quotes
      this.router.navigate(['/customer/accept-quote', quote.id]);
    } else {
      // For custom quotes, order details are already saved
      this.router.navigate(['/customer/accept-quote', quote.id]);
    }
  }

  rejectQuote(): void {
    const quote = this.quote();
    if (!quote) return;

    if (confirm('Are you sure you want to reject this quote?')) {
      this.quoteService.rejectQuote(quote.id).subscribe({
        next: () => {
          this.router.navigate(['/customer/quotes']);
        },
        error: (err) => {
          console.error('Error rejecting quote:', err);
          this.errorMessage.set('Failed to reject quote');
        }
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/customer/quotes']);
  }
}
