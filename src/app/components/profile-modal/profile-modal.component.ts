import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { CustomerService } from '../../services/customer.service';
import { CustomerContextService } from '../../services/customer-context.service';

import { User, UserPersona } from '../../models/user.model';
import { CustomerType } from '../../models/customer.model';

@Component({
  selector: 'app-profile-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile-modal.component.html',
  styleUrl: './profile-modal.component.scss'
})
export class ProfileModalComponent implements OnInit {
  private userService = inject(UserService);
  private customerService = inject(CustomerService);
  private customerContextService = inject(CustomerContextService);

  isOpen = signal(false);
  currentUser = signal<User | null>(null);
  associatedCustomers = signal<any[]>([]);
  selectedCustomerId = signal<number | null>(null);
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  // Inline banner state
  bannerMessage = signal<string | null>(null);
  private bannerTimer: any = null;

  UserPersona = UserPersona;
  CustomerType = CustomerType;

  ngOnInit(): void {
    this.loadCurrentUser();
  }

  openModal(): void {
    this.isOpen.set(true);
    this.loadCurrentUser();
  }

  closeModal(): void {
    this.isOpen.set(false);
  }

  private loadCurrentUser(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.userService.getCurrentUser().subscribe({
      next: (user) => {
        this.currentUser.set(user);
        if (user.persona === UserPersona.Customer) {
          this.loadAssociatedCustomers(user.id);
        } else {
          this.loading.set(false);
        }
      },
      error: (err) => {
        console.error('Error loading current user:', err);
        this.errorMessage.set('Unable to load profile details. Please try again.');
        this.loading.set(false);
      }
    });
  }

  private loadAssociatedCustomers(userId: string): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    console.log('Loading associated customers for user:', userId);
    
    this.customerService.getCustomersForUser(userId).subscribe({
      next: (customers) => {
        console.log('Received customers from API:', customers);
        console.log('API Response type:', typeof customers);
        console.log('Is array?', Array.isArray(customers));
        console.log('Length:', customers?.length);
        
        if (!customers || customers.length === 0) {
          console.log('No customers returned from API');
          this.associatedCustomers.set([]);
          this.loading.set(false);
          return;
        }
        
        // Log each customer's type for debugging
        customers.forEach((c: any, i: number) => {
          console.log(`Customer ${i}:`, {
            id: c.id,
            name: c.name,
            type: c.type,
            typeOf: typeof c.type,
            typeString: String(c.type),
            typeStringLower: (c.type as any) ? String(c.type).toLowerCase() : '',
            keys: Object.keys(c)
          });
        });
        
        // Filter to only Broker type customers
        const brokerCustomers = customers.filter((c: any) => {
          // Handle various type formats from API (number, string, etc)
          const typeStr = String(c.type as any).toLowerCase().trim();
          const typeNum = Number(c.type);
          
          const isBroker = typeStr === 'broker' || typeNum === 5;
          console.log(`Filtering ${c.name}: typeStr='${typeStr}', typeNum=${typeNum}, isBroker=${isBroker}`);
          return isBroker;
        });
        
        console.log('Broker customers after filter:', brokerCustomers);
        this.associatedCustomers.set(brokerCustomers);

        // Set initial selected customer from context or first one
        const context = this.customerContextService.getCustomerContext();
        if (context.customerId) {
          // Prefer stored context if it exists in user's associated customers
          const found = brokerCustomers.find(c => c.id === context.customerId);
          if (found) {
            this.selectedCustomerId.set(context.customerId);
          } else if (brokerCustomers.length > 0) {
            this.selectedCustomerId.set(brokerCustomers[0].id);
            // Update stored context to the new default including quoteType
            const qt: any = (brokerCustomers[0] as any).quoteType;
            const isCustomerType = qt === 2 || String(qt).toLowerCase() === 'customer' || String(qt).toLowerCase() === 'custom';
            const quoteTypeStr: 'Spot' | 'Custom' = isCustomerType ? 'Custom' : 'Spot';
            this.customerContextService.setCustomerContext(brokerCustomers[0].id, brokerCustomers[0].name, undefined, quoteTypeStr);
          }
        } else if (brokerCustomers.length > 0) {
          this.selectedCustomerId.set(brokerCustomers[0].id);
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading associated customers:', err);
        console.error('Error details:', err.message, err.status, err.error);
        this.errorMessage.set(`Unable to load associated customers. ${err.status ? 'Status: ' + err.status : ''}`);
        this.loading.set(false);
      }
    });
  }

  switchCustomer(customerId: number): void {
    const customer = this.associatedCustomers().find(c => c.id === customerId);
    if (customer) {
      this.selectedCustomerId.set(customerId);
      // Determine a frontend-friendly quoteType
      const quoteTypeVal: any = (customer as any).quoteType;
      const isCustomerType = quoteTypeVal === 2 || String(quoteTypeVal).toLowerCase() === 'customer' || String(quoteTypeVal).toLowerCase() === 'custom';
      const quoteTypeStr: 'Spot' | 'Custom' = isCustomerType ? 'Custom' : 'Spot';

      this.customerContextService.setCustomerContext(customerId, customer.name, undefined, quoteTypeStr);

      // Show inline banner confirmation describing the chosen customer
      this.showBanner(`Active customer set to ${customer.name} — Saved`);
    }
  }

  private showBanner(message: string, durationMs = 2000): void {
    this.bannerMessage.set(message);
    if (this.bannerTimer) {
      clearTimeout(this.bannerTimer);
    }
    this.bannerTimer = setTimeout(() => {
      this.bannerMessage.set(null);
      this.bannerTimer = null;
    }, durationMs);
  }

  public clearBanner(): void {
    if (this.bannerTimer) {
      clearTimeout(this.bannerTimer);
      this.bannerTimer = null;
    }
    this.bannerMessage.set(null);
  }

  getPersonaLabel(persona: UserPersona): string {
    const personas: Record<UserPersona, string> = {
      [UserPersona.Customer]: 'Customer',
      [UserPersona.ServiceProvider]: 'Service Provider',
      [UserPersona.Admin]: 'Admin',
      [UserPersona.MarketingManager]: 'Marketing Manager',
      [UserPersona.SalesRep]: 'Sales Rep',
      [UserPersona.SettlementsClerk]: 'Settlements Clerk',
      [UserPersona.BillingClerk]: 'Billing Clerk',
      [UserPersona.OperationClerk]: 'Operation Clerk'
    };
    return personas[persona] || 'Unknown';
  }
}
