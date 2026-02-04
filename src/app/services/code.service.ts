import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Code, CodeDto } from '../models/code.model';

@Injectable({ providedIn: 'root' })
export class CodeService {
  private apiUrl = '/api/codes';

  constructor(private http: HttpClient) {}

  getCodes(type?: string): Observable<Code[]> {
    let params = new HttpParams();
    if (type) {
      params = params.set('type', type);
    }
    return this.http.get<Code[]>(this.apiUrl, { params });
  }

  getCode(id: number): Observable<Code> {
    return this.http.get<Code>(`${this.apiUrl}/${id}`);
  }

  createCode(payload: CodeDto): Observable<Code> {
    return this.http.post<Code>(this.apiUrl, payload);
  }

  updateCode(id: number, payload: CodeDto): Observable<Code> {
    return this.http.put<Code>(`${this.apiUrl}/${id}`, payload);
  }

  deleteCode(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
