import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, delay } from 'rxjs/operators';
import { Quote, Move, Terminal, MoveType } from '../models/order.model';

export type QuoteType = 'Spot' | 'Custom';
export type QuoteStatus = 'Draft' | 'Submitted' | 'Quoted' | 'Accepted' | 'Rejected' | 'Expired';
export type StopType = 'Stay' | 'Drop';

export interface CreateQuoteRequest {
  description: string;
  originLatitude?: number;
  originLongitude?: number;
  originAddress?: string;
  originCity?: string;
  originState?: string;
  originZip: string;  // Required
  extraOriginZip?: string;
  extraOriginAddress?: string;
  extraOriginCity?: string;
  extraOriginState?: string;
  destinationLatitude?: number;
  destinationLongitude?: number;
  destinationAddress?: string;
  destinationCity?: string;
  destinationState?: string;
  destinationZip: string;  // Required
  extraDestinationZip?: string;
  extraDestinationAddress?: string;
  extraDestinationCity?: string;
  extraDestinationState?: string;
  originStopType?: StopType;
  extraOriginStopType?: StopType;
  extraDestinationStopType?: StopType;
  destinationStopType?: StopType;
  brokerCustomerId?: number;   // Broker customer facilitating the quote
  status?: string;
} 

export interface QuoteRequest {
  id: string;
  customerId: string;
  quoteNumber: string;
  quoteType: QuoteType;
  status: QuoteStatus;
  createdDate: string;
  submittedDate?: string;
  expiryDate?: string;
  origin: string;
  destination: string;
  weight?: number;
  specialHandling?: string;
  quotedPrice?: number;
  totalPrice?: number;
  acceptedPrice?: number;
  notes?: string;
  orderId?: string;
  // Appointment details (optional for spot quotes until accepted, required for custom quotes)
  pickupAppointmentDate?: string;
  pickupAppointmentTime?: string;
  deliveryAppointmentDate?: string;
  deliveryAppointmentTime?: string;
  // Order details for custom quotes
  orderDetails?: {
    pickupLocation?: string;
    deliveryLocation?: string;
    pickupContactName?: string;
    pickupContactPhone?: string;
    deliveryContactName?: string;
    deliveryContactPhone?: string;
  };
  shipmentDetails?: {
    commodityType: string;
    dimensions?: string;
    pallets?: number;
  };
  // Pricing breakdown and moves
  baseRate?: number;
  fuelSurcharge?: number;
  pickupCost?: number;
  deliveryCost?: number;
  moves?: Array<{ id?: string; origin: { zip?: string; address?: string }; destination: { zip?: string; address?: string } }>;
  // Customer tracking
  brokerCustomerId?: number;
  brokerCustomerName?: string;
} 

