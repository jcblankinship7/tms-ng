import { Component, OnInit, signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { QuoteService } from '../../services/quote.service';
import { OrderService } from '../../services/order.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { Quote, Order } from '../../models/order.model';
import { QuoteRequest } from '../../services/quote.service';
import { CustomerService } from '../../services/customer.service';

@Component({
  selector: 'app-quote-review',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quote-review.component.html',
  styleUrls: ['./quote-review.component.scss']
})
export class QuoteReviewComponent implements OnInit {
  quote = signal<any | null>(null);
  loading = signal(false);
  errorMessage = signal('');
  isCustomerPersona = signal(false);
  isAdminOrMarketingManager = signal(false);

  constructor(
    private quoteService: QuoteService,
    private orderService: OrderService,
    private authService: AuthService,
    private toastService: ToastService,
    private router: Router,
    private route: ActivatedRoute,
    private customerService: CustomerService
  ) {
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras?.state && navigation.extras.state['quote']) {
      this.quote.set(navigation.extras.state['quote']);
    } else if ((window as any).history && (window as any).history.state && (window as any).history.state['quote']) {
      // When navigating to the same route, getCurrentNavigation() may be null; use history.state as fallback
      this.quote.set((window as any).history.state['quote']);
    }
  }

  ngOnInit(): void {
    if (!this.quote()) {
      // Try to get quote from history state first (handles same-route navigations)
      const historyQuote = (window as any).history?.state?.quote;
      if (historyQuote) {
        this.quote.set(historyQuote);
      } else {
        // If an id is present in query params, try to load that quote. Otherwise, go back to the new-quote form under /customer
        const id = this.route.snapshot.queryParamMap.get('id');
        if (id) {
          this.loading.set(true);
          this.quoteService.getQuoteById(id).subscribe({
            next: (q) => { this.quote.set(q); this.loading.set(false); },
            error: (err) => { console.error('Error loading quote by id in QuoteReview', err); this.loading.set(false); this.router.navigate(['/customer/new-quote']); }
          });
        } else {
          this.router.navigate(['/customer/new-quote']);
          return;
        }
      }
    }

    // Check user persona
    const persona = this.authService.getPersona();
    this.isCustomerPersona.set(persona === 'Customer');
    this.isAdminOrMarketingManager.set(persona === 'Admin' || persona === 'MarketingManager');
  }

  acceptQuote(): void {
    const currentQuote = this.quote();
    if (!currentQuote) return;

    // Only customers can create orders
    if (!this.isCustomerPersona()) {
      this.errorMessage.set('Only customers can create orders. Please log in as a customer or contact your broker.');
      return;
    }

    if (currentQuote.totalPrice <= 0) {
      this.errorMessage.set('No rail rate was found for this quote. Please adjust your locations and try again.');
      return;
    }

    // Navigate to accept-quote flow so user can fill appointment details
    const id = (currentQuote as any).id;
    if (id) {
      this.router.navigate(['/customer/accept-quote', id], { state: { quote: currentQuote } });
    } else {
      // Preview-only quote: pass via navigation state
      this.router.navigate(['/customer/accept-quote'], { state: { quote: currentQuote } });
    }
  }


  // Save the current preview as a server-side draft
  saveAsDraft(): void {
    const currentQuote = this.quote();
    if (!currentQuote) return;

    if (!this.isCustomerPersona()) {
      this.errorMessage.set('Only customers can save drafts.');
      return;
    }

    this.loading.set(true);

    // Normalize payload for server draft endpoint
    const origin = (currentQuote as any).origin ?? (currentQuote.moves && currentQuote.moves.length > 0 ? currentQuote.moves[0].origin.zip : undefined);
    const destination = (currentQuote as any).destination ?? (currentQuote.moves && currentQuote.moves.length > 0 ? currentQuote.moves[currentQuote.moves.length - 1].destination.zip : undefined);
    // Use brokerCustomerId or customerId to determine the active customer for draft payloads
    const customerId = (currentQuote as any).customerId ?? (currentQuote as any).brokerCustomerId ?? undefined;
    const quoteType = (currentQuote as any).quoteType ?? 'Spot';

    const payload: any = {
      quoteType: quoteType,
      status: 'Draft',
      origin: origin,
      destination: destination,
      notes: (currentQuote as any).notes || undefined,
      shipmentDetails: (currentQuote as any).shipmentDetails || undefined,
      weight: (currentQuote as any).weight || undefined,
      totalPrice: (currentQuote as any).totalPrice ?? (currentQuote as any).quotedPrice ?? 0
    };

    // Do not attach a persistent beneficial owner id to the quote. Keep a free-form beneficial owner value in the UI only.
    // Broker will be resolved from user associations and attached to the payload when available.

    // Resolve broker customer from the current user's associated customers and attach brokerCustomerId + brokerCustomerName when found
    const id = (currentQuote as any)?.id;
    const isGuid = id && /^[0-9a-fA-F\-]{36}$/.test(id || '');

    try {
      const userStr = localStorage.getItem('current_user');
      const userId = userStr ? JSON.parse(userStr).id : null;
      if (userId) {
        this.customerService.getCustomersForUser(userId).subscribe({
          next: (list) => {
            const broker = list.find(c => c.type === 5); // CustomerType.Broker
            if (broker) {
              payload.brokerCustomerId = broker.id;
              payload.brokerCustomerName = broker.name;
            }
            // proceed to create or update draft
            if (isGuid) this._updateDraftAndNavigate(id, payload);
            else this._createDraftAndNavigate(payload);
          },
          error: (err) => {
            console.warn('Could not resolve broker for user while saving draft:', err);
            if (isGuid) this._updateDraftAndNavigate(id, payload);
            else this._createDraftAndNavigate(payload);
          }
        });
      } else {
        if (isGuid) this._updateDraftAndNavigate(id, payload);
        else this._createDraftAndNavigate(payload);
      }
    } catch (e) {
      console.warn('Error resolving broker for draft payload', e);
      if (isGuid) this._updateDraftAndNavigate(id, payload);
      else this._createDraftAndNavigate(payload);
    }
  }

  private _createDraftAndNavigate(payload: any): void {
    this.quoteService.createQuoteRequest(payload as any).subscribe({
      next: (created) => {
        this.loading.set(false);
        this.toastService.show('Draft saved');

        // Persist a lightweight local draft for immediate visibility in the quotes list
        try {
          const userStr = localStorage.getItem('current_user');
          const userId = userStr ? JSON.parse(userStr).id : 'anonymous';
          const key = `quoteDrafts:${userId}`;
          const stored = localStorage.getItem(key);

          // Normalize created draft response into frontend QuoteRequest shape for local storage
          const draftPreview: any = {
            id: String(created.id || `DRAFT-${Date.now()}`),
            customerId: String((created as any).brokerCustomerId || (created as any).customerId || ''),
            brokerCustomerId: (created as any).brokerCustomerId || undefined,
            brokerCustomerName: (created as any).brokerCustomerName || undefined,
            quoteNumber: created.quoteNumber || '',
            quoteType: (created as any).quoteType || 'Custom',
            status: 'Draft',
            createdDate: created.createdDate || new Date().toISOString().split('T')[0],
            origin: (created as any).origin || '',
            destination: (created as any).destination || '',
            totalPrice: (created as any).totalPrice ?? (created as any).quotedPrice ?? 0,
            moves: (created as any).moves || [],
            notes: (created as any).notes || undefined
          };

          let drafts: any[] = [];
          if (stored) {
            drafts = JSON.parse(stored);
          }
          drafts.unshift(draftPreview);
          localStorage.setItem(key, JSON.stringify(drafts));
        } catch (e) {
          console.warn('Could not persist local draft preview', e);
        }

        // Navigate to the quotes list filtered to Drafts and ensure navigation succeeds
        this.router.navigate(['/customer/quotes'], { queryParams: { status: 'Draft' } }).then(ok => {
          if (!ok) {
            // Navigation failed - show a toast and keep user on review page so they don't get redirected unexpectedly
            this.toastService.show('Draft saved but could not navigate to My Quotes. You can view drafts from the Quotes page.');
            console.warn('Navigation to /customer/quotes failed after saving draft');
          }
        });
      },
      error: (err) => {
        console.error('Error saving draft:', err);
        this.errorMessage.set(err?.error?.message || 'Failed to save draft. Please try again.');
        this.loading.set(false);
      }
    });
  }

  private _updateDraftAndNavigate(id: string, payload: any): void {
    this.quoteService.updateQuote(id, payload).subscribe({
      next: (updated) => {
        this.loading.set(false);
        this.toastService.show('Draft updated');

        // Update local persisted draft preview if present
        try {
          const userStr = localStorage.getItem('current_user');
          const userId = userStr ? JSON.parse(userStr).id : 'anonymous';
          const key = `quoteDrafts:${userId}`;
          const stored = localStorage.getItem(key);

          if (stored) {
            const drafts: any[] = JSON.parse(stored);
            const idx = drafts.findIndex(d => String(d.id) === String(id));
            const updatedPreview: any = {
              id: String(updated?.id || id),
              customerId: String((updated as any).beneficialOwnerId || (updated as any).brokerCustomerId || (updated as any).customerId || ''),
              brokerCustomerId: (updated as any).brokerCustomerId || (updated as any).beneficialOwnerId || undefined,
              brokerCustomerName: (updated as any).brokerCustomerName || undefined,
              quoteNumber: updated?.quoteNumber || '',
              quoteType: (updated as any).quoteType || 'Custom',
              status: 'Draft',
              createdDate: updated?.createdDate || new Date().toISOString().split('T')[0],
              origin: (updated as any).origin || payload.origin || '',
              destination: (updated as any).destination || payload.destination || '',
              totalPrice: (updated as any).totalPrice ?? payload.totalPrice ?? 0,
              moves: (updated as any).moves || [],
              notes: (updated as any).notes || payload.notes || undefined
            };
            if (idx >= 0) drafts[idx] = updatedPreview;
            else drafts.unshift(updatedPreview);
            localStorage.setItem(key, JSON.stringify(drafts));
          }
        } catch (e) {
          console.warn('Could not persist local draft preview update', e);
        }

        this.router.navigate(['/customer/quotes'], { queryParams: { status: 'Draft' } });
      },
      error: (err) => {
        console.error('Error updating draft:', err);
        this.errorMessage.set(err?.error?.message || 'Failed to update draft. Please try again.');
        this.loading.set(false);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/customer/new-quote']);
  }

  canAcceptQuote(): boolean {
    const currentQuote = this.quote();
    return !!currentQuote && currentQuote.totalPrice > 0 && !this.loading() && this.isCustomerPersona();
  }
}