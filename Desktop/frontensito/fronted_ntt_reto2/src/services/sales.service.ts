// =============================================================================
// MINERVA ECOSYSTEM — SalesService
// Gestión de pedidos de venta, POS y sugerencias de cross-selling
// =============================================================================

import { Injectable, signal, computed, inject } from '@angular/core';
import {
    Order,
    OrderItem,
    OrderStatus,
    OrderChannel,
    PaymentMethod,
    CrossSellingSuggestion,
    CustomerSnapshot,
    UUID,
} from '../models/nnt.models';
import { InventoryService } from './inventory.service';

// ---------------------------------------------------------------------------
// DTO — Payload para crear un nuevo pedido
// ---------------------------------------------------------------------------

/** Payload mínimo para crear una línea de pedido */
export interface CreateOrderItemDto {
    productId: UUID;
    quantity: number;
}

/** Payload para registrar un nuevo pedido de venta */
export interface CreateOrderDto {
    channel: OrderChannel;
    customer: CustomerSnapshot;
    items: CreateOrderItemDto[];
    paymentMethod: PaymentMethod;
    notes?: string;
}

// ---------------------------------------------------------------------------
// DATOS MOCK — Sugerencias de cross-selling (simula respuesta de motor ML)
// ---------------------------------------------------------------------------

const MOCK_CROSS_SELLING: CrossSellingSuggestion[] = [
    {
        sourceProductId: 'prod-001', // Dell XPS
        suggestedProductIds: ['prod-002', 'prod-004', 'prod-005', 'prod-006', 'prod-007'],
        affinityScores: {
            'prod-002': 0.94,
            'prod-004': 0.89,
            'prod-005': 0.85,
            'prod-006': 0.81,
            'prod-007': 0.76,
        },
        algorithmSource: 'HYBRID',
        generatedAt: '2025-06-01T00:00:00Z',
    },
    {
        sourceProductId: 'prod-002', // Monitor LG
        suggestedProductIds: ['prod-004', 'prod-005', 'prod-006'],
        affinityScores: { 'prod-004': 0.91, 'prod-005': 0.88, 'prod-006': 0.83 },
        algorithmSource: 'COLLABORATIVE',
        generatedAt: '2025-06-01T00:00:00Z',
    },
    {
        sourceProductId: 'prod-003', // Sony WH-1000XM5
        suggestedProductIds: ['prod-008', 'prod-001'],
        affinityScores: { 'prod-008': 0.72, 'prod-001': 0.65 },
        algorithmSource: 'CONTENT_BASED',
        generatedAt: '2025-06-01T00:00:00Z',
    },
    {
        sourceProductId: 'prod-004', // Teclado MX Keys
        suggestedProductIds: ['prod-005', 'prod-002', 'prod-007'],
        affinityScores: { 'prod-005': 0.97, 'prod-002': 0.82, 'prod-007': 0.68 },
        algorithmSource: 'COLLABORATIVE',
        generatedAt: '2025-06-01T00:00:00Z',
    },
    {
        sourceProductId: 'prod-009', // SSD Samsung
        suggestedProductIds: ['prod-001', 'prod-006'],
        affinityScores: { 'prod-001': 0.78, 'prod-006': 0.71 },
        algorithmSource: 'CONTENT_BASED',
        generatedAt: '2025-06-01T00:00:00Z',
    },
];

// ---------------------------------------------------------------------------
// DATOS MOCK — Pedidos previos
// ---------------------------------------------------------------------------

