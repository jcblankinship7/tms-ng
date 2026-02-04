export interface UpdateUser {
  persona: number;
  email: string;
  userName: string;
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { User, UpdateUserPersona, SetEmailConfirmed, UserPersona } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = '/api/users';

  constructor(private http: HttpClient) {}

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.apiUrl).pipe(
      map(users => users.map(user => this.normalizePersona(user)))
    );
  }

  getUser(id: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${id}`).pipe(
      map(user => this.normalizePersona(user))
    );
  }

  updateUser(id: string, update: UpdateUser): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/${id}`, update);
  }

  updateUserPersona(id: string, update: UpdateUserPersona): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/${id}/persona`, update);
  }

  setEmailConfirmed(id: string, update: SetEmailConfirmed): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/${id}/email-confirmed`, update);
  }

  getCustomerUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/customer-users`).pipe(
      map(users => users.map(user => this.normalizePersona(user)))
    );
  }

  getCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/me`).pipe(
      map(user => this.normalizePersona(user))
    );
  }

  deleteUser(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  private normalizePersona(user: User): User {
    const personaValue = user.persona as unknown;
    if (typeof personaValue === 'string') {
      const key = Object.keys(UserPersona)
        .filter(k => isNaN(Number(k)))
        .find(k => k.toLowerCase() === personaValue.toLowerCase());

      const enumMap = UserPersona as unknown as Record<string, number>;
      if (key && enumMap[key] !== undefined) {
        return { ...user, persona: enumMap[key] as UserPersona };
      }
    }

    return user;
  }
}
