import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MoveService } from '../../services/move.service';
import { Move, ShipmentDetails } from '../../models/order.model';

@Component({
  selector: 'app-move-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './move-detail.component.html',
  styleUrl: './move-detail.component.scss'
})
export class MoveDetailComponent implements OnInit {
  loading = signal(true);
  move = signal<Move | null>(null);
  errorMessage = signal('');

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private moveService: MoveService
  ) {}

  ngOnInit(): void {
    const moveId = this.route.snapshot.paramMap.get('id');
    if (moveId) {
      this.loadMove(moveId);
    } else {
      this.loading.set(false);
      this.errorMessage.set('Move ID not found in URL');
    }
  }

  loadMove(moveId: string): void {
    this.loading.set(true);
    this.moveService.getMoveById(moveId).subscribe({
      next: (data) => {
        this.move.set(data ?? null);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading move:', err);
        this.errorMessage.set('Failed to load move details');
        this.loading.set(false);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/provider/orders']);
  }

  formatDateTime(dateString?: string): string {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  }

  getMoveTypeLabel(moveType: string): string {
    const typeMap: { [key: string]: string } = {
      'InitialPickup': 'Initial Pickup',
      'ExtraPickup': 'Extra Pickup',
      'Rail': 'Rail Move',
      'ExtraDelivery': 'Extra Delivery',
      'FinalDestination': 'Final Destination',
      'OverTheRoad': 'Over the Road'
    };
    return typeMap[moveType] || moveType;
  }
}
