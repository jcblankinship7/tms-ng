import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CustomerService } from '../../services/customer.service';
import { Customer, CustomerType, QuoteType } from '../../models/customer.model';

@Component({
  selector: 'app-customer-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './customer-list.component.html',
  styleUrl: './customer-list.component.scss'
})
export class CustomerListComponent implements OnInit {
  customers = signal<Customer[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  CustomerType = CustomerType;
  QuoteType = QuoteType;

  constructor(private customerService: CustomerService) {}

  ngOnInit(): void {
    this.loadCustomers();
  }

  loadCustomers(): void {
    this.loading.set(true);
    this.error.set(null);

    this.customerService.getCustomers().subscribe({
      next: (data) => {
        console.log('Loaded customers:', data);
        if (data.length > 0) {
          console.log('First customer type:', data[0].type, 'Type of:', typeof data[0].type);
          console.log('First customer quoteType:', data[0].quoteType, 'Type of:', typeof data[0].quoteType);
        }
        this.customers.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load customers');
        this.loading.set(false);
        console.error('Error loading customers:', err);
      }
    });
  }

  getCustomerTypeName(type: CustomerType | number | string): string {
    console.log('getCustomerTypeName called with:', type, 'Type of:', typeof type);
    
    // Handle string values (camelCase from API)
    if (typeof type === 'string') {
      const typeStr = type.toLowerCase();
      switch (typeStr) {
        case 'broker':
          return 'Broker';
        case 'billto':
          return 'Bill To';
        case 'serviceprovider':
          return 'Service Provider';
        case 'shipper':
          return 'Shipper';
        case 'consignee':
          return 'Consignee';
        case 'other':
          return 'Other';
        default:
          return type; // Return original string if not recognized
      }
    }

    // Handle numeric values
    const typeNum = Number(type);
    switch (typeNum) {
      case CustomerType.Broker:
        return 'Broker';
      case CustomerType.BillTo:
        return 'Bill To';
      case CustomerType.ServiceProvider:
        return 'Service Provider';
      case CustomerType.Shipper:
        return 'Shipper';
      case CustomerType.Consignee:
        return 'Consignee';
      case CustomerType.Other:
        return 'Other';
      default:
        return 'Unknown';
    }
  }

  getQuoteTypeName(quoteType: QuoteType | number | string): string {
    console.log('getQuoteTypeName called with:', quoteType, 'Type of:', typeof quoteType);
    
    // Handle string values (camelCase from API)
    if (typeof quoteType === 'string') {
      const typeStr = quoteType.toLowerCase();
      switch (typeStr) {
        case 'spot':
          return 'Spot';
        case 'customer':
          return 'Customer';
        default:
          return quoteType; // Return original string if not recognized
      }
    }

    // Handle numeric values
    const typeNum = Number(quoteType);
    switch (typeNum) {
      case QuoteType.Spot:
        return 'Spot';
      case QuoteType.Customer:
        return 'Customer';
      default:
        return 'Unknown';
    }
  }

  deleteCustomer(id: number, name: string): void {
    if (!confirm(`Are you sure you want to delete customer "${name}"?`)) {
      return;
    }

    this.customerService.deleteCustomer(id).subscribe({
      next: () => {
        this.loadCustomers();
      },
      error: (err) => {
        alert(err.error?.message || 'Failed to delete customer');
        console.error('Error deleting customer:', err);
      }
    });
  }
}
