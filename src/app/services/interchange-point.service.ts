import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { InterchangePoint } from '../models/interchange-point.model';

@Injectable({
  providedIn: 'root'
})
export class InterchangePointService {
  private apiUrl = '/api/interchangepoints';

  constructor(private http: HttpClient) {}

  getInterchangePoints(): Observable<InterchangePoint[]> {
    return this.http.get<InterchangePoint[]>(this.apiUrl);
  }
}