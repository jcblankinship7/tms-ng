import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CustomerService } from '../../services/customer.service';
import { UserService } from '../../services/user.service';
import { LocationSearchService } from '../../services/location-search.service';
import { CustomerType, ProviderType, QuoteType } from '../../models/customer.model';
import { User, UserPersona } from '../../models/user.model';
import { combineLatest, debounceTime } from 'rxjs';

@Component({
  selector: 'app-customer-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './customer-form.component.html',
  styleUrl: './customer-form.component.scss'
})
export class CustomerFormComponent implements OnInit {
  form!: FormGroup;
  isEditMode = signal(false);
  customerId = signal<number | null>(null);
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  resolvedPosition?: { latitude: number; longitude: number };
  availableUsers = signal<User[]>([]);
  availableBillTos = signal<any[]>([]);
  previousTypeWasOther = signal(false);

  CustomerType = CustomerType;
  ProviderType = ProviderType;
  QuoteType = QuoteType;

  customerTypes = [
    { value: CustomerType.Broker, label: 'Broker' },
    { value: CustomerType.BillTo, label: 'Bill To' },
    { value: CustomerType.ServiceProvider, label: 'Service Provider' },
    { value: CustomerType.Other, label: 'Other' }
    // Note: Shipper and Consignee are automatically created when orders are placed
  ];

  providerTypes = [
    { value: ProviderType.ThirdPartyLogistics, label: 'Third Party Logistics (3PL)' },
    { value: ProviderType.Carrier, label: 'Carrier' }
  ];

  quoteTypes = [
    { value: QuoteType.Spot, label: 'Spot' },
    { value: QuoteType.Custom, label: 'Custom' }
  ];

