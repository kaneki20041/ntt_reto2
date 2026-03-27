import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupplierService } from '../../services/supplier.service';
import { PurchaseOrderStatus, SupplierStatus, OptimalSupplierSuggestion } from '../../models/nnt.models';

@Component({
  selector: 'app-supplier',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './supplier.component.html',
})
export class SupplierComponent {
  private readonly supplierService = inject(SupplierService);

  readonly suppliers = this.supplierService.activeSuppliers;
  readonly purchaseOrders = this.supplierService.openPurchaseOrders;
  readonly pendingSuggestions = this.supplierService.pendingSuggestions;
  readonly summary = this.supplierService.purchasingSummary;

  getStatusColor(status: PurchaseOrderStatus | string): string {
    switch (status) {
      case PurchaseOrderStatus.RECEIVED: return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case PurchaseOrderStatus.CONFIRMED: return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case PurchaseOrderStatus.PARTIAL: return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case PurchaseOrderStatus.SENT: return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      case PurchaseOrderStatus.DRAFT: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      case PurchaseOrderStatus.CANCELLED: return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  }

  getRatingColor(score: number): string {
    if (score >= 90) return 'text-emerald-400';
    if (score >= 75) return 'text-amber-400';
    return 'text-red-400';
  }

  generatePOFromSuggestion(suggestion: OptimalSupplierSuggestion) {
    this.supplierService.generatePurchaseOrder(suggestion);
  }
}
