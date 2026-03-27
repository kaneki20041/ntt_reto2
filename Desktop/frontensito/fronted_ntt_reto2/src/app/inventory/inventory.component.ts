import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InventoryService } from '../../services/inventory.service';
import { StockAlertLevel } from '../../models/nnt.models';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inventory.component.html',
})
export class InventoryComponent {
  private readonly inventoryService = inject(InventoryService);

  // Expose signals to the template
  readonly products = this.inventoryService.products;
  readonly criticalAlerts = this.inventoryService.criticalAlerts;
  readonly summary = this.inventoryService.inventorySummary;

  // Local state for Smart Search
  readonly searchQuery = signal<string>('');
  readonly isSearching = signal<boolean>(false);

  // Method to simulate natural language search processing
  simulateSmartSearch(query: string) {
    if (!query.trim()) return;
    
    this.searchQuery.set(query);
    this.isSearching.set(true);

    // AI Processing Simulation delay
    setTimeout(() => {
      this.isSearching.set(false);
      // Here in a real scenario we would filter the `products` signal based on NLP parsing.
      console.log(`[Smart Search] Procesando intención de usuario: "${query}"`);
    }, 1500);
  }

  // Utilities for UI/UX
  getAlertBadgeClasses(level: StockAlertLevel | string): string {
    switch (level) {
      case StockAlertLevel.OK:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case StockAlertLevel.WARNING:
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case StockAlertLevel.CRITICAL:
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20 animate-pulse';
      case StockAlertLevel.OUT:
        return 'bg-red-500/10 text-red-400 border-red-500/20 animate-pulse shadow-[0_0_15px_-3px_rgba(239,68,68,0.5)]';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  }

  getProgressColor(level: StockAlertLevel | string): string {
    switch (level) {
      case StockAlertLevel.OK: return 'bg-emerald-500 shadow-emerald-500/50';
      case StockAlertLevel.WARNING: return 'bg-amber-500 shadow-amber-500/50';
      case StockAlertLevel.CRITICAL: return 'bg-orange-500 shadow-orange-500/50';
      case StockAlertLevel.OUT: return 'bg-red-500 shadow-red-500/50';
      default: return 'bg-slate-500';
    }
  }

  // Helper template
  getStockPercentage(current: number, max: number): number {
    if (max === 0) return 0;
    const pct = (current / max) * 100;
    return pct > 100 ? 100 : pct;
  }
}
