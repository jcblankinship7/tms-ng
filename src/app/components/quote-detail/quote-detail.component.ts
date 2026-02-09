import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { QuoteService, QuoteRequest } from '../../services/quote.service';
import { AddressLookupService, AddressSuggestion } from '../../services/address-lookup.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

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
  private addressLookup = inject(AddressLookupService);
  private toastService = inject(ToastService);

  quote = signal<QuoteRequest | null>(null);
  loading = signal(true);
  isCustomer = signal(false);
  errorMessage = signal('');

  // Held-quote create modal and verification state
  showHeldCreateModal = signal(false);

  heldOriginName = signal<string>('');
  heldOriginAddress = signal<string>('');
  heldOriginVerified = signal<boolean | null>(null);
  heldOriginTopSuggestion = signal<AddressSuggestion | null>(null);
  heldOriginSuggestions = signal<AddressSuggestion[]>([]);
  showHeldOriginSuggestions = signal(false);

  heldDestinationName = signal<string>('');
  heldDestinationAddress = signal<string>('');
  heldDestinationVerified = signal<boolean | null>(null);
  heldDestinationTopSuggestion = signal<AddressSuggestion | null>(null);
  heldDestinationSuggestions = signal<AddressSuggestion[]>([]);
  showHeldDestinationSuggestions = signal(false);

  heldCustomerShipmentNumber = signal<string>('');
  heldContainerNumber = signal<string>('');

  // Appointment defaults
  pickupAppointmentDate = signal<string>('');
  pickupAppointmentTime = signal<string>('');


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

    // Prepare default pickup date (tomorrow)
    const today = new Date();
    today.setHours(0,0,0,0);
    const min = new Date(today);
    min.setDate(today.getDate() + 1);
    const yyyy = min.getFullYear();
    const mm = String(min.getMonth() + 1).padStart(2, '0');
    const dd = String(min.getDate()).padStart(2, '0');
    this.pickupAppointmentDate.set(`${yyyy}-${mm}-${dd}`);
    // default time to 09:00
    this.pickupAppointmentTime.set('09:00');
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
      'On Hold': 'bg-orange-100 text-orange-800',
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

  openHeldCreateModal(): void {
    const q = this.quote();
    if (!q) return;
    // Load held modal addresses from quote
    if (q.moves && q.moves.length > 0) {
      const origin = q.moves[0].origin;
      const dest = q.moves[q.moves.length - 1].destination;
      this.heldOriginName.set((origin as any)?.name || '');
      this.heldOriginAddress.set(origin?.address || '');
      this.heldDestinationName.set((dest as any)?.name || '');
      this.heldDestinationAddress.set(dest?.address || '');
    }
    this.heldOriginVerified.set(null);
    this.heldDestinationVerified.set(null);
    this.heldOriginTopSuggestion.set(null);
    this.heldDestinationTopSuggestion.set(null);
    this.heldCustomerShipmentNumber.set('');
    this.heldContainerNumber.set('');
    this.showHeldCreateModal.set(true);
  }

  closeHeldCreateModal(): void {
    this.showHeldCreateModal.set(false);
  }

  // Return emoji to represent whether the quote contains any rail moves (🚂) or default truck (🚚)
  private addressTokens(s: string | null | undefined): string[] {
    return ((s || '').toLowerCase().match(/\w+/g) || []);
  }

  private allAddressTokensPresent(input: string | null | undefined, candidate: string | null | undefined): boolean {
    const tokens = this.addressTokens(input);
    if (!tokens || tokens.length === 0) return false;
    const cand = (candidate || '').toLowerCase();
    return tokens.every(t => cand.includes(t));
  }

  verifyHeldOriginAddress(): void {
    const address = this.heldOriginAddress();
    if (!address || address.length < 3) { this.heldOriginVerified.set(false); this.heldOriginTopSuggestion.set(null); return; }
    const q = this.quote();
    const city = q?.moves && q.moves.length > 0 && q.moves[0].origin ? q.moves[0].origin.city : '';
    const state = q?.moves && q.moves.length > 0 && q.moves[0].origin ? q.moves[0].origin.state : '';
    const zip = q?.moves && q.moves.length > 0 && q.moves[0].origin ? q.moves[0].origin.zip : '';
    this.addressLookup.searchAddresses(address).subscribe((results: AddressSuggestion[]) => {
      const filtered = results.filter((r: AddressSuggestion) => this.matchesQuoteLocationInDetail(r, city || null, state || null, zip || null));
      // Preserve all filtered suggestions and show them to the user
      this.heldOriginSuggestions.set(filtered || []);
      this.showHeldOriginSuggestions.set((filtered && filtered.length > 0));

      if (filtered && filtered.length > 0) {
        const top = filtered[0];
        const aMatch = this.allAddressTokensPresent(address, top.displayName) || this.allAddressTokensPresent(address, top.address);
        if (aMatch) {
          // If a strong match, auto-select and hide list
          this.heldOriginAddress.set(top.displayName || top.address);
          this.heldOriginVerified.set(true);
          this.heldOriginTopSuggestion.set(null);
          this.heldOriginSuggestions.set([]);
          this.showHeldOriginSuggestions.set(false);
        } else {
          // Weak matches: keep list visible and show a gentle message
          this.heldOriginVerified.set(false);
          this.heldOriginTopSuggestion.set(top);
        }
      } else {
        this.heldOriginVerified.set(false);
        this.heldOriginTopSuggestion.set(null);
      }
    }, () => {
      this.heldOriginVerified.set(false);
      this.heldOriginTopSuggestion.set(null);
      this.heldOriginSuggestions.set([]);
      this.showHeldOriginSuggestions.set(false);
    });
  }

  selectHeldOriginSuggestion(s: AddressSuggestion | null): void {
    if (!s) return;
    this.heldOriginAddress.set(s.displayName || s.address);
    this.heldOriginVerified.set(true);
    this.heldOriginTopSuggestion.set(null);
    // Clear suggestions list after selection
    this.heldOriginSuggestions.set([]);
    this.showHeldOriginSuggestions.set(false);
  }

  verifyHeldDestinationAddress(): void {
    const address = this.heldDestinationAddress();
    if (!address || address.length < 3) { this.heldDestinationVerified.set(false); this.heldDestinationTopSuggestion.set(null); return; }
    const q = this.quote();
    const lastMove = q?.moves && q.moves.length > 0 ? q.moves[q.moves.length - 1] : null;
    const city = lastMove?.destination?.city || '';
    const state = lastMove?.destination?.state || '';
    const zip = lastMove?.destination?.zip || '';
    this.addressLookup.searchAddresses(address).subscribe((results: AddressSuggestion[]) => {
      const filtered = results.filter((r: AddressSuggestion) => this.matchesQuoteLocationInDetail(r, city || null, state || null, zip || null));
      // Preserve all filtered suggestions and show them
      this.heldDestinationSuggestions.set(filtered || []);
      this.showHeldDestinationSuggestions.set((filtered && filtered.length > 0));

      if (filtered && filtered.length > 0) {
        const top = filtered[0];
        const aMatch = this.allAddressTokensPresent(address, top.displayName) || this.allAddressTokensPresent(address, top.address);
        if (aMatch) {
          this.heldDestinationAddress.set(top.displayName || top.address);
          this.heldDestinationVerified.set(true);
          this.heldDestinationTopSuggestion.set(null);
          this.heldDestinationSuggestions.set([]);
          this.showHeldDestinationSuggestions.set(false);
        } else {
          this.heldDestinationVerified.set(false);
          this.heldDestinationTopSuggestion.set(top);
        }
      } else {
        this.heldDestinationVerified.set(false);
        this.heldDestinationTopSuggestion.set(null);
      }
    }, () => {
      this.heldDestinationVerified.set(false);
      this.heldDestinationTopSuggestion.set(null);
      this.heldDestinationSuggestions.set([]);
      this.showHeldDestinationSuggestions.set(false);
    });
  }

  selectHeldDestinationSuggestion(s: AddressSuggestion | null): void {
    if (!s) return;
    this.heldDestinationAddress.set(s.displayName || s.address);
    this.heldDestinationVerified.set(true);
    this.heldDestinationTopSuggestion.set(null);
    this.heldDestinationSuggestions.set([]);
    this.showHeldDestinationSuggestions.set(false);
  }

  private matchesQuoteLocationInDetail(s: AddressSuggestion, qCity: string | null, qState: string | null, qZip: string | null): boolean {
    if ((!qCity || qCity.trim() === '') && (!qState || qState.trim() === '') && (!qZip || qZip.trim() === '')) return true;
    const cityMatch = qCity ? (s.city || '').toLowerCase() === qCity.toLowerCase() : true;
    const stateMatch = qState ? (s.state || '').toLowerCase() === qState.toLowerCase() : true;
    const zipMatch = qZip ? (s.zip || '') === qZip : true;
    return cityMatch && stateMatch && zipMatch;
  }

  createOrderFromHeldQuote(): void {
    const q = this.quote();
    if (!q || !q.id) return;
    if (!this.heldOriginName().trim() || !this.heldDestinationName().trim()) {
      this.toastService.show('Please enter origin and destination location names', 3000);
      return;
    }
    if (!this.pickupAppointmentDate() || !this.pickupAppointmentTime()) {
      this.errorMessage.set('Please set pickup date and time');
      return;
    }

    const appointmentDetails = {
      pickupAppointmentDate: this.pickupAppointmentDate(),
      pickupAppointmentTime: this.pickupAppointmentTime(),
      deliveryAppointmentDate: '',
      deliveryAppointmentTime: ''
    };

    // Build payload with held modal verified addresses (if present)
    const payload: any = {
      ...appointmentDetails,
      CustomerReference: this.heldCustomerShipmentNumber().trim() || undefined,
      ContainerNumber: this.heldContainerNumber().trim() || undefined
    };
    if (this.heldOriginVerified() === true) {
      payload.Origin = {
        name: this.heldOriginName(),
        address: this.heldOriginAddress(),
        // city/state/zip from quote's origin if available
        city: q.moves && q.moves.length > 0 ? q.moves[0].origin?.city : undefined,
        state: q.moves && q.moves.length > 0 ? q.moves[0].origin?.state : undefined,
        zip: q.moves && q.moves.length > 0 ? q.moves[0].origin?.zip : undefined
      };
    }
    if (this.heldDestinationVerified() === true) {
      payload.Destination = {
        name: this.heldDestinationName(),
        address: this.heldDestinationAddress(),
        city: q.moves && q.moves.length > 0 ? q.moves[q.moves.length - 1].destination?.city : undefined,
        state: q.moves && q.moves.length > 0 ? q.moves[q.moves.length - 1].destination?.state : undefined,
        zip: q.moves && q.moves.length > 0 ? q.moves[q.moves.length - 1].destination?.zip : undefined
      };
    }

    this.showHeldCreateModal.set(false);
    this.router.navigate(['/customer/confirm-order'], {
      state: {
        quoteId: q.id,
        payload,
        returnUrl: `/customer/quotes/${q.id}`
      }
    });
  }

  openAcceptQuoteFromHeld(): void {
    const q = this.quote();
    if (!q) return;

    const navState: any = { quote: q };

    if (this.heldOriginVerified() === true) {
      navState.verifiedAddresses = navState.verifiedAddresses || {};
      navState.verifiedAddresses.origin = {
        address: this.heldOriginAddress(),
        // Pull city/state/zip from quote origin as fallback
        city: q.moves && q.moves.length > 0 && q.moves[0].origin ? q.moves[0].origin.city : '',
        state: q.moves && q.moves.length > 0 && q.moves[0].origin ? q.moves[0].origin.state : '',
        zip: q.moves && q.moves.length > 0 && q.moves[0].origin ? q.moves[0].origin.zip : ''
      };
    }

    if (this.heldDestinationVerified() === true) {
      navState.verifiedAddresses = navState.verifiedAddresses || {};
      const lastMove = q?.moves && q.moves.length > 0 ? q.moves[q.moves.length - 1] : null;
      navState.verifiedAddresses.destination = {
        address: this.heldDestinationAddress(),
        // Prefer the quote's last move destination if available
        city: lastMove?.destination?.city || '',
        state: lastMove?.destination?.state || '',
        zip: lastMove?.destination?.zip || ''
      };
    }

    // Close modal and navigate to accept-quote with the verified info
    this.showHeldCreateModal.set(false);
    if (q.id) {
      this.router.navigate(['/customer/accept-quote', q.id], { state: navState });
    } else {
      this.router.navigate(['/customer/accept-quote'], { state: navState });
    }
  }

  getQuoteMoveEmoji(): string {
    const quote = this.quote();
    if (!quote || !quote.moves || quote.moves.length === 0) return '🚚';
    const hasRail = quote.moves.some(m => (m.moveType || '').toLowerCase().includes('rail'));
    return hasRail ? '🚂' : '🚚';
  }

  // Emoji for the Quote Type (contract-like icon)
  getTypeEmoji(): string {
    return '🧾';
  }

  getStatusEmoji(status?: string): string {
    if (!status) return '';
    const s = status.toLowerCase();
    if (s === 'quoted') return '🟡';
    if (s === 'on hold') return '🟠';
    if (s === 'accepted') return '✅';
    if (s === 'rejected') return '❌';
    if (s === 'draft') return '📝';
    if (s === 'expired') return '⏳';
    return '';
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

  holdQuote(): void {
    const quote = this.quote();
    if (!quote) return;

    this.quoteService.holdQuote(quote.id).subscribe({
      next: (response) => {
        // Update quote status in the UI
        this.quote.update(q => {
          if (q) {
            return { ...q, status: 'On Hold' as any };
          }
          return q;
        });
        this.errorMessage.set(''); // Clear any errors
        this.toastService.show('Quote price has been held successfully. You can now proceed with creating an order at any time.', 4000);
      },
      error: (err) => {
        console.error('Error holding quote:', err);
        this.errorMessage.set(
          err.error?.message || 'Failed to hold quote. Please try again.'
        );
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/customer/quotes']);
  }

  getMoveTypeLabel(moveType?: string): string {
    if (!moveType) return 'Unknown Move';
    const key = moveType.toLowerCase();
    const labels: { [key: string]: string } = {
      'initialpickup': '🚚 Initial Pickup',
      'extrapickup': '🚚 Extra Pickup',
      'rail': '🚂 Rail',
      'extradelivery': '🚚 Extra Delivery',
      'finaldestination': '🚚 Final Destination',
      'overtheroad': '🚚 Over the Road'
    };
    if (labels[key]) return labels[key];
    // Fallback: determine emoji (rail vs truck) and title-case the move type
    const words = moveType.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]/g, ' ').split(' ');
    const title = words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const emoji = key.includes('rail') ? '🚂' : '🚚';
    return `${emoji} ${title}`;
  }
}