@Injectable({
  providedIn: 'root'
})
export class QuoteService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:5277/api/quotes';
  private terminals: Terminal[] = [
    { id: 'CSX-NE', name: 'Northeast Terminal', zip: '10001' },
    { id: 'CSX-SE', name: 'Southeast Terminal', zip: '30301' },
    { id: 'CSX-MW', name: 'Midwest Terminal', zip: '60601' },
    { id: 'CSX-SW', name: 'Southwest Terminal', zip: '75201' },
    { id: 'CSX-W', name: 'West Terminal', zip: '90001' }
  ];

  // Drafts are stored client-side per-user (localStorage) because backend does not currently expose a drafts API.
  // Live quotes are fetched from the backend via the /api/quotes/my endpoint.

  private mapApiToQuoteRequest(api: any): QuoteRequest {
    // Handle server-side drafts (they include a 'payload' object and are identified by lacking typical quote fields)
    if (api && api.payload) {
      const payload = api.payload as any;
      // Provide sensible fallbacks so drafts are visible in the list: show an ID-based draft number, attach names if provided, and expose any price the draft carries
      const draftNumber = api.quoteNumber || (`DRAFT-${String(api.id).slice(0,8)}`);
      const brokerName = api.brokerCustomerName || payload?.brokerCustomerName || undefined;
      const price = payload?.totalPrice ?? payload?.quotedPrice ?? api.totalPrice ?? undefined;

      return {
        id: String(api.id),
        customerId: String(api.brokerCustomerId || payload?.brokerCustomerId || ''),
        quoteNumber: draftNumber,
        quoteType: payload?.quoteType || 'Custom',
        status: 'Draft',
        createdDate: api.createdAt ? new Date(api.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        submittedDate: undefined,
        expiryDate: undefined,
        origin: payload?.origin || payload?.originZip || '',
        destination: payload?.destination || payload?.destinationZip || '',
        weight: payload?.weight || undefined,
        specialHandling: payload?.specialHandling || undefined,
        quotedPrice: price,
        acceptedPrice: undefined,
        notes: payload?.notes || undefined,
        orderId: undefined,
        pickupAppointmentDate: undefined,
        pickupAppointmentTime: undefined,
        deliveryAppointmentDate: undefined,
        deliveryAppointmentTime: undefined,
        orderDetails: payload?.orderDetails,
        shipmentDetails: payload?.shipmentDetails,
        brokerCustomerId: api.brokerCustomerId || payload?.brokerCustomerId,
        brokerCustomerName: brokerName,
        // keep original payload for editing
        rawPayload: payload
      } as QuoteRequest;
    }

    return {
      id: api.id,
      customerId: String(api.brokerCustomerId || ''),
      quoteNumber: api.quoteNumber || api.id || '',
      quoteType: api.route != null || api.moves?.length > 0 ? (api.description?.toLowerCase().includes('custom') ? 'Custom' : (api.description?.toLowerCase().includes('spot') ? 'Spot' : (api.quoteType || 'Spot'))) : (api.quoteType || 'Spot'),
      status: api.status || 'Quoted',
      createdDate: api.createdAt ? new Date(api.createdAt).toISOString().split('T')[0] : (api.createdDate || new Date().toISOString().split('T')[0]),
      submittedDate: api.submittedDate,
      expiryDate: api.expiryDate,
      origin: api.origin || (api.moves && api.moves[0] ? `${api.moves[0].OriginStop?.City || ''} (${api.moves[0].OriginStop?.ZipCode || ''})` : ''),
      destination: api.destination || (api.moves && api.moves.length>0 ? `${api.moves[api.moves.length-1].DestinationStop?.City || ''} (${api.moves[api.moves.length-1].DestinationStop?.ZipCode || ''})` : ''),
      weight: api.weight || undefined,
      specialHandling: api.specialHandling || undefined,
      quotedPrice: api.totalPrice || api.quotedPrice || undefined,
      acceptedPrice: api.acceptedPrice || undefined,
      notes: api.notes || undefined,
      orderId: api.orderId || undefined,
      pickupAppointmentDate: api.pickupAppointmentDate,
      pickupAppointmentTime: api.pickupAppointmentTime,
      deliveryAppointmentDate: api.deliveryAppointmentDate,
      deliveryAppointmentTime: api.deliveryAppointmentTime,
      orderDetails: api.orderDetails,
      shipmentDetails: api.shipmentDetails,
      brokerCustomerId: api.brokerCustomerId,
      brokerCustomerName: api.brokerCustomerName
    } as QuoteRequest; 
  }

  createQuote(request: CreateQuoteRequest): Observable<Quote> {
    return this.http.post<any>(`${this.apiUrl}`, request).pipe(
      map(response => {
        // Build moves from the API response
        const quoteId = response.id || '';
        const moves: Move[] = [];

        // Moves are now created by the backend, we just need to map them
        if (response.moves && Array.isArray(response.moves)) {
          response.moves.forEach((move: any, index: number) => {
            moves.push({
              id: move.id || `MOV-${quoteId}-${index + 1}`,
              orderNumber: quoteId,
              moveOrder: index + 1,
              moveType: this.getMoveType(index, response.moves.length),
              origin: { 
                zip: move.originStop?.zipCode || '', 
                address: move.originStop?.terminalName || move.originStop?.address || `Stop ${index + 1}`
              },
              destination: { 
                zip: move.destinationStop?.zipCode || '', 
                address: move.destinationStop?.terminalName || move.destinationStop?.address || `Stop ${index + 2}`
              }
            });
          });
        }

        return {
          id: quoteId,
          quoteNumber: response.quoteNumber || '',
          moves: moves.length > 0 ? moves : this.buildDefaultMoves(quoteId, request),
          totalPrice: response.totalPrice || 0,
          baseRate: response.baseRate,
          fuelSurcharge: response.fuelSurcharge,
          pickupCost: response.pickupCost,
          deliveryCost: response.deliveryCost
        } as any as Quote;
      })
    );
  }

  private getMoveType(index: number, totalMoves: number): MoveType {
    if (index === 0) return MoveType.ORIGIN_PICKUP;
    if (index === totalMoves - 1) return MoveType.FINAL_DELIVERY;
    return MoveType.RAIL_MOVE;
  }

  private buildDefaultMoves(quoteId: string, request: CreateQuoteRequest): Move[] {
    const moves: Move[] = [];
    let moveNumber = 1;

    // Origin to extra origin or origin terminal
    moves.push({
      id: `MOV-${quoteId}-${moveNumber}`,
      orderNumber: quoteId,
      moveOrder: moveNumber++,
      moveType: MoveType.ORIGIN_PICKUP,
      origin: { 
        zip: request.originZip, 
        address: request.originAddress || `Location (${request.originZip})`
      },
      destination: { 
        zip: request.extraOriginZip || request.originZip, 
        address: request.extraOriginAddress || 'Terminal'
      }
    });

    // Extra origin to origin terminal (if extra origin exists)
    if (request.extraOriginZip) {
      moves.push({
        id: `MOV-${quoteId}-${moveNumber}`,
        orderNumber: quoteId,
        moveOrder: moveNumber++,
        moveType: MoveType.ORIGIN_PICKUP,
        origin: { 
          zip: request.extraOriginZip, 
          address: request.extraOriginAddress || 'Extra Origin'
        },
        destination: { 
          zip: request.originZip, 
          address: 'Origin Terminal'
        }
      });
    }

    // Rail move
    moves.push({
      id: `MOV-${quoteId}-${moveNumber}`,
      orderNumber: quoteId,
      moveOrder: moveNumber++,
      moveType: MoveType.RAIL_MOVE,
      origin: { zip: request.originZip, address: 'Origin Terminal' },
      destination: { zip: request.destinationZip, address: 'Destination Terminal' }
    });

    // Destination terminal to extra destination (if extra destination exists)
    if (request.extraDestinationZip) {
      moves.push({
        id: `MOV-${quoteId}-${moveNumber}`,
        orderNumber: quoteId,
        moveOrder: moveNumber++,
        moveType: MoveType.FINAL_DELIVERY,
        origin: { zip: request.destinationZip, address: 'Destination Terminal' },
        destination: { 
          zip: request.extraDestinationZip, 
          address: request.extraDestinationAddress || 'Extra Destination'
        }
      });
    }

    // Extra destination to final destination or direct delivery
    moves.push({
      id: `MOV-${quoteId}-${moveNumber}`,
      orderNumber: quoteId,
      moveOrder: moveNumber,
      moveType: MoveType.FINAL_DELIVERY,
      origin: { 
        zip: request.extraDestinationZip || request.destinationZip, 
        address: 'Terminal'
      },
      destination: { 
        zip: request.destinationZip, 
        address: request.destinationAddress || `Final Destination (${request.destinationZip})`
      }
    });

    return moves;
  }

  createMissedOpportunity(quote: Quote): Observable<any> {
    const missedOpp = {
      id: `MISS-${Date.now()}`,
      quote,
      reason: 'Price rejected',
      timestamp: new Date().toISOString()
    };
    return of(missedOpp).pipe(delay(300));
  }

  // Quote Management Methods
  getQuotesByCustomer(customerId: string): Observable<QuoteRequest[]> {
    // Fetch quotes created by the current user and filter them client-side by customer id.
    return this.http.get<any[]>(`${this.apiUrl}/my`).pipe(
      map(list => list || []),
      map(list => {
        const filtered = list.filter((q: any) => {
          if (!customerId) return false;
          return String(q.brokerCustomerId) === String(customerId);
        }).map((q: any) => this.mapApiToQuoteRequest(q));

        // Merge local drafts persisted for the current user that target this customer
        try {
          const userStr = localStorage.getItem('current_user');
          const userId = userStr ? JSON.parse(userStr).id : 'anonymous';
          const key = `quoteDrafts:${userId}`;
          const stored = localStorage.getItem(key);
          if (stored) {
            let drafts: QuoteRequest[] = JSON.parse(stored);
            const serverIds = new Set(filtered.map(q => String(q.id)));
            let updated = false;
            // Keep drafts for this customer, but remove any stale server-drafts that no longer exist on server
            drafts = drafts.filter(d => {
              if (String(d.customerId) !== String(customerId)) return true; // keep drafts for other customers untouched
              const isServerDraft = /^[0-9a-fA-F\-]{36}$/.test(String(d.id));
              if (isServerDraft && !serverIds.has(String(d.id))) {
                // stale server draft deleted remotely -> drop it from local store
                updated = true;
                return false;
              }
              return true;
            });
            if (updated) {
              try { localStorage.setItem(key, JSON.stringify(drafts)); } catch (e) { /* ignore storage errors */ }
            }

            drafts.forEach(d => {
              if (String(d.customerId) === String(customerId)) {
                // Avoid duplicates: if a server-provided item with same id exists, remove it first
                const existingIdx = filtered.findIndex(q => String(q.id) === String(d.id));
                if (existingIdx >= 0) {
                  filtered.splice(existingIdx, 1);
                }
                // Only add the draft if it's not already at the front
                if (!filtered.length || String(filtered[0].id) !== String(d.id)) {
                  filtered.unshift(d); // put drafts at the top
                }
              }
            });
          }
        } catch (e) {
          console.warn('Could not load local drafts for quotes', e);
        }

        return filtered;
      })
    );
  }

  getAllQuotes(): Observable<QuoteRequest[]> {
    return this.http.get<any[]>(`${this.apiUrl}/my`).pipe(
      map(list => (list || []).map(q => this.mapApiToQuoteRequest(q)))
    );
  }

  getQuoteById(quoteId: string): Observable<QuoteRequest | undefined> {
    return this.http.get<any[]>(`${this.apiUrl}/my`).pipe(
      map(list => (list || []).find(q => String(q.id) === String(quoteId))),
      map(q => q ? this.mapApiToQuoteRequest(q) : undefined)
    );
  }

  getQuotesByStatus(customerId: string, status: QuoteStatus): Observable<QuoteRequest[]> {
    // Use /my and then filter by status & customer id
    return this.http.get<any[]>(`${this.apiUrl}/my`).pipe(
      map(list => (list || []).filter(q => String(q.brokerCustomerId) === String(customerId) && q.status === status).map(q => this.mapApiToQuoteRequest(q)))
    );
  }

  getQuotesByType(customerId: string, quoteType: QuoteType): Observable<QuoteRequest[]> {
    // Types are not explicitly stored server-side; filter by a heuristic based on stored fields or the mapped quoteType
    return this.getQuotesByCustomer(customerId).pipe(
      map(list => list.filter((q: QuoteRequest) => q.quoteType === quoteType))
    );
  }

  createQuoteRequest(quote: QuoteRequest): Observable<QuoteRequest> {
    // Persist drafts server-side via POST /api/quotes/drafts
    return this.http.post<any>(`${this.apiUrl}/drafts`, quote).pipe(
      map(response => this.mapApiToQuoteRequest(response))
    );
  }

  updateQuote(quoteId: string, updates: Partial<QuoteRequest>): Observable<QuoteRequest | undefined> {
    // If it's a server-side draft (GUID), update via drafts endpoint
    const isGuid = /^[0-9a-fA-F\-]{36}$/.test(quoteId);
    if (isGuid) {
      return this.http.put<any>(`${this.apiUrl}/drafts/${quoteId}`, updates).pipe(
        map(response => this.mapApiToQuoteRequest(response))
      );
    }
    // Fallback: attempt to update via main API (not all endpoints may be supported)
    return this.http.put<any>(`${this.apiUrl}/${quoteId}`, updates).pipe(
      map(response => this.mapApiToQuoteRequest(response))
    );
  }

  submitQuote(quoteId: string): Observable<QuoteRequest | undefined> {
    // If draft GUID -> submit draft via server-side endpoint
    const isGuid = /^[0-9a-fA-F\-]{36}$/.test(quoteId);
    if (isGuid) {
      return this.http.post<any>(`${this.apiUrl}/drafts/${quoteId}/submit`, {}).pipe(
        map(response => {
        // Response contains id and message; the caller will reload the quotes list.
        return undefined as unknown as QuoteRequest;
      })
    );
    }

    // Fallback: attempt to submit existing quote via backend (not implemented universally)
    return this.http.post<any>(`${this.apiUrl}/${quoteId}/submit`, {}).pipe(
      map(response => this.mapApiToQuoteRequest(response))
    );
  }

  acceptQuote(quoteId: string, acceptedPrice?: number): Observable<QuoteRequest | undefined> {
    // Call backend accept endpoint which creates an order and finalizes acceptance
    return this.http.post<any>(`${this.apiUrl}/${quoteId}/accept`, { acceptedPrice }).pipe(
      map(response => {
        // Backend returns order info; caller should reload quotes list.
        return undefined as unknown as QuoteRequest;
      })
    );
  }

  rejectQuote(quoteId: string): Observable<QuoteRequest | undefined> {
    // Backend endpoint for reject may not exist; attempt a server call and fall back to no-op
    return this.http.post<any>(`${this.apiUrl}/${quoteId}/reject`, {}).pipe(
      map(response => undefined as unknown as QuoteRequest)
    );
  }

   createOrderFromQuote(quoteId: string, orderDetails: {
    pickupAppointmentDate: string;
    pickupAppointmentTime: string;
    deliveryAppointmentDate?: string;
    deliveryAppointmentTime?: string;
    pickupContactName?: string;
    pickupContactPhone?: string;
    deliveryContactName?: string;
    deliveryContactPhone?: string;
  }): Observable<{ orderId: string; orderNumber: string }> {
    return this.http.post<{ orderId: string; orderNumber: string }>(
      `${this.apiUrl}/${quoteId}/accept`,
      orderDetails
    );
  }

  private findClosestTerminal(zip: string): Terminal {
    const zipNum = parseInt(zip, 10);
    if (zipNum < 20000) return this.terminals[0];
    if (zipNum < 40000) return this.terminals[1];
    if (zipNum < 65000) return this.terminals[2];
    if (zipNum < 80000) return this.terminals[3];
    return this.terminals[4];
  }

  private calculatePrice(moves: Move[]): number {
    return moves.reduce((total) => {
      const basePrice = 500;
      const distanceFactor = Math.random() * 500 + 200;
      return total + basePrice + distanceFactor;
    }, 0);
  }

  private calculateQuotePrice(quote: QuoteRequest): number {
    const basePrice = 500;
    const weightFactor = (quote.weight || 1000) / 1000 * 50;
    const typeFactor = quote.quoteType === 'Spot' ? 1 : 1.15;
    const randomFactor = Math.random() * 200 + 100;
    return Math.round((basePrice + weightFactor + randomFactor) * typeFactor * 100) / 100;
  }
}
