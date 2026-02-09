import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Order, Move, MoveType, Stop } from '../models/order.model';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private apiUrl = '/api/orders';

  constructor(private http: HttpClient) {}

  getOrders(customerId?: string): Observable<Order[]> {
    let params = new HttpParams();
    if (customerId) {
      params = params.set('customerId', customerId);
    }

    return this.http.get<any[]>(`${this.apiUrl}/my`, { params }).pipe(
      map(list => (list || []).map(order => this.mapApiOrder(order)))
    );
  }

  getOrderById(orderId: string): Observable<Order | undefined> {
    return this.http.get<any>(`${this.apiUrl}/${orderId}`).pipe(
      map(order => order ? this.mapApiOrder(order) : undefined)
    );
  }

  updateOrder(orderId: string, moves: Move[], details?: { customerShipmentNumber?: string; containerNumber?: string }): Observable<Order | undefined> {
    const payload = {
      customerShipmentNumber: details?.customerShipmentNumber ?? undefined,
      containerNumber: details?.containerNumber ?? undefined,
      moves: moves.map(m => ({
        id: m.id,
        moveOrder: m.moveOrder,
        moveType: this.mapMoveTypeToApi(m.moveType),
        origin: {
          address: m.origin?.address || '',
          zip: m.origin?.zip || '',
          city: m.origin?.city || '',
          state: m.origin?.state || ''
        },
        destination: {
          address: m.destination?.address || '',
          zip: m.destination?.zip || '',
          city: m.destination?.city || '',
          state: m.destination?.state || ''
        }
      }))
    };

    return this.http.put<any>(`${this.apiUrl}/${orderId}/moves`, payload).pipe(
      map(order => order ? this.mapApiOrder(order) : undefined)
    );
  }

  private mapApiOrder(api: any): Order {
    const moves = (api?.moves || []).map((m: any) => this.mapApiMove(m));
    const shipper = api?.shipper || {};
    const consignee = api?.consignee || {};
    return {
      id: String(api?.id ?? api?.orderId ?? ''),
      orderNumber: api?.orderNumber ?? undefined,
      customerId: String(api?.shipperId ?? api?.customerId ?? ''),
      status: api?.status ?? 'Active',
      createdDate: api?.createdDate ?? api?.createdAt ?? '',
      totalPrice: Number(api?.totalPrice ?? api?.totalRate ?? 0),
      moves,
      customerShipmentNumber: api?.customerShipmentNumber ?? undefined,
      containerNumber: api?.containerNumber ?? api?.sealNumber ?? undefined,
      shipperName: shipper?.name ?? api?.shipperName ?? undefined,
      shipperAddress: shipper?.address ?? api?.shipperAddress ?? undefined,
      shipperCity: shipper?.city ?? api?.shipperCity ?? undefined,
      shipperState: shipper?.state ?? api?.shipperState ?? undefined,
      shipperZip: shipper?.zip ?? shipper?.zipCode ?? api?.shipperZip ?? undefined,
      consigneeName: consignee?.name ?? api?.consigneeName ?? undefined,
      consigneeAddress: consignee?.address ?? api?.consigneeAddress ?? undefined,
      consigneeCity: consignee?.city ?? api?.consigneeCity ?? undefined,
      consigneeState: consignee?.state ?? api?.consigneeState ?? undefined,
      consigneeZip: consignee?.zip ?? consignee?.zipCode ?? api?.consigneeZip ?? undefined,
      beneficialOwnerId: api?.beneficialOwnerId ?? undefined,
      beneficialOwnerName: api?.beneficialOwner?.name ?? api?.beneficialOwnerName ?? undefined,
      brokerCustomerId: api?.brokerCustomerId ?? undefined,
      brokerCustomerName: api?.brokerCustomer?.name ?? api?.brokerCustomerName ?? undefined
    };
  }

  private mapApiMove(api: any): Move {
    const origin = this.mapApiStop(api?.originStop ?? api?.origin);
    const destination = this.mapApiStop(api?.destinationStop ?? api?.destination);
    return {
      id: String(api?.id ?? ''),
      orderNumber: String(api?.orderNumber ?? api?.orderId ?? ''),
      moveOrder: Number(api?.moveNumber ?? api?.moveOrder ?? 0),
      moveType: this.mapMoveType(api?.moveType),
      origin,
      destination,
      originArrivalTime: api?.originStop?.arrivalAt ?? api?.originArrivalTime,
      originDepartureTime: api?.originStop?.departedAt ?? api?.originDepartureTime,
      destinationArrivalTime: api?.destinationStop?.arrivalAt ?? api?.destinationArrivalTime,
      destinationDepartureTime: api?.destinationStop?.departedAt ?? api?.destinationDepartureTime,
      shipmentDetails: api?.shipmentDetails ?? undefined,
      serviceProviderId: api?.assignedServiceProviderId ?? api?.serviceProviderId
    };
  }

  private mapApiStop(api: any): Stop {
    return {
      address: api?.address ?? api?.name ?? '',
      name: api?.name ?? undefined,
      zip: api?.zipCode ?? api?.zip ?? '',
      city: api?.city ?? '',
      state: api?.state ?? ''
    };
  }

  private mapMoveType(value: any): MoveType {
    if (typeof value === 'string') {
      const normalized = value.toLowerCase();
      switch (normalized) {
        case 'initialpickup':
          return MoveType.INITIAL_PICKUP;
        case 'extrapickup':
          return MoveType.EXTRA_PICKUP;
        case 'rail':
          return MoveType.RAIL;
        case 'extradelivery':
          return MoveType.EXTRA_DELIVERY;
        case 'finaldestination':
          return MoveType.FINAL_DESTINATION;
        case 'overtheroad':
          return MoveType.OVER_THE_ROAD;
        default:
          return MoveType.RAIL;
      }
    }

    switch (Number(value)) {
      case 1:
        return MoveType.INITIAL_PICKUP;
      case 2:
        return MoveType.EXTRA_PICKUP;
      case 3:
        return MoveType.RAIL;
      case 4:
        return MoveType.EXTRA_DELIVERY;
      case 5:
        return MoveType.FINAL_DESTINATION;
      case 6:
        return MoveType.OVER_THE_ROAD;
      default:
        return MoveType.RAIL;
    }
  }

  private mapMoveTypeToApi(value: MoveType | string | number | undefined): number {
    if (value === undefined || value === null) return 3;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const normalized = value.toLowerCase();
      switch (normalized) {
        case 'initialpickup':
          return 1;
        case 'extrapickup':
          return 2;
        case 'rail':
          return 3;
        case 'extradelivery':
          return 4;
        case 'finaldestination':
          return 5;
        case 'overtheroad':
          return 6;
        default:
          return 3;
      }
    }

    switch (value as MoveType) {
      case MoveType.INITIAL_PICKUP:
        return 1;
      case MoveType.EXTRA_PICKUP:
        return 2;
      case MoveType.RAIL:
        return 3;
      case MoveType.EXTRA_DELIVERY:
        return 4;
      case MoveType.FINAL_DESTINATION:
        return 5;
      case MoveType.OVER_THE_ROAD:
        return 6;
      default:
        return 3;
    }
  }
}
