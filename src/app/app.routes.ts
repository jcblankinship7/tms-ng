import { Routes } from '@angular/router';
import { OrderListComponent } from './components/order-list/order-list.component';
import { OrderDetailComponent } from './components/order-detail/order-detail.component';
import { QuoteFormComponent } from './components/quote-form/quote-form.component';
import { QuoteReviewComponent } from './components/quote-review/quote-review.component';

export const routes: Routes = [
  { path: '', component: OrderListComponent },
  { path: 'new-quote', component: QuoteFormComponent },
  { path: 'quote-review', component: QuoteReviewComponent },
  { path: 'order/:id', component: OrderDetailComponent },
  { path: '**', redirectTo: '' }
];