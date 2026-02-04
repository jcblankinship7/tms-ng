import { Component, OnInit, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from './services/auth.service';
import { ProfileModalComponent } from './components/profile-modal/profile-modal.component';
import { ToastComponent } from './components/toast/toast.component';

import { CustomerContextService } from './services/customer-context.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ProfileModalComponent, ToastComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  title = 'tms-app';
  
  @ViewChild(ProfileModalComponent) profileModal!: ProfileModalComponent;

  private authService = inject(AuthService);
  private router = inject(Router);
  private customerContextService = inject(CustomerContextService);
  currentUser$ = this.authService.currentUser$;
  persona$ = this.authService.persona$;
  activeCustomer$ = this.customerContextService.customerContext$;



  ngOnInit(): void {
    // Restore user from localStorage on app init
    this.authService.getCurrentUser();
    // Restore per-user customer context (if any)
    this.customerContextService.loadCustomerContextFromStorage();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/dashboard']);
  }

  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  getOrdersRoute(): string {
    const persona = this.authService.getPersona();
    switch(persona) {
      case 'Customer': return '/customer/orders';
      case 'ServiceProvider': return '/provider/orders';
      case 'Admin': return '/admin/orders';
      case 'MarketingManager':
      case 'SalesRep': return '/sales/orders';
      case 'BillingClerk': return '/billing/orders';
      case 'SettlementsClerk': return '/settlements/moves';
      default: return '/customer/orders';
    }
  }

  getQuotesRoute(): string {
    return '/customer/quotes';
  }
}