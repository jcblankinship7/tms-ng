import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { OrderService } from '../../services/order.service';
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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orderService: OrderService
  ) { }

  ngOnInit(): void {
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
        this.order.set(data ?? null);
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
    if ([MoveType.ORIGIN_PICKUP, MoveType.FINAL_DELIVERY].includes(move.moveType)) {
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
    return moveType === MoveType.RAIL_MOVE;
  }

  getMoveTypeLabel(moveType: MoveType): string {
    const labels: Record<MoveType, string> = {
      [MoveType.ORIGIN_PICKUP]: 'Origin Pickup',
      [MoveType.EXTRA_PICKUP]: 'Extra Pickup',
      [MoveType.RAIL_MOVE]: 'Rail Move',
      [MoveType.EXTRA_DELIVERY]: 'Extra Delivery',
      [MoveType.FINAL_DELIVERY]: 'Final Delivery'
    };
    return labels[moveType];
  }

  getMoveTypeDescription(moveType: MoveType): string {
    const descriptions: Record<MoveType, string> = {
      [MoveType.ORIGIN_PICKUP]: 'Initial pickup location',
      [MoveType.EXTRA_PICKUP]: 'Additional pickup before rail',
      [MoveType.RAIL_MOVE]: 'Terminal to terminal transport',
      [MoveType.EXTRA_DELIVERY]: 'Additional delivery after rail',
      [MoveType.FINAL_DELIVERY]: 'Final delivery destination'
    };
    return descriptions[moveType];
  }

  saveOrder(): void {
    if (this.hasIncompleteMoves()) {
      this.errorMessage.set('Please complete all moves before saving');
      setTimeout(() => this.errorMessage.set(''), 3000);
      return;
    }
    this.saving.set(true);
    setTimeout(() => {
      this.saving.set(false);
      this.successMessage.set('Order saved successfully!');
      setTimeout(() => this.successMessage.set(''), 3000);
    }, 1000);
  }

  private generateId(): string {
    return `move_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
