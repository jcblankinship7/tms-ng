import { Component, OnInit, signal, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../services/order.service';
import { MoveService } from '../../services/move.service';
import { AuthService } from '../../services/auth.service';
import { Order, Move } from '../../models/order.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './order-list.component.html',
  styleUrls: ['./order-list.component.scss']
})
export class OrderListComponent implements OnInit, OnDestroy {

  orders = signal<Order[]>([]);
  moves = signal<Move[]>([]);
  loading = signal(false);
  selectedCustomerId = signal<string | null>(null);
  persona = signal<string>('');
  displayTitle = signal('Orders');
  showCustomerSelector = signal(false);
  isMovesView = signal(false);
  serviceProviderId = signal<string>('PROV-001'); // Default for testing
  
  private personaSubscription?: Subscription;

  constructor(
    private orderService: OrderService,
    private moveService: MoveService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Get persona from auth service
    const persona = this.authService.getPersona();
    this.persona.set(persona || '');
    this.isMovesView.set(persona === 'ServiceProvider');
    this.setDisplayTitleByPersona(persona || '');
    this.setShowCustomerSelector(persona || '');

    // Subscribe to persona changes (for admin persona switching)
    this.personaSubscription = this.authService.persona$.subscribe(newPersona => {
      if (newPersona && newPersona !== this.persona()) {
        this.persona.set(newPersona);
        this.isMovesView.set(newPersona === 'ServiceProvider');
        this.setDisplayTitleByPersona(newPersona);
        this.setShowCustomerSelector(newPersona);
        this.loadData();
      }
    });

    // Load data for the user
    this.loadData();
  }

  ngOnDestroy(): void {
    this.personaSubscription?.unsubscribe();
  }

  private setDisplayTitleByPersona(persona: string): void {
    const titleMap: { [key: string]: string } = {
      'Customer': 'My Orders',
      'ServiceProvider': 'My Assigned Moves',
      'Admin': 'All Orders',
      'MarketingManager': 'Customer Orders',
      'SalesRep': 'Customer Orders',
      'BillingClerk': 'Billing Orders',
      'SettlementsClerk': 'Settlement Moves'
    };
    this.displayTitle.set(titleMap[persona] || 'Orders');
  }

  private setShowCustomerSelector(persona: string): void {
    // Show customer selector for personas that manage multiple customers
    // Also show for Customer persona when admin is testing
    const multiCustomerPersonas = ['Admin', 'MarketingManager', 'SalesRep', 'BillingClerk', 'Customer'];
    this.showCustomerSelector.set(multiCustomerPersonas.includes(persona));
  }

  loadData(): void {
    this.loading.set(true);
    
    const persona = this.persona();

    if (persona === 'ServiceProvider') {
      // Load moves for service provider
      this.moveService.getMovesByServiceProvider(this.serviceProviderId()).subscribe({
        next: (data) => {
          this.moves.set(data);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error loading moves:', err);
          this.loading.set(false);
        }
      });
    } else {
      // Load orders for other personas
      const customerId = this.selectedCustomerId();
      this.orderService.getOrders(customerId || undefined).subscribe({
        next: (data) => {
          this.orders.set(data);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error loading orders:', err);
          this.loading.set(false);
        }
      });
    }
  }

  onCustomerChanged(customerId: string): void {
    this.selectedCustomerId.set(customerId);
    this.loadData();
  }

  viewOrder(orderId: string): void {
    const persona = this.persona();
    const personaPath = this.getPersonaPath(persona);
    this.router.navigate([`${personaPath}/order`, orderId]);
  }

  viewMove(moveId: string): void {
    // Navigate to move detail view
    this.router.navigate(['/provider/move', moveId]);
  }

  createNewQuote(): void {
    // Only customers can create quotes
    if (this.persona() === 'Customer') {
      this.router.navigate(['customer/new-quote']);
    }
  }

  private getPersonaPath(persona: string): string {
    const pathMap: { [key: string]: string } = {
      'Customer': '/customer',
      'ServiceProvider': '/provider',
      'Admin': '/admin',
      'MarketingManager': '/sales',
      'SalesRep': '/sales',
      'BillingClerk': '/billing',
      'SettlementsClerk': '/settlements'
    };
    return pathMap[persona] || '/dashboard';
  }
}
