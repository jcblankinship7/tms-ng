import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CodeService } from '../../services/code.service';
import { Code } from '../../models/code.model';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-code-list',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './code-list.component.html',
  styleUrls: ['./code-list.component.scss']
})
export class CodeListComponent implements OnInit {
  codes: Code[] = [];
  loading = false;
  error: string | null = null;
  filterType = '';
  showDeleteModal = false;
  codeToDelete: Code | null = null;

  constructor(
    private codeService: CodeService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (!this.authService.isAdmin()) {
      this.router.navigate(['/dashboard']);
      return;
    }
    this.loadCodes();
  }

  loadCodes(): void {
    this.loading = true;
    this.error = null;

    this.codeService.getCodes(this.filterType || undefined).subscribe({
      next: (codes) => {
        this.codes = codes;
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to load codes';
        this.loading = false;
      }
    });
  }

  applyFilter(): void {
    this.loadCodes();
  }

  clearFilter(): void {
    this.filterType = '';
    this.loadCodes();
  }

  requestDeleteCode(code: Code): void {
    this.codeToDelete = code;
    this.showDeleteModal = true;
  }

  confirmDeleteCode(): void {
    if (!this.codeToDelete) return;

    this.codeService.deleteCode(this.codeToDelete.id).subscribe({
      next: () => {
        this.showDeleteModal = false;
        this.codeToDelete = null;
        this.loadCodes();
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to delete code';
        this.showDeleteModal = false;
        this.codeToDelete = null;
      }
    });
  }

  cancelDeleteCode(): void {
    this.showDeleteModal = false;
    this.codeToDelete = null;
  }
}
