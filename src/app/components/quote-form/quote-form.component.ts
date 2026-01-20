import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QuoteService } from '../../services/quote.service';

@Component({
  selector: 'app-quote-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quote-form.component.html',
  styleUrls: ['./quote-form.component.scss']
})
export class QuoteFormComponent {
  originZip = signal('');
  destinationZip = signal('');
  loading = signal(false);
  errorMessage = signal('');

  constructor(
    private quoteService: QuoteService,
    private router: Router
  ) {}

  generateQuote(): void {
    if (!this.originZip() || !this.destinationZip()) {
      this.errorMessage.set('Please enter both origin and destination zip codes');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    this.quoteService.createQuote(this.originZip(), this.destinationZip()).subscribe({
      next: (quote) => {
        this.loading.set(false);
        this.router.navigate(['/quote-review'], { state: { quote } });
      },
      error: (err) => {
        console.error('Error generating quote:', err);
        this.errorMessage.set('Failed to generate quote. Please try again.');
        this.loading.set(false);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}