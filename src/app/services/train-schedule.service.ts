import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TrainSchedule, CreateTrainScheduleRequest, UpdateTrainScheduleRequest, TrainScheduleResponse, CreateInterchangeScheduleRequest } from '../models/train-schedule.model';

export interface TrainScheduleFilters {
  railroad?: string;
  originCity?: string;
  originState?: string;
  destinationCity?: string;
  destinationState?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TrainScheduleService {
  private apiUrl = '/api/trainschedules';

  constructor(private http: HttpClient) {}

  getTrainSchedules(
    pageNumber: number = 1,
    pageSize: number = 25,
    filters: TrainScheduleFilters = {}
  ): Observable<TrainScheduleResponse> {
    let params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    if (filters.railroad) {
      params = params.set('railroad', filters.railroad);
    }
    if (filters.originCity) {
      params = params.set('originCity', filters.originCity);
    }
    if (filters.originState) {
      params = params.set('originState', filters.originState);
    }
    if (filters.destinationCity) {
      params = params.set('destinationCity', filters.destinationCity);
    }
    if (filters.destinationState) {
      params = params.set('destinationState', filters.destinationState);
    }

    return this.http.get<TrainScheduleResponse>(this.apiUrl, { params });
  }

  getTrainSchedule(id: number): Observable<TrainSchedule> {
    return this.http.get<TrainSchedule>(`${this.apiUrl}/${id}`);
  }

  getTrainSchedulesByRoute(originCity: string, originState: string, destinationCity: string, destinationState: string): Observable<TrainSchedule[]> {
    const params = new HttpParams()
      .set('originCity', originCity)
      .set('originState', originState)
      .set('destinationCity', destinationCity)
      .set('destinationState', destinationState);
    return this.http.get<TrainSchedule[]>(`${this.apiUrl}/route`, { params });
  }

  createTrainSchedule(request: CreateTrainScheduleRequest): Observable<TrainSchedule> {
    return this.http.post<TrainSchedule>(this.apiUrl, request);
  }

  createInterchangeSchedule(request: CreateInterchangeScheduleRequest): Observable<{ primary: TrainSchedule; secondary: TrainSchedule }> {
    return this.http.post<{ primary: TrainSchedule; secondary: TrainSchedule }>(`${this.apiUrl}/interchange`, request);
  }

  updateTrainSchedule(id: number, request: UpdateTrainScheduleRequest): Observable<TrainSchedule> {
    return this.http.put<TrainSchedule>(`${this.apiUrl}/${id}`, request);
  }

  deleteTrainSchedule(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
