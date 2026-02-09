import { Component, OnInit, signal, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { QuoteService, QuoteRequest } from '../../services/quote.service';
import { AuthService } from '../../services/auth.service';
import { AddressLookupService, AddressSuggestion } from '../../services/address-lookup.service';
import { HttpClientModule } from '@angular/common/http';
import { combineLatest, debounceTime, distinctUntilChanged, Subject } from 'rxjs';

@Component({
  selector: 'app-accept-quote',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './accept-quote.component.html',
  styleUrl: './accept-quote.component.scss'
})
export class AcceptQuoteComponent implements OnInit, OnDestroy {
  private quoteService = inject(QuoteService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private addressLookup = inject(AddressLookupService);

  quote = signal<QuoteRequest | null>(null);
  form!: FormGroup;
  loading = signal(true);
  submitting = signal(false);
  errorMessage = signal('');
  quoteId = '';
  isCustomerPersona = signal(false);
  isAdminOrMarketingManager = signal(false);

  // Pickup date constraints
  minPickupDate: string = '';
  maxPickupDate: string = '';
  minPickupDateDisplay: string = '';
  maxPickupDateDisplay: string = '';

  // Address lookup
  originSuggestions = signal<AddressSuggestion[]>([]);
  destinationSuggestions = signal<AddressSuggestion[]>([]);
  extraPickupSuggestions = signal<AddressSuggestion[]>([]);
  extraDeliverySuggestions = signal<AddressSuggestion[]>([]);
  
  showOriginSuggestions = signal(false);
  showDestinationSuggestions = signal(false);
  showExtraPickupSuggestions = signal(false);
  showExtraDeliverySuggestions = signal(false);

  // Quote-original location (used to constrain suggestions)
  originQuoteCity: string | null = null;
  originQuoteState: string | null = null;
  originQuoteZip: string | null = null;

  destinationQuoteCity: string | null = null;
  destinationQuoteState: string | null = null;
  destinationQuoteZip: string | null = null;

  // Verification state
  originVerified = signal<boolean | null>(null);
  originVerificationMessage = signal('');
  originTopSuggestion = signal<AddressSuggestion | null>(null);
  originPosition = signal<{lat:number,lng:number} | null>(null);

  destinationVerified = signal<boolean | null>(null);
  destinationVerificationMessage = signal('');
  destinationTopSuggestion = signal<AddressSuggestion | null>(null);
  destinationPosition = signal<{lat:number,lng:number} | null>(null);

  // extra pickup/delivery verification and positions
  extraPickupVerified = signal<boolean | null>(null);
  extraPickupVerificationMessage = signal('');
  extraPickupTopSuggestion = signal<AddressSuggestion | null>(null);
  extraPickupPosition = signal<{lat:number,lng:number} | null>(null);

  extraDeliveryVerified = signal<boolean | null>(null);
  extraDeliveryVerificationMessage = signal('');
  extraDeliveryTopSuggestion = signal<AddressSuggestion | null>(null);
  extraDeliveryPosition = signal<{lat:number,lng:number} | null>(null);



  // For cleanup
  private destroy$ = new Subject<void>();

  constructor() {
    // Initialize immediately so binding has values during initial render
    this.setPickupDateRange();
  }

  private setPickupDateRange(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day
    const min = new Date(today);
    min.setDate(today.getDate() + 1); // tomorrow
    const max = new Date(today);
    max.setDate(today.getDate() + 7); // 7 days out
    this.minPickupDate = this.formatDateForInput(min);
    this.maxPickupDate = this.formatDateForInput(max);
    this.minPickupDateDisplay = this.formatDateForDisplay(min);
    this.maxPickupDateDisplay = this.formatDateForDisplay(max);
  }

  private formatDateForInput(d: Date): string {
    // YYYY-MM-DD for input[type=date]
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const result = `${yyyy}-${mm}-${dd}`;
    return result;
  }

  private formatDateForDisplay(d: Date): string {
    return d.toLocaleDateString('en-US');
  }


  ngOnInit(): void {
  const persona = this.authService.getPersona();
  const isAuthenticated = this.authService.isAuthenticated();

  // Set persona flags for template visibility
  this.isCustomerPersona.set(persona === 'Customer');
  this.isAdminOrMarketingManager.set(persona === 'Admin' || persona === 'MarketingManager');

  // Only customers can accept quotes (but allow if not authenticated for demo/mock mode)
  if (isAuthenticated && persona !== 'Customer') {
    // Show error message instead of silent redirect
    this.errorMessage.set('Only customers can accept quotes. Your current role is: ' + (persona || 'not set'));
    this.loading.set(false);

    // Redirect after 3 seconds to let user see the message
    setTimeout(() => {
      this.router.navigate(['/dashboard']);
    }, 3000);
    return;
  }

  // Support navigation state -> if quote was passed in navigation state, use it
  const navigation = this.router.getCurrentNavigation();
  if (navigation?.extras && navigation.extras.state && navigation.extras.state['quote']) {
    this.quote.set(navigation.extras.state['quote']);
      this.setPickupDateRange();
      this.initializeForm();

      const navQuote = this.quote();
      if (navQuote) {
        this.applyStopTypes(navQuote);
      }

      // If navigation contains verified addresses, patch the form and set verification state
      const verified = navigation.extras.state['verifiedAddresses'] || {};
      if (verified.origin) {
        // Patch origin address and city/state/zip if provided
        this.form.patchValue({ originAddress: verified.origin.address }, { emitEvent: false });
        if (verified.origin.city) {
          this.form.get('originCity')?.enable({ emitEvent: false });
          this.form.patchValue({ originCity: verified.origin.city }, { emitEvent: false });
          this.form.get('originCity')?.disable({ emitEvent: false });
        }
        if (verified.origin.state) {
          this.form.get('originState')?.enable({ emitEvent: false });
          this.form.patchValue({ originState: verified.origin.state }, { emitEvent: false });
          this.form.get('originState')?.disable({ emitEvent: false });
        }
        if (verified.origin.zip) {
          this.form.get('originZip')?.enable({ emitEvent: false });
          this.form.patchValue({ originZip: verified.origin.zip }, { emitEvent: false });
          this.form.get('originZip')?.disable({ emitEvent: false });
        }
        this.originVerified.set(true);
        this.originTopSuggestion.set(null);
      }

      if (verified.destination) {
        this.form.patchValue({ destinationAddress: verified.destination.address }, { emitEvent: false });
        if (verified.destination.city) {
          this.form.get('destinationCity')?.enable({ emitEvent: false });
          this.form.patchValue({ destinationCity: verified.destination.city }, { emitEvent: false });
          this.form.get('destinationCity')?.disable({ emitEvent: false });
        }
        if (verified.destination.state) {
          this.form.get('destinationState')?.enable({ emitEvent: false });
          this.form.patchValue({ destinationState: verified.destination.state }, { emitEvent: false });
          this.form.get('destinationState')?.disable({ emitEvent: false });
        }
        if (verified.destination.zip) {
          this.form.get('destinationZip')?.enable({ emitEvent: false });
          this.form.patchValue({ destinationZip: verified.destination.zip }, { emitEvent: false });
          this.form.get('destinationZip')?.disable({ emitEvent: false });
        }
        if (verified.destination.position?.latitude != null && verified.destination.position?.longitude != null) {
          this.destinationPosition.set({ lat: verified.destination.position.latitude!, lng: verified.destination.position.longitude! });
        }
        this.destinationVerified.set(true);
        this.destinationTopSuggestion.set(null);
      }

      // Apply extra pickup/delivery if provided
      if (verified.extraPickup) {
        this.form.patchValue({ extraPickupAddress: verified.extraPickup.address }, { emitEvent: false });
        if (verified.extraPickup.city) {
          this.form.get('extraPickupCity')?.enable({ emitEvent: false });
          this.form.patchValue({ extraPickupCity: verified.extraPickup.city }, { emitEvent: false });
          this.form.get('extraPickupCity')?.disable({ emitEvent: false });
        }
        if (verified.extraPickup.state) {
          this.form.get('extraPickupState')?.enable({ emitEvent: false });
          this.form.patchValue({ extraPickupState: verified.extraPickup.state }, { emitEvent: false });
          this.form.get('extraPickupState')?.disable({ emitEvent: false });
        }
        if (verified.extraPickup.zip) {
          this.form.get('extraPickupZip')?.enable({ emitEvent: false });
          this.form.patchValue({ extraPickupZip: verified.extraPickup.zip }, { emitEvent: false });
          this.form.get('extraPickupZip')?.disable({ emitEvent: false });
        }
        if (verified.extraPickup.position?.latitude != null && verified.extraPickup.position?.longitude != null) {
          this.extraPickupPosition.set({ lat: verified.extraPickup.position.latitude!, lng: verified.extraPickup.position.longitude! });
        }
        this.extraPickupVerified.set(true);
        this.extraPickupTopSuggestion.set(null);
      }

      if (verified.extraDelivery) {
        this.form.patchValue({ extraDeliveryAddress: verified.extraDelivery.address }, { emitEvent: false });
        if (verified.extraDelivery.city) {
          this.form.get('extraDeliveryCity')?.enable({ emitEvent: false });
          this.form.patchValue({ extraDeliveryCity: verified.extraDelivery.city }, { emitEvent: false });
          this.form.get('extraDeliveryCity')?.disable({ emitEvent: false });
        }
        if (verified.extraDelivery.state) {
          this.form.get('extraDeliveryState')?.enable({ emitEvent: false });
          this.form.patchValue({ extraDeliveryState: verified.extraDelivery.state }, { emitEvent: false });
          this.form.get('extraDeliveryState')?.disable({ emitEvent: false });
        }
        if (verified.extraDelivery.zip) {
          this.form.get('extraDeliveryZip')?.enable({ emitEvent: false });
          this.form.patchValue({ extraDeliveryZip: verified.extraDelivery.zip }, { emitEvent: false });
          this.form.get('extraDeliveryZip')?.disable({ emitEvent: false });
        }
        if (verified.extraDelivery.position?.latitude != null && verified.extraDelivery.position?.longitude != null) {
          this.extraDeliveryPosition.set({ lat: verified.extraDelivery.position.latitude!, lng: verified.extraDelivery.position.longitude! });
        }
        this.extraDeliveryVerified.set(true);
        this.extraDeliveryTopSuggestion.set(null);
      }

      this.loading.set(false);
      return;
    }

    this.quoteId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.quoteId) {
      this.errorMessage.set('Quote ID not found');
      this.loading.set(false);
      return;
    }

    this.setPickupDateRange();
    this.initializeForm();
    this.loadQuote(this.quoteId);
  }

  private initializeForm(): void {
    this.form = this.fb.group({
      // Origin/Pickup Address
      originName: ['', Validators.required],
      originAddress: ['', Validators.required],
      originCity: [{ value: '', disabled: true }],
      originState: [{ value: '', disabled: true }],
      originZip: [{ value: '', disabled: true }],
      // Extra Pickup Address (if applicable)
      extraPickupName: [''],
      extraPickupAddress: [''],
      extraPickupCity: [{ value: '', disabled: true }],
      extraPickupState: [{ value: '', disabled: true }],
      extraPickupZip: [{ value: '', disabled: true }],
      // Destination/Delivery Address
      destinationName: ['', Validators.required],
      destinationAddress: ['', Validators.required],
      destinationCity: [{ value: '', disabled: true }],
      destinationState: [{ value: '', disabled: true }],
      destinationZip: [{ value: '', disabled: true }],
      // Extra Delivery Address (if applicable)
      extraDeliveryName: [''],
      extraDeliveryAddress: [''],
      extraDeliveryCity: [{ value: '', disabled: true }],
      extraDeliveryState: [{ value: '', disabled: true }],
      extraDeliveryZip: [{ value: '', disabled: true }],
      // Appointment times
      // Pickup date must be required and within allowed range (tomorrow..7 days out)
      pickupAppointmentDate: ['', Validators.required],
      pickupAppointmentStartTime: ['', Validators.required],
      pickupAppointmentEndTime: ['', Validators.required],
      deliveryAppointmentDate: [''],
      deliveryAppointmentStartTime: [''],
      deliveryAppointmentEndTime: [''],
      // Contact info
      pickupStopType: [''],
      pickupContactName: [''],
      pickupContactPhone: [''],
      deliveryStopType: [''],
      deliveryContactName: [''],
      deliveryContactPhone: [''],
      // Shipment reference details
      customerShipmentNumber: [''],
      containerNumber: [''],
      // Extra pickup details
      extraPickupStopType: [''],
      extraPickupAppointmentDate: [''],
      extraPickupAppointmentStartTime: [''],
      extraPickupAppointmentEndTime: [''],
      extraPickupContactName: [''],
      extraPickupContactPhone: [''],
      // Extra delivery details
      extraDeliveryStopType: [''],
      extraDeliveryAppointmentDate: [''],
      extraDeliveryAppointmentStartTime: [''],
      extraDeliveryAppointmentEndTime: [''],
      extraDeliveryContactName: [''],
      extraDeliveryContactPhone: ['']
    });
    
    // Setup coordinate auto-refresh when address fields change
    this.setupCoordinateAutoRefresh();
  }

  private normalizeStopType(value: any): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') {
      const normalized = value.toLowerCase();
      if (normalized === 'stay') return 'Stay';
      if (normalized === 'drop') return 'Drop';
      return '';
    }
    if (typeof value === 'number') {
      if (value === 1) return 'Stay';
      if (value === 2) return 'Drop';
    }
    return '';
  }

  private applyStopTypes(quote: QuoteRequest): void {
    this.form.patchValue({
      pickupStopType: this.normalizeStopType(quote.originStopType),
      deliveryStopType: this.normalizeStopType(quote.destinationStopType),
      extraPickupStopType: this.normalizeStopType(quote.extraOriginStopType),
      extraDeliveryStopType: this.normalizeStopType(quote.extraDestinationStopType)
    }, { emitEvent: false });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }



  private loadQuote(quoteId: string): void {
    this.quoteService.getQuoteById(quoteId).subscribe({
      next: (quote) => {
        if (quote) {
          this.quote.set(quote);

          this.applyStopTypes(quote);
          
          // Pre-fill address fields from move data
          if (quote.moves && quote.moves.length > 0) {
            const firstMove = quote.moves[0];
            const lastMove = quote.moves[quote.moves.length - 1];
            
            // Find extra pickup/delivery moves by moveType
            const extraPickup = quote.moves.find((m: any) => (m.moveType || '').toLowerCase() === 'extrapickup') || null;
            const extraDelivery = quote.moves.find((m: any) => (m.moveType || '').toLowerCase() === 'extradelivery') || null;

            this.form.patchValue({
              // Origin address from first move origin
              originAddress: firstMove.origin?.address || '',
              originCity: firstMove.origin?.city || '',
              originState: firstMove.origin?.state || '',
              // Extra pickup if exists
              extraPickupAddress: extraPickup?.origin?.address || '',
              extraPickupCity: extraPickup?.origin?.city || '',
              extraPickupState: extraPickup?.origin?.state || '',
              // Destination address from last move destination
              destinationAddress: lastMove.destination?.address || '',
              destinationCity: lastMove.destination?.city || '',
              destinationState: lastMove.destination?.state || '',
              // Extra delivery if exists
              extraDeliveryAddress: extraDelivery?.destination?.address || '',
              extraDeliveryCity: extraDelivery?.destination?.city || '',
              extraDeliveryState: extraDelivery?.destination?.state || ''
            });

            // Set disabled fields separately (patchValue doesn't work on disabled controls)
            this.form.get('originZip')?.setValue(firstMove.origin?.zip || '');
            this.form.get('extraPickupZip')?.setValue(extraPickup?.origin?.zip || '');
            this.form.get('destinationZip')?.setValue(lastMove.destination?.zip || '');
            this.form.get('extraDeliveryZip')?.setValue(extraDelivery?.destination?.zip || '');

            // Record the quote's original city/state/zip so verification can enforce it
            this.originQuoteCity = firstMove.origin?.city || null;
            this.originQuoteState = firstMove.origin?.state || null;
            this.originQuoteZip = firstMove.origin?.zip || null;

            this.destinationQuoteCity = lastMove.destination?.city || null;
            this.destinationQuoteState = lastMove.destination?.state || null;
            this.destinationQuoteZip = lastMove.destination?.zip || null;
          }
          
          // Pre-fill appointment and contact data if available
          if (quote.orderDetails) {
            this.form.patchValue({
              pickupAppointmentDate: quote.pickupAppointmentDate || '',
              pickupAppointmentStartTime: quote.pickupAppointmentTime || '',
              pickupAppointmentEndTime: quote.pickupAppointmentTime || '',
              deliveryAppointmentDate: quote.deliveryAppointmentDate || '',
              deliveryAppointmentStartTime: quote.deliveryAppointmentTime || '',
              deliveryAppointmentEndTime: quote.deliveryAppointmentTime || '',
              pickupContactName: quote.orderDetails.pickupContactName || '',
              pickupContactPhone: quote.orderDetails.pickupContactPhone || '',
              deliveryContactName: quote.orderDetails.deliveryContactName || '',
              deliveryContactPhone: quote.orderDetails.deliveryContactPhone || ''
            });
          }
        } else {
          this.errorMessage.set('Quote not found');
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading quote:', err);
        this.errorMessage.set('Failed to load quote');
        this.loading.set(false);
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.errorMessage.set('Please fill in all required fields (marked with *)');
      return;
    }

    if (!this.quote()) {
      this.errorMessage.set('Please fill in all required fields (marked with *) and ensure end times are not earlier than start times');
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    const formValue = this.form.value;
    const appointmentDetails = {
      pickupAppointmentDate: formValue.pickupAppointmentDate,
      pickupAppointmentTime: formValue.pickupAppointmentStartTime,
      deliveryAppointmentDate: formValue.deliveryAppointmentDate || '',
      deliveryAppointmentTime: formValue.deliveryAppointmentStartTime || '',
      pickupStopType: formValue.pickupStopType || undefined,
      deliveryStopType: formValue.deliveryStopType || undefined,
      pickupContactName: formValue.pickupContactName,
      pickupContactPhone: formValue.pickupContactPhone,
      deliveryContactName: formValue.deliveryContactName,
      deliveryContactPhone: formValue.deliveryContactPhone
    };

    // Build payload and include verified addresses if present
    const payload: any = { ...appointmentDetails };

    const customerShipmentNumber = (formValue.customerShipmentNumber || '').trim();
    if (customerShipmentNumber) {
      payload.CustomerReference = customerShipmentNumber;
    }

    const containerNumber = (formValue.containerNumber || '').trim();
    if (containerNumber) {
      payload.ContainerNumber = containerNumber;
    }

    if (this.hasExtraPickup()) {
      payload.ExtraPickup = {
        name: formValue.extraPickupName || '',
        stopType: formValue.extraPickupStopType || undefined,
        appointmentDate: formValue.extraPickupAppointmentDate || '',
        appointmentStartTime: formValue.extraPickupAppointmentStartTime || '',
        appointmentEndTime: formValue.extraPickupAppointmentEndTime || '',
        contactName: formValue.extraPickupContactName || '',
        contactPhone: formValue.extraPickupContactPhone || ''
      };
    }

    if (this.hasExtraDelivery()) {
      payload.ExtraDelivery = {
        name: formValue.extraDeliveryName || '',
        stopType: formValue.extraDeliveryStopType || undefined,
        appointmentDate: formValue.extraDeliveryAppointmentDate || '',
        appointmentStartTime: formValue.extraDeliveryAppointmentStartTime || '',
        appointmentEndTime: formValue.extraDeliveryAppointmentEndTime || '',
        contactName: formValue.extraDeliveryContactName || '',
        contactPhone: formValue.extraDeliveryContactPhone || ''
      };
    }

    if (this.originVerified() === true) {
      payload.Origin = {
        name: this.form.get('originName')?.value,
        address: this.form.get('originAddress')?.value,
        city: this.form.get('originCity')?.value,
        state: this.form.get('originState')?.value,
        zip: this.form.get('originZip')?.value
      };
      if (this.originPosition()) payload.Origin.Position = { latitude: this.originPosition()?.lat, longitude: this.originPosition()?.lng };
    }

    if (this.destinationVerified() === true) {
      payload.Destination = {
        name: this.form.get('destinationName')?.value,
        address: this.form.get('destinationAddress')?.value,
        city: this.form.get('destinationCity')?.value,
        state: this.form.get('destinationState')?.value,
        zip: this.form.get('destinationZip')?.value
      };
      if (this.destinationPosition()) payload.Destination.Position = { latitude: this.destinationPosition()?.lat, longitude: this.destinationPosition()?.lng };
    }

    const navState = {
      quoteId: this.quoteId,
      payload,
      returnUrl: `/customer/accept-quote/${this.quoteId}`
    };

    this.submitting.set(false);
    this.router.navigate(['/customer/confirm-order'], { state: navState });
  }

  cancel(): void {
    this.router.navigate(['/customer/quotes']);
  }

  // Address Lookup Methods
  onOriginAddressInput(event: any): void {
    const address = event.target.value;
    const city = this.form.get('originCity')?.value || '';
    const state = this.form.get('originState')?.value || '';
    const zip = this.form.get('originZip')?.value || '';
    const query = `${address}, ${city}, ${state} ${zip}`.trim();
    
    if (address && address.length >= 3) {
      this.addressLookup.searchAddresses(query).subscribe(suggestions => {
        // If quote has a pre-set city/state/zip, filter suggestions to match it
        const filtered = suggestions.filter(s => this.matchesQuoteLocation(s, this.originQuoteCity, this.originQuoteState, this.originQuoteZip));
        this.originSuggestions.set(filtered.length > 0 ? filtered : []);
        this.showOriginSuggestions.set((filtered.length > 0));
      });
    } else {
      this.originSuggestions.set([]);
      this.showOriginSuggestions.set(false);
    }
  }

  onDestinationAddressInput(event: any): void {
    const address = event.target.value;
    const city = this.form.get('destinationCity')?.value || '';
    const state = this.form.get('destinationState')?.value || '';
    const zip = this.form.get('destinationZip')?.value || '';
    const query = `${address}, ${city}, ${state} ${zip}`.trim();
    
    if (address && address.length >= 3) {
      this.addressLookup.searchAddresses(query).subscribe(suggestions => {
        const filtered = suggestions.filter(s => this.matchesQuoteLocation(s, this.destinationQuoteCity, this.destinationQuoteState, this.destinationQuoteZip));
        this.destinationSuggestions.set(filtered.length > 0 ? filtered : []);
        this.showDestinationSuggestions.set(filtered.length > 0);
      });
    } else {
      this.destinationSuggestions.set([]);
      this.showDestinationSuggestions.set(false);
    }
  }

  onExtraPickupAddressInput(event: any): void {
    const address = event.target.value;
    const city = this.form.get('extraPickupCity')?.value || '';
    const state = this.form.get('extraPickupState')?.value || '';
    const zip = this.form.get('extraPickupZip')?.value || '';
    const query = `${address}, ${city}, ${state} ${zip}`.trim();
    
    if (address && address.length >= 3) {
      this.addressLookup.searchAddresses(query).subscribe(suggestions => {
        this.extraPickupSuggestions.set(suggestions);
        this.showExtraPickupSuggestions.set(true);
      });
    } else {
      this.extraPickupSuggestions.set([]);
      this.showExtraPickupSuggestions.set(false);
    }
  }

  onExtraDeliveryAddressInput(event: any): void {
    const address = event.target.value;
    const city = this.form.get('extraDeliveryCity')?.value || '';
    const state = this.form.get('extraDeliveryState')?.value || '';
    const zip = this.form.get('extraDeliveryZip')?.value || '';
    const query = `${address}, ${city}, ${state} ${zip}`.trim();
    
    if (address && address.length >= 3) {
      this.addressLookup.searchAddresses(query).subscribe(suggestions => {
        this.extraDeliverySuggestions.set(suggestions);
        this.showExtraDeliverySuggestions.set(true);
      });
    } else {
      this.extraDeliverySuggestions.set([]);
      this.showExtraDeliverySuggestions.set(false);
    }
  }

  selectOriginAddress(suggestion: AddressSuggestion | null): void {
    if (!suggestion) return;
    // Enable disabled fields temporarily to set values
    this.form.get('originCity')?.enable({ emitEvent: false });
    this.form.get('originState')?.enable({ emitEvent: false });
    this.form.get('originZip')?.enable({ emitEvent: false });
    
    this.form.patchValue({
      originAddress: suggestion.displayName || suggestion.address,
      originCity: suggestion.city,
      originState: suggestion.state,
      originZip: suggestion.zip
    }, { emitEvent: false });
    
    // Re-disable the fields
    this.form.get('originCity')?.disable({ emitEvent: false });
    this.form.get('originState')?.disable({ emitEvent: false });
    this.form.get('originZip')?.disable({ emitEvent: false });

    // Mark as verified
    this.originVerified.set(true);
    this.originVerificationMessage.set('Address verified');
    this.originTopSuggestion.set(null);

    // Store coordinates if available
    if (suggestion.position?.latitude != null && suggestion.position?.longitude != null) {
      this.originPosition.set({ lat: suggestion.position.latitude!, lng: suggestion.position.longitude! });
    }

    // clear suggestion list
    this.originSuggestions.set([]);
    this.showOriginSuggestions.set(false);
  }

  selectDestinationAddress(suggestion: AddressSuggestion | null): void {
    if (!suggestion) return;
    // Enable disabled fields temporarily to set values
    this.form.get('destinationCity')?.enable({ emitEvent: false });
    this.form.get('destinationState')?.enable({ emitEvent: false });
    this.form.get('destinationZip')?.enable({ emitEvent: false });
    
    this.form.patchValue({
      destinationAddress: suggestion.displayName || suggestion.address,
      destinationCity: suggestion.city,
      destinationState: suggestion.state,
      destinationZip: suggestion.zip
    }, { emitEvent: false });
    
    // Re-disable the fields
    this.form.get('destinationCity')?.disable({ emitEvent: false });
    this.form.get('destinationState')?.disable({ emitEvent: false });
    this.form.get('destinationZip')?.disable({ emitEvent: false });

    // Mark as verified
    this.destinationVerified.set(true);
    this.destinationVerificationMessage.set('Address verified');
    this.destinationTopSuggestion.set(null);

    // Store coordinates if available
    if (suggestion.position?.latitude != null && suggestion.position?.longitude != null) {
      this.destinationPosition.set({ lat: suggestion.position.latitude!, lng: suggestion.position.longitude! });
    }

    // clear suggestion list
    this.destinationSuggestions.set([]);
    this.showDestinationSuggestions.set(false);
  }

  selectExtraPickupAddress(suggestion: AddressSuggestion | null): void {
    if (!suggestion) return;
    // Enable disabled fields temporarily to set values
    this.form.get('extraPickupCity')?.enable({ emitEvent: false });
    this.form.get('extraPickupState')?.enable({ emitEvent: false });
    this.form.get('extraPickupZip')?.enable({ emitEvent: false });
    
    this.form.patchValue({
      extraPickupAddress: suggestion.displayName || suggestion.address,
      extraPickupCity: suggestion.city,
      extraPickupState: suggestion.state,
      extraPickupZip: suggestion.zip
    }, { emitEvent: false });
    
    // Re-disable the fields
    this.form.get('extraPickupCity')?.disable({ emitEvent: false });
    this.form.get('extraPickupState')?.disable({ emitEvent: false });
    this.form.get('extraPickupZip')?.disable({ emitEvent: false });

    // Mark as verified
    this.extraPickupVerified.set(true);
    this.extraPickupVerificationMessage.set('Address verified');
    this.extraPickupTopSuggestion.set(null);

    // Store coordinates if available
    if (suggestion.position?.latitude != null && suggestion.position?.longitude != null) {
      this.extraPickupPosition.set({ lat: suggestion.position.latitude!, lng: suggestion.position.longitude! });
    }
    
    // clear suggestion list for extras
    this.extraPickupSuggestions.set([]);
    this.showExtraPickupSuggestions.set(false);
  }

  selectExtraDeliveryAddress(suggestion: AddressSuggestion | null): void {
    if (!suggestion) return;
    // Enable disabled fields temporarily to set values
    this.form.get('extraDeliveryCity')?.enable({ emitEvent: false });
    this.form.get('extraDeliveryState')?.enable({ emitEvent: false });
    this.form.get('extraDeliveryZip')?.enable({ emitEvent: false });
    
    this.form.patchValue({
      extraDeliveryAddress: suggestion.displayName || suggestion.address,
      extraDeliveryCity: suggestion.city,
      extraDeliveryState: suggestion.state,
      extraDeliveryZip: suggestion.zip
    }, { emitEvent: false });
    
    // Re-disable the fields
    this.form.get('extraDeliveryCity')?.disable({ emitEvent: false });
    this.form.get('extraDeliveryState')?.disable({ emitEvent: false });
    this.form.get('extraDeliveryZip')?.disable({ emitEvent: false });

    // Mark as verified
    this.extraDeliveryVerified.set(true);
    this.extraDeliveryVerificationMessage.set('Address verified');
    this.extraDeliveryTopSuggestion.set(null);

    if (suggestion.position?.latitude != null && suggestion.position?.longitude != null) {
      this.extraDeliveryPosition.set({ lat: suggestion.position.latitude!, lng: suggestion.position.longitude! });
    }
    
    // clear suggestion list for extras
    this.extraDeliverySuggestions.set([]);
    this.showExtraDeliverySuggestions.set(false);
  }
  private setupCoordinateAutoRefresh(): void {
    // Setup auto-refresh for origin address coordinates
    const originAddressCtrl = this.form.get('originAddress');
    const originCityCtrl = this.form.get('originCity');
    const originStateCtrl = this.form.get('originState');
    const originZipCtrl = this.form.get('originZip');

    if (originAddressCtrl && originCityCtrl && originStateCtrl && originZipCtrl) {
      combineLatest([
        originAddressCtrl.valueChanges,
        originCityCtrl.valueChanges,
        originStateCtrl.valueChanges,
        originZipCtrl.valueChanges
      ])
        .pipe(
          debounceTime(500),
          distinctUntilChanged()
        )
        .subscribe(() => {
          this.resolveOriginCoordinates();
        });
    }

    // Setup auto-refresh for destination address coordinates
    const destAddressCtrl = this.form.get('destinationAddress');
    const destCityCtrl = this.form.get('destinationCity');
    const destStateCtrl = this.form.get('destinationState');
    const destZipCtrl = this.form.get('destinationZip');

    if (destAddressCtrl && destCityCtrl && destStateCtrl && destZipCtrl) {
      combineLatest([
        destAddressCtrl.valueChanges,
        destCityCtrl.valueChanges,
        destStateCtrl.valueChanges,
        destZipCtrl.valueChanges
      ])
        .pipe(
          debounceTime(500),
          distinctUntilChanged()
        )
        .subscribe(() => {
          this.resolveDestinationCoordinates();
        });
    }
  }

  private resolveOriginCoordinates(): void {
    const address = this.form.get('originAddress')?.value;
    const city = this.form.get('originCity')?.value;
    const state = this.form.get('originState')?.value;
    const zip = this.form.get('originZip')?.value;

    if (!address || !city || !state || !zip) return;

    const query = `${address}, ${city}, ${state} ${zip}`.trim();
    this.addressLookup.searchAddresses(query).subscribe(results => {
      const filtered = results.filter((r: AddressSuggestion) => this.matchesQuoteLocation(r, this.originQuoteCity, this.originQuoteState, this.originQuoteZip));

      if (filtered && filtered.length > 0) {
        const match = filtered[0];

        const addrMatches = this.normalizeAddressForCompare(match.address).includes(this.normalizeAddressForCompare(address)) || this.normalizeAddressForCompare(match.displayName).includes(this.normalizeAddressForCompare(address));
        const cityMatches = city ? (match.city || '').toLowerCase() === (city || '').toLowerCase() : true;
        const stateMatches = state ? (match.state || '').toLowerCase() === (state || '').toLowerCase() : true;
        const zipMatches = zip ? (match.zip || '') === (zip || '') : true;

        // Do not change verification status automatically. Surface a top suggestion only when fields do not fully match.
        if (addrMatches && cityMatches && stateMatches && zipMatches) {
          // All fields match — clear any top suggestion
          this.originTopSuggestion.set(null);
        } else {
          this.originTopSuggestion.set(match);
        }
      } else {
        this.originTopSuggestion.set(null);
      }
    }, (err) => {
      // Do not set verification status during auto-checks triggered by field changes.
      this.originTopSuggestion.set(null);
    });
  }

  verifyOriginAddress(): void {
    const address = this.form.get('originAddress')?.value;
    if (!address || address.length < 3) {
      this.originVerified.set(false);
      this.originVerificationMessage.set('Enter at least 3 characters to verify');
      this.originTopSuggestion.set(null);
      return;
    }

    this.addressLookup.searchAddresses(address).subscribe(results => {
      // Filter results to those that match the quote's city/state/zip
      const filtered = results.filter((r: AddressSuggestion) => this.matchesQuoteLocation(r, this.originQuoteCity, this.originQuoteState, this.originQuoteZip));

      if (filtered && filtered.length > 0) {
        const top = filtered[0];
        const addrMatches = this.allAddressTokensPresent(address, top.displayName) || this.allAddressTokensPresent(address, top.address);
        if (addrMatches) {
          // Strong match - auto-select
          this.selectOriginAddress(top);
        } else {
          this.originVerified.set(false);
          this.originVerificationMessage.set('Address not verified (closest match shown)');
          this.originTopSuggestion.set(top);
        }
      } else {
        this.originVerified.set(false);
        this.originVerificationMessage.set('No match found for the quote location');
        this.originTopSuggestion.set(null);
      }
    }, (err) => {
      this.originVerified.set(false);
      this.originVerificationMessage.set('Unable to verify address');
      this.originTopSuggestion.set(null);
    });
  }

  verifyDestinationAddress(): void {
    const address = this.form.get('destinationAddress')?.value;
    if (!address || address.length < 3) {
      this.destinationVerified.set(false);
      this.destinationVerificationMessage.set('Enter at least 3 characters to verify');
      this.destinationTopSuggestion.set(null);
      return;
    }

    this.addressLookup.searchAddresses(address).subscribe(results => {
      const filtered = results.filter((r: AddressSuggestion) => this.matchesQuoteLocation(r, this.destinationQuoteCity, this.destinationQuoteState, this.destinationQuoteZip));

      if (filtered && filtered.length > 0) {
        const top = filtered[0];
        const addrMatches = this.allAddressTokensPresent(address, top.displayName) || this.allAddressTokensPresent(address, top.address);
        if (addrMatches) {
          // Strong match - auto-select
          this.selectDestinationAddress(top);
        } else {
          this.destinationVerified.set(false);
          this.destinationVerificationMessage.set('Address not verified (closest match shown)');
          this.destinationTopSuggestion.set(top);
        }
      } else {
        this.destinationVerified.set(false);
        this.destinationVerificationMessage.set('No match found for the quote location');
        this.destinationTopSuggestion.set(null);
      }
    }, (err) => {
      this.destinationVerified.set(false);
      this.destinationVerificationMessage.set('Unable to verify address');
      this.destinationTopSuggestion.set(null);
    });
  }

  verifyExtraPickupAddress(): void {
    const address = this.form.get('extraPickupAddress')?.value;
    if (!address || address.length < 3) {
      this.extraPickupVerified.set(false);
      this.extraPickupVerificationMessage.set('Enter at least 3 characters to verify');
      this.extraPickupTopSuggestion.set(null);
      return;
    }

    const city = this.form.get('extraPickupCity')?.value || '';
    const state = this.form.get('extraPickupState')?.value || '';
    const zip = this.form.get('extraPickupZip')?.value || '';

    this.addressLookup.searchAddresses(address).subscribe(results => {
      const filtered = results.filter((r: AddressSuggestion) => this.matchesQuoteLocation(r, city, state, zip));

      if (filtered && filtered.length > 0) {
        const top = filtered[0];
        const addrMatches = this.allAddressTokensPresent(address, top.displayName) || this.allAddressTokensPresent(address, top.address);
        if (addrMatches) {
          this.selectExtraPickupAddress(top);
        } else {
          this.extraPickupVerified.set(false);
          this.extraPickupVerificationMessage.set('Address not verified (closest match shown)');
          this.extraPickupTopSuggestion.set(top);
        }
      } else {
        this.extraPickupVerified.set(false);
        this.extraPickupVerificationMessage.set('No match found');
        this.extraPickupTopSuggestion.set(null);
      }
    }, (err) => {
      this.extraPickupVerified.set(false);
      this.extraPickupVerificationMessage.set('Unable to verify address');
      this.extraPickupTopSuggestion.set(null);
    });
  }

  verifyExtraDeliveryAddress(): void {
    const address = this.form.get('extraDeliveryAddress')?.value;
    if (!address || address.length < 3) {
      this.extraDeliveryVerified.set(false);
      this.extraDeliveryVerificationMessage.set('Enter at least 3 characters to verify');
      this.extraDeliveryTopSuggestion.set(null);
      return;
    }

    const city = this.form.get('extraDeliveryCity')?.value || '';
    const state = this.form.get('extraDeliveryState')?.value || '';
    const zip = this.form.get('extraDeliveryZip')?.value || '';

    this.addressLookup.searchAddresses(address).subscribe(results => {
      const filtered = results.filter((r: AddressSuggestion) => this.matchesQuoteLocation(r, city, state, zip));

      if (filtered && filtered.length > 0) {
        const top = filtered[0];
        const addrMatches = this.allAddressTokensPresent(address, top.displayName) || this.allAddressTokensPresent(address, top.address);
        if (addrMatches) {
          this.selectExtraDeliveryAddress(top);
        } else {
          this.extraDeliveryVerified.set(false);
          this.extraDeliveryVerificationMessage.set('Address not verified (closest match shown)');
          this.extraDeliveryTopSuggestion.set(top);
        }
      } else {
        this.extraDeliveryVerified.set(false);
        this.extraDeliveryVerificationMessage.set('No match found');
        this.extraDeliveryTopSuggestion.set(null);
      }
    }, (err) => {
      this.extraDeliveryVerified.set(false);
      this.extraDeliveryVerificationMessage.set('Unable to verify address');
      this.extraDeliveryTopSuggestion.set(null);
    });
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

  private normalizeAddressForCompare(s: string | null | undefined): string {
    return (s || '').replace(/\W+/g, '').toLowerCase();
  }

  private matchesQuoteLocation(s: AddressSuggestion, qCity: string | null, qState: string | null, qZip: string | null): boolean {
    // If the quote doesn't specify a complete city/state/zip, do not constrain
    if ((!qCity || qCity.trim() === '') && (!qState || qState.trim() === '') && (!qZip || qZip.trim() === '')) return true;

    const cityMatch = qCity ? (s.city || '').toLowerCase() === qCity.toLowerCase() : true;
    const stateMatch = qState ? (s.state || '').toLowerCase() === qState.toLowerCase() : true;
    const zipMatch = qZip ? (s.zip || '') === qZip : true;
    return cityMatch && stateMatch && zipMatch;
  }

  private resolveDestinationCoordinates(): void {
    const address = this.form.get('destinationAddress')?.value;
    const city = this.form.get('destinationCity')?.value;
    const state = this.form.get('destinationState')?.value;
    const zip = this.form.get('destinationZip')?.value;

    if (!address || !city || !state || !zip) return;

    const query = `${address}, ${city}, ${state} ${zip}`.trim();
    this.addressLookup.searchAddresses(query).subscribe(results => {
      const filtered = results.filter((r: AddressSuggestion) => this.matchesQuoteLocation(r, this.destinationQuoteCity, this.destinationQuoteState, this.destinationQuoteZip));

      if (filtered && filtered.length > 0) {
        const match = filtered[0];

        // If suggestion differs from entered address, surface it
        const addrMatches = this.allAddressTokensPresent(address, match.displayName) || this.allAddressTokensPresent(address, match.address);
        const cityMatches = city ? (match.city || '').toLowerCase() === (city || '').toLowerCase() : true;
        const stateMatches = state ? (match.state || '').toLowerCase() === (state || '').toLowerCase() : true;
        const zipMatches = zip ? (match.zip || '') === (zip || '') : true;

        // Do not change verification status automatically. Surface a top suggestion only when fields do not fully match.
        if (addrMatches && cityMatches && stateMatches && zipMatches) {
          this.destinationTopSuggestion.set(null);
        } else {
          this.destinationTopSuggestion.set(match);
        }
      } else {
        this.destinationTopSuggestion.set(null);
      }
    }, (err) => {
      // Do not set verification status during auto-checks triggered by field changes.
      this.destinationTopSuggestion.set(null);
    });
  }
  getQuoteTypeLabel(type: string): string {
    return type === 'Spot' ? 'Spot Quote' : 'Custom Quote';
  }

  hasExtraPickup(): boolean {
    const quote = this.quote();
    return !!(quote && quote.moves && quote.moves.some((m: any) => (m.moveType || '').toLowerCase() === 'extrapickup'));
  }

  hasExtraDelivery(): boolean {
    const quote = this.quote();
    return !!(quote && quote.moves && quote.moves.some((m: any) => (m.moveType || '').toLowerCase() === 'extradelivery'));
  }
}