  constructor(
    private fb: FormBuilder,
    private customerService: CustomerService,
    private userService: UserService,
    private locationSearchService: LocationSearchService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.loadCustomerUsers();
    this.loadAvailableBillTos();
    this.setupCoordinateAutoRefresh();
    
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.customerId.set(Number(id));
      this.loadCustomer(Number(id));
    }
  }

  initForm(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(200)]],
      type: [CustomerType.Broker, Validators.required],
      patronCode: ['', [Validators.required, Validators.maxLength(50)]],
      quoteType: [QuoteType.Spot, Validators.required],
      lineOfCredit: [null],
      motorCarrierCode: [''],
      scacCode: [''],
      address: [''],
      city: [''],
      state: ['', Validators.maxLength(2)],
      zip: [''],
      userIds: [[]],
      billToIds: [[]],
      providerType: [null],
      status: ['active']
    });

    // Watch for type changes to manage user associations, provider type, and line of credit
    this.form.get('type')?.valueChanges.subscribe((type) => {
      const userIdsControl = this.form.get('userIds');
      const providerTypeControl = this.form.get('providerType');
      const lineOfCreditControl = this.form.get('lineOfCredit');
      const patronCodeControl = this.form.get('patronCode');
      const quoteTypeControl = this.form.get('quoteType');
      const motorCarrierCodeControl = this.form.get('motorCarrierCode');
      const scacCodeControl = this.form.get('scacCode');
      
      const typeNum = Number(type);

      // If type is "Other", clear all associations
      if (typeNum === CustomerType.Other) {
        userIdsControl?.reset([]);
        providerTypeControl?.reset(null);
        providerTypeControl?.clearValidators();
        lineOfCreditControl?.reset(null);
        lineOfCreditControl?.clearValidators();
        lineOfCreditControl?.updateValueAndValidity();
        patronCodeControl?.setValidators([Validators.required, Validators.maxLength(50)]);
        patronCodeControl?.updateValueAndValidity();
        quoteTypeControl?.setValidators([Validators.required]);
        quoteTypeControl?.updateValueAndValidity();
        motorCarrierCodeControl?.reset('');
        motorCarrierCodeControl?.clearValidators();
        motorCarrierCodeControl?.updateValueAndValidity();
        scacCodeControl?.reset('');
        scacCodeControl?.clearValidators();
        scacCodeControl?.updateValueAndValidity();
        this.previousTypeWasOther.set(true);
      } else if (typeNum === CustomerType.BillTo) {
        // BillTo is a standalone customer type, no line of credit or associations
        lineOfCreditControl?.reset(null);
        lineOfCreditControl?.clearValidators();
        lineOfCreditControl?.updateValueAndValidity();
        userIdsControl?.reset([]);
        providerTypeControl?.reset(null);
        providerTypeControl?.clearValidators();
        providerTypeControl?.updateValueAndValidity();
        patronCodeControl?.setValidators([Validators.required, Validators.maxLength(50)]);
        patronCodeControl?.updateValueAndValidity();
        quoteTypeControl?.setValidators([Validators.required]);
        quoteTypeControl?.updateValueAndValidity();
        motorCarrierCodeControl?.reset('');
        motorCarrierCodeControl?.clearValidators();
        motorCarrierCodeControl?.updateValueAndValidity();
        scacCodeControl?.reset('');
        scacCodeControl?.clearValidators();
        scacCodeControl?.updateValueAndValidity();
        this.previousTypeWasOther.set(false);
      } else if (typeNum === CustomerType.ServiceProvider) {
        // ServiceProvider requires provider type and motor carrier codes, no patron code or quote type
        providerTypeControl?.clearValidators();
        providerTypeControl?.setValidators([Validators.required]);
        providerTypeControl?.updateValueAndValidity();
        lineOfCreditControl?.reset(null);
        lineOfCreditControl?.clearValidators();
        lineOfCreditControl?.updateValueAndValidity();
        userIdsControl?.reset([]);
        patronCodeControl?.reset('');
        patronCodeControl?.clearValidators();
        patronCodeControl?.updateValueAndValidity();
        quoteTypeControl?.reset(null);
        quoteTypeControl?.clearValidators();
        quoteTypeControl?.updateValueAndValidity();
        motorCarrierCodeControl?.setValidators([Validators.required, Validators.maxLength(50)]);
        motorCarrierCodeControl?.updateValueAndValidity();
        scacCodeControl?.setValidators([Validators.required, Validators.maxLength(10)]);
        scacCodeControl?.updateValueAndValidity();
        this.previousTypeWasOther.set(false);
      } else if (typeNum === CustomerType.Broker) {
        // Broker can associate with users and has line of credit
        lineOfCreditControl?.clearValidators();
        lineOfCreditControl?.updateValueAndValidity();
        providerTypeControl?.reset(null);
        providerTypeControl?.clearValidators();
        providerTypeControl?.updateValueAndValidity();
        patronCodeControl?.setValidators([Validators.required, Validators.maxLength(50)]);
        patronCodeControl?.updateValueAndValidity();
        quoteTypeControl?.setValidators([Validators.required]);
        quoteTypeControl?.updateValueAndValidity();
        motorCarrierCodeControl?.reset('');
        motorCarrierCodeControl?.clearValidators();
        motorCarrierCodeControl?.updateValueAndValidity();
        scacCodeControl?.reset('');
        scacCodeControl?.clearValidators();
        scacCodeControl?.updateValueAndValidity();
        this.previousTypeWasOther.set(false);
      } else {
        // All other types except Other can have user associations, but don't require provider type or line of credit
        providerTypeControl?.reset(null);
        providerTypeControl?.clearValidators();
        providerTypeControl?.updateValueAndValidity();
        lineOfCreditControl?.reset(null);
        lineOfCreditControl?.clearValidators();
        lineOfCreditControl?.updateValueAndValidity();
        patronCodeControl?.setValidators([Validators.required, Validators.maxLength(50)]);
        patronCodeControl?.updateValueAndValidity();
        quoteTypeControl?.setValidators([Validators.required]);
        quoteTypeControl?.updateValueAndValidity();
        motorCarrierCodeControl?.reset('');
        motorCarrierCodeControl?.clearValidators();
        motorCarrierCodeControl?.updateValueAndValidity();
        scacCodeControl?.reset('');
        scacCodeControl?.clearValidators();
        scacCodeControl?.updateValueAndValidity();
        this.previousTypeWasOther.set(false);
      }
    });
  }

  loadCustomerUsers(): void {
    this.userService.getCustomerUsers().subscribe({
      next: (users) => {
        const customerUsers = users.filter(u => u.persona === UserPersona.Customer);
        this.availableUsers.set(customerUsers);
      },
      error: (err) => {
        console.error('Error loading users:', err);
      }
    });
  }

  private stringEnumToNumber(value: string | number | undefined): number | null {
    if (value === undefined || value === null) return null;
    
    if (typeof value === 'string') {
      const strLower = value.toLowerCase();
      // Map common string enum values to their numeric equivalents
      const stringEnumMap: Record<string, number> = {
        'broker': 5,
        'billto': 3,
        'serviceprovider': 6,
        'shipper': 1,
        'consignee': 2,
        'other': 4,
        'spot': 1,
        'customer': 2,
        'custom': 2
      };
      return stringEnumMap[strLower] || null;
    }
    
    return Number(value);
  }

  loadAvailableBillTos(): void {
    this.customerService.getCustomersByType(CustomerType.BillTo).subscribe({
      next: (customers) => {
        this.availableBillTos.set(customers);
      },
      error: (err) => {
        console.error('Error loading bill to customers:', err);
      }
    });
  }

  loadCustomer(id: number): void {
    this.loading.set(true);
    this.customerService.getCustomer(id).subscribe({
      next: (customer) => {
        const typeValue = this.stringEnumToNumber(customer.type) || CustomerType.Broker;
        const quoteTypeValue = this.stringEnumToNumber(customer.quoteType) || QuoteType.Spot;
        const providerTypeValue = customer.providerType ? this.stringEnumToNumber(customer.providerType) : null;
        
        this.form.patchValue({
          name: customer.name,
          type: typeValue,
          patronCode: customer.patronCode,
          quoteType: quoteTypeValue,
          lineOfCredit: customer.lineOfCredit,
          motorCarrierCode: customer.motorCarrierCode || '',
          scacCode: customer.scacCode || '',
          address: customer.address,
          city: customer.city,
          state: customer.state,
          zip: customer.zip,
          userIds: customer.associatedUserIds || [],
          billToIds: customer.associatedBillToIds || [],
          providerType: providerTypeValue,
          status: 'active'
        });

        this.form.markAsPristine();
        this.form.markAsUntouched();
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load customer');
        this.loading.set(false);
        console.error('Error loading customer:', err);
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    // Use getRawValue() and include resolved position if present
    const formValue = this.form.getRawValue();
    const payload = this.resolvedPosition ? { ...formValue, position: this.resolvedPosition } : formValue;

    if (this.isEditMode() && this.customerId()) {
      this.customerService.updateCustomer(this.customerId()!, payload).subscribe({
        next: () => {
          this.router.navigate(['/admin/customers']);
        },
        error: (err) => {
          this.error.set(err.error?.message || 'Failed to update customer');
          this.saving.set(false);
          console.error('Error updating customer:', err);
        }
      });
    } else {
      this.customerService.createCustomer(formValue).subscribe({
        next: () => {
          this.router.navigate(['/admin/customers']);
        },
        error: (err) => {
          this.error.set(err.error?.message || 'Failed to create customer');
          this.saving.set(false);
          console.error('Error creating customer:', err);
        }
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/admin/customers']);
  }

  getUserLabel(user: User): string {
    return `${user.firstName} ${user.lastName} (${user.email})`;
  }

  isUserSelected(userId: string): boolean {
    const selectedIds = this.form.get('userIds')?.value || [];
    return selectedIds.includes(userId);
  }

  toggleUser(userId: string): void {
    const currentIds = this.form.get('userIds')?.value || [];
    const newIds = currentIds.includes(userId)
      ? currentIds.filter((id: string) => id !== userId)
      : [...currentIds, userId];
    this.form.patchValue({ userIds: newIds });
  }

  isUserAssociationEnabled(): boolean {
    const type = this.form.get('type')?.value;
    return type !== CustomerType.Other && Number(type) !== CustomerType.Other;
  }

  isProviderTypeRequired(): boolean {
    const type = this.form.get('type')?.value;
    return type === CustomerType.ServiceProvider || Number(type) === CustomerType.ServiceProvider;
  }

  isLineOfCreditVisible(): boolean {
    const type = this.form.get('type')?.value;
    return type === CustomerType.Broker || Number(type) === CustomerType.Broker;
  }

  isBrokerBillToAssociationEnabled(): boolean {
    const type = this.form.get('type')?.value;
    return type === CustomerType.Broker || Number(type) === CustomerType.Broker;
  }

  isBillToSelected(billToId: number): boolean {
    const selectedIds = this.form.get('billToIds')?.value || [];
    return selectedIds.includes(billToId);
  }

  toggleBillTo(billToId: number): void {
    const currentIds = this.form.get('billToIds')?.value || [];
    const newIds = currentIds.includes(billToId)
      ? currentIds.filter((id: number) => id !== billToId)
      : [...currentIds, billToId];
    this.form.patchValue({ billToIds: newIds });
  }

  isPatronCodeVisible(): boolean {
    const type = this.form.get('type')?.value;
    const typeNum = Number(type);
    return typeNum !== CustomerType.ServiceProvider;
  }

  isQuoteTypeVisible(): boolean {
    const type = this.form.get('type')?.value;
    const typeNum = Number(type);
    return typeNum !== CustomerType.ServiceProvider;
  }

  isMotorCarrierFieldsVisible(): boolean {
    const type = this.form.get('type')?.value;
    return type === CustomerType.ServiceProvider || Number(type) === CustomerType.ServiceProvider;
  }

  private setupCoordinateAutoRefresh(): void {
    // Watch for changes in address, city, and state with debounce
    const addressChanges$ = this.form.get('address')?.valueChanges.pipe(debounceTime(500)) || null;
    const cityChanges$ = this.form.get('city')?.valueChanges.pipe(debounceTime(500)) || null;
    const stateChanges$ = this.form.get('state')?.valueChanges.pipe(debounceTime(500)) || null;

    if (addressChanges$ && cityChanges$ && stateChanges$) {
      combineLatest([addressChanges$, cityChanges$, stateChanges$]).subscribe(() => {
        this.resolveCoordinates();
      });
    }
  }

  private resolveCoordinates(): void {
    const address = this.form.get('address')?.value?.trim();
    const city = this.form.get('city')?.value?.trim();
    const state = this.form.get('state')?.value?.trim();

    if (!address || !city || !state) {
      return;
    }

    const query = `${address} ${city}, ${state}`;
    this.locationSearchService.searchLocation(query).subscribe({
      next: (results) => {
        if (results && results.length > 0) {
          const firstResult = results[0];
          this.resolvedPosition = { latitude: firstResult.position?.latitude ?? (firstResult as any).latitude, longitude: firstResult.position?.longitude ?? (firstResult as any).longitude };
          // No form fields for coordinates anymore; keep resolvedPosition for saving and display
        }
      },
      error: (err) => {
        console.error('Error resolving coordinates:', err);
      }
    });
  }
}