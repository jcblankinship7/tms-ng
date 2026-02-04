import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastSubject = new BehaviorSubject<string | null>(null);
  public toast$ = this.toastSubject.asObservable();

  show(message: string, durationMs = 2000): void {
    this.toastSubject.next(message);
    if (durationMs > 0) {
      setTimeout(() => this.toastSubject.next(null), durationMs);
    }
  }

  clear(): void {
    this.toastSubject.next(null);
  }
}
