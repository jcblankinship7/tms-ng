import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, of } from 'rxjs';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { CustomerContextService } from './customer-context.service';

export interface LoginRequest {
  emailOrUsername: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  userName?: string;
}

export interface AuthResponse {
  token: string;
  expiresAt: string;
  user: UserInfo;
}

export interface UserInfo {
  id: string;
  email: string;
  userName: string;
  firstName: string;
  lastName: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ConfirmEmailRequest {
  userId: string;
  token: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:5277/api/auth';
  private currentUserSubject = new BehaviorSubject<UserInfo | null>(null);
  private tokenSubject = new BehaviorSubject<string | null>(null);
  private personaSubject = new BehaviorSubject<string | null>(null);

  public currentUser$ = this.currentUserSubject.asObservable();
  public token$ = this.tokenSubject.asObservable();
  public persona$ = this.personaSubject.asObservable();

  constructor(private http: HttpClient, private router: Router, private customerContextService: CustomerContextService) {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    const token = localStorage.getItem('jwt_token');
    const userStr = localStorage.getItem('current_user');
    const persona = localStorage.getItem('user_persona');

    if (token && userStr) {
      this.tokenSubject.next(token);
      this.currentUserSubject.next(JSON.parse(userStr));
      if (persona) this.personaSubject.next(persona);
      // Restore customer context for the current user
      try {
        this.customerContextService.loadCustomerContextFromStorage();
      } catch (e) {
        console.error('Failed to load customer context on auth load', e);
      }
    }
  }

  register(request: RegisterRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, request);
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, request).pipe(
      tap(response => {
        this.setAuthData(response);
      })
    );
  }

  confirmEmail(request: ConfirmEmailRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/confirm-email`, request);
  }

  forgotPassword(request: ForgotPasswordRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/forgot-password`, request);
  }

  resetPassword(request: ResetPasswordRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-password`, request);
  }

  getCurrentUser(): Observable<UserInfo> {
    return this.http.get<UserInfo>(`${this.apiUrl}/me`);
  }

  logout(): void {
    // Clear in-memory context but keep the persisted per-user selection so it remains on next login
    try {
      this.customerContextService.clearInMemoryContext();
    } catch (e) {
      console.error('Failed to clear in-memory customer context on logout', e);
    }

    localStorage.removeItem('jwt_token');
    localStorage.removeItem('current_user');
    localStorage.removeItem('user_persona');
    this.tokenSubject.next(null);
    this.currentUserSubject.next(null);
    this.personaSubject.next(null);
    this.router.navigate(['/dashboard']);
  }

  getToken(): string | null {
    return this.tokenSubject.value || localStorage.getItem('jwt_token');
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      const decoded: any = jwtDecode(token);
      const expiryTime = decoded.exp * 1000;
      return expiryTime > Date.now();
    } catch {
      return false;
    }
  }

  getPersona(): string | null {
    return this.personaSubject.value || localStorage.getItem('user_persona');
  }

  switchPersona(persona: string): void {
    // Persona switching removed - users have a fixed persona from the database
  }

  isAdmin(): boolean {
    const persona = this.getPersona();
    return persona === 'Admin';
  }

  private setAuthData(response: AuthResponse): void {
    localStorage.setItem('jwt_token', response.token);
    localStorage.setItem('current_user', JSON.stringify(response.user));

    try {
      const decoded: any = jwtDecode(response.token);
      const persona = decoded.persona;
      if (persona) {
        localStorage.setItem('user_persona', persona);
        this.personaSubject.next(persona);
      }
    } catch (e) {
      console.error('Error decoding JWT', e);
    }

    this.tokenSubject.next(response.token);
    this.currentUserSubject.next(response.user);
    // Load any stored per-user customer context after login
    try {
      this.customerContextService.loadCustomerContextFromStorage();
    } catch (e) {
      console.error('Failed to load customer context after login', e);
    }
  }
}
