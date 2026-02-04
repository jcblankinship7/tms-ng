import { Injectable, signal } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';

export interface CustomerContext {
  customerId: number | null;
  customerName: string | null;
  userId?: string | null;
  quoteType?: 'Spot' | 'Custom' | null;
}

@Injectable({
  providedIn: 'root'
})
export class CustomerContextService {
  private customerContext = signal<CustomerContext>({
    customerId: null,
    customerName: null
  });

  private customerContextSubject = new BehaviorSubject<CustomerContext>({
    customerId: null,
    customerName: null
  });

  public customerContext$ = this.customerContextSubject.asObservable();

  private makeStorageKey(userId?: string | null): string {
    if (userId) return `customerContext:${userId}`;
    return 'customerContext'; // legacy key fallback
  }

  setCustomerContext(customerId: number, customerName: string, userId?: string | null, quoteType?: 'Spot' | 'Custom' | null): void {
    const resolvedUserId = userId ?? this.getCurrentUserIdFromStorage();
    const context: CustomerContext = { customerId, customerName, userId: resolvedUserId, quoteType: quoteType ?? null };
    this.customerContext.set(context);
    this.customerContextSubject.next(context);
    // Persist to per-user localStorage key when possible
    const key = this.makeStorageKey(resolvedUserId);
    localStorage.setItem(key, JSON.stringify(context));
  }

  getCustomerContext(): CustomerContext {
    return this.customerContext();
  }

  clearCustomerContext(): void {
    const current = this.customerContext();
    this.customerContext.set({ customerId: null, customerName: null, userId: null });
    this.customerContextSubject.next({ customerId: null, customerName: null, userId: null });
    // Remove both per-user and legacy keys
    const key = this.makeStorageKey(current.userId ?? null);
    localStorage.removeItem(key);
    localStorage.removeItem('customerContext');
  }

  // Clear only the in-memory context without removing persisted data.
  clearInMemoryContext(): void {
    const current = this.customerContext();
    this.customerContext.set({ customerId: null, customerName: null, userId: current.userId ?? null });
    this.customerContextSubject.next({ customerId: null, customerName: null, userId: current.userId ?? null });
  }

  loadCustomerContextFromStorage(): void {
    // Try per-user key first
    const userId = this.getCurrentUserIdFromStorage();
    const perUserKey = this.makeStorageKey(userId);
    const storedPerUser = localStorage.getItem(perUserKey);

    if (storedPerUser) {
      try {
        const context = JSON.parse(storedPerUser);
        this.customerContext.set(context);
        this.customerContextSubject.next(context);
        return;
      } catch (e) {
        console.error('Failed to parse per-user customer context', e);
      }
    }

    // Fallback to legacy key
    const stored = localStorage.getItem('customerContext');
    if (stored) {
      try {
        const context = JSON.parse(stored);
        // Migrate to per-user key when possible
        const migrated: CustomerContext = { ...context, userId, quoteType: (context as any).quoteType ?? null };
        this.customerContext.set(migrated);
        this.customerContextSubject.next(migrated);
        if (userId) {
          localStorage.setItem(this.makeStorageKey(userId), JSON.stringify(migrated));
          localStorage.removeItem('customerContext');
        }
      } catch (e) {
        console.error('Failed to load customer context from storage', e);
      }
    }
  }

  private getCurrentUserIdFromStorage(): string | null {
    try {
      const userStr = localStorage.getItem('current_user');
      if (!userStr) return null;
      const user = JSON.parse(userStr);
      return user?.id ?? null;
    } catch (e) {
      console.error('Failed to read current user from storage', e);
      return null;
    }
  }
}
