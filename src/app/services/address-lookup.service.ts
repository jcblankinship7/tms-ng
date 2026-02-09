import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

export interface AddressSuggestion {
  id?: string;
  address: string;
  // human-readable display name returned by some backends
  displayName?: string;
  city: string;
  state: string;
  zip: string;
  // Optional structured position to support multiple backends (latitude/longitude)
  position?: {
    latitude?: number;
    longitude?: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AddressLookupService {
  private apiUrl = '/api/quotes';
  private cache = new Map<string, AddressSuggestion[]>();
  private cacheExpiry = new Map<string, number>();
  private readonly CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

  constructor(private http: HttpClient) {}

  searchAddresses(query: string): Observable<AddressSuggestion[]> {
    if (!query || query.length < 3) {
      return new Observable(observer => {
        observer.next([]);
        observer.complete();
      });
    }

    // Check cache first
    if (this.isCacheValid(query)) {
      const cachedResults = this.cache.get(query);
      if (cachedResults) {
        return of(cachedResults);
      }
    }

    const params = new HttpParams().set('query', query);
    return new Observable(observer => {
      this.http.get<any[]>(`${this.apiUrl}/search-location`, { params })
        .subscribe({
          next: (results) => {
            // Transform results to AddressSuggestion format
            const suggestions: AddressSuggestion[] = results.map((result: any) => ({
              id: result.id || result.placeId || result.uid || '',
              address: result.address || result.freeformAddress || result.displayName || '',
              displayName: result.displayName || result.freeformAddress || result.address || '',
              city: result.city || result.municipality || '',
              state: result.state || result.countrySubdivision || result.stateCode || '',
              zip: result.zip || result.zipCode || result.postalCode || result.postal || result.postal_code || '',
              position: {
                latitude: result.position?.lat || result.position?.latitude || result.latitude,
                longitude: result.position?.lon || result.position?.longitude || result.longitude
              }
            }));
            
            // Cache the results
            this.cache.set(query, suggestions);
            this.cacheExpiry.set(query, Date.now() + this.CACHE_DURATION_MS);
            
            observer.next(suggestions);
            observer.complete();
          },
          error: (err) => {
            console.error('Error searching addresses:', err);
            observer.next([]);
            observer.complete();
          }
        });
    });
  }

  private isCacheValid(query: string): boolean {
    const expiry = this.cacheExpiry.get(query);
    if (!expiry) return false;
    return Date.now() < expiry;
  }
}