const MOCK_ORDERS: Order[] = [
    {
        id: 'ord-001',
        orderNumber: 'ORD-2025-00241',
        channel: OrderChannel.ECOMMERCE,
        status: OrderStatus.DELIVERED,
        customer: {
            id: 'cust-001', name: 'Alejandro Ramírez',
            email: 'alejandro.ramirez@email.com', phone: '+52 55 1234 5678',
            address: { street: 'Av. Insurgentes Sur 1234', city: 'CDMX', state: 'CDMX', country: 'MX', postalCode: '03100' },
        },
        items: [
            {
                id: 'item-001', orderId: 'ord-001', productId: 'prod-001',
                quantity: 1, unitPriceCents: 189900, discountCents: 0, taxCents: 30384, subtotalCents: 220284,
            },
            {
                id: 'item-002', orderId: 'ord-001', productId: 'prod-004',
                quantity: 1, unitPriceCents: 11900, discountCents: 0, taxCents: 1904, subtotalCents: 13804,
            },
        ],
        subtotalCents: 201800, discountCents: 0, taxCents: 32288, shippingCents: 0, totalCents: 234088,
        paymentMethod: PaymentMethod.CREDIT_CARD, isPaid: true, paidAt: '2025-05-15T10:30:00Z',
        shippingAddress: { street: 'Av. Insurgentes Sur 1234', city: 'CDMX', state: 'CDMX', country: 'MX', postalCode: '03100' },
        estimatedDelivery: '2025-05-20T00:00:00Z',
        createdAt: '2025-05-14T18:22:00Z', updatedAt: '2025-05-20T14:00:00Z',
        createdBy: 'user-op-002', updatedBy: 'user-op-002',
    },
    {
        id: 'ord-002',
        orderNumber: 'ORD-2025-00248',
        channel: OrderChannel.POS,
        status: OrderStatus.DELIVERED,
        customer: {
            id: 'cust-002', name: 'Valeria Mendoza',
            email: 'valeria.mendoza@empresa.com', phone: '+52 81 9876 5432',
        },
        items: [
            {
                id: 'item-003', orderId: 'ord-002', productId: 'prod-003',
                quantity: 2, unitPriceCents: 34900, discountCents: 3490, taxCents: 10624, subtotalCents: 77034,
            },
            {
                id: 'item-004', orderId: 'ord-002', productId: 'prod-008',
                quantity: 1, unitPriceCents: 39900, discountCents: 0, taxCents: 6384, subtotalCents: 46284,
            },
        ],
        subtotalCents: 109800, discountCents: 3490, taxCents: 17008, shippingCents: 0, totalCents: 123318,
        paymentMethod: PaymentMethod.DEBIT_CARD, isPaid: true, paidAt: '2025-05-28T12:15:00Z',
        createdAt: '2025-05-28T12:10:00Z', updatedAt: '2025-05-28T12:15:00Z',
        createdBy: 'user-op-003', updatedBy: 'user-op-003',
    },
    {
        id: 'ord-003',
        orderNumber: 'ORD-2025-00255',
        channel: OrderChannel.ECOMMERCE,
        status: OrderStatus.PROCESSING,
        customer: {
            id: 'cust-003', name: 'Rodrigo Sánchez',
            email: 'rodrigo.s@techcorp.io', phone: '+52 33 5555 0000',
            address: { street: 'López Mateos 890 Col. Chapalita', city: 'Guadalajara', state: 'Jalisco', country: 'MX', postalCode: '45040' },
        },
        items: [
            {
                id: 'item-005', orderId: 'ord-003', productId: 'prod-002',
                quantity: 2, unitPriceCents: 64900, discountCents: 6490, taxCents: 19728, subtotalCents: 143038,
            },
            {
                id: 'item-006', orderId: 'ord-003', productId: 'prod-007',
                quantity: 2, unitPriceCents: 19900, discountCents: 0, taxCents: 6368, subtotalCents: 46168,
            },
        ],
        subtotalCents: 149700, discountCents: 6490, taxCents: 26096, shippingCents: 19900, totalCents: 189206,
        paymentMethod: PaymentMethod.BANK_TRANSFER, paymentReference: 'TRANS-20250602-0042',
        isPaid: true, paidAt: '2025-06-02T09:00:00Z',
        shippingAddress: { street: 'López Mateos 890', city: 'Guadalajara', state: 'Jalisco', country: 'MX', postalCode: '45040' },
        estimatedDelivery: '2025-06-10T00:00:00Z',
        createdAt: '2025-06-02T08:45:00Z', updatedAt: '2025-06-03T10:00:00Z',
        createdBy: 'user-op-001', updatedBy: 'user-op-001',
    },
    {
        id: 'ord-004',
        orderNumber: 'ORD-2025-00261',
        channel: OrderChannel.WHOLESALE,
        status: OrderStatus.CONFIRMED,
        customer: {
            id: 'cust-004', name: 'TechDistrib S.A. de C.V.',
            email: 'compras@techdistrib.com.mx', phone: '+52 55 8000 1200',
        },
        items: [
            {
                id: 'item-007', orderId: 'ord-004', productId: 'prod-005',
                quantity: 10, unitPriceCents: 8910, discountCents: 8910, taxCents: 14256, subtotalCents: 103446,
            },
            {
                id: 'item-008', orderId: 'ord-004', productId: 'prod-009',
                quantity: 15, unitPriceCents: 13410, discountCents: 0, taxCents: 32184, subtotalCents: 233334,
            },
        ],
        subtotalCents: 210510, discountCents: 8910, taxCents: 46440, shippingCents: 0, totalCents: 248040,
        paymentMethod: PaymentMethod.CREDIT_LINE, isPaid: false,
        createdAt: '2025-06-10T14:00:00Z', updatedAt: '2025-06-10T14:30:00Z',
        createdBy: 'user-op-001', updatedBy: 'user-op-001',
    },
];

