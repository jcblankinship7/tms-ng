import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { TerminalService } from '../../services/terminal.service';
import { LocationSearchService } from '../../services/location-search.service';
import { LocationSearchResult } from '../../models/location-search-result.model';
import { combineLatest } from 'rxjs';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
import { TerminalStatus } from '../../models/terminal.model';

@Component({
  selector: 'app-terminal-form',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './terminal-form.component.html',
  styleUrls: ['./terminal-form.component.scss']
})
export class TerminalFormComponent implements OnInit {
  terminalForm: FormGroup;
  isEditMode = false;
  terminalId: number | null = null;
  loading = false;
  error: string | null = null;
  resolvedPosition?: { latitude: number; longitude: number };
  TerminalStatus = TerminalStatus;

  constructor(
    private fb: FormBuilder,
    private terminalService: TerminalService,
    private locationSearchService: LocationSearchService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.terminalForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(200)]],
      address: ['', [Validators.required, Validators.maxLength(300)]],
      city: ['', [Validators.required, Validators.maxLength(100)]],
      state: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(2)]],
      zip: ['', [Validators.required, Validators.maxLength(10)]],
      railroad: ['', [Validators.required, Validators.maxLength(200)]],
      status: [{ value: TerminalStatus.Active, disabled: true }],
      isTwentyFourSevenHours: [false],
      isTwentyFourSevenFlipHours: [false],
      mondayHours: [''],
      tuesdayHours: [''],
      wednesdayHours: [''],
      thursdayHours: [''],
      fridayHours: [''],
      saturdayHours: [''],
      sundayHours: [''],
      mondayFlipHours: [''],
      tuesdayFlipHours: [''],
      wednesdayFlipHours: [''],
      thursdayFlipHours: [''],
      fridayFlipHours: [''],
      saturdayFlipHours: [''],
      sundayFlipHours: ['']
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      this.isEditMode = true;
      this.terminalId = +id;
      this.loadTerminal(this.terminalId);
    }

    this.setupCoordinateAutoRefresh();
  }

  loadTerminal(id: number): void {
    this.loading = true;
    this.terminalService.getTerminal(id).subscribe({
      next: (terminal) => {
        const normalizedStatus = this.normalizeStatus(terminal.status);
        this.terminalForm.patchValue({
          name: terminal.name,
          address: terminal.address,
          city: terminal.city,
          state: terminal.state,
          zip: terminal.zip,
          railroad: terminal.railroad,
          status: normalizedStatus,
          mondayHours: terminal.mondayHours,
          tuesdayHours: terminal.tuesdayHours,
          wednesdayHours: terminal.wednesdayHours,
          thursdayHours: terminal.thursdayHours,
          fridayHours: terminal.fridayHours,
          saturdayHours: terminal.saturdayHours,
          sundayHours: terminal.sundayHours,
          mondayFlipHours: terminal.mondayFlipHours,
          tuesdayFlipHours: terminal.tuesdayFlipHours,
          wednesdayFlipHours: terminal.wednesdayFlipHours,
          thursdayFlipHours: terminal.thursdayFlipHours,
          fridayFlipHours: terminal.fridayFlipHours,
          saturdayFlipHours: terminal.saturdayFlipHours,
          sundayFlipHours: terminal.sundayFlipHours
        }, { emitEvent: false });

        // Load resolved position from terminal object (new shape) or fallback to legacy fields
        this.resolvedPosition = terminal.position ?? ({ latitude: (terminal as any).latitude, longitude: (terminal as any).longitude });

        this.terminalForm.patchValue({
          isTwentyFourSevenHours: this.isTwentyFourSevenHours(),
          isTwentyFourSevenFlipHours: this.isTwentyFourSevenFlipHours()
        }, { emitEvent: false });

        this.disableNonHourFields();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load terminal';
        console.error(err);
        this.loading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.terminalForm.invalid) {
      this.terminalForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = null;

    const save = (terminalData: any) => {
      const request = this.isEditMode && this.terminalId
        ? this.terminalService.updateTerminal(this.terminalId, terminalData)
        : this.terminalService.createTerminal(terminalData);

      request.subscribe({
        next: () => {
          this.router.navigate(['/admin/terminals']);
        },
        error: (err) => {
          this.error = `Failed to ${this.isEditMode ? 'update' : 'create'} terminal: ${err.error?.message || err.message}`;
          console.error(err);
          this.loading = false;
        }
      });
    };

    const terminalData = this.terminalForm.getRawValue();

    // If we do not have resolved position yet, try resolving from address
    if (!this.resolvedPosition) {
      this.resolveCoordinates(terminalData).then((coords) => {
        if (!coords) {
          this.error = 'Unable to resolve coordinates from the address. Please verify the address.';
          this.loading = false;
          return;
        }

        // Store resolved structured position
        const lat = coords.position?.latitude ?? (coords as any).latitude;
        const lng = coords.position?.longitude ?? (coords as any).longitude;
        this.resolvedPosition = { latitude: lat, longitude: lng };

        // Save payload with position field instead of top-level latitude/longitude
        save({ ...terminalData, position: { latitude: lat, longitude: lng } });
      });
      return;
    }

    save(terminalData);
  }

  cancel(): void {
    this.router.navigate(['/admin/terminals']);
  }

  getFieldError(fieldName: string): string | null {
    const field = this.terminalForm.get(fieldName);
    if (!field || !field.errors || !field.touched) {
      return null;
    }

    if (field.errors['required']) {
      return 'This field is required';
    }
    if (field.errors['maxlength']) {
      return `Maximum length is ${field.errors['maxlength'].requiredLength}`;
    }
    if (field.errors['minlength']) {
      return `Minimum length is ${field.errors['minlength'].requiredLength}`;
    }
    if (field.errors['min']) {
      return `Minimum value is ${field.errors['min'].min}`;
    }
    if (field.errors['max']) {
      return `Maximum value is ${field.errors['max'].max}`;
    }
    return 'Invalid value';
  }

  private disableNonHourFields(): void {
    const fieldsToDisable = [
      'name',
      'address',
      'city',
      'state',
      'zip',
      'railroad',
      'status'
    ];

    fieldsToDisable.forEach((field) => {
      this.terminalForm.get(field)?.disable({ emitEvent: false });
    });
  }

  private setupCoordinateAutoRefresh(): void {
    const addressControl = this.terminalForm.get('address');
    const cityControl = this.terminalForm.get('city');
    const stateControl = this.terminalForm.get('state');
    const zipControl = this.terminalForm.get('zip');

    if (!addressControl || !cityControl || !stateControl || !zipControl) return;

    combineLatest([
      addressControl.valueChanges,
      cityControl.valueChanges,
      stateControl.valueChanges,
      zipControl.valueChanges
    ])
      .pipe(
        map(([address, city, state, zip]) => `${address}, ${city}, ${state} ${zip}`.trim()),
        debounceTime(500),
        distinctUntilChanged()
      )
      .subscribe((query) => {
        const address = addressControl.value;
        const city = cityControl.value;
        const state = stateControl.value;
        const zip = zipControl.value;

        if (!address || !city || !state || !zip) return;

        this.resolveCoordinates({ address, city, state, zip }).then((coords) => {
          if (!coords) return;

          this.resolvedPosition = { latitude: coords.position?.latitude ?? (coords as any).latitude, longitude: coords.position?.longitude ?? (coords as any).longitude };
          // No form fields for coordinates anymore; keep resolvedPosition for saving and display
        });
      });
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

    return TerminalStatus.Active;
  }

  private async resolveCoordinates(terminalData: any): Promise<LocationSearchResult | null> {
    const query = `${terminalData.address}, ${terminalData.city}, ${terminalData.state} ${terminalData.zip}`.trim();
    if (!terminalData.address || !terminalData.city || !terminalData.state || !terminalData.zip) {
      return null;
    }

    return new Promise((resolve) => {
      this.locationSearchService.searchLocation(query).subscribe({
        next: (results) => resolve(results?.[0] ?? null),
        error: () => resolve(null)
      });
    });
  }

  onTwentyFourSevenHoursToggle(): void {
    const isChecked = !!this.terminalForm.get('isTwentyFourSevenHours')?.value;
    if (!isChecked) return;

    const fullDay = '0000-2359';
    this.terminalForm.patchValue({
      mondayHours: fullDay,
      tuesdayHours: fullDay,
      wednesdayHours: fullDay,
      thursdayHours: fullDay,
      fridayHours: fullDay,
      saturdayHours: fullDay,
      sundayHours: fullDay
    }, { emitEvent: false });
  }

  onTwentyFourSevenFlipHoursToggle(): void {
    const isChecked = !!this.terminalForm.get('isTwentyFourSevenFlipHours')?.value;
    if (!isChecked) return;

    const fullDay = '0000-2359';
    this.terminalForm.patchValue({
      mondayFlipHours: fullDay,
      tuesdayFlipHours: fullDay,
      wednesdayFlipHours: fullDay,
      thursdayFlipHours: fullDay,
      fridayFlipHours: fullDay,
      saturdayFlipHours: fullDay,
      sundayFlipHours: fullDay
    }, { emitEvent: false });
  }

  private isTwentyFourSevenHours(): boolean {
    const fullDay = '0000-2359';
    const values = [
      this.terminalForm.get('mondayHours')?.value,
      this.terminalForm.get('tuesdayHours')?.value,
      this.terminalForm.get('wednesdayHours')?.value,
      this.terminalForm.get('thursdayHours')?.value,
      this.terminalForm.get('fridayHours')?.value,
      this.terminalForm.get('saturdayHours')?.value,
      this.terminalForm.get('sundayHours')?.value
    ];

    return values.every((value) => value === fullDay);
  }

  private isTwentyFourSevenFlipHours(): boolean {
    const fullDay = '0000-2359';
    const values = [
      this.terminalForm.get('mondayFlipHours')?.value,
      this.terminalForm.get('tuesdayFlipHours')?.value,
      this.terminalForm.get('wednesdayFlipHours')?.value,
      this.terminalForm.get('thursdayFlipHours')?.value,
      this.terminalForm.get('fridayFlipHours')?.value,
      this.terminalForm.get('saturdayFlipHours')?.value,
      this.terminalForm.get('sundayFlipHours')?.value
    ];

    return values.every((value) => value === fullDay);
  }
}
