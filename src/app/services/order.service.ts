import { Injectable, signal } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { Order, Move, MoveType } from '../models/order.model';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private mockOrders: Order[] = [
    {
      id: 'ORD-001',
      customerId: 'CUST-001',
      status: 'Active',
      createdDate: '2025-01-15',
      totalPrice: 1245.50,
      moves: [
        {
          id: 'MOV-001',
          moveOrder: 1,
          moveType: MoveType.ORIGIN_PICKUP,
          origin: { zip: '10001', address: '123 Main St, New York, NY' },
          destination: { zip: '10001', address: 'Northeast Terminal' }
        },
        {
          id: 'MOV-002',
          moveOrder: 2,
          moveType: MoveType.RAIL_MOVE,
          origin: { zip: '10001', address: 'Northeast Terminal' },
          destination: { zip: '30301', address: 'Southeast Terminal' }
        },
        {
          id: 'MOV-003',
          moveOrder: 3,
          moveType: MoveType.FINAL_DELIVERY,
          origin: { zip: '30301', address: 'Southeast Terminal' },
          destination: { zip: '30305', address: '456 Oak Ave, Atlanta, GA' }
        }
      ]
    },
    {
      id: 'ORD-002',
      customerId: 'CUST-001',
      status: 'Completed',
      createdDate: '2025-01-10',
      totalPrice: 890.00,
      moves: [
        {
          id: 'MOV-004',
          moveOrder: 1,
          moveType: MoveType.ORIGIN_PICKUP,
          origin: { zip: '60601', address: '789 State St, Chicago, IL' },
          destination: { zip: '60601', address: 'Midwest Terminal' }
        },
        {
          id: 'MOV-005',
          moveOrder: 2,
          moveType: MoveType.RAIL_MOVE,
          origin: { zip: '60601', address: 'Midwest Terminal' },
          destination: { zip: '75201', address: 'Southwest Terminal' }
        },
        {
          id: 'MOV-006',
          moveOrder: 3,
          moveType: MoveType.FINAL_DELIVERY,
          origin: { zip: '75201', address: 'Southwest Terminal' },
          destination: { zip: '75220', address: '321 Elm St, Dallas, TX' }
        }
      ]
    }
  ];

  orders = signal<Order[]>(this.mockOrders);

  getOrders(customerId: string): Observable<Order[]> {
    return of(this.mockOrders.filter(o => o.customerId === customerId)).pipe(delay(300));
  }

  getOrderById(orderId: string): Observable<Order | undefined> {
    return of(this.mockOrders.find(o => o.id === orderId)).pipe(delay(300));
  }

  createOrder(order: Order): Observable<Order> {
    // Ensure moves have moveOrder and moveType if missing
    order.moves.forEach((move, index) => {
      if (!move.moveOrder) move.moveOrder = index + 1;
      if (!move.moveType) move.moveType = index === 0
        ? MoveType.ORIGIN_PICKUP
        : index === order.moves.length - 1
        ? MoveType.FINAL_DELIVERY
        : MoveType.RAIL_MOVE;
    });

    order.totalPrice = this.calculatePrice(order.moves);

    this.mockOrders.unshift(order);
    this.orders.set([...this.mockOrders]);
    return of(order).pipe(delay(300));
  }

  updateOrder(orderId: string, moves: Move[]): Observable<Order | undefined> {
    const orderIndex = this.mockOrders.findIndex(o => o.id === orderId);
    if (orderIndex !== -1) {
      moves.forEach((move, index) => move.moveOrder = index + 1); // ensure moveOrder
      this.mockOrders[orderIndex].moves = moves;
      this.mockOrders[orderIndex].totalPrice = this.calculatePrice(moves);
      this.orders.set([...this.mockOrders]);
      return of(this.mockOrders[orderIndex]).pipe(delay(300));
    }
    return of(undefined).pipe(delay(300));
  }

  deleteOrder(orderId: string): Observable<boolean> {
    const index = this.mockOrders.findIndex(o => o.id === orderId);
    if (index !== -1) {
      this.mockOrders.splice(index, 1);
      this.orders.set([...this.mockOrders]);
      return of(true).pipe(delay(300));
    }
    return of(false).pipe(delay(300));
  }

  private calculatePrice(moves: Move[]): number {
    return moves.reduce((total) => {
      const basePrice = 500;
      const distanceFactor = Math.random() * 500 + 200;
      return total + basePrice + distanceFactor;
    }, 0);
  }
}