// ---------------------------------------------------------------------------
// SERVICIO
// ---------------------------------------------------------------------------

@Injectable({ providedIn: 'root' })
export class SalesService {

    // ── Dependencias ────────────────────────────────────────────────────────
    readonly #inventory = inject(InventoryService);

    // ── Estado privado ──────────────────────────────────────────────────────

    /** Signal raíz: todos los pedidos de venta */
    private readonly _orders = signal<Order[]>(MOCK_ORDERS);

    /** Signal raíz: sugerencias de cross-selling indexadas por productId */
    private readonly _crossSelling = signal<CrossSellingSuggestion[]>(MOCK_CROSS_SELLING);

    // ── API pública de lectura ──────────────────────────────────────────────

    readonly orders = this._orders.asReadonly();
    readonly crossSelling = this._crossSelling.asReadonly();

    // ── Signals computados ──────────────────────────────────────────────────

    /** Pedidos activos (no cancelados ni reembolsados) */
    readonly activeOrders = computed<Order[]>(() =>
        this._orders().filter(
            (o) => o.status !== OrderStatus.CANCELLED && o.status !== OrderStatus.REFUNDED
        )
    );

    /** Pedidos pendientes de procesamiento */
    readonly pendingOrders = computed<Order[]>(() =>
        this._orders().filter(
            (o) => o.status === OrderStatus.PENDING || o.status === OrderStatus.CONFIRMED
        )
    );

    /** Métricas de ventas para dashboard */
    readonly salesSummary = computed(() => {
        const all = this._orders();
        const paid = all.filter((o) => o.isPaid);
        return {
            totalOrders: all.length,
            paidOrders: paid.length,
            pendingPayment: all.filter((o) => !o.isPaid && o.status !== OrderStatus.CANCELLED).length,
            totalRevenueCents: paid.reduce((sum, o) => sum + o.totalCents, 0),
            averageOrderCents: paid.length > 0
                ? Math.round(paid.reduce((sum, o) => sum + o.totalCents, 0) / paid.length)
                : 0,
            byChannel: {
                ecommerce: all.filter((o) => o.channel === OrderChannel.ECOMMERCE).length,
                pos: all.filter((o) => o.channel === OrderChannel.POS).length,
                wholesale: all.filter((o) => o.channel === OrderChannel.WHOLESALE).length,
            },
        };
    });

    // ── Métodos de escritura ────────────────────────────────────────────────

