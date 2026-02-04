import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TerminalService } from '../../services/terminal.service';
import { Terminal, TerminalStatus } from '../../models/terminal.model';

@Component({
  selector: 'app-terminal-list',
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './terminal-list.component.html',
  styleUrls: ['./terminal-list.component.scss']
})
export class TerminalListComponent implements OnInit {
  terminals: Terminal[] = [];
  filteredTerminals: Terminal[] = [];
  loading = false;
  error: string | null = null;
  selectedTerminal: Terminal | null = null;

  // Filter properties
  searchTerm = '';
  selectedRailroad = '';
  selectedStatus: TerminalStatus | null = null;

  // Enum for template
  TerminalStatus = TerminalStatus;

  // Unique railroads for filter dropdown
  railroads: string[] = [];

  constructor(private terminalService: TerminalService) {}

  ngOnInit(): void {
    this.loadTerminals();
  }

  loadTerminals(): void {
    this.loading = true;
    this.error = null;

    this.terminalService.getTerminals(
      this.searchTerm || undefined,
      this.selectedRailroad || undefined,
      this.selectedStatus !== null ? this.selectedStatus : undefined
    ).subscribe({
      next: (data) => {
        this.terminals = data;
        this.filteredTerminals = data;
        this.extractRailroads();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load terminals';
        console.error(err);
        this.loading = false;
      }
    });
  }

  extractRailroads(): void {
    const railroadSet = new Set(this.terminals.map(t => t.railroad));
    this.railroads = Array.from(railroadSet).sort();
  }

  applyFilters(): void {
    this.loadTerminals();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedRailroad = '';
    this.selectedStatus = null;
    this.loadTerminals();
  }

  deleteTerminal(terminal: Terminal): void {
    if (!confirm(`Are you sure you want to delete ${terminal.name}?`)) {
      return;
    }

    this.terminalService.deleteTerminal(terminal.id).subscribe({
      next: () => {
        this.loadTerminals();
      },
      error: (err) => {
        this.error = `Failed to delete terminal: ${err.error?.message || err.message}`;
        console.error(err);
      }
    });
  }

  showDetails(terminal: Terminal): void {
    this.selectedTerminal = terminal;
  }

  closeDetails(): void {
    this.selectedTerminal = null;
  }

  private normalizeStatus(status: TerminalStatus | string | number | null | undefined): TerminalStatus {
    if (status === TerminalStatus.Active || status === TerminalStatus.Inactive) {
      return status;
    }

    if (typeof status === 'string') {
      const normalized = status.trim().toLowerCase();
      if (normalized === 'active') return TerminalStatus.Active;
      if (normalized === 'inactive') return TerminalStatus.Inactive;
    }

    if (typeof status === 'number') {
      return status === 1 ? TerminalStatus.Active : TerminalStatus.Inactive;
    }

    return TerminalStatus.Inactive;
  }

  getStatusLabel(status: TerminalStatus | string | number | null | undefined): string {
    return this.normalizeStatus(status) === TerminalStatus.Active ? 'Active' : 'Inactive';
  }

  getStatusClass(status: TerminalStatus | string | number | null | undefined): string {
    return this.normalizeStatus(status) === TerminalStatus.Active ? 'status-active' : 'status-inactive';
  }
}
