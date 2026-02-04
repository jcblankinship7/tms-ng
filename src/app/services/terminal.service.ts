import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Terminal, TerminalDto, TerminalDistance, TerminalStatus } from '../models/terminal.model';

@Injectable({
  providedIn: 'root'
})
export class TerminalService {
  private apiUrl = '/api/terminals';

  constructor(private http: HttpClient) {}

  getTerminals(search?: string, railroad?: string, status?: TerminalStatus): Observable<Terminal[]> {
    let params = new HttpParams();
    
    if (search) {
      params = params.set('search', search);
    }
    if (railroad) {
      params = params.set('railroad', railroad);
    }
    if (status !== undefined && status !== null) {
      params = params.set('status', status.toString());
    }

    return this.http.get<Terminal[]>(this.apiUrl, { params });
  }

  getTerminal(id: number): Observable<Terminal> {
    return this.http.get<Terminal>(`${this.apiUrl}/${id}`);
  }

  createTerminal(terminal: TerminalDto): Observable<Terminal> {
    return this.http.post<Terminal>(this.apiUrl, terminal);
  }

  updateTerminal(id: number, terminal: TerminalDto): Observable<Terminal> {
    return this.http.put<Terminal>(`${this.apiUrl}/${id}`, terminal);
  }

  deleteTerminal(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getDistance(fromId: number, toId: number): Observable<TerminalDistance> {
    const params = new HttpParams()
      .set('fromId', fromId.toString())
      .set('toId', toId.toString());
    
    return this.http.get<TerminalDistance>(`${this.apiUrl}/distance`, { params });
  }
}
