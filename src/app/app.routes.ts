import { Routes } from '@angular/router';
import { OrderListComponent } from './components/order-list/order-list.component';
import { OrderDetailComponent } from './components/order-detail/order-detail.component';
import { MoveDetailComponent } from './components/move-detail/move-detail.component';
import { QuoteFormComponent } from './components/quote-form/quote-form.component';
import { QuoteListComponent } from './components/quote-list/quote-list.component';
import { QuoteReviewComponent } from './components/quote-review/quote-review.component';
import { LoginComponent } from './components/auth/login/login.component';
import { RegisterComponent } from './components/auth/register/register.component';
import { ForgotPasswordComponent } from './components/auth/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './components/auth/reset-password/reset-password.component';
import { ConfirmEmailComponent } from './components/auth/confirm-email/confirm-email.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { TerminalListComponent } from './components/terminal-list/terminal-list.component';
import { TerminalFormComponent } from './components/terminal-form/terminal-form.component';
import { CodeListComponent } from './components/code-list/code-list.component';
import { CodeFormComponent } from './components/code-form/code-form.component';
import { RailRateListComponent } from './components/rail-rate-list/rail-rate-list.component';
import { RailRateFormComponent } from './components/rail-rate-form/rail-rate-form.component';
import { QuoteDetailComponent } from './components/quote-detail/quote-detail.component';
import { AcceptQuoteComponent } from './components/accept-quote/accept-quote.component';
import { OrderConfirmComponent } from './components/order-confirm/order-confirm.component';
import { AuthGuardService } from './services/auth.guard';
import { CustomerListComponent } from './components/customer-list/customer-list.component';
import { CustomerFormComponent } from './components/customer-form/customer-form.component';
import { UserManagementComponent } from './components/user-management/user-management.component';
import { TrainScheduleListComponent } from './components/train-schedule-list/train-schedule-list.component';
import { TrainScheduleFormComponent } from './components/train-schedule-form/train-schedule-form.component';

export const routes: Routes = [
  // Auth routes (public)
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'confirm-email', component: ConfirmEmailComponent },

  // Customer routes
  {
    path: 'customer',
    canActivate: [AuthGuardService],
    children: [
      { path: 'orders', component: OrderListComponent },
      { path: 'order/:id', component: OrderDetailComponent, data: { prerender: false } },
      { path: 'confirm-order', component: OrderConfirmComponent, data: { prerender: false } },
      { path: 'quotes', component: QuoteListComponent },
      { path: 'quotes/:id', component: QuoteDetailComponent, data: { prerender: false } },
      { path: 'accept-quote/:id', component: AcceptQuoteComponent, data: { prerender: false } },
      { path: 'quote-form', component: QuoteFormComponent },
      { path: 'quote-form/:id', component: QuoteFormComponent, data: { prerender: false } },
      { path: 'quote-review', component: QuoteReviewComponent },
      { path: 'new-quote', component: QuoteFormComponent }
    ]
  },

  // Service Provider (3PL) routes
  {
    path: 'provider',
    canActivate: [AuthGuardService],
    children: [
      { path: 'orders', component: OrderListComponent },
      { path: 'move/:id', component: MoveDetailComponent, data: { prerender: false } },
      { path: 'quotes/:id', component: QuoteDetailComponent, data: { prerender: false } }
    ]
  },

  // Admin routes
  {
    path: 'admin',
    canActivate: [AuthGuardService],
    children: [
      { path: 'orders', component: OrderListComponent },
      { path: 'order/:id', component: OrderDetailComponent, data: { prerender: false } },
      { path: 'quotes/:id', component: QuoteDetailComponent, data: { prerender: false } },
      { path: 'customers', component: CustomerListComponent },
      { path: 'customers/new', component: CustomerFormComponent },
      { path: 'customers/edit/:id', component: CustomerFormComponent, data: { prerender: false } },
      { path: 'users', component: UserManagementComponent },
      { path: 'terminals', component: TerminalListComponent },
      { path: 'terminals/new', component: TerminalFormComponent },
      { path: 'terminals/edit/:id', component: TerminalFormComponent, data: { prerender: false } },
      { path: 'codes', component: CodeListComponent },
      { path: 'codes/new', component: CodeFormComponent },
      { path: 'codes/edit/:id', component: CodeFormComponent, data: { prerender: false } },
      { path: 'rail-rates', component: RailRateListComponent },
      { path: 'rail-rates/new', component: RailRateFormComponent },
      { path: 'rail-rates/edit/:id', component: RailRateFormComponent, data: { prerender: false } },
      { path: 'train-schedules', component: TrainScheduleListComponent },
      { path: 'train-schedules/new', component: TrainScheduleFormComponent },
      { path: 'train-schedules/edit/:id', component: TrainScheduleFormComponent, data: { prerender: false } }
    ]
  },

  // Sales team (Marketing Manager, Sales Rep) routes
  {
    path: 'sales',
    canActivate: [AuthGuardService],
    children: [
      { path: 'orders', component: OrderListComponent },
      { path: 'order/:id', component: OrderDetailComponent, data: { prerender: false } },
      { path: 'quotes/:id', component: QuoteDetailComponent, data: { prerender: false } },
      { path: 'customers', component: CustomerListComponent },
      { path: 'customers/new', component: CustomerFormComponent },
      { path: 'customers/edit/:id', component: CustomerFormComponent, data: { prerender: false } }
    ]
  },

  // Billing routes
  {
    path: 'billing',
    canActivate: [AuthGuardService],
    children: [
      { path: 'orders', component: OrderListComponent },
      { path: 'order/:id', component: OrderDetailComponent, data: { prerender: false } },
      { path: 'quotes/:id', component: QuoteDetailComponent, data: { prerender: false } }
    ]
  },

  // Settlement routes
  {
    path: 'settlements',
    canActivate: [AuthGuardService],
    children: [
      { path: 'moves', component: OrderListComponent },
      { path: 'order/:id', component: OrderDetailComponent, data: { prerender: false } },
      { path: 'quotes/:id', component: QuoteDetailComponent, data: { prerender: false } }
    ]
  },

  // Public quote review (allow preview access without auth)
  { path: 'quote-review', component: QuoteReviewComponent },

  // Dashboard/home
  { path: 'dashboard', component: DashboardComponent },

  // Fallback
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: '/dashboard' }
];