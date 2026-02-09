import { Component, OnInit, signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { QuoteService, CreateQuoteRequest } from '../../services/quote.service';
import { AddressLookupService, AddressSuggestion } from '../../services/address-lookup.service';
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

  // Address verification UI signals
  originAddress = signal<string>('');
  originSuggestions = signal<AddressSuggestion[]>([]);
  showOriginSuggestions = signal(false);
  originVerified = signal<boolean | null>(null);
  originTopSuggestion = signal<AddressSuggestion | null>(null);
  originSelectedSuggestion = signal<AddressSuggestion | null>(null);

  destinationAddress = signal<string>('');
  destinationSuggestions = signal<AddressSuggestion[]>([]);
  showDestinationSuggestions = signal(false);
  destinationVerified = signal<boolean | null>(null);
  destinationTopSuggestion = signal<AddressSuggestion | null>(null);
  destinationSelectedSuggestion = signal<AddressSuggestion | null>(null);

  // Extra pickup/delivery per-move state (keyed by move index)
  extraPickupAddresses = signal<{[index:number]: string}>({});
  extraPickupSuggestions = signal<{[index:number]: AddressSuggestion[]}>({});
  extraPickupVerified = signal<{[index:number]: boolean|null}>({});
  extraPickupTopSuggestion = signal<{[index:number]: AddressSuggestion|null}>({});
  extraPickupSelected = signal<{[index:number]: AddressSuggestion|null}>({});

  extraDeliveryAddresses = signal<{[index:number]: string}>({});
  extraDeliverySuggestions = signal<{[index:number]: AddressSuggestion[]}>({});
  extraDeliveryVerified = signal<{[index:number]: boolean|null}>({});
  extraDeliveryTopSuggestion = signal<{[index:number]: AddressSuggestion|null}>({});
  extraDeliverySelected = signal<{[index:number]: AddressSuggestion|null}>({});

  constructor(
    private quoteService: QuoteService,
    private orderService: OrderService,
    private authService: AuthService,
    private toastService: ToastService,
    private router: Router,
    private route: ActivatedRoute,
    private customerService: CustomerService,
    private addressLookup: AddressLookupService
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

      // Initialize local address fields from quote for in-page verification
    const q = this.quote();
    if (q && q.moves && q.moves.length > 0) {
      const origin = q.moves[0].origin;
      const dest = q.moves[q.moves.length - 1].destination;
      this.originAddress.set(origin?.address || '');
      this.destinationAddress.set(dest?.address || '');

      // Initialize extra pickup/delivery fields (use first extra if present)
      q.moves.forEach((m: any, idx: number) => {
        if ((m.moveType || '').toLowerCase() === 'extrapickup') {
          const map = this.extraPickupAddresses();
          map[idx] = m.origin?.address || '';
          this.extraPickupAddresses.set(map);
        }
        if ((m.moveType || '').toLowerCase() === 'extradelivery') {
          const mapD = this.extraDeliveryAddresses();
          mapD[idx] = m.destination?.address || '';
          this.extraDeliveryAddresses.set(mapD);
        }
      });
    }

    // Check user persona
    const persona = this.authService.getPersona();
    this.isCustomerPersona.set(persona === 'Customer');
    this.isAdminOrMarketingManager.set(persona === 'Admin' || persona === 'MarketingManager');
  }

  private addressTokens(s: string | null | undefined): string[] {
    return ((s || '').toLowerCase().match(/\w+/g) || []);
  }

  private allAddressTokensPresent(input: string | null | undefined, candidate: string | null | undefined): boolean {
    const tokens = this.addressTokens(input);
    if (!tokens || tokens.length === 0) return false;
    const cand = (candidate || '').toLowerCase();
    return tokens.every(t => cand.includes(t));
  }

  private matchesQuoteLocation(s: AddressSuggestion, qCity: string | null, qState: string | null, qZip: string | null): boolean {
    if ((!qCity || qCity.trim() === '') && (!qState || qState.trim() === '') && (!qZip || qZip.trim() === '')) return true;
    const cityMatch = qCity ? (s.city || '').toLowerCase() === qCity.toLowerCase() : true;
    const stateMatch = qState ? (s.state || '').toLowerCase() === qState.toLowerCase() : true;
    const zipMatch = qZip ? (s.zip || '') === qZip : true;
    return cityMatch && stateMatch && zipMatch;
  }

  onOriginAddressInput(event: any): void {
    const address = event.target.value;
    this.originAddress.set(address);
    const q = this.quote();
    const city = q?.moves && q.moves.length > 0 ? q.moves[0].origin.city : '';
    const state = q?.moves && q.moves.length > 0 ? q.moves[0].origin.state : '';
    const zip = q?.moves && q.moves.length > 0 ? q.moves[0].origin.zip : '';

    if (address && address.length >= 3) {
      this.addressLookup.searchAddresses(address).subscribe(suggestions => {
        const filtered = suggestions.filter(s => this.matchesQuoteLocation(s, city || null, state || null, zip || null));
        this.originSuggestions.set(filtered);
        this.showOriginSuggestions.set(filtered.length > 0);
      });
    } else {
      this.originSuggestions.set([]);
      this.showOriginSuggestions.set(false);
    }
  }

  selectOriginSuggestion(suggestion: AddressSuggestion | null): void {
    if (!suggestion) return;
    this.originAddress.set(suggestion.displayName || suggestion.address);
    this.originVerified.set(true);
    this.originTopSuggestion.set(null);
    this.originSelectedSuggestion.set(suggestion);
    this.originSuggestions.set([]);
    this.showOriginSuggestions.set(false);
  }

  verifyOriginAddress(): void {
    const address = this.originAddress();
    if (!address || address.length < 3) {
      this.originVerified.set(false);
      this.originTopSuggestion.set(null);
      return;
    }

    const q = this.quote();
    const city = q?.moves && q.moves.length > 0 ? q.moves[0].origin.city : '';
    const state = q?.moves && q.moves.length > 0 ? q.moves[0].origin.state : '';
    const zip = q?.moves && q.moves.length > 0 ? q.moves[0].origin.zip : '';

    this.addressLookup.searchAddresses(address).subscribe(results => {
      const filtered = results.filter((r: AddressSuggestion) => this.matchesQuoteLocation(r, city || null, state || null, zip || null));

      // show full suggestion list
      this.originSuggestions.set(filtered || []);
      this.showOriginSuggestions.set((filtered && filtered.length > 0));

      if (filtered && filtered.length > 0) {
        const top = filtered[0];
        const addrMatches = this.allAddressTokensPresent(address, top.displayName) || this.allAddressTokensPresent(address, top.address);
        if (addrMatches) {
          // strong match -> auto-select and prefer displayName
          this.originAddress.set(top.displayName || top.address);
          this.originVerified.set(true);
          this.originTopSuggestion.set(null);
          this.originSelectedSuggestion.set(top);
          this.originSuggestions.set([]);
          this.showOriginSuggestions.set(false);
        } else {
          // weak match -> surface list and set gentle top hint
          this.originVerified.set(false);
          this.originTopSuggestion.set(top);
        }
      } else {
        this.originVerified.set(false);
        this.originTopSuggestion.set(null);
        this.originSuggestions.set([]);
        this.showOriginSuggestions.set(false);
      }
    }, () => {
      this.originVerified.set(false);
      this.originTopSuggestion.set(null);
      this.originSuggestions.set([]);
      this.showOriginSuggestions.set(false);
    });
  }

  onDestinationAddressInput(event: any): void {
    const address = event.target.value;
    this.destinationAddress.set(address);
    const q = this.quote();
    const city = q?.moves && q.moves.length > 0 ? q.moves[q.moves.length - 1].destination.city : '';
    const state = q?.moves && q.moves.length > 0 ? q.moves[q.moves.length - 1].destination.state : '';
    const zip = q?.moves && q.moves.length > 0 ? q.moves[q.moves.length - 1].destination.zip : '';

    if (address && address.length >= 3) {
      this.addressLookup.searchAddresses(address).subscribe(suggestions => {
        const filtered = suggestions.filter(s => this.matchesQuoteLocation(s, city || null, state || null, zip || null));
        this.destinationSuggestions.set(filtered);
        this.showDestinationSuggestions.set(filtered.length > 0);
      });
    } else {
      this.destinationSuggestions.set([]);
      this.showDestinationSuggestions.set(false);
    }
  }

  // Extra pickup handlers (indexed by move index)
  onExtraPickupAddressInput(index: number, event: any): void {
    const address = event.target.value;
    const map = { ...this.extraPickupAddresses() };
    map[index] = address;
    this.extraPickupAddresses.set(map);

    if (address && address.length >= 3) {
      this.addressLookup.searchAddresses(address).subscribe(suggestions => {
        this.extraPickupSuggestions.set({ ...this.extraPickupSuggestions(), [index]: suggestions });
      });
    } else {
      this.extraPickupSuggestions.set({ ...this.extraPickupSuggestions(), [index]: [] });
    }
  }

  verifyExtraPickupAddress(index: number): void {
    const address = (this.extraPickupAddresses() || {})[index];
    if (!address || address.length < 3) {
      this.extraPickupVerified.set({ ...this.extraPickupVerified(), [index]: false });
      this.extraPickupTopSuggestion.set({ ...this.extraPickupTopSuggestion(), [index]: null });
      return;
    }

    // Use quote move's origin location to constrain
    const q = this.quote();
    const move = q?.moves && q.moves[index] ? q.moves[index] : null;
    const city = move?.origin?.city || null;
    const state = move?.origin?.state || null;
    const zip = move?.origin?.zip || null;

    this.addressLookup.searchAddresses(address).subscribe(results => {
      const filtered = results.filter((r: AddressSuggestion) => this.matchesQuoteLocation(r, city, state, zip));
      if (filtered && filtered.length > 0) {
        const top = filtered[0];
        const addrMatches = this.allAddressTokensPresent(address, top.displayName) || this.allAddressTokensPresent(address, top.address);
        if (addrMatches) {
          // select
          this.extraPickupSelected.set({ ...this.extraPickupSelected(), [index]: top });
          this.extraPickupAddresses.set({ ...this.extraPickupAddresses(), [index]: top.displayName || top.address });
          this.extraPickupVerified.set({ ...this.extraPickupVerified(), [index]: true });
          this.extraPickupTopSuggestion.set({ ...this.extraPickupTopSuggestion(), [index]: null });
        } else {
          this.extraPickupVerified.set({ ...this.extraPickupVerified(), [index]: false });
          this.extraPickupTopSuggestion.set({ ...this.extraPickupTopSuggestion(), [index]: top });
        }
      } else {
        this.extraPickupVerified.set({ ...this.extraPickupVerified(), [index]: false });
        this.extraPickupTopSuggestion.set({ ...this.extraPickupTopSuggestion(), [index]: null });
      }
    }, () => {
      this.extraPickupVerified.set({ ...this.extraPickupVerified(), [index]: false });
      this.extraPickupTopSuggestion.set({ ...this.extraPickupTopSuggestion(), [index]: null });
    });
  }

  selectExtraPickupSuggestion(index: number, suggestion: AddressSuggestion | null): void {
    if (!suggestion) return;
    this.extraPickupSelected.set({ ...this.extraPickupSelected(), [index]: suggestion });
    this.extraPickupAddresses.set({ ...this.extraPickupAddresses(), [index]: suggestion.displayName || suggestion.address });
    this.extraPickupVerified.set({ ...this.extraPickupVerified(), [index]: true });
    this.extraPickupTopSuggestion.set({ ...this.extraPickupTopSuggestion(), [index]: null });
    this.extraPickupSuggestions.set({ ...this.extraPickupSuggestions(), [index]: [] });
  }

  // Extra delivery handlers (indexed by move index)
  onExtraDeliveryAddressInput(index: number, event: any): void {
    const address = event.target.value;
    const map = { ...this.extraDeliveryAddresses() };
    map[index] = address;
    this.extraDeliveryAddresses.set(map);

    if (address && address.length >= 3) {
      this.addressLookup.searchAddresses(address).subscribe(suggestions => {
        this.extraDeliverySuggestions.set({ ...this.extraDeliverySuggestions(), [index]: suggestions });
      });
    } else {
      this.extraDeliverySuggestions.set({ ...this.extraDeliverySuggestions(), [index]: [] });
    }
  }

  verifyExtraDeliveryAddress(index: number): void {
    const address = (this.extraDeliveryAddresses() || {})[index];
    if (!address || address.length < 3) {
      this.extraDeliveryVerified.set({ ...this.extraDeliveryVerified(), [index]: false });
      this.extraDeliveryTopSuggestion.set({ ...this.extraDeliveryTopSuggestion(), [index]: null });
      return;
    }

    const q = this.quote();
    const move = q?.moves && q.moves[index] ? q.moves[index] : null;
    const city = move?.destination?.city || null;
    const state = move?.destination?.state || null;
    const zip = move?.destination?.zip || null;

    this.addressLookup.searchAddresses(address).subscribe(results => {
      const filtered = results.filter((r: AddressSuggestion) => this.matchesQuoteLocation(r, city, state, zip));
      if (filtered && filtered.length > 0) {
        const top = filtered[0];
        const addrMatches = this.allAddressTokensPresent(address, top.displayName) || this.allAddressTokensPresent(address, top.address);
        if (addrMatches) {
          this.extraDeliverySelected.set({ ...this.extraDeliverySelected(), [index]: top });
          this.extraDeliveryAddresses.set({ ...this.extraDeliveryAddresses(), [index]: top.displayName || top.address });
          this.extraDeliveryVerified.set({ ...this.extraDeliveryVerified(), [index]: true });
          this.extraDeliveryTopSuggestion.set({ ...this.extraDeliveryTopSuggestion(), [index]: null });
        } else {
          this.extraDeliveryVerified.set({ ...this.extraDeliveryVerified(), [index]: false });
          this.extraDeliveryTopSuggestion.set({ ...this.extraDeliveryTopSuggestion(), [index]: top });
        }
      } else {
        this.extraDeliveryVerified.set({ ...this.extraDeliveryVerified(), [index]: false });
        this.extraDeliveryTopSuggestion.set({ ...this.extraDeliveryTopSuggestion(), [index]: null });
      }
    }, () => {
      this.extraDeliveryVerified.set({ ...this.extraDeliveryVerified(), [index]: false });
      this.extraDeliveryTopSuggestion.set({ ...this.extraDeliveryTopSuggestion(), [index]: null });
    });
  }

  selectExtraDeliverySuggestion(index: number, suggestion: AddressSuggestion | null): void {
    if (!suggestion) return;
    this.extraDeliverySelected.set({ ...this.extraDeliverySelected(), [index]: suggestion });
    this.extraDeliveryAddresses.set({ ...this.extraDeliveryAddresses(), [index]: suggestion.displayName || suggestion.address });
    this.extraDeliveryVerified.set({ ...this.extraDeliveryVerified(), [index]: true });
    this.extraDeliveryTopSuggestion.set({ ...this.extraDeliveryTopSuggestion(), [index]: null });
    this.extraDeliverySuggestions.set({ ...this.extraDeliverySuggestions(), [index]: [] });
  }

  selectDestinationSuggestion(suggestion: AddressSuggestion | null): void {
    if (!suggestion) return;
    this.destinationAddress.set(suggestion.displayName || suggestion.address);
    this.destinationVerified.set(true);
    this.destinationTopSuggestion.set(null);
    this.destinationSelectedSuggestion.set(suggestion);
    this.destinationSuggestions.set([]);
    this.showDestinationSuggestions.set(false);
  }

  verifyDestinationAddress(): void {
    const address = this.destinationAddress();
    if (!address || address.length < 3) {
      this.destinationVerified.set(false);
      this.destinationTopSuggestion.set(null);
      return;
    }

    const q = this.quote();
    const city = q?.moves && q.moves.length > 0 ? q.moves[q.moves.length - 1].destination.city : '';
    const state = q?.moves && q.moves.length > 0 ? q.moves[q.moves.length - 1].destination.state : '';
    const zip = q?.moves && q.moves.length > 0 ? q.moves[q.moves.length - 1].destination.zip : '';

    this.addressLookup.searchAddresses(address).subscribe(results => {
      const filtered = results.filter((r: AddressSuggestion) => this.matchesQuoteLocation(r, city || null, state || null, zip || null));
      if (filtered && filtered.length > 0) {
        const top = filtered[0];
        const addrMatches = this.allAddressTokensPresent(address, top.displayName) || this.allAddressTokensPresent(address, top.address);
        if (addrMatches) {
          this.selectDestinationSuggestion(top);
        } else {
          this.destinationVerified.set(false);
          this.destinationTopSuggestion.set(top);
        }
      } else {
        this.destinationVerified.set(false);
        this.destinationTopSuggestion.set(null);
      }
    }, () => {
      this.destinationVerified.set(false);
      this.destinationTopSuggestion.set(null);
    });
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

    // Build navigation state including verified addresses when present
    const id = (currentQuote as any).id;
    const navState: any = { quote: currentQuote };

    // Attach verified origin if present
    if (this.originVerified() === true) {
      const originSuggestion = this.originSelectedSuggestion();
      const originData: any = {
        address: this.originAddress()
      };
      if (originSuggestion) {
        originData.city = originSuggestion.city;
        originData.state = originSuggestion.state;
        originData.zip = originSuggestion.zip;
        originData.position = originSuggestion.position || null;
      } else {
        // Fallback to quote's origin fields
        originData.city = (currentQuote as any).moves && (currentQuote as any).moves.length > 0 ? (currentQuote as any).moves[0].origin.city : '';
        originData.state = (currentQuote as any).moves && (currentQuote as any).moves.length > 0 ? (currentQuote as any).moves[0].origin.state : '';
        originData.zip = (currentQuote as any).moves && (currentQuote as any).moves.length > 0 ? (currentQuote as any).moves[0].origin.zip : '';
      }
      navState.verifiedAddresses = navState.verifiedAddresses || {};
      navState.verifiedAddresses.origin = originData;
    }

    // Attach verified destination if present
    if (this.destinationVerified() === true) {
      const destSuggestion = this.destinationSelectedSuggestion();
      const destData: any = {
        address: this.destinationAddress()
      };
      if (destSuggestion) {
        destData.city = destSuggestion.city;
        destData.state = destSuggestion.state;
        destData.zip = destSuggestion.zip;
        destData.position = destSuggestion.position || null;
      } else {
        destData.city = (currentQuote as any).moves && (currentQuote as any).moves.length > 0 ? (currentQuote as any).moves[(currentQuote as any).moves.length - 1].destination.city : '';
        destData.state = (currentQuote as any).moves && (currentQuote as any).moves.length > 0 ? (currentQuote as any).moves[(currentQuote as any).moves.length - 1].destination.state : '';
        destData.zip = (currentQuote as any).moves && (currentQuote as any).moves.length > 0 ? (currentQuote as any).moves[(currentQuote as any).moves.length - 1].destination.zip : '';
      }
      navState.verifiedAddresses = navState.verifiedAddresses || {};
      navState.verifiedAddresses.destination = destData;
    }

    // Attach verified extra pickup/delivery (first verified of each type if present)
    const extraPickups = Object.keys(this.extraPickupVerified() || {}).map(k => parseInt(k, 10)).filter(i => this.extraPickupVerified()[i] === true);
    if (extraPickups.length > 0) {
      const first = extraPickups[0];
      const sel = (this.extraPickupSelected() || {})[first] as AddressSuggestion | null;
      const data: any = {
        address: (this.extraPickupAddresses() || {})[first] || ''
      };
      if (sel) {
        data.city = sel.city; data.state = sel.state; data.zip = sel.zip; data.position = sel.position || null;
      } else {
        const m = (currentQuote as any).moves && (currentQuote as any).moves[first] ? (currentQuote as any).moves[first] : null;
        data.city = m?.origin?.city || ''; data.state = m?.origin?.state || ''; data.zip = m?.origin?.zip || '';
      }
      navState.verifiedAddresses = navState.verifiedAddresses || {};
      navState.verifiedAddresses.extraPickup = data;
    }

    const extraDeliveries = Object.keys(this.extraDeliveryVerified() || {}).map(k => parseInt(k, 10)).filter(i => this.extraDeliveryVerified()[i] === true);
    if (extraDeliveries.length > 0) {
      const first = extraDeliveries[0];
      const sel = (this.extraDeliverySelected() || {})[first] as AddressSuggestion | null;
      const data: any = {
        address: (this.extraDeliveryAddresses() || {})[first] || ''
      };
      if (sel) {
        data.city = sel.city; data.state = sel.state; data.zip = sel.zip; data.position = sel.position || null;
      } else {
        const m = (currentQuote as any).moves && (currentQuote as any).moves[first] ? (currentQuote as any).moves[first] : null;
        data.city = m?.destination?.city || ''; data.state = m?.destination?.state || ''; data.zip = m?.destination?.zip || '';
      }
      navState.verifiedAddresses = navState.verifiedAddresses || {};
      navState.verifiedAddresses.extraDelivery = data;
    }

    if (id) {
      this.router.navigate(['/customer/accept-quote', id], { state: navState });
    } else {
      // Preview-only quote: pass via navigation state
      this.router.navigate(['/customer/accept-quote'], { state: navState });
    }
  }

  holdQuote(): void {
    const currentQuote = this.quote();
    if (!currentQuote) return;

    // Only customers can hold quotes
    if (!this.isCustomerPersona()) {
      this.errorMessage.set('Only customers can hold quotes.');
      return;
    }

    if (!currentQuote.id) {
      this.errorMessage.set('Cannot hold a quote without an ID. Please try again.');
      return;
    }

    this.loading.set(true);
    this.quoteService.holdQuote(currentQuote.id).subscribe({
      next: (response) => {
        this.loading.set(false);
        this.toastService.show('Quote held successfully. Price locked.');
        
        // Update the quote status to "On Hold"
        const updated = { ...currentQuote, status: 'On Hold' };
        this.quote.set(updated);
        
        // Navigate to quotes list after a brief delay so user can see the success message
        setTimeout(() => {
          this.router.navigate(['/customer/quotes'], { queryParams: { status: 'On Hold' } });
        }, 1500);
      },
      error: (err) => {
        console.error('Error holding quote:', err);
        this.errorMessage.set(err?.error?.message || 'Failed to hold quote. Please try again.');
        this.loading.set(false);
      }
    });
  }

  submitCustomRequest(): void {
    const currentQuote = this.quote();
    if (!currentQuote) return;

    if (!this.isCustomerPersona()) {
      this.errorMessage.set('Only customers can submit requests.');
      return;
    }

    if ((currentQuote as any).quoteType !== 'Custom') {
      this.errorMessage.set('Only custom quotes can be submitted as requests.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    const shipment = (currentQuote as any).shipmentDetails || {};
    const originZip = String(shipment.shipperZip || '').trim();
    const destinationZip = String(shipment.consigneeZip || '').trim();
    if (!originZip || !destinationZip) {
      this.errorMessage.set('Shipper and consignee zip codes are required to submit a custom quote request.');
      this.loading.set(false);
      return;
    }

    const payload: CreateQuoteRequest = {
      description: `Custom quote from ${originZip} to ${destinationZip}`,
      originName: shipment.shipperName?.trim() || undefined,
      originAddress: shipment.shipperAddress?.trim() || undefined,
      originCity: shipment.shipperCity?.trim() || undefined,
      originState: shipment.shipperState?.trim() || undefined,
      originZip: originZip,
      originPosition: shipment.shipperLatitude != null && shipment.shipperLongitude != null
        ? { latitude: shipment.shipperLatitude, longitude: shipment.shipperLongitude }
        : undefined,
      destinationName: shipment.consigneeName?.trim() || undefined,
      destinationAddress: shipment.consigneeAddress?.trim() || undefined,
      destinationCity: shipment.consigneeCity?.trim() || undefined,
      destinationState: shipment.consigneeState?.trim() || undefined,
      destinationZip: destinationZip,
      destinationPosition: shipment.consigneeLatitude != null && shipment.consigneeLongitude != null
        ? { latitude: shipment.consigneeLatitude, longitude: shipment.consigneeLongitude }
        : undefined,
      originStopType: (currentQuote as any).originStopType || undefined,
      extraOriginStopType: (currentQuote as any).extraOriginStopType || undefined,
      extraDestinationStopType: (currentQuote as any).extraDestinationStopType || undefined,
      destinationStopType: (currentQuote as any).destinationStopType || undefined,
      status: 'Requested'
    };

    try {
      const userStr = localStorage.getItem('current_user');
      const userId = userStr ? JSON.parse(userStr).id : null;
      if (userId) {
        this.customerService.getCustomersForUser(userId).subscribe({
          next: (list) => {
            const broker = list.find(c => c.type === 5); // CustomerType.Broker
            if (broker) {
              payload.brokerCustomerId = broker.id;
            } else {
              const customerId = (currentQuote as any).customerId;
              const parsed = Number(customerId);
              if (!Number.isNaN(parsed)) payload.brokerCustomerId = parsed;
            }
            this.createRequestedQuote(payload);
          },
          error: () => {
            const customerId = (currentQuote as any).customerId;
            const parsed = Number(customerId);
            if (!Number.isNaN(parsed)) payload.brokerCustomerId = parsed;
            this.createRequestedQuote(payload);
          }
        });
        return;
      }
    } catch {
      // fall through
    }

    this.createRequestedQuote(payload);
  }

  private createRequestedQuote(payload: CreateQuoteRequest): void {
    this.quoteService.createQuote(payload).subscribe({
      next: (created) => {
        this.loading.set(false);
        if (created?.status === 'Opportunity') {
          const message = created?.message || 'No train schedule was found. The quote was saved as an opportunity.';
          this.toastService.show(message);
          this.errorMessage.set(message);
          this.router.navigate(['/customer/quotes']);
          return;
        }
        this.toastService.show('Request submitted');
        this.router.navigate(['/customer/quotes'], { queryParams: { status: 'Requested' } });
      },
      error: (err) => {
        console.error('Error submitting request:', err);
        this.errorMessage.set(err?.error?.message || 'Failed to submit request. Please try again.');
        this.loading.set(false);
      }
    });
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