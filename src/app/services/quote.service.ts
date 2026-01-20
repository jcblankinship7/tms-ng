import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { Quote, Move, Terminal, MoveType } from '../models/order.model';

@Injectable({
  providedIn: 'root'
})
export class QuoteService {
  private terminals: Terminal[] = [
    { id: 'CSX-NE', name: 'Northeast Terminal', zip: '10001' },
    { id: 'CSX-SE', name: 'Southeast Terminal', zip: '30301' },
    { id: 'CSX-MW', name: 'Midwest Terminal', zip: '60601' },
    { id: 'CSX-SW', name: 'Southwest Terminal', zip: '75201' },
    { id: 'CSX-W', name: 'West Terminal', zip: '90001' }
  ];

  createQuote(originZip: string, destinationZip: string): Observable<Quote> {
    const originTerminal = this.findClosestTerminal(originZip);
    const destTerminal = this.findClosestTerminal(destinationZip);

    const moves: Move[] = [
      {
        id: `MOV-${Date.now()}-1`,
        moveOrder: 1,
        moveType: MoveType.ORIGIN_PICKUP,
        origin: { zip: originZip, address: `Customer Location (${originZip})` },
        destination: { zip: originTerminal.zip, address: originTerminal.name }
      },
      {
        id: `MOV-${Date.now()}-2`,
        moveOrder: 2,
        moveType: MoveType.RAIL_MOVE,
        origin: { zip: originTerminal.zip, address: originTerminal.name },
        destination: { zip: destTerminal.zip, address: destTerminal.name }
      },
      {
        id: `MOV-${Date.now()}-3`,
        moveOrder: 3,
        moveType: MoveType.FINAL_DELIVERY,
        origin: { zip: destTerminal.zip, address: destTerminal.name },
        destination: { zip: destinationZip, address: `Destination (${destinationZip})` }
      }
    ];

    const price = this.calculatePrice(moves); // now returns number
    return of({ moves, price }).pipe(delay(500));
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
}
