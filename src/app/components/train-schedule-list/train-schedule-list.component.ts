import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TrainScheduleService } from '../../services/train-schedule.service';
import { TrainSchedule } from '../../models/train-schedule.model';

@Component({
  selector: 'app-train-schedule-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="container mx-auto p-4">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-3xl font-bold">Train Schedules</h1>
        <a routerLink="/admin/train-schedules/new" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Add Schedule
        </a>
      </div>

      <div class="bg-white p-4 rounded-lg shadow mb-6">
        <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label class="block text-sm font-semibold mb-1">Railroad</label>
            <input
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              placeholder="UP, BNSF, CSX"
              [value]="railroadFilter()"
              (input)="railroadFilter.set($any($event.target).value)"
            />
          </div>
          <div>
            <label class="block text-sm font-semibold mb-1">Origin City</label>
            <input
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              placeholder="Chicago"
              [value]="originCityFilter()"
              (input)="originCityFilter.set($any($event.target).value)"
            />
          </div>
          <div>
            <label class="block text-sm font-semibold mb-1">Origin State</label>
            <input
              type="text"
              maxlength="2"
              class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              placeholder="IL"
              [value]="originStateFilter()"
              (input)="originStateFilter.set($any($event.target).value)"
            />
          </div>
          <div>
            <label class="block text-sm font-semibold mb-1">Destination City</label>
            <input
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              placeholder="Dallas"
              [value]="destinationCityFilter()"
              (input)="destinationCityFilter.set($any($event.target).value)"
            />
          </div>
          <div>
            <label class="block text-sm font-semibold mb-1">Destination State</label>
            <input
              type="text"
              maxlength="2"
              class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              placeholder="TX"
              [value]="destinationStateFilter()"
              (input)="destinationStateFilter.set($any($event.target).value)"
            />
          </div>
        </div>
        <div class="flex flex-wrap gap-3 mt-4">
          <button
            type="button"
            (click)="applyFilters()"
            class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Apply Filters
          </button>
          <button
            type="button"
            (click)="resetFilters()"
            class="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
          >
            Clear
          </button>
        </div>
      </div>

      @if (loading()) {
        <div class="text-center text-gray-500">Loading schedules...</div>
      } @else if (schedules().length === 0) {
        <div class="text-center text-gray-500">No train schedules found</div>
      } @else {
        <div class="overflow-x-auto shadow rounded-lg">
          <table class="min-w-full">
            <thead class="bg-gray-100">
              <tr>
                <th class="px-4 py-2 text-left">Railroad</th>
                <th class="px-4 py-2 text-left">Train #</th>
                <th class="px-4 py-2 text-left">Service</th>
                <th class="px-4 py-2 text-left">Route</th>
                <th class="px-4 py-2 text-left">Distance</th>
                <th class="px-4 py-2 text-left">Frequency</th>
                <th class="px-4 py-2 text-left">Transit</th>
                <th class="px-4 py-2 text-left">Status</th>
                <th class="px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (schedule of schedules(); track schedule.id) {
                <tr class="border-t hover:bg-gray-50">
                  <td class="px-4 py-2">{{ schedule.railroad }}</td>
                  <td class="px-4 py-2 font-mono">{{ schedule.trainNumber }}</td>
                  <td class="px-4 py-2">{{ schedule.service }}</td>
                  <td class="px-4 py-2">
                    {{ schedule.originCity }}, {{ schedule.originState }} →
                    {{ schedule.destinationCity }}, {{ schedule.destinationState }}
                  </td>
                  <td class="px-4 py-2">{{ schedule.distanceMiles }} mi</td>
                  <td class="px-4 py-2">{{ schedule.frequency }}</td>
                  <td class="px-4 py-2">{{ schedule.transitDays }} days</td>
                  <td class="px-4 py-2">
                    <span 
                      [class]="getStatusClass(schedule.status)"
                      class="px-2 py-1 rounded text-sm"
                    >
                      {{ getStatusLabel(schedule.status) }}
                    </span>
                  </td>
                  <td class="px-4 py-2">
                    <button
                      (click)="showDetails(schedule)"
                      class="text-green-600 hover:text-green-800 mr-3 text-sm"
                      title="View Schedule Details"
                    >
                      Details
                    </button>
                    <button
                      (click)="editSchedule(schedule.id)"
                      class="text-blue-600 hover:text-blue-800 mr-3 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      (click)="deleteSchedule(schedule.id)"
                      class="text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
                @if (selectedSchedule()?.id === schedule.id) {
                  <tr class="border-t bg-blue-50">
                    <td colspan="9" class="px-4 py-4">
                      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <!-- Days of Operation -->
                        <div>
                          <h3 class="font-bold text-gray-700 mb-2">Days of Operation</h3>
                          <div class="flex flex-wrap gap-2">
                            <span [class]="getDayClass(schedule.monday)">Mon</span>
                            <span [class]="getDayClass(schedule.tuesday)">Tue</span>
                            <span [class]="getDayClass(schedule.wednesday)">Wed</span>
                            <span [class]="getDayClass(schedule.thursday)">Thu</span>
                            <span [class]="getDayClass(schedule.friday)">Fri</span>
                            <span [class]="getDayClass(schedule.saturday)">Sat</span>
                            <span [class]="getDayClass(schedule.sunday)">Sun</span>
                          </div>
                        </div>
                        
                        <!-- Times -->
                        <div>
                          <h3 class="font-bold text-gray-700 mb-2">Schedule Times</h3>
                          <div class="space-y-1 text-sm">
                            <div><span class="font-semibold">Gate Cutoff:</span> {{ schedule.gateCutoffTime }}</div>
                            <div><span class="font-semibold">Cutoff Time:</span> {{ schedule.cutoffTime }}</div>
                            <div><span class="font-semibold">Departure:</span> {{ schedule.departureTime }}</div>
                            <div><span class="font-semibold">Arrival:</span> {{ schedule.arrivalTime }} ({{ schedule.arrivalDay }})</div>
                          </div>
                        </div>
                        
                        <!-- Additional Info -->
                        <div>
                          <h3 class="font-bold text-gray-700 mb-2">Additional Information</h3>
                          <div class="space-y-1 text-sm">
                            <div><span class="font-semibold">Equipment:</span> {{ schedule.equipment }}</div>
                            <div><span class="font-semibold">Effective:</span> {{ formatDate(schedule.effectiveDate) }}</div>
                            <div><span class="font-semibold">Expires:</span> {{ formatDate(schedule.expirationDate) }}</div>
                          </div>
                        </div>
                      </div>
                      <div class="mt-3 text-right">
                        <button
                          (click)="closeDetails()"
                          class="text-blue-600 hover:text-blue-800 text-sm font-semibold"
                        >
                          Close Details
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-4 mt-4">
          <div class="text-sm text-gray-600">
            Showing {{ getStartRecord() }}-{{ getEndRecord() }} of {{ totalRecords() }}
          </div>
          <div class="flex items-center gap-2">
            <label class="text-sm text-gray-600">Rows per page</label>
            <select
              class="px-2 py-1 border border-gray-300 rounded"
              [value]="pageSize()"
              (change)="onPageSizeChange($any($event.target).value)"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              (click)="goToPage(pageNumber() - 1)"
              [disabled]="pageNumber() <= 1"
              class="px-3 py-1 border rounded disabled:opacity-50"
            >
              Prev
            </button>
            <span class="text-sm text-gray-600">Page {{ pageNumber() }} of {{ totalPages() }}</span>
            <button
              type="button"
              (click)="goToPage(pageNumber() + 1)"
              [disabled]="pageNumber() >= totalPages()"
              class="px-3 py-1 border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      }

      @if (error()) {
        <div class="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {{ error() }}
        </div>
      }
    </div>
  `,
  styles: []
})
export class TrainScheduleListComponent implements OnInit {
  schedules = signal<TrainSchedule[]>([]);
  loading = signal(false);
  error = signal('');
  pageNumber = signal(1);
  pageSize = signal(25);
  totalPages = signal(1);
  totalRecords = signal(0);
  railroadFilter = signal('');
  originCityFilter = signal('');
  originStateFilter = signal('');
  destinationCityFilter = signal('');
  destinationStateFilter = signal('');
  selectedSchedule = signal<TrainSchedule | null>(null);

  constructor(private trainScheduleService: TrainScheduleService) {}

  ngOnInit() {
    this.loadSchedules();
  }

  loadSchedules() {
    this.loading.set(true);
    this.error.set('');

    this.trainScheduleService
      .getTrainSchedules(this.pageNumber(), this.pageSize(), {
        railroad: this.railroadFilter().trim() || undefined,
        originCity: this.originCityFilter().trim() || undefined,
        originState: this.originStateFilter().trim() || undefined,
        destinationCity: this.destinationCityFilter().trim() || undefined,
        destinationState: this.destinationStateFilter().trim() || undefined
      })
      .subscribe({
        next: (response) => {
          this.schedules.set(response.data || []);
          this.totalPages.set(response.totalPages || 1);
          this.totalRecords.set(response.totalRecords || 0);
          this.pageNumber.set(response.pageNumber || 1);
          this.pageSize.set(response.pageSize || this.pageSize());
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Failed to load train schedules');
          this.loading.set(false);
        }
      });
  }

  applyFilters() {
    this.pageNumber.set(1);
    this.loadSchedules();
  }

  resetFilters() {
    this.railroadFilter.set('');
    this.originCityFilter.set('');
    this.originStateFilter.set('');
    this.destinationCityFilter.set('');
    this.destinationStateFilter.set('');
    this.pageNumber.set(1);
    this.loadSchedules();
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages()) {
      return;
    }
    this.pageNumber.set(page);
    this.loadSchedules();
  }

  onPageSizeChange(value: string) {
    const newSize = Number(value);
    if (!Number.isNaN(newSize) && newSize > 0) {
      this.pageSize.set(newSize);
      this.pageNumber.set(1);
      this.loadSchedules();
    }
  }

  editSchedule(id: number) {
    // Navigate to edit page - will be implemented with router
    window.location.href = `/admin/train-schedules/edit/${id}`;
  }

  deleteSchedule(id: number) {
    if (confirm('Are you sure you want to delete this train schedule?')) {
      this.trainScheduleService.deleteTrainSchedule(id).subscribe({
        next: () => {
          this.loadSchedules();
        },
        error: () => {
          this.error.set('Failed to delete train schedule');
        }
      });
    }
  }

  private normalizeStatus(status: number | string | null | undefined): number {
    if (typeof status === 'number') return status;
    if (typeof status === 'string') {
      const normalized = status.trim().toLowerCase();
      if (normalized === 'active') return 1;
      if (normalized === 'inactive') return 3;
      if (normalized === 'expired') return 2;
    }
    return 3;
  }

  getStatusLabel(status: number | string | null | undefined): string {
    const normalized = this.normalizeStatus(status);
    return normalized === 1 ? 'Active' : 'Inactive';
  }

  getStatusClass(status: number | string | null | undefined): string {
    const normalized = this.normalizeStatus(status);
    return normalized === 1 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
  }

  getStartRecord(): number {
    if (this.totalRecords() === 0) return 0;
    return (this.pageNumber() - 1) * this.pageSize() + 1;
  }

  getEndRecord(): number {
    const end = this.pageNumber() * this.pageSize();
    return Math.min(end, this.totalRecords());
  }

  showDetails(schedule: TrainSchedule) {
    this.selectedSchedule.set(schedule);
  }

  closeDetails() {
    this.selectedSchedule.set(null);
  }

  getDayClass(isActive: number): string {
    return isActive === 1
      ? 'px-2 py-1 bg-green-500 text-white rounded text-xs font-semibold'
      : 'px-2 py-1 bg-gray-200 text-gray-500 rounded text-xs';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }
}
