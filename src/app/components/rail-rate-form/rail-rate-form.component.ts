import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { RailRateService } from '../../services/rail-rate.service';
import { TerminalService } from '../../services/terminal.service';
import { AuthService } from '../../services/auth.service';
import { RailRate, RailRateStatus, RailRateDto } from '../../models/rail-rate.model';
import { Terminal } from '../../models/terminal.model';

@Component({
  selector: 'app-rail-rate-form',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './rail-rate-form.component.html',
  styleUrl: './rail-rate-form.component.scss'
})
export class RailRateFormComponent implements OnInit {
  private railRateService = inject(RailRateService);
  private terminalService = inject(TerminalService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  form!: FormGroup;
  terminals: Terminal[] = [];
  filteredDestinationTerminals: Terminal[] = [];
  isEdit = false;
  railRateId?: number;
  
  loading = false;
  submitting = false;
  errorMessage = '';
  
  showConflictDialog = false;
  conflictMessage = '';
  conflictingRates: RailRate[] = [];
  RailRateStatus = RailRateStatus;

  ngOnInit(): void {
    if (!this.authService.isAdmin()) {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.initializeForm();
    this.loadTerminals();

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.isEdit = true;
      this.railRateId = parseInt(idParam, 10);
      this.loadRailRate(this.railRateId);
    }
  }

  private initializeForm(): void {
    this.form = this.fb.group({
      originTerminalId: ['', Validators.required],
      destinationTerminalId: ['', Validators.required],
      railCost: ['', [Validators.required, Validators.min(0.01)]],
      effectiveDate: ['', Validators.required],
      endDate: ['', Validators.required],
      status: [RailRateStatus.Active, Validators.required]
    });

    // When origin changes, reset destination and filter by matching railroad
    this.form.get('originTerminalId')?.valueChanges.subscribe((originId: number) => {
      const origin = this.terminals.find(t => t.id === Number(originId));
      this.filteredDestinationTerminals = origin
        ? this.terminals.filter(t => t.railroad.toLowerCase() === origin.railroad.toLowerCase())
        : [];
      // Reset destination when origin changes
      this.form.get('destinationTerminalId')?.setValue('');
    });
  }

  private loadTerminals(): void {
    this.terminalService.getTerminals().subscribe({
      next: (terminals) => {
        this.terminals = terminals;
        // Initialize filtered list based on current origin (if any)
        const originId = this.form.get('originTerminalId')?.value;
        if (originId) {
          const origin = this.terminals.find(t => t.id === Number(originId));
          this.filteredDestinationTerminals = origin
            ? this.terminals.filter(t => t.railroad.toLowerCase() === origin.railroad.toLowerCase())
            : [];
        }
      },
      error: (error) => {
        console.error('Error loading terminals:', error);
        this.errorMessage = 'Failed to load terminals.';
      }
    });
  }

  private loadRailRate(id: number): void {
    this.loading = true;
    this.railRateService.getRailRate(id).subscribe({
      next: (railRate) => {
        this.form.patchValue({
          originTerminalId: railRate.originTerminalId,
          destinationTerminalId: railRate.destinationTerminalId,
          railCost: railRate.railCost ?? railRate.totalRate,
          effectiveDate: this.formatDateForInput(railRate.effectiveDate),
          endDate: this.formatDateForInput(railRate.endDate),
          status: railRate.status
        });
        // Ensure destination terminals are filtered to match the origin
        const origin = this.terminals.find(t => t.id === Number(railRate.originTerminalId));
        this.filteredDestinationTerminals = origin
          ? this.terminals.filter(t => t.railroad.toLowerCase() === origin.railroad.toLowerCase())
          : [];
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading rail rate:', error);
        this.errorMessage = 'Failed to load rail rate.';
        this.loading = false;
      }
    });
  }

  private formatDateForInput(date: Date | string): string {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.errorMessage = 'Please fill in all required fields correctly.';
      return;
    }

    const effectiveDate = new Date(this.form.value.effectiveDate);
    const endDate = new Date(this.form.value.endDate);

    if (endDate <= effectiveDate) {
      this.errorMessage = 'End date must be after effective date.';
      return;
    }

    this.checkForConflicts();
  }

  private checkForConflicts(): void {
    const formValue = this.form.value;
    const dto = {
      originTerminalId: formValue.originTerminalId,
      destinationTerminalId: formValue.destinationTerminalId,
      effectiveDate: new Date(formValue.effectiveDate),
      endDate: new Date(formValue.endDate),
      excludeId: this.railRateId
    };

    this.railRateService.checkConflict(dto).subscribe({
      next: (response) => {
        if (response.hasConflict) {
          this.conflictingRates = response.conflicts;
          this.conflictMessage = `A rail rate already exists for this origin/destination terminal combination during the selected time period. Would you like to override and set the existing rate(s) to inactive?`;
          this.showConflictDialog = true;
        } else {
          this.saveRailRate(false);
        }
      },
      error: (error) => {
        console.error('Error checking conflicts:', error);
        this.errorMessage = 'Failed to check for conflicts.';
      }
    });
  }

  saveWithOverride(): void {
    this.saveRailRate(true);
  }

  saveWithoutOverride(): void {
    this.showConflictDialog = false;
    this.errorMessage = 'No rail rate could be created. Please select a different time period or terminals.';
  }

  private saveRailRate(overrideConflicts: boolean): void {
    this.showConflictDialog = false;
    this.submitting = true;
    this.errorMessage = '';

    const formValue = this.form.value;
    const dto: RailRateDto = {
      originTerminalId: formValue.originTerminalId,
      destinationTerminalId: formValue.destinationTerminalId,
      railCost: parseFloat(formValue.railCost),
      effectiveDate: new Date(formValue.effectiveDate),
      endDate: new Date(formValue.endDate),
      status: formValue.status,
      overrideConflicts
    };

    const operation = this.isEdit
      ? this.railRateService.updateRailRate(this.railRateId!, dto)
      : this.railRateService.createRailRate(dto);

    operation.subscribe({
      next: () => {
        this.submitting = false;
        this.router.navigate(['/admin/rail-rates']);
      },
      error: (error) => {
        this.submitting = false;
        console.error('Error saving rail rate:', error);

        if (error.status === 409 && error.error?.requiresOverride) {
          this.conflictingRates = error.error.conflicts || [];
          this.showConflictDialog = true;
        } else {
          this.errorMessage = error.error?.message || 'Failed to save rail rate.';
        }
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/admin/rail-rates']);
  }

  getTerminalLabel(terminalId: number): string {
    const terminal = this.terminals.find(t => t.id === terminalId);
    return terminal ? `${terminal.name} (${terminal.railroad})` : '';
  }
}
