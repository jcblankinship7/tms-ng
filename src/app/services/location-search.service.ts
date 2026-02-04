import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { LocationSearchResult } from '../models/location-search-result.model';

export interface RateLimitStatus {
  canMakeRequest: boolean;
  requestsThisMinute: number; // Actually QPS (requests per second)
  maxRequestsPerMinute: number; // Actually max QPS (500)
  requestsThisMonth: number;
  maxRequestsPerMonth: number; // Free tier: 5,000 transactions/month
  secondsUntilNextRequest: number;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class LocationSearchService {
  private apiUrl = '/api/quotes';
  private cache = new Map<string, LocationSearchResult[]>();
  private cacheExpiry = new Map<string, number>();
  private readonly CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
  
  rateLimitStatus = signal<RateLimitStatus | null>(null);
  isRateLimited = signal(false);

  constructor(private http: HttpClient) {
    this.checkRateLimitStatus();
    // Check rate limit every 30 seconds
    setInterval(() => this.checkRateLimitStatus(), 30000);
  }

  searchLocation(query: string): Observable<LocationSearchResult[]> {
    // Check cache first
    if (this.isCacheValid(query)) {
      const cachedResults = this.cache.get(query);
      if (cachedResults) {
        console.log(`Returning cached results for: ${query}`);
        return of(cachedResults);
      }
    }

    const params = new HttpParams().set('query', query);
    return new Observable(observer => {
      this.http.get<LocationSearchResult[]>(`${this.apiUrl}/search-location`, { params })
        .subscribe({
          next: (results) => {
            // Cache the results
            this.cache.set(query, results);
            this.cacheExpiry.set(query, Date.now() + this.CACHE_DURATION_MS);
            observer.next(results);
            observer.complete();
          },
          error: (err) => {
            // Check if it's a rate limit error (HTTP 429)
            if (err.status === 429) {
              this.isRateLimited.set(true);
            }
            observer.error(err);
          }
        });
    });
  }

  private checkRateLimitStatus(): void {
    this.http.get<RateLimitStatus>(`${this.apiUrl}/rate-limit-status`)
      .subscribe({
        next: (status) => {
          this.rateLimitStatus.set(status);
          this.isRateLimited.set(!status.canMakeRequest);
        },
        error: (err) => {
          console.warn('Could not fetch rate limit status:', err);
        }
      });
  }

  private isCacheValid(query: string): boolean {
    const expiry = this.cacheExpiry.get(query);
    if (!expiry) return false;
    
    const isValid = Date.now() < expiry;
    if (!isValid) {
      this.cache.delete(query);
      this.cacheExpiry.delete(query);
    }
    
    return isValid;
  }

  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }
}
