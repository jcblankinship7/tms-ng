import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen flex flex-col items-center justify-center" style="background: linear-gradient(135deg, #F8F8F8 0%, #E8E8E8 100%);">
      <!-- Hero Section -->
      <div class="max-w-6xl mx-auto px-6 py-12 text-center">
        <!-- Logo and Tagline -->
        <div class="mb-8">
          <div class="text-7xl font-bold mb-4">
            <span style="color: #002855;">Freight</span><span style="color: #003DA5;">Flow</span>
            <div class="text-4xl font-normal mt-2" style="color: #53565A;">TMS</div>
          </div>
          <div class="text-xl uppercase tracking-widest font-bold" style="color: #60a5fa;">
            Ship Smarter, Not Harder
          </div>
        </div>

        <!-- Shipping Icon -->
        <div class="mb-12">
          <svg class="w-48 h-48 mx-auto" style="color: #003DA5;" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18 18.5a1.5 1.5 0 0 1-1 1.5 1.5 1.5 0 0 1-1.5-1.5 1.5 1.5 0 0 1 1.5-1.5 1.5 1.5 0 0 1 1.5 1.5m1.5-9l1.96 2.5H17V11m-11 7.5a1.5 1.5 0 0 1-1.5 1.5A1.5 1.5 0 0 1 3 18.5 1.5 1.5 0 0 1 4.5 17 1.5 1.5 0 0 1 6 18.5M20 8h-3V4H3c-1.11 0-2 .89-2 2v11h2a3 3 0 0 0 3 3 3 3 0 0 0 3-3h6a3 3 0 0 0 3 3 3 3 0 0 0 3-3h2v-5l-3-4z"/>
          </svg>
        </div>

        <!-- Welcome Message -->
        <div class="mb-12">
          <h1 class="text-4xl font-bold mb-4" style="color: #002855;">
            Welcome to Your Transportation Hub
          </h1>
          <p class="text-xl" style="color: #53565A;">
            Manage your freight, track shipments, and optimize logistics all in one place
          </p>
        </div>

        <!-- Quick Action Cards -->
        <div class="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <!-- Orders Card -->
          <a routerLink="/customer/orders" 
             class="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition-all cursor-pointer border-t-4"
             style="border-top-color: #003DA5;">
            <div class="text-5xl mb-4">📦</div>
            <h3 class="text-xl font-bold mb-2" style="color: #002855;">Orders</h3>
            <p class="text-sm" style="color: #53565A;">View and manage shipments</p>
          </a>

          <!-- Quotes Card -->
          <a routerLink="/customer/quotes"
             class="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition-all cursor-pointer border-t-4"
             style="border-top-color: #60a5fa;">
            <div class="text-5xl mb-4">💰</div>
            <h3 class="text-xl font-bold mb-2" style="color: #002855;">Quotes</h3>
            <p class="text-sm" style="color: #53565A;">Request and review pricing</p>
          </a>

          <!-- Analytics Card -->
          <div class="bg-white p-8 rounded-lg shadow-lg border-t-4 opacity-60"
               style="border-top-color: #97999B;">
            <div class="text-5xl mb-4">📊</div>
            <h3 class="text-xl font-bold mb-2" style="color: #002855;">Analytics</h3>
            <p class="text-sm" style="color: #53565A;">Coming soon</p>
          </div>
        </div>

        <!-- Stats Section -->
        <div class="mt-16 grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div class="text-center">
            <div class="text-4xl font-bold" style="color: #003DA5;">24/7</div>
            <div class="text-sm uppercase tracking-wider" style="color: #53565A;">Support Available</div>
          </div>
          <div class="text-center">
            <div class="text-4xl font-bold" style="color: #003DA5;">Real-Time</div>
            <div class="text-sm uppercase tracking-wider" style="color: #53565A;">Tracking Updates</div>
          </div>
          <div class="text-center">
            <div class="text-4xl font-bold" style="color: #003DA5;">Nationwide</div>
            <div class="text-sm uppercase tracking-wider" style="color: #53565A;">Coverage</div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class DashboardComponent {
  constructor(private authService: AuthService) {}
}
