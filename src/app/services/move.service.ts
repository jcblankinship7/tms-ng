import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Move, MoveType } from '../models/order.model';

export interface Stop {
  id: string;
  Name: string;
  stopType: 'Stay' | 'Drop';
  arrivalAt?: string;
  departedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MoveService {
  private mockMoves: Move[] = [
    {
      id: 'MOV-001',
      orderNumber: 'ORD-001',
      moveOrder: 1,
      moveType: MoveType.RAIL,
      origin: {
        zip: '10001',
        address: 'Northeast Terminal - NY'
      },
      destination: {
        zip: '30303',
        address: 'Southeast Terminal - GA'
      },
      originArrivalTime: '2025-01-20T08:00:00Z',
      originDepartureTime: '2025-01-20T14:30:00Z',
      destinationArrivalTime: '2025-01-21T16:00:00Z',
      serviceProviderId: 'PROV-001',
      shipmentDetails: {
        containerSealNumber: 'SEAL-2025-001A',
        weight: 24500,
        weightUnit: 'lbs',
        description: 'Automotive Parts - Engine Components',
        hazardous: false,
        commodityType: 'Automotive Parts'
      }
    },
    {
      id: 'MOV-002',
      orderNumber: 'ORD-001',
      moveOrder: 2,
      moveType: MoveType.FINAL_DESTINATION,
      origin: {
        zip: '30303',
        address: 'Southeast Terminal - GA'
      },
      destination: {
        zip: '33101',
        address: 'Miami Port - FL'
      },
      originArrivalTime: '2025-01-21T16:00:00Z',
      originDepartureTime: '2025-01-21T18:00:00Z',
      serviceProviderId: 'PROV-002',
      shipmentDetails: {
        containerSealNumber: 'SEAL-2025-001B',
        weight: 24500,
        weightUnit: 'lbs',
        description: 'Automotive Parts - Engine Components',
        hazardous: false,
        commodityType: 'Automotive Parts'
      }
    },
    {
      id: 'MOV-003',
      orderNumber: 'ORD-002',
      moveOrder: 1,
      moveType: MoveType.INITIAL_PICKUP,
      origin: {
        zip: '90001',
        address: 'West Coast Hub - CA'
      },
      destination: {
        zip: '80202',
        address: 'Denver Terminal - CO'
      },
      originArrivalTime: '2025-01-19T10:00:00Z',
      originDepartureTime: '2025-01-19T16:45:00Z',
      destinationArrivalTime: '2025-01-20T20:00:00Z',
      serviceProviderId: 'PROV-001',
      shipmentDetails: {
        containerSealNumber: 'SEAL-2025-002A',
        weight: 18200,
        weightUnit: 'lbs',
        description: 'Electronics - Consumer Devices',
        hazardous: false,
        commodityType: 'Electronics'
      }
    }
  ];

  getMovesByServiceProvider(serviceProviderId: string): Observable<Move[]> {
    const filtered = this.mockMoves.filter(m => m.serviceProviderId === serviceProviderId);
    return of(filtered).pipe(delay(300));
  }

  getAllMoves(): Observable<Move[]> {
    return of(this.mockMoves).pipe(delay(300));
  }

  getMoveById(moveId: string): Observable<Move | undefined> {
    return of(this.mockMoves.find(m => m.id === moveId)).pipe(delay(300));
  }
}
