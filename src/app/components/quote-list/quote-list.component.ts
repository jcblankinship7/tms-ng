import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { QuoteService, QuoteRequest, QuoteType, QuoteStatus } from '../../services/quote.service';
import { AuthService } from '../../services/auth.service';
import { CustomerContextService } from '../../services/customer-context.service';
import { CustomerService } from '../../services/customer.service';

@Component({
  selector: 'app-quote-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen">
      <!-- Header -->
      <div class="flex justify-between items-center mb-6 bg-white p-6 rounded-lg shadow-lg" style="border-left: 4px solid #60A5FA;">
        <div>
          <h2 class="text-3xl font-bold uppercase tracking-tight" style="color: #002855;">My Quotes</h2>
          <p class="text-sm font-semibold mt-2 uppercase tracking-wider" style="color: #97999B;">Manage your spot and custom quotes</p>
        </div>
        <a
          routerLink="/customer/new-quote"
          class="px-6 py-3 rounded flex items-center gap-2 font-bold shadow-md transition-all duration-200 uppercase tracking-wider text-sm"
          style="background-color: #003DA5; color: white;"
          onmouseover="this.style.backgroundColor='#002855'"
          onmouseout="this.style.backgroundColor='#003DA5'">
          <span>+</span>
          Request Quote
        </a>
      </div>

      <!-- Filters -->
      <div class="mb-6 bg-white p-5 rounded-lg shadow-md flex gap-4 items-center flex-wrap" style="border: 1px solid #D0D0CE;">
        <div class="flex gap-3">
          @if (activeCustomerQuoteType()) {
            <button
              aria-disabled="true"
              [ngStyle]="{'background-color': activeCustomerQuoteType() === 'Spot' ? '#00A651' : '#6B21A8', 'color': 'white'}"
              class="px-5 py-2.5 rounded font-bold shadow-sm uppercase tracking-wider text-xs cursor-default"
              type="button">
              @if (activeCustomerQuoteType() === 'Spot') {
                All Spot Quotes
              } @else {
                All Custom Quotes
              }
            </button>
          } @else {
            <button
              (click)="filterByType('All')"
              [ngStyle]="selectedType() === 'All' ? {'background-color': '#003DA5', 'color': 'white'} : {'background-color': '#F8F8F8', 'color': '#53565A', 'border': '2px solid #D0D0CE'}"
              class="px-5 py-2.5 rounded font-bold shadow-sm uppercase tracking-wider text-xs transition-all"
              type="button">
              All Quotes
            </button>
          }
        </div>
        <div class="flex gap-2 ml-auto">
          <button
            (click)="filterByStatus('All')"
            [class]="selectedStatus() === 'All'
              ? 'bg-blue-600 text-white px-4 py-2 rounded text-sm'
              : 'bg-gray-200 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-300'"
            type="button">
            All Status
          </button>
          <button
            (click)="filterByStatus('Draft')"
            [class]="selectedStatus() === 'Draft'
              ? 'bg-gray-600 text-white px-4 py-2 rounded text-sm'
              : 'bg-gray-200 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-300'"
            type="button">
            Draft
          </button>
          <button
            (click)="filterByStatus('Quoted')"
            [class]="selectedStatus() === 'Quoted'
              ? 'bg-blue-600 text-white px-4 py-2 rounded text-sm'
              : 'bg-gray-200 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-300'"
            type="button">
            Quoted
          </button>
          <button
            (click)="filterByStatus('Accepted')"
            [class]="selectedStatus() === 'Accepted'
              ? 'bg-green-600 text-white px-4 py-2 rounded text-sm'
              : 'bg-gray-200 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-300'"
            type="button">
            Accepted
          </button>
        </div>
      </div>

      <!-- Loading State -->
      @if (loading()) {
        <div class="text-center py-12 text-gray-500">Loading quotes...</div>
      } @else {

      <!-- Empty State -->
      @if (filteredQuotes().length === 0) {
        <div class="bg-white rounded-lg shadow p-12 text-center">
          <p class="text-gray-500 mb-4">No quotes found</p>
          <a
            routerLink="/customer/new-quote"
            class="text-blue-600 hover:text-blue-800 font-medium">
            Create your first quote request
          </a>
        </div>
      } @else {

      <!-- Quotes Table -->
      <div class="bg-white rounded-lg shadow overflow-hidden">
        <table class="w-full">
          <thead class="bg-gray-100 border-b">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Quote #</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Type</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Route</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Broker</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Created</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Price</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Expires</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
            </tr>
          </thead>

          <tbody class="divide-y">
            @for (quote of filteredQuotes(); track quote.id) {
              <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 text-sm font-medium text-gray-900">
                  {{ quote.quoteNumber }}
                </td>

                <td class="px-6 py-4">
                  <span
                    [class]="quote.quoteType === 'Spot'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-purple-100 text-purple-800'"
                    class="px-2 py-1 text-xs rounded-full font-medium">
                    {{ quote.quoteType }}
                  </span>
                </td>

                <td class="px-6 py-4 text-sm text-gray-600">
                  <div class="font-medium">{{ quote.origin }}</div>
                  <div class="text-xs text-gray-500">→ {{ quote.destination }}</div>
                </td>

                <td class="px-6 py-4 text-sm text-gray-600">
                  {{ quote.brokerCustomerName || '—' }}
                </td>

                <td class="px-6 py-4 text-sm text-gray-600">
                  {{ quote.createdDate }}
                </td>

                <td class="px-6 py-4">
                  <span
                    [class]="getStatusClass(quote.status)"
                    class="px-2 py-1 text-xs rounded-full font-medium">
                    {{ quote.status }}
                  </span>
                </td>

                <td class="px-6 py-4 text-sm font-semibold text-gray-900">
                  @if (quote.quotedPrice) {
                    <div>$ {{ quote.quotedPrice.toFixed(2) }}</div>
                  } @else {
                    <span class="text-gray-400">—</span>
                  }
                  @if (quote.acceptedPrice && quote.acceptedPrice !== quote.quotedPrice) {
                    <div class="text-xs text-green-600">Accepted: $ {{ quote.acceptedPrice.toFixed(2) }}</div>
                  }
                </td>

                <td class="px-6 py-4 text-sm text-gray-600">
                  @if (quote.expiryDate) {
                    {{ quote.expiryDate }}
                  } @else {
                    <span class="text-gray-400">—</span>
                  }
                </td>

                <td class="px-6 py-4 text-sm">
                  @if (isCustomer()) {
                    @if (quote.status === 'Draft') {
                      <div class="flex gap-2">
                        <a
                          (click)="editDraft(quote)"
                          class="text-blue-600 hover:text-blue-800 font-medium cursor-pointer">
                          Edit
                        </a>
                        <button
                          (click)="submitQuote(quote.id)"
                          class="text-green-600 hover:text-green-800 font-medium">
                          Submit
                        </button>
                      </div>
                    } @else if (quote.status === 'Quoted') {
                      <button
                        (click)="acceptQuote(quote.id)"
                        class="text-green-600 hover:text-green-800 font-medium">
                        Accept
                      </button>
                    } @else if (quote.status === 'Accepted') {
                      @if (quote.orderId) {
                        <a
                          [routerLink]="['/customer/order', quote.orderId]"
                          class="text-blue-600 hover:text-blue-800 font-medium">
                          View Order
                        </a>
                      } @else {
                        <span class="text-green-600 font-medium">
                          Accepted
                        </span>
                      }
                    } @else {
                      @if (quote.id) {
                        <a
                          [routerLink]="getQuoteDetailRoute(quote.id)"
                          class="text-gray-600 hover:text-gray-800 font-medium">
                          View Details
                        </a>
                      }
                    }
                  } @else {
                    @if (quote.id) {
                      <a
                        [routerLink]="getQuoteDetailRoute(quote.id)"
                        class="text-blue-600 hover:text-blue-800 font-medium">
                        View Details
                      </a>
                    }
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="9" class="text-center py-12 text-gray-500">
                  No quotes found matching your criteria.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      }
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class QuoteListComponent implements OnInit {
  private quoteService = inject(QuoteService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private customerContextService = inject(CustomerContextService);
  private customerService = inject(CustomerService);

  quotes = signal<QuoteRequest[]>([]);
  filteredQuotes = signal<QuoteRequest[]>([]);
  loading = signal(false);
  selectedType = signal<'All' | QuoteType>('All');
  selectedStatus = signal<'All' | QuoteStatus>('All');
  customerId = signal<string>('');
  isCustomer = signal(false);
  persona = signal<string>('');
  activeCustomerQuoteType = signal<'Spot' | 'Custom' | null>(null);

  ngOnInit(): void {
    const persona = this.authService.getPersona();
    this.persona.set(persona || '');
    this.isCustomer.set(persona === 'Customer');

    // Auto-select status if provided via query params (e.g., after saving a draft)
    this.route.queryParams.subscribe(params => {
      const status = params['status'];
      if (status && (status === 'Draft' || status === 'Quoted' || status === 'Accepted' || status === 'Submitted' || status === 'Rejected' || status === 'Expired')) {
        this.selectedStatus.set(status as any);
      }
    });

    // Initialize from current context and listen for changes
    const ctx = this.customerContextService.getCustomerContext();
    this.customerId.set(String(ctx.customerId || ''));

    // If context includes quoteType (e.g., user selected via profile modal), prefer that to avoid an API call
    if (ctx.quoteType) {
      this.activeCustomerQuoteType.set(ctx.quoteType);
      this.selectedType.set(ctx.quoteType);
    } else if (ctx.customerId) {
      // Otherwise fetch the user's associated customers and find the matching entry (avoids calling GET /api/customers/:id which can be restricted)
      try {
        const userStr = localStorage.getItem('current_user');
        const userId = userStr ? JSON.parse(userStr).id : null;
        if (userId) {
          this.customerService.getCustomersForUser(userId).subscribe({
            next: (list) => {
              const match = list.find(x => String(x.id) === String(ctx.customerId));
              if (match) {
                const qt: any = (match as any).quoteType;
                const isCustomerType = qt === 2 || String(qt).toLowerCase() === 'customer' || String(qt).toLowerCase() === 'custom';
                const typeStr: 'Spot' | 'Custom' = isCustomerType ? 'Custom' : 'Spot';
                this.activeCustomerQuoteType.set(typeStr);
                this.selectedType.set(typeStr);
                return;
              }
              // fallback
              this.activeCustomerQuoteType.set(null);
              this.selectedType.set('All');
            },
            error: (err) => {
              console.warn('Could not load customers for user to determine quote preference', err);
              this.activeCustomerQuoteType.set(null);
              this.selectedType.set('All');
            }
          });
        }
      } catch (e) {
        console.warn('Error while trying to determine customer quote preference', e);
        this.activeCustomerQuoteType.set(null);
        this.selectedType.set('All');
      }
    }

    this.customerContextService.customerContext$.subscribe(c => {
      this.customerId.set(String(c.customerId || ''));

      if (c.customerId) {
        try {
          const userStr = localStorage.getItem('current_user');
          const userId = userStr ? JSON.parse(userStr).id : null;
          if (userId) {
            this.customerService.getCustomersForUser(userId).subscribe({
              next: (list: any[]) => {
                const match = list.find(x => String(x.id) === String(c.customerId));
                if (match) {
                  const qt: any = (match as any).quoteType;
                  const isCustomerType = qt === 2 || String(qt).toLowerCase() === 'customer' || String(qt).toLowerCase() === 'custom';
                  const typeStr: 'Spot' | 'Custom' = isCustomerType ? 'Custom' : 'Spot';
                  this.activeCustomerQuoteType.set(typeStr);
                  this.selectedType.set(typeStr);
                } else {
                  this.activeCustomerQuoteType.set(null);
                  this.selectedType.set('All');
                }
                this.loadQuotes();
              },
              error: (err: any) => {
                console.warn('Could not load customers for user in subscription', err);
                this.activeCustomerQuoteType.set(null);
                this.selectedType.set('All');
                this.loadQuotes();
              }
            });
            return;
          }
        } catch (e) {
          console.warn('Error during customer preference lookup', e);
        }
      }

      this.activeCustomerQuoteType.set(null);
      this.selectedType.set('All');
      this.loadQuotes();
    });

    this.loadQuotes();
  }

  loadQuotes(): void {
    this.loading.set(true);

    if (!this.customerId()) {
      // No active customer yet - clear lists
      this.quotes.set([]);
      this.filteredQuotes.set([]);
      this.loading.set(false);
      return;
    }

    this.quoteService.getQuotesByCustomer(this.customerId()).subscribe({
      next: (data) => {
        this.quotes.set(data);
        // If no explicit type filter is set yet, but all returned quotes are the same type, default to that type
        if (this.selectedType() === 'All' && data && data.length > 0) {
          const types = Array.from(new Set(data.map(d => d.quoteType)));
          if (types.length === 1) {
            this.selectedType.set(types[0] as any);
          }
        }
        this.applyFilters();
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading quotes:', err);
        this.loading.set(false);
      }
    });
  }

  filterByType(type: 'All' | QuoteType): void {
    this.selectedType.set(type);
    this.applyFilters();
  }

  toggleTypeForActiveCustomer(): void {
    const type = this.activeCustomerQuoteType();
    if (!type) {
      this.selectedType.set('All');
      this.applyFilters();
      return;
    }
    if (this.selectedType() === type) {
      this.selectedType.set('All');
    } else {
      this.selectedType.set(type);
    }
    this.applyFilters();
  }

  filterByStatus(status: 'All' | QuoteStatus): void {
    this.selectedStatus.set(status);
    this.applyFilters();
  }

  private applyFilters(): void {
    let filtered = this.quotes();

    if (this.selectedType() !== 'All') {
      filtered = filtered.filter(q => q.quoteType === this.selectedType());
    }

    if (this.selectedStatus() !== 'All') {
      filtered = filtered.filter(q => q.status === this.selectedStatus());
    }

    this.filteredQuotes.set(filtered);
  }

  submitQuote(quoteId: string): void {
    this.quoteService.submitQuote(quoteId).subscribe({
      next: () => {
        this.loadQuotes();
      },
      error: (err) => console.error('Error submitting quote:', err)
    });
  }

  acceptQuote(quoteId: string): void {
    // Navigate to quote detail page where user can accept the quote
    this.router.navigate(['/customer/quotes', quoteId]);
  }

  editDraft(quote: any): void {
    // Navigate to the quote form and pass the quote via navigation state so local-only drafts are editable
    this.router.navigate(['/customer/quote-form', quote.id], { state: { quote } });
  }

  getQuoteDetailRoute(quoteId: string): string[] {
    const persona = this.persona();
    switch(persona) {
      case 'Customer': return ['/customer/quotes', quoteId];
      case 'ServiceProvider': return ['/provider/quotes', quoteId];
      case 'Admin': return ['/admin/quotes', quoteId];
      case 'MarketingManager':
      case 'SalesRep': return ['/sales/quotes', quoteId];
      case 'BillingClerk': return ['/billing/quotes', quoteId];
      case 'SettlementsClerk': return ['/settlements/quotes', quoteId];
      default: return ['/customer/quotes', quoteId];
    }
  }

  getStatusClass(status: QuoteStatus): string {
    const classMap: { [key in QuoteStatus]: string } = {
      'Draft': 'bg-gray-100 text-gray-800',
      'Submitted': 'bg-blue-100 text-blue-800',
      'Quoted': 'bg-blue-100 text-blue-800',
      'Accepted': 'bg-green-100 text-green-800',
      'Rejected': 'bg-red-100 text-red-800',
      'Expired': 'bg-orange-100 text-orange-800'
    };
    return classMap[status] || 'bg-gray-100 text-gray-800';
  }
}
