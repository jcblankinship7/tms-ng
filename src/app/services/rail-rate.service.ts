import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RailRate, RailRateDto, RailRateConflictCheckDto, RailRateConflictResponse, RailRateStatus } from '../models/rail-rate.model';

@Injectable({
  providedIn: 'root'
})
export class RailRateService {
  private apiUrl = '/api/railrates';

  constructor(private http: HttpClient) {}

  getRailRates(originTerminalId?: number, destinationTerminalId?: number, status?: RailRateStatus): Observable<RailRate[]> {
    let params = new HttpParams();
    if (originTerminalId !== undefined) {
      params = params.set('originTerminalId', originTerminalId.toString());
    }
    if (destinationTerminalId !== undefined) {
      params = params.set('destinationTerminalId', destinationTerminalId.toString());
    }
    if (status !== undefined) {
      params = params.set('status', status.toString());
    }
    return this.http.get<RailRate[]>(this.apiUrl, { params });
  }

  getRailRate(id: number): Observable<RailRate> {
    return this.http.get<RailRate>(`${this.apiUrl}/${id}`);
  }

  checkConflict(dto: RailRateConflictCheckDto): Observable<RailRateConflictResponse> {
    return this.http.post<RailRateConflictResponse>(`${this.apiUrl}/check-conflict`, dto);
  }

  createRailRate(dto: RailRateDto): Observable<RailRate> {
    return this.http.post<RailRate>(this.apiUrl, dto);
  }

  updateRailRate(id: number, dto: RailRateDto): Observable<RailRate> {
    return this.http.put<RailRate>(`${this.apiUrl}/${id}`, dto);
  }

  deleteRailRate(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
