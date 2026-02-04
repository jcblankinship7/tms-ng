import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="message" class="toast-container" role="status" aria-live="polite">
      <div class="toast">{{ message }}</div>
    </div>
  `,
  styles: [
    `:host { position: fixed; inset: auto 1rem 1rem auto; z-index: 9999; }
     .toast-container { display: flex; justify-content: flex-end; }
     .toast { background: rgba(30,58,138,0.95); color: white; padding: 0.5rem 0.75rem; border-radius: 6px; box-shadow: 0 6px 24px rgba(15,23,42,0.25); font-weight: 600; font-size: 0.875rem; }
    `
  ]
})
export class ToastComponent implements OnInit {
  private toastService = inject(ToastService);
  message: string | null = null;

  ngOnInit(): void {
    this.toastService.toast$.subscribe(m => {
      this.message = m;
    });
  }
}
