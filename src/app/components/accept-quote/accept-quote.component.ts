import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { QuoteService, QuoteRequest } from '../../services/quote.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-accept-quote',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './accept-quote.component.html',
  styleUrl: './accept-quote.component.scss'
})
export class AcceptQuoteComponent implements OnInit {
  private quoteService = inject(QuoteService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  quote = signal<QuoteRequest | null>(null);
  form!: FormGroup;
  loading = signal(true);
  submitting = signal(false);
  errorMessage = signal('');
  quoteId = '';
  isCustomerPersona = signal(false);
  isAdminOrMarketingManager = signal(false);

  ngOnInit(): void {
  const persona = this.authService.getPersona();
  const isAuthenticated = this.authService.isAuthenticated();

  // Set persona flags for template visibility
  this.isCustomerPersona.set(persona === 'Customer');
  this.isAdminOrMarketingManager.set(persona === 'Admin' || persona === 'MarketingManager');

  console.log('Accept Quote - Current persona:', persona); // Debug log
  console.log('Accept Quote - Is authenticated:', isAuthenticated); // Debug log

  // Only customers can accept quotes (but allow if not authenticated for demo/mock mode)
  if (isAuthenticated && persona !== 'Customer') {
    console.warn('Non-customer persona attempting to accept quote:', persona);
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
    this.initializeForm();
    this.loading.set(false);
    return;
  }

  this.quoteId = this.route.snapshot.paramMap.get('id') || '';
  if (!this.quoteId) {
    this.errorMessage.set('Quote ID not found');
    this.loading.set(false);
    return;
  }

  this.initializeForm();
  this.loadQuote(this.quoteId);
}

  private initializeForm(): void {
    this.form = this.fb.group({
      pickupAppointmentDate: ['', Validators.required],
      pickupAppointmentStartTime: ['', Validators.required],
      pickupAppointmentEndTime: ['', Validators.required],
      deliveryAppointmentDate: [''],
      deliveryAppointmentStartTime: [''],
      deliveryAppointmentEndTime: [''],
      pickupContactName: [''],
      pickupContactPhone: [''],
      deliveryContactName: [''],
      deliveryContactPhone: ['']
    }, { validators: this.appointmentTimeValidator.bind(this) });
  }

  private appointmentTimeValidator(control: AbstractControl): ValidationErrors | null {
    const pickupDate = control.get('pickupAppointmentDate')?.value;
    const pickupStartTime = control.get('pickupAppointmentStartTime')?.value;
    const pickupEndTime = control.get('pickupAppointmentEndTime')?.value;
    const deliveryDate = control.get('deliveryAppointmentDate')?.value;
    const deliveryStartTime = control.get('deliveryAppointmentStartTime')?.value;
    const deliveryEndTime = control.get('deliveryAppointmentEndTime')?.value;

    if (pickupDate && pickupStartTime && pickupEndTime) {
      if (pickupEndTime < pickupStartTime) {
        control.get('pickupAppointmentEndTime')?.setErrors({ 'endBeforeStart': true });
        return { 'invalidPickupTimes': true };
      }
    }

    if (deliveryDate && deliveryStartTime && deliveryEndTime) {
      if (deliveryEndTime < deliveryStartTime) {
        control.get('deliveryAppointmentEndTime')?.setErrors({ 'endBeforeStart': true });
        return { 'invalidDeliveryTimes': true };
      }
    }

    return null;
  }

  private loadQuote(quoteId: string): void {
    this.quoteService.getQuoteById(quoteId).subscribe({
      next: (quote) => {
        if (quote) {
          this.quote.set(quote);
          // Pre-fill form with existing data if available
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
      pickupContactName: formValue.pickupContactName,
      pickupContactPhone: formValue.pickupContactPhone,
      deliveryContactName: formValue.deliveryContactName,
      deliveryContactPhone: formValue.deliveryContactPhone
    };

    this.quoteService.createOrderFromQuote(this.quoteId, appointmentDetails).subscribe({
      next: (response) => {
        this.submitting.set(false);
        // Navigate to the newly created order
        this.router.navigate(['/customer/order', response.orderId]);
      },
      error: (err) => {
        console.error('Error creating order:', err);
        this.errorMessage.set('Failed to create order. Please try again.');
        this.submitting.set(false);
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/customer/quotes']);
  }

  getQuoteTypeLabel(type: string): string {
    return type === 'Spot' ? 'Spot Quote' : 'Custom Quote';
  }
}
