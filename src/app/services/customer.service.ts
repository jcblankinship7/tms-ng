import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Customer, CreateCustomer, UpdateCustomer, CustomerType } from '../models/customer.model';

@Injectable({
  providedIn: 'root'
})
export class CustomerService {
  private apiUrl = '/api/customers';

  constructor(private http: HttpClient) {}

  getCustomers(): Observable<Customer[]> {
    return this.http.get<Customer[]>(this.apiUrl);
  }

  getCustomer(id: number): Observable<Customer> {
    return this.http.get<Customer>(`${this.apiUrl}/${id}`);
  }

  getCustomersByType(type: CustomerType): Observable<Customer[]> {
    return this.http.get<Customer[]>(`${this.apiUrl}?type=${type}`);
  }

  getCustomersForUser(userId: string): Observable<Customer[]> {
    return this.http.get<Customer[]>(`${this.apiUrl}/user/${userId}`);
  }

  createCustomer(customer: CreateCustomer): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(this.apiUrl, customer);
  }

  updateCustomer(id: number, customer: UpdateCustomer): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/${id}`, customer);
  }

  deleteCustomer(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }
}
