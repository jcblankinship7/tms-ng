import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RailRateService } from '../../services/rail-rate.service';
import { TerminalService } from '../../services/terminal.service';
import { AuthService } from '../../services/auth.service';
import { RailRate, RailRateStatus } from '../../models/rail-rate.model';
import { Terminal } from '../../models/terminal.model';

@Component({
  selector: 'app-rail-rate-list',
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './rail-rate-list.component.html',
  styleUrl: './rail-rate-list.component.scss'
})
export class RailRateListComponent implements OnInit {
  private railRateService = inject(RailRateService);
  private terminalService = inject(TerminalService);
  private authService = inject(AuthService);
  private router = inject(Router);

  railRates: RailRate[] = [];
  terminals: Terminal[] = [];
  
  filterOriginTerminalId?: number;
  filterDestinationTerminalId?: number;
  filterStatus?: RailRateStatus;
  
  RailRateStatus = RailRateStatus;
  loading = false;
  errorMessage = '';
  selectedRateId?: number;

  ngOnInit(): void {
    if (!this.authService.isAdmin()) {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.loadTerminals();
    this.loadRailRates();
  }

  loadTerminals(): void {
    this.terminalService.getTerminals().subscribe({
      next: (terminals) => {
        this.terminals = terminals;
      },
      error: (error) => {
        console.error('Error loading terminals:', error);
      }
    });
  }

  loadRailRates(): void {
    this.loading = true;
    this.errorMessage = '';

    this.railRateService.getRailRates(
      this.filterOriginTerminalId,
      this.filterDestinationTerminalId,
      this.filterStatus
    ).subscribe({
      next: (railRates) => {
        this.railRates = railRates;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading rail rates:', error);
        this.errorMessage = 'Failed to load rail rates.';
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    this.loadRailRates();
  }

  clearFilters(): void {
    this.filterOriginTerminalId = undefined;
    this.filterDestinationTerminalId = undefined;
    this.filterStatus = undefined;
    this.loadRailRates();
  }

  toggleDetails(rateId: number): void {
    this.selectedRateId = this.selectedRateId === rateId ? undefined : rateId;
  }

  isDetailsOpen(rateId: number): boolean {
    return this.selectedRateId === rateId;
  }

  deleteRailRate(id: number): void {
    if (!confirm('Are you sure you want to delete this rail rate?')) {
      return;
    }

    this.railRateService.deleteRailRate(id).subscribe({
      next: () => {
        this.loadRailRates();
      },
      error: (error) => {
        console.error('Error deleting rail rate:', error);
        alert('Failed to delete rail rate.');
      }
    });
  }

  getStatusName(status: RailRateStatus): string {
    return status === RailRateStatus.Active ? 'Active' : 'Inactive';
  }

  getStatusClass(status: RailRateStatus): string {
    return status === RailRateStatus.Active ? 'text-green-600' : 'text-gray-400';
  }
}
