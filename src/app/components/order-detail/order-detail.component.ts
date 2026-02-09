import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { OrderService } from '../../services/order.service';
import { AuthService } from '../../services/auth.service';
import { Order, Move, MoveType } from '../../models/order.model'; // ✅ import shared models

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './order-detail.component.html'
})
export class OrderDetailComponent implements OnInit {
  loading = signal(true);
  saving = signal(false);
  order = signal<Order | null>(null); // now uses shared model
  successMessage = signal('');
  errorMessage = signal('');
  isReadOnly = signal(false);
  expandedMoveId = signal<string | null>(null);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orderService: OrderService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    const persona = this.authService.getPersona();
    const isCustomerPersona = (persona || '').toLowerCase() === 'customer';
    const path = window.location.pathname || this.router.url || '';
    const isCustomerRoute = path.toLowerCase().startsWith('/customer/');
    this.isReadOnly.set(isCustomerPersona || isCustomerRoute);

    // If navigation included a preview order object, use it immediately to avoid a blank UI
    const nav = this.router.getCurrentNavigation();
    const stateOrder = nav?.extras?.state?.['order'] || (window as any).history?.state?.['order'];
    if (stateOrder) {
      this.order.set(stateOrder);
      this.loading.set(false);
      return;
    }

    const orderId = this.route.snapshot.paramMap.get('id');
    if (orderId) {
      this.loadOrder(orderId);
    } else {
      this.loading.set(false);
      this.errorMessage.set('Order ID not found in URL');
    }
  }

  loadOrder(orderId: string): void {
    this.loading.set(true);
    this.orderService.getOrderById(orderId).subscribe({
      next: (data) => {
        if (!data) {
          this.order.set(null);
          this.errorMessage.set('Order not found');
        } else {
          this.order.set(data);
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading order:', err);
        this.errorMessage.set('Failed to load order');
        this.loading.set(false);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  viewOrder(orderId: string): void {
    this.router.navigate(['/order', orderId]);
  }

  isCustomerReadOnly(): boolean {
    const path = window.location.pathname || this.router.url || '';
    return this.isReadOnly() || path.toLowerCase().includes('/customer/order');
  }

  getInitialPickupMove(): Move | undefined {
    return this.order()?.moves.find(m => m.moveType === MoveType.INITIAL_PICKUP);
  }

  getFinalDestinationMove(): Move | undefined {
    return this.order()?.moves.find(m => m.moveType === MoveType.FINAL_DESTINATION);
  }

  toggleMoveDetails(moveId: string): void {
    this.expandedMoveId.set(this.expandedMoveId() === moveId ? null : moveId);
  }

  // --- Move logic ---
  isMoveDirty(move: Move): boolean {
    return !this.isMoveComplete(move);
  }

  isMoveComplete(move: Move): boolean {
    return !!(
      move.origin.zip &&
      move.origin.address &&
      move.destination.zip &&
      move.destination.address
    );
  }

  hasIncompleteMoves(): boolean {
    const currentOrder = this.order();
    return currentOrder?.moves.some(m => !this.isMoveComplete(m)) ?? false;
  }

  canAddMoveAfter(index: number): boolean {
    const currentOrder = this.order();
    if (!currentOrder) return false;
    if (this.hasIncompleteMoves()) return false;
    if (index === currentOrder.moves.length - 1) return false;
    return true;
  }

  addMoveAfter(afterIndex: number): void {
    const currentOrder = this.order();
    if (!currentOrder) return;

    const previousMove = currentOrder.moves[afterIndex];

    // Clear previous move's destination for user input
    previousMove.destination = { zip: '', address: '' };

    const newMove: Move = {
      id: this.generateId(),
      orderNumber: currentOrder.id,
      moveOrder: afterIndex + 2,
      moveType: MoveType.EXTRA_PICKUP, // default type, adjust if needed
      origin: { ...previousMove.destination }, // initially empty
      destination: { zip: '', address: '' },
      isDirty: true
    };

    const updatedMoves = [...currentOrder.moves];
    updatedMoves.splice(afterIndex + 1, 0, newMove);

    this.recalculateMoveOrders(updatedMoves);
    this.order.set({ ...currentOrder, moves: updatedMoves });
  }

  removeMove(index: number): void {
    const currentOrder = this.order();
    if (!currentOrder) return;

    const move = currentOrder.moves[index];
    if ([MoveType.INITIAL_PICKUP, MoveType.FINAL_DESTINATION].includes(move.moveType)) {
      this.errorMessage.set('Cannot remove origin pickup or final delivery moves');
      setTimeout(() => this.errorMessage.set(''), 3000);
      return;
    }

    const updatedMoves = currentOrder.moves.filter((_, i) => i !== index);
    this.recalculateMoveOrders(updatedMoves);
    this.order.set({ ...currentOrder, moves: updatedMoves });
  }

  private recalculateMoveOrders(moves: Move[]): void {
    moves.forEach((move, idx) => move.moveOrder = idx + 1);
  }

  onMoveFieldChange(move: Move, field: 'destination'): void {
    if (this.isCustomerReadOnly()) {
      return;
    }
    move.isDirty = !this.isMoveComplete(move);

    // Update the origin of the next move if it exists
    const currentOrder = this.order();
    if (!currentOrder) return;

    const moveIndex = currentOrder.moves.findIndex(m => m.id === move.id);
    const nextMove = currentOrder.moves[moveIndex + 1];
    if (nextMove) {
      nextMove.origin = { ...move.destination };
    }
  }

  isTerminalMove(moveType: MoveType): boolean {
    return moveType === MoveType.RAIL;
  }

  getMoveTypeLabel(moveType: MoveType): string {
    const labels: Record<MoveType, string> = {
      [MoveType.INITIAL_PICKUP]: 'Initial Pickup',
      [MoveType.EXTRA_PICKUP]: 'Extra Pickup',
      [MoveType.RAIL]: 'Rail Move',
      [MoveType.EXTRA_DELIVERY]: 'Extra Delivery',
      [MoveType.FINAL_DESTINATION]: 'Final Destination',
      [MoveType.OVER_THE_ROAD]: 'Over the Road'
    };
    return labels[moveType];
  }

  getMoveTypeDescription(moveType: MoveType): string {
    const descriptions: Record<MoveType, string> = {
      [MoveType.INITIAL_PICKUP]: 'Initial pickup location',
      [MoveType.EXTRA_PICKUP]: 'Additional pickup before rail',
      [MoveType.RAIL]: 'Terminal to terminal transport',
      [MoveType.EXTRA_DELIVERY]: 'Additional delivery after rail',
      [MoveType.FINAL_DESTINATION]: 'Final delivery destination',
      [MoveType.OVER_THE_ROAD]: 'Over the road transport'
    };
    return descriptions[moveType];
  }

  saveOrder(): void {
    const currentOrder = this.order();
    if (!currentOrder) return;

    if (this.hasIncompleteMoves()) {
      this.errorMessage.set('Please complete all moves before saving');
      setTimeout(() => this.errorMessage.set(''), 3000);
      return;
    }
    
    this.saving.set(true);
    this.errorMessage.set('');
    
    this.orderService.updateOrder(currentOrder.id, currentOrder.moves, {
      customerShipmentNumber: currentOrder.customerShipmentNumber,
      containerNumber: currentOrder.containerNumber
    }).subscribe({
      next: (updatedOrder) => {
        this.saving.set(false);
        if (updatedOrder) {
          this.successMessage.set('Order saved successfully!');
          // Navigate to order detail view after short delay
          setTimeout(() => {
            this.router.navigate(['/customer/order', currentOrder.id]);
          }, 1000);
        }
      },
      error: (err) => {
        console.error('Error saving order:', err);
        this.saving.set(false);
        this.errorMessage.set('Failed to save order. Please try again.');
        setTimeout(() => this.errorMessage.set(''), 3000);
      }
    });
  }

  private generateId(): string {
    return `move_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
