import { Component, inject, signal, computed, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SalesService } from '../../services/sales.service';
import { InventoryService } from '../../services/inventory.service';
import { Product, OrderChannel, PaymentMethod } from '../../models/nnt.models';

interface CartItem {
  product: Product;
  quantity: number;
}

@Component({
  selector: 'app-sales',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sales.component.html',
})
export class SalesComponent {
  private readonly inventoryService = inject(InventoryService);
  private readonly salesService = inject(SalesService);

  readonly products = this.inventoryService.products;
  readonly smartQuery = signal<string>('');
  
  // State: Shopping Cart
  readonly cart = signal<CartItem[]>([]);
  
  // Computed: Cart Total
  readonly cartTotalCents = computed(() => {
    return this.cart().reduce((total, item) => total + (item.product.priceCents * item.quantity), 0);
  });

  // Computed: Dynamic Cross-selling recommendations based on latest cart item
  readonly crossSellingSuggestions = computed<Product[]>(() => {
    const currentCart = this.cart();
    if (currentCart.length === 0) return [];
    
    const lastItem = currentCart[currentCart.length - 1];
    const suggestionRule = this.salesService.getCrossSellingFor(lastItem.product.id);
    
    if (!suggestionRule) return [];
    
    const cartProductIds = currentCart.map(i => i.product.id);
    
    return suggestionRule.suggestedProductIds
      // Don't suggest items already in cart
      .filter(id => !cartProductIds.includes(id))
      .map(id => this.inventoryService.getProductById(id))
      // Filter out invalid products
      .filter((p): p is Product => p !== undefined)
      // Max 3 suggestions
      .slice(0, 3);
  });

  addToCart(product: Product, quantity: number = 1) {
    if (product.stockCurrent < quantity) return;
    
    this.cart.update(items => {
      const existing = items.find(i => i.product.id === product.id);
      if (existing) {
        if (existing.quantity + quantity > product.stockCurrent) return items;
        return items.map(i => i.product.id === product.id 
            ? { ...i, quantity: i.quantity + quantity } 
            : i);
      }
      return [...items, { product, quantity }];
    });
  }

  removeFromCart(productId: string) {
    this.cart.update(items => items.filter(i => i.product.id !== productId));
  }

  // NLP Simulation for Smart POS
  processSmartCommand() {
    const query = this.smartQuery().toLowerCase();
    if (!query) return;

    // RegEx para encontrar números (ej. "3 monitores") -> qty
    const qtyMatch = query.match(/\b(\d+)\b/);
    const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
    
    // Find matching product by name or tag
    const foundProduct = this.products().find(p => {
        const nameMatch = p.name.toLowerCase().split(' ').some(word => word.length > 3 && query.includes(word));
        const tagMatch = p.tags.some(t => query.includes(t.toLowerCase()));
        return nameMatch || tagMatch;
    });

    if (foundProduct) {
      this.addToCart(foundProduct, qty);
      this.smartQuery.set(''); // Clear input
    } else {
        // Trigger shake animation or feedback
        console.warn('Producto no encontrado por comando de voz/texto.');
    }
  }

  checkout() {
    if (this.cart().length === 0) return;
    
    this.salesService.placeOrder({
      channel: OrderChannel.POS,
      customer: { id: 'cust-walkin', name: 'Cliente de Mostrador', email: 'na@na.com' },
      items: this.cart().map(i => ({ productId: i.product.id, quantity: i.quantity })),
      paymentMethod: PaymentMethod.CASH
    });

    this.cart.set([]);
  }
}