    /**
     * Registra un nuevo pedido de venta y descuenta el stock en InventoryService.
     *
     * Valida disponibilidad antes de confirmar la orden.
     * @returns La orden creada, o null si algún item no tiene stock suficiente.
     *
     * @future Reemplazar con: this.http.post<Order>('/api/orders', payload)
     *         El backend se encargará de la transacción atómica de stock.
     */
    placeOrder(dto: CreateOrderDto): Order | null {
        // 1. Validar stock para todos los items antes de crear la orden
        for (const item of dto.items) {
            const product = this.#inventory.getProductById(item.productId);
            if (!product) {
                console.error(`[Sales] Producto ${item.productId} no encontrado en inventario.`);
                return null;
            }
            if (product.stockCurrent < item.quantity) {
                console.warn(`[Sales] Stock insuficiente para "${product.name}". Disponible: ${product.stockCurrent}, requerido: ${item.quantity}`);
                return null;
            }
        }

        const orderId = crypto.randomUUID();
        const now = new Date().toISOString();
        const orderNumber = `ORD-${new Date().getFullYear()}-${String(this._orders().length + 1).padStart(5, '0')}`;

        // 2. Construir items con precios reales del catálogo
        const orderItems: OrderItem[] = dto.items.map((item) => {
            const product = this.#inventory.getProductById(item.productId)!;
            const unitPrice = product.priceCents;
            const taxCents = Math.round(unitPrice * item.quantity * 0.16); // IVA 16%
            const subtotal = unitPrice * item.quantity + taxCents;

            return {
                id: crypto.randomUUID(),
                orderId,
                productId: item.productId,
                quantity: item.quantity,
                unitPriceCents: unitPrice,
                discountCents: 0,
                taxCents,
                subtotalCents: subtotal,
            };
        });

        // 3. Calcular totales
        const subtotal = orderItems.reduce((s, i) => s + i.unitPriceCents * i.quantity, 0);
        const taxes = orderItems.reduce((s, i) => s + i.taxCents, 0);
        const total = subtotal + taxes;

        // 4. Construir la orden
        const newOrder: Order = {
            id: orderId,
            orderNumber,
            channel: dto.channel,
            status: OrderStatus.CONFIRMED,
            customer: dto.customer,
            items: orderItems,
            subtotalCents: subtotal,
            discountCents: 0,
            taxCents: taxes,
            shippingCents: 0,
            totalCents: total,
            paymentMethod: dto.paymentMethod,
            isPaid: dto.paymentMethod === PaymentMethod.CASH
                || dto.paymentMethod === PaymentMethod.DEBIT_CARD,
            notes: dto.notes,
            createdAt: now,
            updatedAt: now,
            createdBy: 'user-current',
            updatedBy: 'user-current',
        };

        // 5. Persistir la orden en el signal
        this._orders.update((prev) => [...prev, newOrder]);

        // 6. Decrementar stock en InventoryService (interconexión de servicios)
        for (const item of dto.items) {
            this.#inventory.decreaseStock(item.productId, item.quantity, orderId);
        }

        console.info(`[Sales] ✅ Orden ${orderNumber} registrada. Total: $${(total / 100).toFixed(2)}`);
        return newOrder;
    }

    /**
     * Actualiza el estado de un pedido existente.
     * @future Reemplazar con: this.http.patch<Order>(`/api/orders/${orderId}`, { status })
     */
    updateOrderStatus(orderId: UUID, newStatus: OrderStatus): void {
        this._orders.update((prev) =>
            prev.map((o) =>
                o.id === orderId
                    ? { ...o, status: newStatus, updatedAt: new Date().toISOString() }
                    : o
            )
        );
    }

    /**
     * Cancela un pedido y, si estaba confirmado, devuelve el stock al inventario.
     * @future Reemplazar con: this.http.post(`/api/orders/${orderId}/cancel`, {})
     */
    cancelOrder(orderId: UUID, reason: string): void {
        const order = this._orders().find((o) => o.id === orderId);
        if (!order) return;

        // Si la orden ya había descontado stock, devolverlo
        if (
            order.status === OrderStatus.CONFIRMED ||
            order.status === OrderStatus.PROCESSING
        ) {
            for (const item of order.items) {
                this.#inventory.increaseStock(item.productId, item.quantity, orderId);
            }
        }

        this.updateOrderStatus(orderId, OrderStatus.CANCELLED);
        console.info(`[Sales] Orden ${order.orderNumber} cancelada. Motivo: ${reason}`);
    }

    // ── Cross-selling ───────────────────────────────────────────────────────

    /**
     * Obtiene las sugerencias de cross-selling para un producto dado.
     * Devuelve los productos sugeridos ordenados por score de afinidad descendente.
     *
     * @future Reemplazar con: this.http.get<CrossSellingSuggestion>(`/api/cross-sell/${productId}`)
     */
    getCrossSellingFor(productId: UUID): CrossSellingSuggestion | undefined {
        return this._crossSelling().find((s) => s.sourceProductId === productId);
    }

    /**
     * Actualiza o inserta sugerencias de cross-selling para un producto.
     * (En producción, esto vendría del motor ML del backend).
     */
    upsertCrossSellingRule(suggestion: CrossSellingSuggestion): void {
        this._crossSelling.update((prev) => {
            const exists = prev.findIndex((s) => s.sourceProductId === suggestion.sourceProductId);
            if (exists >= 0) {
                const updated = [...prev];
                updated[exists] = suggestion;
                return updated;
            }
            return [...prev, suggestion];
        });
    }
}