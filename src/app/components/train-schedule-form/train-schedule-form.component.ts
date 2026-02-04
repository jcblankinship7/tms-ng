import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { TrainScheduleService } from '../../services/train-schedule.service';
import { TerminalService } from '../../services/terminal.service';
import { InterchangePointService } from '../../services/interchange-point.service';
import { Terminal } from '../../models/terminal.model';
import { InterchangePoint } from '../../models/interchange-point.model';

@Component({
  selector: 'app-train-schedule-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="container mx-auto p-4">
      <h1 class="text-3xl font-bold mb-6">{{ isEdit ? 'Edit' : 'Add' }} Train Schedule</h1>

      @if (loading()) {
        <div class="text-center text-gray-500">Loading...</div>
      } @else {
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="max-w-4xl">
          <div class="grid grid-cols-2 gap-4">
            <!-- Railroad -->
            <div>
              <label class="block font-semibold mb-1">Railroad *</label>
              <input
                type="text"
                formControlName="railroad"
                class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                placeholder="UP, BNSF, etc."
              />
            </div>

            <!-- Train Number -->
            <div>
              <label class="block font-semibold mb-1">Train Number *</label>
              <input
                type="text"
                formControlName="trainNumber"
                class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                placeholder="ZLAMN, Q290, etc."
              />
            </div>

            <!-- Service -->
            <div>
              <label class="block font-semibold mb-1">Service *</label>
              <select
                formControlName="service"
                class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              >
                <option value="">Select service</option>
                <option value="Premium">Premium</option>
                <option value="Expedited">Expedited</option>
                <option value="Standard">Standard</option>
              </select>
            </div>

            <!-- Frequency -->
            <div>
              <label class="block font-semibold mb-1">Frequency *</label>
              <select
                formControlName="frequency"
                class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              >
                <option value="">Select frequency</option>
                <option value="Daily">Daily</option>
                <option value="5x/week">5x/week</option>
                <option value="3x/week">3x/week</option>
              </select>
            </div>

            <!-- Origin Terminal -->
            <div>
              <label class="block font-semibold mb-1">Origin Terminal *</label>
              <select
                formControlName="originTerminalId"
                class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                (change)="onOriginTerminalChange()"
              >
                <option value="">Select terminal</option>
                @for (terminal of terminals(); track terminal.id) {
                  <option [value]="terminal.id">{{ terminal.name }} ({{ terminal.city }}, {{ terminal.state }})</option>
                }
              </select>
            </div>

            <!-- Destination Terminal -->
            <div>
              <label class="block font-semibold mb-1">Destination Terminal *</label>
              <select
                formControlName="destinationTerminalId"
                class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                (change)="onDestinationTerminalChange()"
              >
                <option value="">Select terminal</option>
                @for (terminal of terminals(); track terminal.id) {
                  <option [value]="terminal.id">{{ terminal.name }} ({{ terminal.city }}, {{ terminal.state }})</option>
                }
              </select>
            </div>

            <!-- Interchange Toggle -->
            <div class="col-span-2 mt-2">
              <label class="flex items-center font-semibold">
                <input type="checkbox" formControlName="useInterchange" class="mr-2" />
                Use Interchange (create two schedule legs)
              </label>
            </div>

            @if (form.get('useInterchange')?.value) {
              <div class="col-span-2">
                <label class="block font-semibold mb-1">Interchange Point *</label>
                <select
                  formControlName="interchangePointId"
                  class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                >
                  <option value="">Select interchange</option>
                  @for (point of interchangePoints(); track point.id) {
                    <option [value]="point.id">{{ point.name }} ({{ point.city }}, {{ point.state }})</option>
                  }
                </select>
              </div>
            }

            <!-- Origin City -->
            <div>
              <label class="block font-semibold mb-1">Origin City *</label>
              <input
                type="text"
                formControlName="originCity"
                class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                readonly
              />
            </div>

            <!-- Origin State -->
            <div>
              <label class="block font-semibold mb-1">Origin State *</label>
              <input
                type="text"
                formControlName="originState"
                class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                readonly
              />
            </div>

            <!-- Destination City -->
            <div>
              <label class="block font-semibold mb-1">Destination City *</label>
              <input
                type="text"
                formControlName="destinationCity"
                class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                readonly
              />
            </div>

            <!-- Destination State -->
            <div>
              <label class="block font-semibold mb-1">Destination State *</label>
              <input
                type="text"
                formControlName="destinationState"
                class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                readonly
              />
            </div>

            <!-- Distance Miles -->
            <div>
              <label class="block font-semibold mb-1">Distance (miles) *</label>
              <input
                type="number"
                formControlName="distanceMiles"
                class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>

            <!-- Transit Days -->
            <div>
              <label class="block font-semibold mb-1">Transit Days *</label>
              <input
                type="number"
                formControlName="transitDays"
                class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>

            <!-- Equipment -->
            <div class="col-span-2">
              <label class="block font-semibold mb-1">Equipment *</label>
              <input
                type="text"
                formControlName="equipment"
                class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                placeholder="Double-Stack (Priority), etc."
              />
            </div>

            <!-- Cutoff Time -->
            <div>
              <label class="block font-semibold mb-1">Cutoff Time *</label>
              <input
                type="time"
                formControlName="cutoffTime"
                class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>

            <!-- Departure Time -->
            <div>
              <label class="block font-semibold mb-1">Departure Time *</label>
              <input
                type="time"
                formControlName="departureTime"
                class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>

            <!-- Arrival Day -->
            <div>
              <label class="block font-semibold mb-1">Arrival Day *</label>
              <input
                type="text"
                formControlName="arrivalDay"
                class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                placeholder="Day 1, Day 2, etc."
              />
            </div>

            <!-- Arrival Time -->
            <div>
              <label class="block font-semibold mb-1">Arrival Time *</label>
              <input
                type="time"
                formControlName="arrivalTime"
                class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>

            <!-- Gate Cutoff Time -->
            <div>
              <label class="block font-semibold mb-1">Gate Cutoff Time *</label>
              <input
                type="time"
                formControlName="gateCutoffTime"
                class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>

            <!-- Expiration Date -->
            <div>
              <label class="block font-semibold mb-1">Expiration Date *</label>
              <input
                type="date"
                formControlName="expirationDate"
                class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          @if (form.get('useInterchange')?.value) {
            <div class="mt-8 border-t pt-6">
              <h2 class="text-xl font-semibold mb-4">Secondary Leg (Interchange → Destination)</h2>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block font-semibold mb-1">Railroad *</label>
                  <input
                    type="text"
                    formControlName="secondaryRailroad"
                    class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                    placeholder="UP, BNSF, CSX"
                  />
                </div>

                <div>
                  <label class="block font-semibold mb-1">Train Number *</label>
                  <input
                    type="text"
                    formControlName="secondaryTrainNumber"
                    class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label class="block font-semibold mb-1">Service *</label>
                  <select
                    formControlName="secondaryService"
                    class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select service</option>
                    <option value="Premium">Premium</option>
                    <option value="Expedited">Expedited</option>
                    <option value="Standard">Standard</option>
                  </select>
                </div>

                <div>
                  <label class="block font-semibold mb-1">Frequency *</label>
                  <select
                    formControlName="secondaryFrequency"
                    class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select frequency</option>
                    <option value="Daily">Daily</option>
                    <option value="5x/week">5x/week</option>
                    <option value="3x/week">3x/week</option>
                  </select>
                </div>

                <div>
                  <label class="block font-semibold mb-1">Origin Terminal *</label>
                  <select
                    formControlName="secondaryOriginTerminalId"
                    class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                    (change)="onSecondaryOriginTerminalChange()"
                  >
                    <option value="">Select terminal</option>
                    @for (terminal of terminals(); track terminal.id) {
                      <option [value]="terminal.id">{{ terminal.name }} ({{ terminal.city }}, {{ terminal.state }})</option>
                    }
                  </select>
                </div>

                <div>
                  <label class="block font-semibold mb-1">Destination Terminal *</label>
                  <select
                    formControlName="secondaryDestinationTerminalId"
                    class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                    (change)="onSecondaryDestinationTerminalChange()"
                  >
                    <option value="">Select terminal</option>
                    @for (terminal of terminals(); track terminal.id) {
                      <option [value]="terminal.id">{{ terminal.name }} ({{ terminal.city }}, {{ terminal.state }})</option>
                    }
                  </select>
                </div>

                <div>
                  <label class="block font-semibold mb-1">Origin City *</label>
                  <input
                    type="text"
                    formControlName="secondaryOriginCity"
                    class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                    readonly
                  />
                </div>

                <div>
                  <label class="block font-semibold mb-1">Origin State *</label>
                  <input
                    type="text"
                    formControlName="secondaryOriginState"
                    class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                    readonly
                  />
                </div>

                <div>
                  <label class="block font-semibold mb-1">Destination City *</label>
                  <input
                    type="text"
                    formControlName="secondaryDestinationCity"
                    class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                    readonly
                  />
                </div>

                <div>
                  <label class="block font-semibold mb-1">Destination State *</label>
                  <input
                    type="text"
                    formControlName="secondaryDestinationState"
                    class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                    readonly
                  />
                </div>

                <div>
                  <label class="block font-semibold mb-1">Distance (miles) *</label>
                  <input
                    type="number"
                    formControlName="secondaryDistanceMiles"
                    class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label class="block font-semibold mb-1">Transit Days *</label>
                  <input
                    type="number"
                    formControlName="secondaryTransitDays"
                    class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div class="col-span-2">
                  <label class="block font-semibold mb-1">Equipment *</label>
                  <input
                    type="text"
                    formControlName="secondaryEquipment"
                    class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label class="block font-semibold mb-1">Cutoff Time *</label>
                  <input
                    type="time"
                    formControlName="secondaryCutoffTime"
                    class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label class="block font-semibold mb-1">Departure Time *</label>
                  <input
                    type="time"
                    formControlName="secondaryDepartureTime"
                    class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label class="block font-semibold mb-1">Arrival Day *</label>
                  <input
                    type="text"
                    formControlName="secondaryArrivalDay"
                    class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                    placeholder="Day 1, Day 2, etc."
                  />
                </div>

                <div>
                  <label class="block font-semibold mb-1">Arrival Time *</label>
                  <input
                    type="time"
                    formControlName="secondaryArrivalTime"
                    class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label class="block font-semibold mb-1">Gate Cutoff Time *</label>
                  <input
                    type="time"
                    formControlName="secondaryGateCutoffTime"
                    class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label class="block font-semibold mb-1">Expiration Date *</label>
                  <input
                    type="date"
                    formControlName="secondaryExpirationDate"
                    class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div class="mt-6">
                <label class="block font-semibold mb-3">Operating Days *</label>
                <div class="grid grid-cols-7 gap-2">
                  @for (day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']; track day) {
                    <label class="flex items-center">
                      <input
                        type="checkbox"
                        [formControlName]="'secondary' + day"
                        class="mr-2"
                      />
                      {{ day }}
                    </label>
                  }
                </div>
              </div>
            </div>
          }

          <!-- Days of Week -->
          <div class="mt-6">
            <label class="block font-semibold mb-3">Operating Days *</label>
            <div class="grid grid-cols-7 gap-2">
              @for (day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']; track day) {
                <label class="flex items-center">
                  <input
                    type="checkbox"
                    [formControlName]="day.toLowerCase()"
                    class="mr-2"
                  />
                  {{ day }}
                </label>
              }
            </div>
          </div>

          <!-- Buttons -->
          <div class="mt-6 flex gap-2">
            <button
              type="submit"
              [disabled]="!form.valid || submitting()"
              class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {{ submitting() ? 'Saving...' : 'Save' }}
            </button>
            <button
              type="button"
              (click)="cancel()"
              class="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
            >
              Cancel
            </button>
          </div>

          @if (error()) {
            <div class="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {{ error() }}
            </div>
          }
        </form>
      }
    </div>
  `,
  styles: []
})
export class TrainScheduleFormComponent implements OnInit {
  form!: FormGroup;
  terminals = signal<Terminal[]>([]);
  interchangePoints = signal<InterchangePoint[]>([]);
  loading = signal(false);
  submitting = signal(false);
  error = signal('');
  isEdit = false;
  scheduleId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private trainScheduleService: TrainScheduleService,
    private terminalService: TerminalService,
    private interchangePointService: InterchangePointService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.form = this.fb.group({
      railroad: ['', Validators.required],
      trainNumber: ['', Validators.required],
      service: ['', Validators.required],
      frequency: ['', Validators.required],
      originTerminalId: ['', Validators.required],
      destinationTerminalId: ['', Validators.required],
      originCity: [{ value: '', disabled: true }],
      originState: [{ value: '', disabled: true }],
      destinationCity: [{ value: '', disabled: true }],
      destinationState: [{ value: '', disabled: true }],
      distanceMiles: [0, Validators.required],
      transitDays: [0, Validators.required],
      equipment: ['', Validators.required],
      cutoffTime: ['', Validators.required],
      departureTime: ['', Validators.required],
      arrivalDay: ['', Validators.required],
      arrivalTime: ['', Validators.required],
      gateCutoffTime: ['', Validators.required],
      expirationDate: ['', Validators.required],
      monday: [false],
      tuesday: [false],
      wednesday: [false],
      thursday: [false],
      friday: [false],
      saturday: [false],
      sunday: [false],
      useInterchange: [false],
      interchangePointId: [''],
      secondaryRailroad: [''],
      secondaryTrainNumber: [''],
      secondaryService: [''],
      secondaryFrequency: [''],
      secondaryOriginTerminalId: [''],
      secondaryDestinationTerminalId: [''],
      secondaryOriginCity: [{ value: '', disabled: true }],
      secondaryOriginState: [{ value: '', disabled: true }],
      secondaryDestinationCity: [{ value: '', disabled: true }],
      secondaryDestinationState: [{ value: '', disabled: true }],
      secondaryDistanceMiles: [0],
      secondaryTransitDays: [0],
      secondaryEquipment: [''],
      secondaryCutoffTime: [''],
      secondaryDepartureTime: [''],
      secondaryArrivalDay: [''],
      secondaryArrivalTime: [''],
      secondaryGateCutoffTime: [''],
      secondaryExpirationDate: [''],
      secondaryMonday: [false],
      secondaryTuesday: [false],
      secondaryWednesday: [false],
      secondaryThursday: [false],
      secondaryFriday: [false],
      secondarySaturday: [false],
      secondarySunday: [false]
    });
  }

  ngOnInit() {
    this.loadTerminals();
    this.loadInterchangePoints();
    this.checkIfEdit();
    this.form.get('useInterchange')?.valueChanges.subscribe(() => this.updateInterchangeValidators());
    this.updateInterchangeValidators();
  }

  loadTerminals() {
    this.terminalService.getTerminals().subscribe({
      next: (terminals: Terminal[]) => {
        this.terminals.set(terminals || []);
      },
      error: (err: any) => {
        this.error.set('Failed to load terminals');
      }
    });
  }

  loadInterchangePoints() {
    this.interchangePointService.getInterchangePoints().subscribe({
      next: (points: InterchangePoint[]) => {
        this.interchangePoints.set(points || []);
      },
      error: () => {
        this.error.set('Failed to load interchange points');
      }
    });
  }

  checkIfEdit() {
    this.route.params.subscribe((params) => {
      if (params['id']) {
        this.isEdit = true;
        this.scheduleId = params['id'];
        this.form.get('useInterchange')?.disable();
        this.loadSchedule(params['id']);
      }
    });
  }

  loadSchedule(id: number) {
    this.loading.set(true);
    this.trainScheduleService.getTrainSchedule(id).subscribe({
      next: (schedule: any) => {
        this.form.patchValue({
          railroad: schedule.railroad,
          trainNumber: schedule.trainNumber,
          service: schedule.service,
          frequency: schedule.frequency,
          originTerminalId: schedule.originTerminalId,
          destinationTerminalId: schedule.destinationTerminalId,
          originCity: schedule.originCity,
          originState: schedule.originState,
          destinationCity: schedule.destinationCity,
          destinationState: schedule.destinationState,
          distanceMiles: schedule.distanceMiles,
          transitDays: schedule.transitDays,
          equipment: schedule.equipment,
          cutoffTime: schedule.cutoffTime,
          departureTime: schedule.departureTime,
          arrivalDay: schedule.arrivalDay,
          arrivalTime: schedule.arrivalTime,
          gateCutoffTime: schedule.gateCutoffTime,
          expirationDate: schedule.expirationDate?.split('T')[0],
          monday: schedule.monday === 1,
          tuesday: schedule.tuesday === 1,
          wednesday: schedule.wednesday === 1,
          thursday: schedule.thursday === 1,
          friday: schedule.friday === 1,
          saturday: schedule.saturday === 1,
          sunday: schedule.sunday === 1
        });
        this.loading.set(false);
      },
      error: (err: any) => {
        this.error.set('Failed to load schedule');
        this.loading.set(false);
      }
    });
  }

  updateInterchangeValidators() {
    const useInterchange = this.form.get('useInterchange')?.value === true;

    const requiredControls = [
      'interchangePointId',
      'secondaryRailroad',
      'secondaryTrainNumber',
      'secondaryService',
      'secondaryFrequency',
      'secondaryOriginTerminalId',
      'secondaryDestinationTerminalId',
      'secondaryDistanceMiles',
      'secondaryTransitDays',
      'secondaryEquipment',
      'secondaryCutoffTime',
      'secondaryDepartureTime',
      'secondaryArrivalDay',
      'secondaryArrivalTime',
      'secondaryGateCutoffTime',
      'secondaryExpirationDate'
    ];

    requiredControls.forEach((controlName) => {
      const control = this.form.get(controlName);
      if (!control) return;
      if (useInterchange) {
        control.setValidators([Validators.required]);
      } else {
        control.clearValidators();
      }
      control.updateValueAndValidity({ emitEvent: false });
    });
  }

  onOriginTerminalChange() {
    const terminalId = this.form.get('originTerminalId')?.value;
    const terminal = this.terminals().find((t) => t.id === terminalId);
    if (terminal) {
      this.form.patchValue({
        originCity: terminal.city,
        originState: terminal.state
      });
    }
  }

  onDestinationTerminalChange() {
    const terminalId = this.form.get('destinationTerminalId')?.value;
    const terminal = this.terminals().find((t) => t.id === terminalId);
    if (terminal) {
      this.form.patchValue({
        destinationCity: terminal.city,
        destinationState: terminal.state
      });
    }
  }

  onSecondaryOriginTerminalChange() {
    const terminalId = this.form.get('secondaryOriginTerminalId')?.value;
    const terminal = this.terminals().find((t) => t.id === terminalId);
    if (terminal) {
      this.form.patchValue({
        secondaryOriginCity: terminal.city,
        secondaryOriginState: terminal.state
      });
    }
  }

  onSecondaryDestinationTerminalChange() {
    const terminalId = this.form.get('secondaryDestinationTerminalId')?.value;
    const terminal = this.terminals().find((t) => t.id === terminalId);
    if (terminal) {
      this.form.patchValue({
        secondaryDestinationCity: terminal.city,
        secondaryDestinationState: terminal.state
      });
    }
  }

  onSubmit() {
    if (!this.form.valid) return;

    this.submitting.set(true);
    this.error.set('');

    const formValue = this.form.getRawValue();
    const payload = {
      ...formValue,
      monday: formValue.monday ? 1 : 0,
      tuesday: formValue.tuesday ? 1 : 0,
      wednesday: formValue.wednesday ? 1 : 0,
      thursday: formValue.thursday ? 1 : 0,
      friday: formValue.friday ? 1 : 0,
      saturday: formValue.saturday ? 1 : 0,
      sunday: formValue.sunday ? 1 : 0
    };

    const useInterchange = formValue.useInterchange === true;

    let operation$: Observable<unknown>;
    if (useInterchange && !this.isEdit) {
      const primaryLeg = {
        railroad: payload.railroad,
        trainNumber: payload.trainNumber,
        service: payload.service,
        frequency: payload.frequency,
        originTerminalId: payload.originTerminalId,
        destinationTerminalId: payload.destinationTerminalId,
        originCity: payload.originCity,
        originState: payload.originState,
        destinationCity: payload.destinationCity,
        destinationState: payload.destinationState,
        distanceMiles: payload.distanceMiles,
        transitDays: payload.transitDays,
        equipment: payload.equipment,
        cutoffTime: payload.cutoffTime,
        departureTime: payload.departureTime,
        arrivalDay: payload.arrivalDay,
        arrivalTime: payload.arrivalTime,
        gateCutoffTime: payload.gateCutoffTime,
        expirationDate: payload.expirationDate,
        monday: payload.monday,
        tuesday: payload.tuesday,
        wednesday: payload.wednesday,
        thursday: payload.thursday,
        friday: payload.friday,
        saturday: payload.saturday,
        sunday: payload.sunday
      };

      const secondaryLeg = {
        railroad: payload.secondaryRailroad,
        trainNumber: payload.secondaryTrainNumber,
        service: payload.secondaryService,
        frequency: payload.secondaryFrequency,
        originTerminalId: payload.secondaryOriginTerminalId,
        destinationTerminalId: payload.secondaryDestinationTerminalId,
        originCity: payload.secondaryOriginCity,
        originState: payload.secondaryOriginState,
        destinationCity: payload.secondaryDestinationCity,
        destinationState: payload.secondaryDestinationState,
        distanceMiles: payload.secondaryDistanceMiles,
        transitDays: payload.secondaryTransitDays,
        equipment: payload.secondaryEquipment,
        cutoffTime: payload.secondaryCutoffTime,
        departureTime: payload.secondaryDepartureTime,
        arrivalDay: payload.secondaryArrivalDay,
        arrivalTime: payload.secondaryArrivalTime,
        gateCutoffTime: payload.secondaryGateCutoffTime,
        expirationDate: payload.secondaryExpirationDate,
        monday: payload.secondaryMonday ? 1 : 0,
        tuesday: payload.secondaryTuesday ? 1 : 0,
        wednesday: payload.secondaryWednesday ? 1 : 0,
        thursday: payload.secondaryThursday ? 1 : 0,
        friday: payload.secondaryFriday ? 1 : 0,
        saturday: payload.secondarySaturday ? 1 : 0,
        sunday: payload.secondarySunday ? 1 : 0
      };

      operation$ = this.trainScheduleService.createInterchangeSchedule({
        interchangePointId: payload.interchangePointId,
        primaryLeg,
        secondaryLeg
      });
    } else {
      operation$ = this.isEdit && this.scheduleId
        ? this.trainScheduleService.updateTrainSchedule(this.scheduleId, payload)
        : this.trainScheduleService.createTrainSchedule(payload);
    }

    operation$.subscribe({
      next: () => {
        this.router.navigate(['/admin/train-schedules']);
      },
      error: (err: any) => {
        this.error.set(err.error?.error || 'Failed to save schedule');
        this.submitting.set(false);
      }
    });
  }

  cancel() {
    this.router.navigate(['/admin/train-schedules']);
  }
}
