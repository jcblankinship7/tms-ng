import { Component, signal, inject, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QuoteService, QuoteType, QuoteRequest, StopType, CreateQuoteRequest } from '../../services/quote.service';
import { LocationSearchService } from '../../services/location-search.service';
import { CustomerContextService } from '../../services/customer-context.service';
import { AuthService } from '../../services/auth.service';
import { CustomerService } from '../../services/customer.service';
import { ToastService } from '../../services/toast.service';
import { LocationSearchResult } from '../../models/location-search-result.model';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';

type InputType = 'zipcode' | 'citystate';

interface LocationData {
  // prefer structured position over top-level latitude/longitude when available
  position?: { latitude: number; longitude: number };
  latitude?: number;
  longitude?: number;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

@Component({
  selector: 'app-quote-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quote-form.component.html',
  styleUrls: ['./quote-form.component.scss']
})
export class QuoteFormComponent implements OnInit {
  private quoteService = inject(QuoteService);
  locationSearchService = inject(LocationSearchService);
  private customerContextService = inject(CustomerContextService);
  private customerService = inject(CustomerService);
  private toastService = inject(ToastService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // If the active customer is a "Customer" quoteType (custom quotes), default to Custom
  isCustomerDefaultCustom = signal(false);

  // If the active customer is a "Spot" quoteType (spot quotes), default to Spot
  isCustomerDefaultSpot = signal(false);

  // In-memory preview quote and flag to enable Save as Draft
  generatedQuote = signal<QuoteRequest | null>(null);

  // Search subjects for debouncing
  private originSearchSubject = new Subject<string>();
  private destinationSearchSubject = new Subject<string>();
  private extraOriginSearchSubject = new Subject<string>();
  private extraDestinationSearchSubject = new Subject<string>();

  // Quote Type Selection
  quoteType = signal<QuoteType>('Spot');

  // Input Type Selection
  originInputType = signal<InputType>('zipcode');
  destinationInputType = signal<InputType>('zipcode');
  extraOriginInputType = signal<InputType>('zipcode');
  extraDestinationInputType = signal<InputType>('zipcode');

  // Initial Pickup Fields (Required: originZip)
  originZipCode = signal('');
  originCityState = signal('');
  originSearchResults = signal<LocationSearchResult[]>([]);
  originShowResults = signal(false);
  selectedOrigin = signal<LocationData | null>(null);
  originSearching = signal(false);

  // Extra Pickup Fields (Optional)
  showExtraOrigin = signal(false);
  extraOriginZipCode = signal('');
  extraOriginCityState = signal('');
  extraOriginSearchResults = signal<LocationSearchResult[]>([]);
  extraOriginShowResults = signal(false);
  selectedExtraOrigin = signal<LocationData | null>(null);
  extraOriginSearching = signal(false);

  // Final Delivery Fields (Required: destinationZip)
  destinationZipCode = signal('');
  destinationCityState = signal('');
  destinationSearchResults = signal<LocationSearchResult[]>([]);
  destinationShowResults = signal(false);
  selectedDestination = signal<LocationData | null>(null);
  destinationSearching = signal(false);

  // Extra Delivery Fields (Optional)
  showExtraDestination = signal(false);
  extraDestinationZipCode = signal('');
  extraDestinationCityState = signal('');
  extraDestinationSearchResults = signal<LocationSearchResult[]>([]);
  extraDestinationShowResults = signal(false);
  selectedExtraDestination = signal<LocationData | null>(null);
  extraDestinationSearching = signal(false);

  // Stop Type Preferences
  originStopType = signal<StopType>('Stay');
  extraOriginStopType = signal<StopType>('Stay');
  extraDestinationStopType = signal<StopType>('Stay');
  destinationStopType = signal<StopType>('Stay');

  // Custom Quote Fields
  shipperName = signal('');
  shipperAddress = signal('');
  shipperCity = signal('');
  shipperState = signal('');
  shipperZip = signal('');
  shipperContactName = signal('');
  shipperContactPhone = signal('');
  consigneeName = signal('');
  consigneeAddress = signal('');
  consigneeCity = signal('');
  consigneeState = signal('');
  consigneeZip = signal('');
  consigneeContactName = signal('');
  consigneeContactPhone = signal('');
  shipperVerified = signal(false);
  shipperVerifying = signal(false);
  shipperLatitude = signal<number | null>(null);
  shipperLongitude = signal<number | null>(null);
  shipperVerifyMessage = signal('');
  shipperZipOptions = signal<LocationSearchResult[]>([]);
  shipperZipSelectionRequired = signal(false);
  consigneeVerified = signal(false);
  consigneeVerifying = signal(false);
  consigneeLatitude = signal<number | null>(null);
  consigneeLongitude = signal<number | null>(null);
  consigneeVerifyMessage = signal('');
  consigneeZipOptions = signal<LocationSearchResult[]>([]);
  consigneeZipSelectionRequired = signal(false);
  weight = signal<number | null>(null);
  specialHandling = signal('');
  commodityType = signal('Electronics');
  packageType = signal('');
  containerType = signal('');
  freightDescription = signal('');
  notes = signal('');

  loading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  editingQuoteId = signal<string | null>(null);
  
  // Rate limit monitoring
  rateLimitWarning = signal('');
  isRateLimited = signal(false);

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  isCustomer(): boolean {
    return this.authService.getPersona() === 'Customer';
  }

  private applyQuoteTypePreference(preferred: 'Custom' | 'Spot', lockForCustomer: boolean): void {
    this.quoteType.set(preferred);
    if (lockForCustomer) {
      this.isCustomerDefaultCustom.set(preferred === 'Custom');
      this.isCustomerDefaultSpot.set(preferred === 'Spot');
      return;
    }

    this.isCustomerDefaultCustom.set(false);
    this.isCustomerDefaultSpot.set(false);
  }

  isCustomLocationComplete(): boolean {
    const shipperHasCityStateOrZip = !!(
      this.shipperZip().trim() || (this.shipperCity().trim() && this.shipperState().trim())
    );
    const consigneeHasCityStateOrZip = !!(
      this.consigneeZip().trim() || (this.consigneeCity().trim() && this.consigneeState().trim())
    );

    return !!(
      this.shipperName().trim() &&
      this.shipperAddress().trim() &&
      shipperHasCityStateOrZip &&
      this.consigneeName().trim() &&
      this.consigneeAddress().trim() &&
      consigneeHasCityStateOrZip
    );
  }

  isCustomLocationVerified(): boolean {
    return this.shipperVerified() && this.consigneeVerified();
  }

  private buildLocationSummary(label: 'shipper' | 'consignee'): string {
    if (label === 'shipper') {
      return `${this.shipperName().trim()}, ${this.shipperAddress().trim()}, ${this.shipperCity().trim()}, ${this.shipperState().trim()} ${this.shipperZip().trim()}`.replace(/\s+/g, ' ').trim();
    }

    return `${this.consigneeName().trim()}, ${this.consigneeAddress().trim()}, ${this.consigneeCity().trim()}, ${this.consigneeState().trim()} ${this.consigneeZip().trim()}`.replace(/\s+/g, ' ').trim();
  }

  private buildLocationQuery(label: 'shipper' | 'consignee'): string {
    if (label === 'shipper') {
      return this.shipperZip().trim() || `${this.shipperCity().trim()}, ${this.shipperState().trim()}`.trim();
    }
    return this.consigneeZip().trim() || `${this.consigneeCity().trim()}, ${this.consigneeState().trim()}`.trim();
  }

  private getZipFromResult(result?: LocationSearchResult | null): string {
    if (!result) return '';
    const direct = (result.zipCode || '').trim();
    if (direct) return direct;
    const text = `${result.displayName || ''} ${result.address || ''}`;
    const match = text.match(/\b\d{5}(?:-\d{4})?\b/);
    return match ? match[0] : '';
  }

  getZipLabel(result: LocationSearchResult): string {
    const zip = this.getZipFromResult(result);
    const city = result.city || '';
    const state = result.stateCode || result.state || '';
    if (zip) return `${zip} — ${city}, ${state}`.replace(/\s+/g, ' ').trim();
    return `${city}, ${state}`.replace(/\s+/g, ' ').trim();
  }

  private mergeZipOptions(results: LocationSearchResult[]): LocationSearchResult[] {
    const seen = new Set<string>();
    return results.filter(result => {
      const zip = this.getZipFromResult(result);
      const key = zip ? `zip:${zip}` : `id:${result.id}`;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  onShipperLocationChanged(): void {
    this.shipperVerified.set(false);
    this.shipperVerifyMessage.set('');
    this.shipperZipOptions.set([]);
    this.shipperZipSelectionRequired.set(false);
  }

  onConsigneeLocationChanged(): void {
    this.consigneeVerified.set(false);
    this.consigneeVerifyMessage.set('');
    this.consigneeZipOptions.set([]);
    this.consigneeZipSelectionRequired.set(false);
  }

  selectShipperZip(optionId: string): void {
    if (!optionId) return;
    const match = this.shipperZipOptions().find(option => option.id === optionId);
    const zip = this.getZipFromResult(match);
    if (match) {
      if (zip) this.shipperZip.set(zip);
      this.shipperCity.set(match.city || this.shipperCity());
      this.shipperState.set(match.stateCode || match.state || this.shipperState());
      // capture lat/lon if provided
      const lat = match.position?.latitude ?? (match as any).latitude ?? null;
      const lon = match.position?.longitude ?? (match as any).longitude ?? null;
      this.shipperLatitude.set(lat ?? null);
      this.shipperLongitude.set(lon ?? null);
    }
    this.shipperZipOptions.set([]);
    this.shipperZipSelectionRequired.set(false);
    if (zip) {
      this.shipperVerified.set(true);
      this.shipperVerifyMessage.set('Location verified.');
    } else {
      this.shipperVerified.set(false);
      this.shipperVerifyMessage.set('No zip code found for that selection.');
    }
  }

  selectConsigneeZip(optionId: string): void {
    if (!optionId) return;
    const match = this.consigneeZipOptions().find(option => option.id === optionId);
    const zip = this.getZipFromResult(match);
    if (match) {
      if (zip) this.consigneeZip.set(zip);
      this.consigneeCity.set(match.city || this.consigneeCity());
      this.consigneeState.set(match.stateCode || match.state || this.consigneeState());
      const lat = match.position?.latitude ?? (match as any).latitude ?? null;
      const lon = match.position?.longitude ?? (match as any).longitude ?? null;
      this.consigneeLatitude.set(lat ?? null);
      this.consigneeLongitude.set(lon ?? null);
    }
    this.consigneeZipOptions.set([]);
    this.consigneeZipSelectionRequired.set(false);
    if (zip) {
      this.consigneeVerified.set(true);
      this.consigneeVerifyMessage.set('Location verified.');
    } else {
      this.consigneeVerified.set(false);
      this.consigneeVerifyMessage.set('No zip code found for that selection.');
    }
  }

  verifyShipperLocation(): void {
    if (!(this.shipperZip().trim() || (this.shipperCity().trim() && this.shipperState().trim()))) {
      this.shipperVerifyMessage.set('Enter either city/state or zip to verify.');
      this.shipperVerified.set(false);
      return;
    }
    if (this.locationSearchService.isRateLimited()) {
      this.shipperVerifyMessage.set('Search limit reached. Please wait and try again.');
      this.shipperVerified.set(false);
      return;
    }

    this.shipperVerifying.set(true);
    this.shipperVerifyMessage.set('Verifying location...');
    const primaryQuery = this.buildLocationQuery('shipper');

    this.locationSearchService.searchLocation(primaryQuery).subscribe({
      next: (results) => {
        this.shipperVerifying.set(false);
        const combined = this.mergeZipOptions(results);
        const zipFiltered = combined.filter(option => this.getZipFromResult(option));
        if (zipFiltered.length > 1 && !this.shipperZip().trim()) {
          this.shipperZipOptions.set(zipFiltered);
          this.shipperZipSelectionRequired.set(true);
          this.shipperVerified.set(false);
          this.shipperVerifyMessage.set('Multiple zip codes found. Please select one.');
          return;
        }
        if (zipFiltered.length === 0) {
          this.shipperVerified.set(false);
          this.shipperVerifyMessage.set('No zip codes found for that city/state.');
          return;
        }

        const match = zipFiltered[0];
        if (!this.shipperCity().trim()) this.shipperCity.set(match.city || this.shipperCity());
        if (!this.shipperState().trim()) this.shipperState.set(match.stateCode || match.state || this.shipperState());
        if (!this.shipperZip().trim()) this.shipperZip.set(this.getZipFromResult(match) || this.shipperZip());
        const shipperLat = match.position?.latitude ?? (match as any).latitude ?? null;
        const shipperLon = match.position?.longitude ?? (match as any).longitude ?? null;
        this.shipperLatitude.set(shipperLat ?? null);
        this.shipperLongitude.set(shipperLon ?? null);
        this.shipperVerified.set(true);
        this.shipperVerifyMessage.set('Location verified.');
      },
      error: () => {
        this.shipperVerifying.set(false);
        this.shipperVerified.set(false);
        this.shipperVerifyMessage.set('Unable to verify location.');
      }
    });
  }

  verifyConsigneeLocation(): void {
    if (!(this.consigneeZip().trim() || (this.consigneeCity().trim() && this.consigneeState().trim()))) {
      this.consigneeVerifyMessage.set('Enter either city/state or zip to verify.');
      this.consigneeVerified.set(false);
      return;
    }
    if (this.locationSearchService.isRateLimited()) {
      this.consigneeVerifyMessage.set('Search limit reached. Please wait and try again.');
      this.consigneeVerified.set(false);
      return;
    }

    this.consigneeVerifying.set(true);
    this.consigneeVerifyMessage.set('Verifying location...');
    const primaryQuery = this.buildLocationQuery('consignee');

    this.locationSearchService.searchLocation(primaryQuery).subscribe({
      next: (results) => {
        this.consigneeVerifying.set(false);
        const combined = this.mergeZipOptions(results);
        const zipFiltered = combined.filter(option => this.getZipFromResult(option));
        if (zipFiltered.length > 1 && !this.consigneeZip().trim()) {
          this.consigneeZipOptions.set(zipFiltered);
          this.consigneeZipSelectionRequired.set(true);
          this.consigneeVerified.set(false);
          this.consigneeVerifyMessage.set('Multiple zip codes found. Please select one.');
          return;
        }
        if (zipFiltered.length === 0) {
          this.consigneeVerified.set(false);
          this.consigneeVerifyMessage.set('No zip codes found for that city/state.');
          return;
        }

        const match = zipFiltered[0];
        if (!this.consigneeCity().trim()) this.consigneeCity.set(match.city || this.consigneeCity());
        if (!this.consigneeState().trim()) this.consigneeState.set(match.stateCode || match.state || this.consigneeState());
        if (!this.consigneeZip().trim()) this.consigneeZip.set(this.getZipFromResult(match) || this.consigneeZip());
        const consigneeLat = match.position?.latitude ?? (match as any).latitude ?? null;
        const consigneeLon = match.position?.longitude ?? (match as any).longitude ?? null;
        this.consigneeLatitude.set(consigneeLat ?? null);
        this.consigneeLongitude.set(consigneeLon ?? null);
        this.consigneeVerified.set(true);
        this.consigneeVerifyMessage.set('Location verified.');
      },
      error: () => {
        this.consigneeVerifying.set(false);
        this.consigneeVerified.set(false);
        this.consigneeVerifyMessage.set('Unable to verify location.');
      }
    });
  }

  ngOnInit(): void {
    // Monitor rate limit status
    this.rateLimitWarning.set(this.locationSearchService.isRateLimited() ? 
      'Search is temporarily limited. Please wait before trying again.' : '');

    // If there's an active customer selection, load that customer's details (prefer context to avoid restricted endpoints)
    const ctx = this.customerContextService.getCustomerContext();
    if (ctx.quoteType) {
      if (ctx.quoteType === 'Custom') {
        this.applyQuoteTypePreference('Custom', this.isCustomer());
      } else if (ctx.quoteType === 'Spot') {
        this.applyQuoteTypePreference('Spot', this.isCustomer());
      }
    } else if (ctx.customerId) {
      // Fallback: use the user's associated customers lookup which we know the profile modal can query
      try {
        const userStr = localStorage.getItem('current_user');
        const userId = userStr ? JSON.parse(userStr).id : null;
        if (userId) {
          this.customerService.getCustomersForUser(userId).subscribe({
            next: (list) => {
              const match = list.find(c => String(c.id) === String(ctx.customerId));
              if (match) {
                const quoteTypeVal: any = (match as any).quoteType;
              const lowered = String(quoteTypeVal).toLowerCase();
              const isCustomerType = quoteTypeVal === 2 || lowered === 'customer' || lowered === 'custom';
              const isSpotType = quoteTypeVal === 1 || lowered === 'spot';
              if (isCustomerType) {
                  this.applyQuoteTypePreference('Custom', this.isCustomer());
              } else if (isSpotType) {
                  this.applyQuoteTypePreference('Spot', this.isCustomer());
                }
              }
            },
            error: (err) => console.warn('Could not determine customer quote preference', err)
          });
        }
      } catch (e) {
        console.warn('Could not determine customer quote preference', e);
      }
    } else if (this.isCustomer()) {
      try {
        const userStr = localStorage.getItem('current_user');
        const userId = userStr ? JSON.parse(userStr).id : null;
        if (userId) {
          this.customerService.getCustomersForUser(userId).subscribe({
            next: (list) => {
              if (!list || list.length === 0) return;
              const primary = list[0];
              const quoteTypeVal: any = (primary as any).quoteType;
              const lowered = String(quoteTypeVal).toLowerCase();
              const isCustomerType = quoteTypeVal === 2 || lowered === 'customer' || lowered === 'custom';
              const preferred: 'Custom' | 'Spot' = isCustomerType ? 'Custom' : 'Spot';
              this.customerContextService.setCustomerContext(primary.id, primary.name, userId, preferred);
              this.applyQuoteTypePreference(preferred, true);
            },
            error: (err) => console.warn('Could not load customers for user', err)
          });
        }
      } catch (e) {
        console.warn('Could not load customers for user', e);
      }
    }

    // Setup debounced searches
    this.originSearchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(query => this.performOriginSearch(query));

    this.destinationSearchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(query => this.performDestinationSearch(query));

    this.extraOriginSearchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(query => this.performExtraOriginSearch(query));

    this.extraDestinationSearchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(query => this.performExtraDestinationSearch(query));

    // If navigated with a quote via navigation state (local draft previews), prefer that to avoid relying on a server lookup
    const nav = this.router.getCurrentNavigation();
    if (nav?.extras?.state && nav.extras.state['quote']) {
      const q = nav.extras.state['quote'];
      this.editingQuoteId.set(q?.id || null);
      this.populateFromQuote(q);
      return;
    }

    // Support history.state as a fallback (handles same-route navigations)
    const histQ = (window as any).history?.state?.quote;
    if (histQ) {
      this.editingQuoteId.set(histQ?.id || null);
      this.populateFromQuote(histQ);
      return;
    }

    // Check if editing existing quote via route param
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.editingQuoteId.set(params['id']);
        this.loadQuote(params['id']);
      }
    });

  }

  // Populate form fields from an existing Quote object (server or local preview)
  private populateFromQuote(quote: any): void {
    try {
      if (!quote) return;
      this.quoteType.set(quote.quoteType || 'Spot');
      this.weight.set(quote.weight || null);
      this.specialHandling.set(quote.specialHandling || '');
      this.notes.set(quote.notes || '');

      const raw = (quote as any).rawPayload;
      if (raw) {
        // Reuse same mapping logic as loadQuote for raw payload
        const originVal = raw.origin || raw.originZip || quote.origin || '';
        if (originVal) {
          const zipMatch = /^\d{5}(-\d{4})?/.test(originVal);
          if (zipMatch) {
            this.originInputType.set('zipcode');
            this.originZipCode.set(originVal);
            this.selectedOrigin.set(null);
          } else {
            this.originInputType.set('citystate');
            this.originCityState.set(originVal);
            this.selectedOrigin.set(null);
          }
        }

        const destVal = raw.destination || raw.destinationZip || quote.destination || '';
        if (destVal) {
          const zipMatch = /^\d{5}(-\d{4})?/.test(destVal);
          if (zipMatch) {
            this.destinationInputType.set('zipcode');
            this.destinationZipCode.set(destVal);
            this.selectedDestination.set(null);
          } else {
            this.destinationInputType.set('citystate');
            this.destinationCityState.set(destVal);
            this.selectedDestination.set(null);
          }
        }

        if (raw.extraOriginZip || raw.extraOriginCity || raw.extraOriginAddress) {
          this.showExtraOrigin.set(true);
          this.extraOriginInputType.set(raw.extraOriginZip ? 'zipcode' : 'citystate');
          if (raw.extraOriginZip) this.extraOriginZipCode.set(raw.extraOriginZip);
          if (raw.extraOriginCity) this.extraOriginCityState.set(raw.extraOriginCity + (raw.extraOriginState ? `, ${raw.extraOriginState}` : ''));
        }

        if (raw.extraDestinationZip || raw.extraDestinationCity || raw.extraDestinationAddress) {
          this.showExtraDestination.set(true);
          this.extraDestinationInputType.set(raw.extraDestinationZip ? 'zipcode' : 'citystate');
          if (raw.extraDestinationZip) this.extraDestinationZipCode.set(raw.extraDestinationZip);
          if (raw.extraDestinationCity) this.extraDestinationCityState.set(raw.extraDestinationCity + (raw.extraDestinationState ? `, ${raw.extraDestinationState}` : ''));
        }

        if (raw.shipmentDetails) {
          this.commodityType.set(raw.shipmentDetails.commodityType || this.commodityType());
          const rawPallets = raw.shipmentDetails.pallets;
          this.packageType.set(raw.shipmentDetails.packageType || (rawPallets != null ? String(rawPallets) : this.packageType()));
          this.containerType.set(raw.shipmentDetails.containerType || raw.shipmentDetails.dimensions || this.containerType());
          this.freightDescription.set(raw.shipmentDetails.freightDescription || this.freightDescription());
          this.shipperName.set(raw.shipmentDetails.shipperName || this.shipperName());
          this.shipperAddress.set(raw.shipmentDetails.shipperAddress || raw.shipmentDetails.shipperLocation || raw.origin || this.shipperAddress());
          this.shipperCity.set(raw.shipmentDetails.shipperCity || this.shipperCity());
          this.shipperState.set(raw.shipmentDetails.shipperState || this.shipperState());
          this.shipperZip.set(raw.shipmentDetails.shipperZip || this.shipperZip());
          this.shipperContactName.set(raw.shipmentDetails.shipperContactName || this.shipperContactName());
          this.shipperContactPhone.set(raw.shipmentDetails.shipperContactPhone || this.shipperContactPhone());
          this.consigneeName.set(raw.shipmentDetails.consigneeName || this.consigneeName());
          this.consigneeAddress.set(raw.shipmentDetails.consigneeAddress || raw.shipmentDetails.consigneeLocation || raw.destination || this.consigneeAddress());
          this.consigneeCity.set(raw.shipmentDetails.consigneeCity || this.consigneeCity());
          this.consigneeState.set(raw.shipmentDetails.consigneeState || this.consigneeState());
          this.consigneeZip.set(raw.shipmentDetails.consigneeZip || this.consigneeZip());
          this.consigneeContactName.set(raw.shipmentDetails.consigneeContactName || this.consigneeContactName());
          this.consigneeContactPhone.set(raw.shipmentDetails.consigneeContactPhone || this.consigneeContactPhone());
        }

        this.notes.set(raw.notes || quote.notes || '');
        this.weight.set(raw.weight || quote.weight || null);

      } else if (quote.moves && Array.isArray(quote.moves) && quote.moves.length > 0) {
        // map moves into form fields (same as loadQuote)
        const moves = quote.moves;
        const firstOrigin = moves[0].origin;
        if (firstOrigin) {
          if (firstOrigin.zip) {
            this.originInputType.set('zipcode');
            this.originZipCode.set(firstOrigin.zip);
            this.selectedOrigin.set(null);
          } else if (firstOrigin.address) {
            this.originInputType.set('citystate');
            this.originCityState.set(firstOrigin.address);
            this.selectedOrigin.set(null);
          }
        }

        if (moves.length > 2) {
          const maybeExtraOrigin = moves[1];
          if (maybeExtraOrigin && maybeExtraOrigin.origin && maybeExtraOrigin.origin.zip && maybeExtraOrigin.origin.zip !== (firstOrigin?.zip || '')) {
            this.showExtraOrigin.set(true);
            this.extraOriginInputType.set('zipcode');
            this.extraOriginZipCode.set(maybeExtraOrigin.origin.zip);
            this.extraOriginCityState.set(maybeExtraOrigin.origin.address || '');
          }
        }

        const lastDest = moves[moves.length - 1].destination;
        if (lastDest) {
          if (lastDest.zip) {
            this.destinationInputType.set('zipcode');
            this.destinationZipCode.set(lastDest.zip);
            this.selectedDestination.set(null);
          } else if (lastDest.address) {
            this.destinationInputType.set('citystate');
            this.destinationCityState.set(lastDest.address);
            this.selectedDestination.set(null);
          }
        }

        if (moves.length > 2) {
          const maybeExtraDest = moves[moves.length - 2];
          if (maybeExtraDest && maybeExtraDest.destination && maybeExtraDest.destination.zip && maybeExtraDest.destination.zip !== (lastDest?.zip || '')) {
            this.showExtraDestination.set(true);
            this.extraDestinationInputType.set('zipcode');
            this.extraDestinationZipCode.set(maybeExtraDest.destination.zip);
            this.extraDestinationCityState.set(maybeExtraDest.destination.address || '');
          }
        }

        if (quote.shipmentDetails) {
          this.commodityType.set(quote.shipmentDetails.commodityType || this.commodityType());
          const quotePallets = quote.shipmentDetails.pallets;
          this.packageType.set((quote.shipmentDetails as any).packageType || (quotePallets != null ? String(quotePallets) : this.packageType()));
          this.containerType.set((quote.shipmentDetails as any).containerType || quote.shipmentDetails.dimensions || this.containerType());
          this.freightDescription.set((quote.shipmentDetails as any).freightDescription || this.freightDescription());
          this.shipperName.set((quote.shipmentDetails as any).shipperName || this.shipperName());
          this.shipperAddress.set((quote.shipmentDetails as any).shipperAddress || (quote.shipmentDetails as any).shipperLocation || quote.origin || this.shipperAddress());
          this.shipperCity.set((quote.shipmentDetails as any).shipperCity || this.shipperCity());
          this.shipperState.set((quote.shipmentDetails as any).shipperState || this.shipperState());
          this.shipperZip.set((quote.shipmentDetails as any).shipperZip || this.shipperZip());
          this.shipperContactName.set((quote.shipmentDetails as any).shipperContactName || this.shipperContactName());
          this.shipperContactPhone.set((quote.shipmentDetails as any).shipperContactPhone || this.shipperContactPhone());
          this.consigneeName.set((quote.shipmentDetails as any).consigneeName || this.consigneeName());
          this.consigneeAddress.set((quote.shipmentDetails as any).consigneeAddress || (quote.shipmentDetails as any).consigneeLocation || quote.destination || this.consigneeAddress());
          this.consigneeCity.set((quote.shipmentDetails as any).consigneeCity || this.consigneeCity());
          this.consigneeState.set((quote.shipmentDetails as any).consigneeState || this.consigneeState());
          this.consigneeZip.set((quote.shipmentDetails as any).consigneeZip || this.consigneeZip());
          this.consigneeContactName.set((quote.shipmentDetails as any).consigneeContactName || this.consigneeContactName());
          this.consigneeContactPhone.set((quote.shipmentDetails as any).consigneeContactPhone || this.consigneeContactPhone());
        }

        this.notes.set(quote.notes || '');
        this.weight.set(quote.weight || null);
      }
    } catch (e) {
      console.warn('populateFromQuote failed', e);
    }
  }

  private loadQuote(quoteId: string): void {
    this.quoteService.getQuoteById(quoteId).subscribe({
      next: (quote) => {
        if (quote) {
          this.quoteType.set(quote.quoteType);
          this.weight.set(quote.weight || null);
          this.specialHandling.set(quote.specialHandling || '');
          this.notes.set(quote.notes || '');

          // Pre-fill intrinsic fields for drafts when available; prefer raw payload but fall back to mapped quote fields (moves, shipmentDetails)
          const raw = (quote as any).rawPayload;
          if (raw) {
            // Origin
            const originVal = raw.origin || raw.originZip || quote.origin || '';
            if (originVal) {
              const zipMatch = /^\d{5}(-\d{4})?/.test(originVal);
              if (zipMatch) {
                this.originInputType.set('zipcode');
                this.originZipCode.set(originVal);
                this.selectedOrigin.set(null);
              } else {
                this.originInputType.set('citystate');
                this.originCityState.set(originVal);
                this.selectedOrigin.set(null);
              }
            }

            // Destination
            const destVal = raw.destination || raw.destinationZip || quote.destination || '';
            if (destVal) {
              const zipMatch = /^\d{5}(-\d{4})?/.test(destVal);
              if (zipMatch) {
                this.destinationInputType.set('zipcode');
                this.destinationZipCode.set(destVal);
                this.selectedDestination.set(null);
              } else {
                this.destinationInputType.set('citystate');
                this.destinationCityState.set(destVal);
                this.selectedDestination.set(null);
              }
            }

            // Extra Origin/Destination
            if (raw.extraOriginZip || raw.extraOriginCity || raw.extraOriginAddress) {
              this.showExtraOrigin.set(true);
              this.extraOriginInputType.set(raw.extraOriginZip ? 'zipcode' : 'citystate');
              if (raw.extraOriginZip) this.extraOriginZipCode.set(raw.extraOriginZip);
              if (raw.extraOriginCity) this.extraOriginCityState.set(raw.extraOriginCity + (raw.extraOriginState ? `, ${raw.extraOriginState}` : ''));
            }

            if (raw.extraDestinationZip || raw.extraDestinationCity || raw.extraDestinationAddress) {
              this.showExtraDestination.set(true);
              this.extraDestinationInputType.set(raw.extraDestinationZip ? 'zipcode' : 'citystate');
              if (raw.extraDestinationZip) this.extraDestinationZipCode.set(raw.extraDestinationZip);
              if (raw.extraDestinationCity) this.extraDestinationCityState.set(raw.extraDestinationCity + (raw.extraDestinationState ? `, ${raw.extraDestinationState}` : ''));
            }

            // Shipment details
            if (raw.shipmentDetails) {
              this.commodityType.set(raw.shipmentDetails.commodityType || this.commodityType());
              const rawPallets = raw.shipmentDetails.pallets;
              this.packageType.set(raw.shipmentDetails.packageType || (rawPallets != null ? String(rawPallets) : this.packageType()));
              this.containerType.set(raw.shipmentDetails.containerType || raw.shipmentDetails.dimensions || this.containerType());
              this.freightDescription.set(raw.shipmentDetails.freightDescription || this.freightDescription());
              this.shipperName.set(raw.shipmentDetails.shipperName || this.shipperName());
              this.shipperAddress.set(raw.shipmentDetails.shipperAddress || raw.shipmentDetails.shipperLocation || raw.origin || this.shipperAddress());
              this.shipperCity.set(raw.shipmentDetails.shipperCity || this.shipperCity());
              this.shipperState.set(raw.shipmentDetails.shipperState || this.shipperState());
              this.shipperZip.set(raw.shipmentDetails.shipperZip || this.shipperZip());
              this.shipperContactName.set(raw.shipmentDetails.shipperContactName || this.shipperContactName());
              this.shipperContactPhone.set(raw.shipmentDetails.shipperContactPhone || this.shipperContactPhone());
              this.consigneeName.set(raw.shipmentDetails.consigneeName || this.consigneeName());
              this.consigneeAddress.set(raw.shipmentDetails.consigneeAddress || raw.shipmentDetails.consigneeLocation || raw.destination || this.consigneeAddress());
              this.consigneeCity.set(raw.shipmentDetails.consigneeCity || this.consigneeCity());
              this.consigneeState.set(raw.shipmentDetails.consigneeState || this.consigneeState());
              this.consigneeZip.set(raw.shipmentDetails.consigneeZip || this.consigneeZip());
              this.consigneeContactName.set(raw.shipmentDetails.consigneeContactName || this.consigneeContactName());
              this.consigneeContactPhone.set(raw.shipmentDetails.consigneeContactPhone || this.consigneeContactPhone());
            }

            // Notes and weight fallback
            this.notes.set(raw.notes || quote.notes || '');
            this.weight.set(raw.weight || quote.weight || null);

          } else if (quote.moves && Array.isArray(quote.moves) && quote.moves.length > 0) {
            // Map from moves (as shown on the view page) into form fields
            const moves = quote.moves;

            // Origin from first move
            const firstOrigin = moves[0].origin;
            if (firstOrigin) {
              if (firstOrigin.zip) {
                this.originInputType.set('zipcode');
                this.originZipCode.set(firstOrigin.zip);
                this.selectedOrigin.set(null);
              } else if (firstOrigin.address) {
                this.originInputType.set('citystate');
                this.originCityState.set(firstOrigin.address);
                this.selectedOrigin.set(null);
              }
            }

            // Extra origin if move 2 differs from origin
            if (moves.length > 2) {
              const maybeExtraOrigin = moves[1];
              if (maybeExtraOrigin && maybeExtraOrigin.origin && maybeExtraOrigin.origin.zip && maybeExtraOrigin.origin.zip !== (firstOrigin?.zip || '')) {
                this.showExtraOrigin.set(true);
                this.extraOriginInputType.set('zipcode');
                this.extraOriginZipCode.set(maybeExtraOrigin.origin.zip);
                this.extraOriginCityState.set(maybeExtraOrigin.origin.address || '');
              }
            }

            // Destination from last move
            const lastDest = moves[moves.length - 1].destination;
            if (lastDest) {
              if (lastDest.zip) {
                this.destinationInputType.set('zipcode');
                this.destinationZipCode.set(lastDest.zip);
                this.selectedDestination.set(null);
              } else if (lastDest.address) {
                this.destinationInputType.set('citystate');
                this.destinationCityState.set(lastDest.address);
                this.selectedDestination.set(null);
              }
            }

            // Extra destination if moves include an intermediate final delivery (second to last)
            if (moves.length > 2) {
              const maybeExtraDest = moves[moves.length - 2];
              if (maybeExtraDest && maybeExtraDest.destination && maybeExtraDest.destination.zip && maybeExtraDest.destination.zip !== (lastDest?.zip || '')) {
                this.showExtraDestination.set(true);
                this.extraDestinationInputType.set('zipcode');
                this.extraDestinationZipCode.set(maybeExtraDest.destination.zip);
                this.extraDestinationCityState.set(maybeExtraDest.destination.address || '');
              }
            }

            // Shipment details fallback
            if (quote.shipmentDetails) {
              this.commodityType.set(quote.shipmentDetails.commodityType || this.commodityType());
              const quotePallets = quote.shipmentDetails.pallets;
              this.packageType.set((quote.shipmentDetails as any).packageType || (quotePallets != null ? String(quotePallets) : this.packageType()));
              this.containerType.set((quote.shipmentDetails as any).containerType || quote.shipmentDetails.dimensions || this.containerType());
              this.freightDescription.set((quote.shipmentDetails as any).freightDescription || this.freightDescription());
              this.shipperName.set((quote.shipmentDetails as any).shipperName || this.shipperName());
              this.shipperAddress.set((quote.shipmentDetails as any).shipperAddress || (quote.shipmentDetails as any).shipperLocation || quote.origin || this.shipperAddress());
              this.shipperCity.set((quote.shipmentDetails as any).shipperCity || this.shipperCity());
              this.shipperState.set((quote.shipmentDetails as any).shipperState || this.shipperState());
              this.shipperZip.set((quote.shipmentDetails as any).shipperZip || this.shipperZip());
              this.shipperContactName.set((quote.shipmentDetails as any).shipperContactName || this.shipperContactName());
              this.shipperContactPhone.set((quote.shipmentDetails as any).shipperContactPhone || this.shipperContactPhone());
              this.consigneeName.set((quote.shipmentDetails as any).consigneeName || this.consigneeName());
              this.consigneeAddress.set((quote.shipmentDetails as any).consigneeAddress || (quote.shipmentDetails as any).consigneeLocation || quote.destination || this.consigneeAddress());
              this.consigneeCity.set((quote.shipmentDetails as any).consigneeCity || this.consigneeCity());
              this.consigneeState.set((quote.shipmentDetails as any).consigneeState || this.consigneeState());
              this.consigneeZip.set((quote.shipmentDetails as any).consigneeZip || this.consigneeZip());
              this.consigneeContactName.set((quote.shipmentDetails as any).consigneeContactName || this.consigneeContactName());
              this.consigneeContactPhone.set((quote.shipmentDetails as any).consigneeContactPhone || this.consigneeContactPhone());
            }

            // Notes and weight
            this.notes.set(quote.notes || '');
            this.weight.set(quote.weight || null);

          } else if (quote.shipmentDetails) {
            this.commodityType.set(quote.shipmentDetails.commodityType);
            const quotePallets = quote.shipmentDetails.pallets;
            this.packageType.set((quote.shipmentDetails as any).packageType || (quotePallets != null ? String(quotePallets) : this.packageType()));
            this.containerType.set((quote.shipmentDetails as any).containerType || quote.shipmentDetails.dimensions || '');
            this.freightDescription.set((quote.shipmentDetails as any).freightDescription || '');
            this.shipperName.set((quote.shipmentDetails as any).shipperName || this.shipperName());
            this.shipperAddress.set((quote.shipmentDetails as any).shipperAddress || (quote.shipmentDetails as any).shipperLocation || quote.origin || this.shipperAddress());
            this.shipperCity.set((quote.shipmentDetails as any).shipperCity || this.shipperCity());
            this.shipperState.set((quote.shipmentDetails as any).shipperState || this.shipperState());
            this.shipperZip.set((quote.shipmentDetails as any).shipperZip || this.shipperZip());
            this.shipperContactName.set((quote.shipmentDetails as any).shipperContactName || this.shipperContactName());
            this.shipperContactPhone.set((quote.shipmentDetails as any).shipperContactPhone || this.shipperContactPhone());
            this.consigneeName.set((quote.shipmentDetails as any).consigneeName || this.consigneeName());
            this.consigneeAddress.set((quote.shipmentDetails as any).consigneeAddress || (quote.shipmentDetails as any).consigneeLocation || quote.destination || this.consigneeAddress());
            this.consigneeCity.set((quote.shipmentDetails as any).consigneeCity || this.consigneeCity());
            this.consigneeState.set((quote.shipmentDetails as any).consigneeState || this.consigneeState());
            this.consigneeZip.set((quote.shipmentDetails as any).consigneeZip || this.consigneeZip());
            this.consigneeContactName.set((quote.shipmentDetails as any).consigneeContactName || this.consigneeContactName());
            this.consigneeContactPhone.set((quote.shipmentDetails as any).consigneeContactPhone || this.consigneeContactPhone());
          }
        }
      },
      error: (err) => console.error('Error loading quote:', err)
    });
  }

  // Extra Origin Methods
  onExtraOriginInputTypeChange(type: InputType): void {
    this.extraOriginInputType.set(type);
    this.extraOriginZipCode.set('');
    this.extraOriginCityState.set('');
    this.extraOriginSearchResults.set([]);
    this.selectedExtraOrigin.set(null);
  }

  onExtraOriginZipCodeChange(zipCode: string): void {
    this.extraOriginZipCode.set(zipCode);
    this.selectedExtraOrigin.set(null);
    if (zipCode.length >= 3) {
      this.extraOriginSearchSubject.next(zipCode);
    } else {
      this.extraOriginSearchResults.set([]);
      this.extraOriginShowResults.set(false);
    }
  }

  onExtraOriginCityStateChange(cityState: string): void {
    this.extraOriginCityState.set(cityState);
    this.selectedExtraOrigin.set(null);
    if (cityState.length >= 3) {
      this.extraOriginSearchSubject.next(cityState);
    } else {
      this.extraOriginSearchResults.set([]);
      this.extraOriginShowResults.set(false);
    }
  }

  private performExtraOriginSearch(query: string): void {
    if (this.locationSearchService.isRateLimited()) {
      this.rateLimitWarning.set('Search limit reached. Please wait a moment and try again.');
      this.extraOriginSearching.set(false);
      return;
    }

    this.extraOriginSearching.set(true);
    this.rateLimitWarning.set('');
    
    this.locationSearchService.searchLocation(query).subscribe({
      next: (results) => {
        this.extraOriginSearchResults.set(results);
        this.extraOriginSearching.set(false);
        if (results.length === 1) {
          this.selectExtraOriginLocation(results[0]);
          this.extraOriginShowResults.set(false);
        } else if (results.length > 1) {
          this.extraOriginShowResults.set(true);
        } else {
          this.extraOriginShowResults.set(false);
        }
      },
      error: (err) => {
        console.error('Error searching extra origin:', err);
        this.extraOriginSearching.set(false);
        this.extraOriginShowResults.set(false);
      }
    });
  }

  selectExtraOriginLocation(result: LocationSearchResult): void {
    this.selectedExtraOrigin.set({
      position: { latitude: result.position?.latitude ?? (result as any).latitude, longitude: result.position?.longitude ?? (result as any).longitude },
      address: result.address,
      city: result.city,
      state: result.state,
      zipCode: result.zipCode
    });
    
    if (this.extraOriginInputType() === 'zipcode') {
      this.extraOriginZipCode.set(result.zipCode);
    } else {
      this.extraOriginCityState.set(`${result.city}, ${result.stateCode}`);
    }
    
    this.extraOriginShowResults.set(false);
  }

  // Extra Destination Methods
  onExtraDestinationInputTypeChange(type: InputType): void {
    this.extraDestinationInputType.set(type);
    this.extraDestinationZipCode.set('');
    this.extraDestinationCityState.set('');
    this.extraDestinationSearchResults.set([]);
    this.selectedExtraDestination.set(null);
  }

  onExtraDestinationZipCodeChange(zipCode: string): void {
    this.extraDestinationZipCode.set(zipCode);
    this.selectedExtraDestination.set(null);
    if (zipCode.length >= 3) {
      this.extraDestinationSearchSubject.next(zipCode);
    } else {
      this.extraDestinationSearchResults.set([]);
      this.extraDestinationShowResults.set(false);
    }
  }

  onExtraDestinationCityStateChange(cityState: string): void {
    this.extraDestinationCityState.set(cityState);
    this.selectedExtraDestination.set(null);
    if (cityState.length >= 3) {
      this.extraDestinationSearchSubject.next(cityState);
    } else {
      this.extraDestinationSearchResults.set([]);
      this.extraDestinationShowResults.set(false);
    }
  }

  private performExtraDestinationSearch(query: string): void {
    if (this.locationSearchService.isRateLimited()) {
      this.rateLimitWarning.set('Search limit reached. Please wait a moment and try again.');
      this.extraDestinationSearching.set(false);
      return;
    }

    this.extraDestinationSearching.set(true);
    this.rateLimitWarning.set('');
    
    this.locationSearchService.searchLocation(query).subscribe({
      next: (results) => {
        this.extraDestinationSearchResults.set(results);
        this.extraDestinationSearching.set(false);
        if (results.length === 1) {
          this.selectExtraDestinationLocation(results[0]);
          this.extraDestinationShowResults.set(false);
        } else if (results.length > 1) {
          this.extraDestinationShowResults.set(true);
        } else {
          this.extraDestinationShowResults.set(false);
        }
      },
      error: (err) => {
        console.error('Error searching extra destination:', err);
        this.extraDestinationSearching.set(false);
        this.extraDestinationShowResults.set(false);
      }
    });
  }

  selectExtraDestinationLocation(result: LocationSearchResult): void {
    this.selectedExtraDestination.set({
      position: { latitude: result.position?.latitude ?? (result as any).latitude, longitude: result.position?.longitude ?? (result as any).longitude },
      address: result.address,
      city: result.city,
      state: result.state,
      zipCode: result.zipCode
    });
    
    if (this.extraDestinationInputType() === 'zipcode') {
      this.extraDestinationZipCode.set(result.zipCode);
    } else {
      this.extraDestinationCityState.set(`${result.city}, ${result.stateCode}`);
    }
    
    this.extraDestinationShowResults.set(false);
  }

  onOriginInputTypeChange(type: InputType): void {
    this.originInputType.set(type);
    this.originZipCode.set('');
    this.originCityState.set('');
    this.originSearchResults.set([]);
    this.selectedOrigin.set(null);
  }

  onDestinationInputTypeChange(type: InputType): void {
    this.destinationInputType.set(type);
    this.destinationZipCode.set('');
    this.destinationCityState.set('');
    this.destinationSearchResults.set([]);
    this.selectedDestination.set(null);
  }

  onOriginZipCodeChange(zipCode: string): void {
    this.originZipCode.set(zipCode);
    this.selectedOrigin.set(null);
    if (zipCode.length >= 3) {
      this.originSearchSubject.next(zipCode);
    } else {
      this.originSearchResults.set([]);
      this.originShowResults.set(false);
    }
  }

  onOriginCityStateChange(cityState: string): void {
    this.originCityState.set(cityState);
    this.selectedOrigin.set(null);
    if (cityState.length >= 3) {
      this.originSearchSubject.next(cityState);
    } else {
      this.originSearchResults.set([]);
      this.originShowResults.set(false);
    }
  }

  onDestinationZipCodeChange(zipCode: string): void {
    this.destinationZipCode.set(zipCode);
    this.selectedDestination.set(null);
    if (zipCode.length >= 3) {
      this.destinationSearchSubject.next(zipCode);
    } else {
      this.destinationSearchResults.set([]);
      this.destinationShowResults.set(false);
    }
  }

  onDestinationCityStateChange(cityState: string): void {
    this.destinationCityState.set(cityState);
    this.selectedDestination.set(null);
    if (cityState.length >= 3) {
      this.destinationSearchSubject.next(cityState);
    } else {
      this.destinationSearchResults.set([]);
      this.destinationShowResults.set(false);
    }
  }

  private performOriginSearch(query: string): void {
    // Check rate limit before searching
    if (this.locationSearchService.isRateLimited()) {
      this.rateLimitWarning.set('Search limit reached. Please wait a moment and try again.');
      this.originSearching.set(false);
      return;
    }

    this.originSearching.set(true);
    this.rateLimitWarning.set('');
    
    this.locationSearchService.searchLocation(query).subscribe({
      next: (results) => {
        this.originSearchResults.set(results);
        this.originSearching.set(false);
        
        // Auto-select if only one result
        if (results.length === 1) {
          this.selectOriginLocation(results[0]);
          this.originShowResults.set(false);
        } else if (results.length > 1) {
          this.originShowResults.set(true);
        } else {
          this.originShowResults.set(false);
        }
      },
      error: (err) => {
        console.error('Error searching origin:', err);
        this.originSearching.set(false);
        this.originShowResults.set(false);
      }
    });
  }

  private performDestinationSearch(query: string): void {
    // Check rate limit before searching
    if (this.locationSearchService.isRateLimited()) {
      this.rateLimitWarning.set('Search limit reached. Please wait a moment and try again.');
      this.destinationSearching.set(false);
      return;
    }

    this.destinationSearching.set(true);
    this.rateLimitWarning.set('');
    
    this.locationSearchService.searchLocation(query).subscribe({
      next: (results) => {
        this.destinationSearchResults.set(results);
        this.destinationSearching.set(false);
        
        // Auto-select if only one result
        if (results.length === 1) {
          this.selectDestinationLocation(results[0]);
          this.destinationShowResults.set(false);
        } else if (results.length > 1) {
          this.destinationShowResults.set(true);
        } else {
          this.destinationShowResults.set(false);
        }
      },
      error: (err) => {
        console.error('Error searching destination:', err);
        this.destinationSearching.set(false);
        this.destinationShowResults.set(false);
      }
    });
  }

  selectOriginLocation(result: LocationSearchResult): void {
    this.selectedOrigin.set({
      position: { latitude: result.position?.latitude ?? (result as any).latitude, longitude: result.position?.longitude ?? (result as any).longitude },
      address: result.address,
      city: result.city,
      state: result.state,
      zipCode: result.zipCode
    });
    
    if (this.originInputType() === 'zipcode') {
      this.originZipCode.set(result.zipCode);
    } else {
      this.originCityState.set(`${result.city}, ${result.stateCode}`);
    }
    
    this.originShowResults.set(false);
  }

  selectDestinationLocation(result: LocationSearchResult): void {
    this.selectedDestination.set({
      position: { latitude: result.position?.latitude ?? (result as any).latitude, longitude: result.position?.longitude ?? (result as any).longitude },
      address: result.address,
      city: result.city,
      state: result.state,
      zipCode: result.zipCode
    });
    
    if (this.destinationInputType() === 'zipcode') {
      this.destinationZipCode.set(result.zipCode);
    } else {
      this.destinationCityState.set(`${result.city}, ${result.stateCode}`);
    }
    
    this.destinationShowResults.set(false);
  }

  generateSpotQuote(): void {
    if (!this.selectedOrigin() || !this.selectedDestination()) {
      this.errorMessage.set('Please select valid initial pickup and final delivery locations (zip codes are required)');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    const origin = this.selectedOrigin()!;
    const destination = this.selectedDestination()!;
    const extraOrigin = this.selectedExtraOrigin();
    const extraDestination = this.selectedExtraDestination();

    const request: CreateQuoteRequest = {
      description: `Quote from ${origin.zipCode} to ${destination.zipCode}`,
      originPosition: origin.position ? { latitude: origin.position.latitude, longitude: origin.position.longitude } : undefined,
      originZip: origin.zipCode,
      originAddress: origin.address,
      originCity: origin.city,
      originState: origin.state,
      destinationPosition: destination.position ? { latitude: destination.position.latitude, longitude: destination.position.longitude } : undefined,
      destinationZip: destination.zipCode,
      destinationAddress: destination.address,
      destinationCity: destination.city,
      destinationState: destination.state,
      // Extra Origin (optional)
      extraOriginPosition: extraOrigin?.position ? { latitude: extraOrigin.position.latitude, longitude: extraOrigin.position.longitude } : undefined,
      extraOriginZip: extraOrigin?.zipCode,
      extraOriginAddress: extraOrigin?.address,
      extraOriginCity: extraOrigin?.city,
      extraOriginState: extraOrigin?.state,
      // Extra Destination (optional)
      extraDestinationPosition: extraDestination?.position ? { latitude: extraDestination.position.latitude, longitude: extraDestination.position.longitude } : undefined,
      extraDestinationZip: extraDestination?.zipCode,
      extraDestinationAddress: extraDestination?.address,
      extraDestinationCity: extraDestination?.city,
      extraDestinationState: extraDestination?.state,
      // Stop Type Preferences
      originStopType: this.originStopType(),
      extraOriginStopType: this.extraOriginStopType(),
      extraDestinationStopType: this.extraDestinationStopType(),
      destinationStopType: this.destinationStopType(),
      // Customer Context: do not attach a persistent beneficial owner id to the quote.
      // Broker will be resolved from the current user's associated customers when possible.
      status: 'Opportunity'
    };

    const userStr = localStorage.getItem('current_user');
    const userId = userStr ? JSON.parse(userStr).id : null;

    const sendRequest = (req: any) => {
      this.quoteService.createQuote(req).subscribe({
      next: (response) => {
        // Build a lightweight QuoteRequest preview from request and response
        const preview: any = {
          id: response.id || `PREVIEW-${Date.now()}`,
          customerId: String(this.customerContextService.getCustomerContext().customerId || ''),
          quoteNumber: response.quoteNumber || response.id || '',
          quoteType: 'Spot',
          status: 'Opportunity',
          createdDate: new Date().toISOString(),
          origin: `${request.originZip}`,
          destination: `${request.destinationZip}`,
          weight: undefined,
          notes: request.description,
          totalPrice: response.totalPrice || 0,
          moves: response.moves || [],
          baseRate: response.baseRate,
          fuelSurcharge: response.fuelSurcharge,
          pickupCost: response.pickupCost,
          deliveryCost: response.deliveryCost
        };

        this.generatedQuote.set(preview as QuoteRequest);
        this.loading.set(false);
        // Navigate to the review page to show the quote and give actions (save, create order, cancel)
        // Prefer the customer-scoped review when the user is authenticated as a Customer so navigation lands under /customer
        const target = this.isCustomer() ? ['/customer/quote-review'] : ['/quote-review'];
        this.router.navigate(target, { state: { quote: preview } }).then(ok => {
          if (!ok) {
            this.router.navigate(['/quote-review'], { state: { quote: preview } });
          }
        });
      },
      error: (err) => {
        console.error('Error generating quote:', err);
        this.errorMessage.set(err?.error?.message || 'Failed to generate quote. Please try again.');
        this.loading.set(false);
      }
    });
    };

    // Resolve broker for current user (if possible) before sending the request
    if (userId) {
      this.customerService.getCustomersForUser(userId).subscribe({
        next: (list) => {
          const broker = list.find(c => c.type === 5); // CustomerType.Broker
          if (broker) request.brokerCustomerId = broker.id;
          else request.brokerCustomerId = this.customerContextService.getCustomerContext().customerId || undefined;

          sendRequest(request);
        },
        error: (err) => {
          console.warn('Could not resolve broker for user while generating opportunity:', err);
          request.brokerCustomerId = this.customerContextService.getCustomerContext().customerId || undefined;
          sendRequest(request);
        }
      });
    } else {
      request.brokerCustomerId = this.customerContextService.getCustomerContext().customerId || undefined;
      sendRequest(request);
    }
  }

  generateCustomQuote(): void {
    if (!this.isCustomLocationComplete()) {
      this.errorMessage.set('Please enter shipper and consignee name, address, city, state, and zip.');
      return;
    }
    if (!this.isCustomLocationVerified()) {
      this.errorMessage.set('Please verify shipper and consignee locations before submitting.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    const quoteReq: any = {
      customerId: String(this.customerContextService.getCustomerContext().customerId || ''),
      quoteType: 'Custom',
      status: 'Draft',
      origin: this.buildLocationSummary('shipper'),
      destination: this.buildLocationSummary('consignee'),
      weight: this.weight(),
      shipmentDetails: {
        shipperName: this.shipperName().trim(),
        shipperAddress: this.shipperAddress().trim(),
        shipperCity: this.shipperCity().trim(),
        shipperState: this.shipperState().trim(),
        shipperZip: this.shipperZip().trim(),
        shipperLatitude: this.shipperLatitude() ?? undefined,
        shipperLongitude: this.shipperLongitude() ?? undefined,
        shipperContactName: this.shipperContactName().trim() || undefined,
        shipperContactPhone: this.shipperContactPhone().trim() || undefined,
        consigneeName: this.consigneeName().trim(),
        consigneeAddress: this.consigneeAddress().trim(),
        consigneeCity: this.consigneeCity().trim(),
        consigneeState: this.consigneeState().trim(),
        consigneeZip: this.consigneeZip().trim(),
        consigneeLatitude: this.consigneeLatitude() ?? undefined,
        consigneeLongitude: this.consigneeLongitude() ?? undefined,
        consigneeContactName: this.consigneeContactName().trim() || undefined,
        consigneeContactPhone: this.consigneeContactPhone().trim() || undefined,
        commodityType: this.commodityType(),
        packageType: this.packageType() || undefined,
        containerType: this.containerType() || undefined,
        freightDescription: this.freightDescription() || undefined
      },
      notes: this.notes() || undefined
    };

    // Use createQuoteRequest mock method which returns a QuoteRequest
    // Construct a preview object for Custom quote
    const preview: any = {
      id: `PREVIEW-${Date.now()}`,
      customerId: String(this.customerContextService.getCustomerContext().customerId || ''),
      quoteNumber: '',
      quoteType: 'Custom',
      status: 'Preview',
      createdDate: new Date().toISOString(),
      origin: this.buildLocationSummary('shipper'),
      destination: this.buildLocationSummary('consignee'),
      weight: this.weight(),
      shipmentDetails: {
        shipperName: this.shipperName().trim(),
        shipperAddress: this.shipperAddress().trim(),
        shipperCity: this.shipperCity().trim(),
        shipperState: this.shipperState().trim(),
        shipperZip: this.shipperZip().trim(),
        shipperLatitude: this.shipperLatitude() ?? undefined,
        shipperLongitude: this.shipperLongitude() ?? undefined,
        shipperContactName: this.shipperContactName().trim() || undefined,
        shipperContactPhone: this.shipperContactPhone().trim() || undefined,
        consigneeName: this.consigneeName().trim(),
        consigneeAddress: this.consigneeAddress().trim(),
        consigneeCity: this.consigneeCity().trim(),
        consigneeState: this.consigneeState().trim(),
        consigneeZip: this.consigneeZip().trim(),
        consigneeLatitude: this.consigneeLatitude() ?? undefined,
        consigneeLongitude: this.consigneeLongitude() ?? undefined,
        consigneeContactName: this.consigneeContactName().trim() || undefined,
        consigneeContactPhone: this.consigneeContactPhone().trim() || undefined,
        commodityType: this.commodityType(),
        packageType: this.packageType() || undefined,
        containerType: this.containerType() || undefined,
        freightDescription: this.freightDescription() || undefined
      },
      notes: this.notes() || undefined,
      totalPrice: 0,
      moves: []
    };

    this.generatedQuote.set(preview as QuoteRequest);
    this.loading.set(false);
    // Navigate to the review page to show the quote and give actions (save, create order, cancel)
    // Prefer customer-scoped review when user is a Customer
    const target = this.isCustomer() ? ['/customer/quote-review'] : ['/quote-review'];
    this.router.navigate(target, { state: { quote: preview } }).then(ok => {
      if (!ok) this.router.navigate(['/quote-review'], { state: { quote: preview } });
    });
  }

  // Save current quote as Draft (works for Spot and Custom flows). Only customers can save drafts.
  saveDraft(): void {
    if (!this.isCustomer()) {
      this.errorMessage.set('Only customers can save drafts.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    if (this.quoteType() === 'Custom') {
      if (!this.isCustomLocationComplete()) {
        this.errorMessage.set('Please enter shipper and consignee name, address, city, state, and zip to save a draft.');
        this.loading.set(false);
        return;
      }
      if (!this.isCustomLocationVerified()) {
        this.errorMessage.set('Please verify shipper and consignee locations before saving a draft.');
        this.loading.set(false);
        return;
      }
      const quoteReq: any = {
        quoteType: 'Custom',
        status: 'Draft',
        origin: this.buildLocationSummary('shipper'),
        destination: this.buildLocationSummary('consignee'),
        weight: this.weight(),
        shipmentDetails: {
          shipperName: this.shipperName().trim(),
          shipperAddress: this.shipperAddress().trim(),
          shipperCity: this.shipperCity().trim(),
          shipperState: this.shipperState().trim(),
          shipperZip: this.shipperZip().trim(),
          shipperLatitude: this.shipperLatitude() ?? undefined,
          shipperLongitude: this.shipperLongitude() ?? undefined,
          shipperContactName: this.shipperContactName().trim() || undefined,
          shipperContactPhone: this.shipperContactPhone().trim() || undefined,
          consigneeName: this.consigneeName().trim(),
          consigneeAddress: this.consigneeAddress().trim(),
          consigneeCity: this.consigneeCity().trim(),
          consigneeState: this.consigneeState().trim(),
          consigneeZip: this.consigneeZip().trim(),
          consigneeLatitude: this.consigneeLatitude() ?? undefined,
          consigneeLongitude: this.consigneeLongitude() ?? undefined,
          consigneeContactName: this.consigneeContactName().trim() || undefined,
          consigneeContactPhone: this.consigneeContactPhone().trim() || undefined,
          commodityType: this.commodityType(),
          packageType: this.packageType() || undefined,
          containerType: this.containerType() || undefined,
          freightDescription: this.freightDescription() || undefined
        },
        notes: this.notes() || undefined,
        totalPrice: this.generatedQuote()?.totalPrice ?? 0
      };

      // Attach the active customer only as the broker on the quote (don't persist a beneficial owner id to quote)
      const activeCustomer = this.customerContextService.getCustomerContext().customerId;
      if (activeCustomer) {
        const parsed = Number(activeCustomer);
        if (!Number.isNaN(parsed)) { quoteReq.brokerCustomerId = parsed; }
        else { quoteReq.brokerCustomerId = activeCustomer; }
      }

      // If editing an existing server-side draft, update it instead of creating a new one
      if (this.editingQuoteId()) {
        this._createFormDraftAndNavigate(quoteReq, this.editingQuoteId() ?? undefined);
      } else {
        this._createFormDraftAndNavigate(quoteReq);
      }
    } else {
      if (!this.selectedOrigin() || !this.selectedDestination()) {
        this.errorMessage.set('Please select valid initial pickup and final delivery locations to save a draft.');
        this.loading.set(false);
        return;
      }

      const origin = this.selectedOrigin()!;
      const destination = this.selectedDestination()!;
      // Spot draft
      const quoteReq: any = {
        quoteType: 'Spot',
        status: 'Draft',
        origin: `${origin.city} (${origin.zipCode})`,
        destination: `${destination.city} (${destination.zipCode})`,
        notes: this.notes() || undefined,
        totalPrice: this.generatedQuote()?.totalPrice ?? 0
      };

      // Do not attach a persistent beneficial owner ID to the quote (keep it free-form in the UI). Broker will be resolved next.
      // (No beneficialOwnerId set)

      // Resolve broker for user then create draft
      const userStr2 = localStorage.getItem('current_user');
      const userId2 = userStr2 ? JSON.parse(userStr2).id : null;
      if (userId2) {
        this.customerService.getCustomersForUser(userId2).subscribe({
          next: (list) => {
            const broker = list.find(c => c.type === 5); // CustomerType.Broker
            if (broker) {
              quoteReq.brokerCustomerId = broker.id;
            }
            this._createFormDraftAndNavigate(quoteReq, this.editingQuoteId() ?? undefined);
          },
          error: (err) => {
            console.warn('Could not resolve broker for user while saving draft:', err);
            this._createFormDraftAndNavigate(quoteReq);
          }
        });
      } else {
        this._createFormDraftAndNavigate(quoteReq);
      }
    }
  }

  private _createFormDraftAndNavigate(quoteReq: any, updateId?: string): void {
    if (updateId) {
      this.quoteService.updateQuote(updateId, quoteReq).subscribe({
        next: (updated) => {
          this.loading.set(false);
          this.toastService.show('Draft updated');
          this.successMessage.set('Draft updated.');
          this.router.navigate(['/customer/quotes'], { queryParams: { status: 'Draft' } });
        },
        error: (err) => {
          console.error('Error updating draft:', err);
          this.errorMessage.set(err?.error?.message || 'Failed to update draft. Please try again.');
          this.loading.set(false);
        }
      });
      return;
    }

    this.quoteService.createQuoteRequest(quoteReq).subscribe({
      next: (created) => {
        this.loading.set(false);
        this.toastService.show('Draft saved');
        this.successMessage.set('Draft saved.');
        this.router.navigate(['/customer/quotes'], { queryParams: { status: 'Draft' } });
      },
      error: (err) => {
        console.error('Error saving draft:', err);
        this.errorMessage.set(err?.error?.message || 'Failed to save draft. Please try again.');
        this.loading.set(false);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/customer/quotes']);
  }
}