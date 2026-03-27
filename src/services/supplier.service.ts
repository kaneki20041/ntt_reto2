import { Injectable, signal, computed, inject, effect } from '@angular/core';
import {
    Supplier,
    PurchaseOrder,
    PurchaseOrderItem,
    PurchaseOrderStatus,
    SupplierStatus,
    StockCriticalAlert,
    OptimalSupplierSuggestion,
    UUID,
} from '../models/nnt.models';
import { InventoryService } from './inventory.service';

// ---------------------------------------------------------------------------
// CONFIGURACIÓN DEL MOTOR DE SELECCIÓN
// Pesos para el score compuesto de proveedor óptimo (deben sumar 1.0)
// ---------------------------------------------------------------------------

const SUPPLIER_SCORE_WEIGHTS = {
    rating: 0.40, // calificación general del proveedor
    leadTime: 0.35, // velocidad de entrega (inverso normalizado)
    reliability: 0.25, // historial de fiabilidad reciente
} as const;

// ---------------------------------------------------------------------------
// DATOS MOCK — Proveedores
// ---------------------------------------------------------------------------

const MOCK_SUPPLIERS: Supplier[] = [
    {
        id: 'sup-001',
        code: 'PROV-001',
        name: 'TechGlobal Import S.A.',
        legalName: 'TechGlobal Import Sociedad Anónima de C.V.',
        taxId: 'TGI840512MX3',
        status: SupplierStatus.ACTIVE,
        contact: {
            email: 'ventas@techglobal.com.mx',
            phone: '+52 55 4000 7800',
            website: 'https://techglobal.com.mx',
        },
        address: {
            street: 'Blvd. Manuel Ávila Camacho 2000, Piso 12',
            city: 'Ciudad de México',
            state: 'CDMX',
            country: 'MX',
            postalCode: '11000',
        },
        rating: 4.7,
        averageLeadTimeDays: 5,
        minimumOrderCents: 500000,
        suppliedProductIds: ['prod-001', 'prod-003', 'prod-008'],
        paymentTermsDays: 30,
        reliabilityHistory: [
            {
                period: { from: '2025-01-01T00:00:00Z', to: '2025-03-31T23:59:59Z' },
                totalOrdersPlaced: 12, ordersOnTime: 11, ordersWithDefects: 0,
                averageLeadTimeDays: 4.8, reliabilityScore: 96,
            },
            {
                period: { from: '2024-10-01T00:00:00Z', to: '2024-12-31T23:59:59Z' },
                totalOrdersPlaced: 15, ordersOnTime: 14, ordersWithDefects: 1,
                averageLeadTimeDays: 5.2, reliabilityScore: 92,
            },
        ],
        notes: 'Proveedor preferido para marcas Sony, Bose y Dell. Canal exclusivo para Latinoamérica.',
        createdAt: '2023-03-10T08:00:00Z', updatedAt: '2025-05-01T10:00:00Z',
        createdBy: 'user-admin-001', updatedBy: 'user-admin-001',
    },
    {
        id: 'sup-002',
        code: 'PROV-002',
        name: 'Logitech Distribuciones MX',
        legalName: 'Logitech Distribuciones México S. de R.L.',
        taxId: 'LDM910215MX7',
        status: SupplierStatus.ACTIVE,
        contact: {
            email: 'orders@logitech-mx.com',
            phone: '+52 81 3300 9900',
            website: 'https://logitech-mx.com',
        },
        address: {
            street: 'Av. del Estado 1550, Parque Industrial Apodaca',
            city: 'Apodaca',
            state: 'Nuevo León',
            country: 'MX',
            postalCode: '66600',
        },
        rating: 4.9,
        averageLeadTimeDays: 3,
        minimumOrderCents: 250000,
        suppliedProductIds: ['prod-002', 'prod-004', 'prod-005', 'prod-007'],
        paymentTermsDays: 45,
        reliabilityHistory: [
            {
                period: { from: '2025-01-01T00:00:00Z', to: '2025-03-31T23:59:59Z' },
                totalOrdersPlaced: 20, ordersOnTime: 20, ordersWithDefects: 0,
                averageLeadTimeDays: 2.9, reliabilityScore: 100,
            },
            {
                period: { from: '2024-10-01T00:00:00Z', to: '2024-12-31T23:59:59Z' },
                totalOrdersPlaced: 18, ordersOnTime: 17, ordersWithDefects: 0,
                averageLeadTimeDays: 3.1, reliabilityScore: 98,
            },
        ],
        notes: 'Distribuidor oficial Logitech, LG y monitor de accesorios de cómputo. SLA garantizado 3 días.',
        createdAt: '2023-06-01T08:00:00Z', updatedAt: '2025-06-01T08:00:00Z',
        createdBy: 'user-admin-001', updatedBy: 'user-admin-001',
    },
    {
        id: 'sup-003',
        code: 'PROV-003',
        name: 'Periféricos y Redes del Norte S.A.',
        legalName: 'Periféricos y Redes del Norte S.A. de C.V.',
        taxId: 'PRN780320MX1',
        status: SupplierStatus.ACTIVE,
        contact: {
            email: 'compras@prn.mx',
            phone: '+52 656 200 3300',
        },
        address: {
            street: 'Av. Tecnológico 880, Fracc. Industrial',
            city: 'Ciudad Juárez',
            state: 'Chihuahua',
            country: 'MX',
            postalCode: '32470',
        },
        rating: 3.8,
        averageLeadTimeDays: 8,
        minimumOrderCents: 150000,
        suppliedProductIds: ['prod-006', 'prod-009', 'prod-010'],
        paymentTermsDays: 15,
        reliabilityHistory: [
            {
                period: { from: '2025-01-01T00:00:00Z', to: '2025-03-31T23:59:59Z' },
                totalOrdersPlaced: 8, ordersOnTime: 6, ordersWithDefects: 1,
                averageLeadTimeDays: 8.5, reliabilityScore: 75,
            },
            {
                period: { from: '2024-10-01T00:00:00Z', to: '2024-12-31T23:59:59Z' },
                totalOrdersPlaced: 10, ordersOnTime: 8, ordersWithDefects: 2,
                averageLeadTimeDays: 9.0, reliabilityScore: 70,
            },
        ],
        notes: 'Proveedor de respaldo para CalDigit, Samsung almacenamiento y ASUS networking. En evaluación para mejora.',
        createdAt: '2023-09-15T10:00:00Z', updatedAt: '2025-04-01T11:00:00Z',
        createdBy: 'user-admin-001', updatedBy: 'user-op-001',
    },
    {
        id: 'sup-004',
        code: 'PROV-004',
        name: 'AudioPro Supply Chain MX',
        legalName: 'AudioPro Supply Chain México S.A.',
        taxId: 'ASC011120MX9',
        status: SupplierStatus.ACTIVE,
        contact: {
            email: 'ventas@audiopro.mx',
            phone: '+52 33 9000 1100',
            website: 'https://audiopro.mx',
        },
        address: {
            street: 'Periférico Sur 5678, Col. Miramar',
            city: 'Guadalajara',
            state: 'Jalisco',
            country: 'MX',
            postalCode: '44840',
        },
        rating: 4.3,
        averageLeadTimeDays: 6,
        minimumOrderCents: 300000,
        suppliedProductIds: ['prod-003', 'prod-008', 'prod-001'],
        paymentTermsDays: 30,
        reliabilityHistory: [
            {
                period: { from: '2025-01-01T00:00:00Z', to: '2025-03-31T23:59:59Z' },
                totalOrdersPlaced: 9, ordersOnTime: 8, ordersWithDefects: 0,
                averageLeadTimeDays: 5.8, reliabilityScore: 89,
            },
            {
                period: { from: '2024-10-01T00:00:00Z', to: '2024-12-31T23:59:59Z' },
                totalOrdersPlaced: 11, ordersOnTime: 9, ordersWithDefects: 1,
                averageLeadTimeDays: 6.2, reliabilityScore: 83,
            },
        ],
        notes: 'Especialistas en línea de audio/video Bose y Sony. Alternativa competitiva para prod-003 y prod-008.',
        createdAt: '2024-01-10T09:00:00Z', updatedAt: '2025-05-10T12:00:00Z',
        createdBy: 'user-admin-001', updatedBy: 'user-op-002',
    },
];

// ---------------------------------------------------------------------------
// DATOS MOCK — Órdenes de compra previas
// ---------------------------------------------------------------------------

const MOCK_PURCHASE_ORDERS: PurchaseOrder[] = [
    {
        id: 'po-001',
        orderNumber: 'PO-2025-00085',
        supplierId: 'sup-001',
        status: PurchaseOrderStatus.RECEIVED,
        items: [
            {
                id: 'poi-001', purchaseOrderId: 'po-001', productId: 'prod-001',
                quantityOrdered: 10, quantityReceived: 10,
                unitCostCents: 142000, subtotalCents: 1420000,
                expectedDelivery: '2025-05-20T00:00:00Z',
            },
            {
                id: 'poi-002', purchaseOrderId: 'po-001', productId: 'prod-003',
                quantityOrdered: 15, quantityReceived: 15,
                unitCostCents: 24500, subtotalCents: 367500,
                expectedDelivery: '2025-05-20T00:00:00Z',
            },
        ],
        subtotalCents: 1787500, taxCents: 286000, totalCents: 2073500,
        expectedDeliveryDate: '2025-05-20T00:00:00Z',
        isAutoGenerated: false,
        notes: 'Reposición trimestral programada.',
        createdAt: '2025-05-13T09:00:00Z', updatedAt: '2025-05-20T15:00:00Z',
        createdBy: 'user-op-001', updatedBy: 'user-op-001',
    },
    {
        id: 'po-002',
        orderNumber: 'PO-2025-00089',
        supplierId: 'sup-002',
        status: PurchaseOrderStatus.CONFIRMED,
        items: [
            {
                id: 'poi-003', purchaseOrderId: 'po-002', productId: 'prod-004',
                quantityOrdered: 30, quantityReceived: 0,
                unitCostCents: 7800, subtotalCents: 234000,
                expectedDelivery: '2025-06-18T00:00:00Z',
            },
            {
                id: 'poi-004', purchaseOrderId: 'po-002', productId: 'prod-005',
                quantityOrdered: 25, quantityReceived: 0,
                unitCostCents: 6500, subtotalCents: 162500,
                expectedDelivery: '2025-06-18T00:00:00Z',
            },
        ],
        subtotalCents: 396500, taxCents: 63440, totalCents: 459940,
        expectedDeliveryDate: '2025-06-18T00:00:00Z',
        isAutoGenerated: true,
        triggeredByProductId: 'prod-004',
        notes: 'Generada automáticamente por alerta de stock crítico en teclado MX Keys.',
        createdAt: '2025-06-11T08:30:00Z', updatedAt: '2025-06-11T10:00:00Z',
        createdBy: 'system-auto', updatedBy: 'user-admin-001',
    },
];

// ---------------------------------------------------------------------------
// SERVICIO
// ---------------------------------------------------------------------------

@Injectable({ providedIn: 'root' })
export class SupplierService {

    // ── Dependencias ────────────────────────────────────────────────────────
    readonly #inventory = inject(InventoryService);

    // ── Estado privado ──────────────────────────────────────────────────────

    private readonly _suppliers = signal<Supplier[]>(MOCK_SUPPLIERS);
    private readonly _purchaseOrders = signal<PurchaseOrder[]>(MOCK_PURCHASE_ORDERS);

    /** Buffer de sugerencias pendientes de revisión/confirmación */
    private readonly _pendingSuggestions = signal<OptimalSupplierSuggestion[]>([]);

    // ── API pública de lectura ──────────────────────────────────────────────

    readonly suppliers = this._suppliers.asReadonly();
    readonly purchaseOrders = this._purchaseOrders.asReadonly();
    readonly pendingSuggestions = this._pendingSuggestions.asReadonly();

    // ── Signals computados ──────────────────────────────────────────────────

    /** Solo proveedores activos, ordenados por rating descendente */
    readonly activeSuppliers = computed<Supplier[]>(() =>
        this._suppliers()
            .filter((s) => s.status === SupplierStatus.ACTIVE)
            .sort((a, b) => b.rating - a.rating)
    );

    /** Órdenes de compra abiertas (no recibidas ni canceladas) */
    readonly openPurchaseOrders = computed<PurchaseOrder[]>(() =>
        this._purchaseOrders().filter(
            (po) =>
                po.status !== PurchaseOrderStatus.RECEIVED &&
                po.status !== PurchaseOrderStatus.CANCELLED
        )
    );

    /** Métricas de compras para dashboard */
    readonly purchasingSummary = computed(() => {
        const all = this._purchaseOrders();
        return {
            totalOrders: all.length,
            openOrders: this.openPurchaseOrders().length,
            totalInvestment: all
                .filter((po) => po.status === PurchaseOrderStatus.RECEIVED)
                .reduce((s, po) => s + po.totalCents, 0),
            autoGenerated: all.filter((po) => po.isAutoGenerated).length,
            pendingAlerts: this._pendingSuggestions().length,
        };
    });

    // ── Efecto reactivo: escucha alertas críticas del inventario ─────────────

    constructor() {
        /**
         * Efecto que se dispara automáticamente cuando cambian las alertas críticas.
         * Genera sugerencias de proveedor óptimo para cada alerta nueva
         * que aún no tenga una orden de compra abierta asociada.
         */
        effect(() => {
            const alerts = this.#inventory.criticalAlerts();
            if (alerts.length === 0) return;

            const openPOs = this.openPurchaseOrders();
            const existingProductsInOpenPOs = new Set(
                openPOs.flatMap((po) => po.items.map((i) => i.productId))
            );

            const newAlerts = alerts.filter(
                (a) => !existingProductsInOpenPOs.has(a.productId)
            );

            if (newAlerts.length === 0) return;

            // Generar sugerencias automáticas para alertas no cubiertas
            const suggestions: OptimalSupplierSuggestion[] = newAlerts
                .map((alert) => this.#computeOptimalSupplier(alert))
                .filter((s): s is OptimalSupplierSuggestion => s !== null);

            if (suggestions.length > 0) {
                // Evitar duplicar sugerencias ya existentes en el buffer
                this._pendingSuggestions.update((prev) => {
                    const existingProductIds = new Set(prev.map((s) => s.alert.productId));
                    const fresh = suggestions.filter(
                        (s) => !existingProductIds.has(s.alert.productId)
                    );
                    return [...prev, ...fresh];
                });

                console.info(
                    `[Minerva·Supplier] 🤖 ${suggestions.length} sugerencia(s) de recompra generadas automáticamente.`
                );
            }
        });
    }

    // ── Métodos públicos ────────────────────────────────────────────────────

    /**
     * Recibe una alerta de stock crítico y calcula el proveedor óptimo.
     * Expuesto como método público para uso manual desde la UI.
     *
     * @returns La sugerencia con el proveedor recomendado y score detallado, o null.
     * @future Reemplazar con: this.http.post<OptimalSupplierSuggestion>('/api/suppliers/suggest', alert)
     */
    suggestOptimalSupplier(alert: StockCriticalAlert): OptimalSupplierSuggestion | null {
        return this.#computeOptimalSupplier(alert);
    }

    /**
     * Genera y registra una Orden de Compra a partir de una sugerencia aprobada.
     * Elimina la sugerencia del buffer de pendientes.
     *
     * @future Reemplazar con: this.http.post<PurchaseOrder>('/api/purchase-orders', payload)
     */
    generatePurchaseOrder(suggestion: OptimalSupplierSuggestion): PurchaseOrder {
        const now = new Date();
        const poId = crypto.randomUUID();
        const orderNumber = `PO-${now.getFullYear()}-${String(this._purchaseOrders().length + 1).padStart(5, '0')}`;
        const deliveryDate = new Date(now);
        deliveryDate.setDate(deliveryDate.getDate() + suggestion.suggestedSupplier.averageLeadTimeDays);

        const product = this.#inventory.getProductById(suggestion.alert.productId);

        const item: PurchaseOrderItem = {
            id: crypto.randomUUID(),
            purchaseOrderId: poId,
            productId: suggestion.alert.productId,
            quantityOrdered: suggestion.suggestedQuantity,
            quantityReceived: 0,
            unitCostCents: product?.costCents ?? suggestion.estimatedCostCents / suggestion.suggestedQuantity,
            subtotalCents: suggestion.estimatedCostCents,
            expectedDelivery: deliveryDate.toISOString(),
        };

        const taxCents = Math.round(item.subtotalCents * 0.16);

        const newPO: PurchaseOrder = {
            id: poId,
            orderNumber,
            supplierId: suggestion.suggestedSupplier.id,
            status: PurchaseOrderStatus.DRAFT,
            items: [item],
            subtotalCents: item.subtotalCents,
            taxCents,
            totalCents: item.subtotalCents + taxCents,
            expectedDeliveryDate: deliveryDate.toISOString(),
            isAutoGenerated: true,
            triggeredByProductId: suggestion.alert.productId,
            notes: `Generada automáticamente. Alerta: ${suggestion.alert.alertLevel} en ${suggestion.alert.productSku}. Score proveedor: ${suggestion.score.toFixed(1)}/100`,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            createdBy: 'system-auto',
            updatedBy: 'system-auto',
        };

        this._purchaseOrders.update((prev) => [...prev, newPO]);

        // Remover del buffer de sugerencias pendientes
        this._pendingSuggestions.update((prev) =>
            prev.filter((s) => s.alert.productId !== suggestion.alert.productId)
        );

        console.info(
            `[Supplier] ✅ OC ${orderNumber} generada para proveedor "${suggestion.suggestedSupplier.name}".`
        );
        return newPO;
    }

    /**
     * Registra la recepción (total o parcial) de una orden de compra.
     * Actualiza el inventario y el estado de la OC.
     *
     * @future Reemplazar con: this.http.post(`/api/purchase-orders/${poId}/receive`, { items })
     */
    receivePurchaseOrder(
        poId: UUID,
        receivedItems: { productId: UUID; quantityReceived: number }[]
    ): void {
        let allReceived = true;

        this._purchaseOrders.update((prev) =>
            prev.map((po) => {
                if (po.id !== poId) return po;

                const updatedItems = po.items.map((item) => {
                    const received = receivedItems.find((r) => r.productId === item.productId);
                    if (!received) return item;

                    const newQtyReceived = item.quantityReceived + received.quantityReceived;
                    if (newQtyReceived < item.quantityOrdered) allReceived = false;

                    // Incrementar stock en inventario
                    this.#inventory.increaseStock(item.productId, received.quantityReceived, poId);

                    return { ...item, quantityReceived: newQtyReceived };
                });

                return {
                    ...po,
                    items: updatedItems,
                    status: allReceived ? PurchaseOrderStatus.RECEIVED : PurchaseOrderStatus.PARTIAL,
                    updatedAt: new Date().toISOString(),
                };
            })
        );
    }

    /**
     * Obtiene todos los proveedores capaces de suministrar un producto específico.
     * Ordenados por score compuesto descendente.
     */
    getSuppliersForProduct(productId: UUID): Supplier[] {
        return this.activeSuppliers().filter((s) =>
            s.suppliedProductIds.includes(productId)
        );
    }

    // ── Motor de selección privado ───────────────────────────────────────────

    /**
     * Calcula el proveedor óptimo para una alerta de stock dado.
     *
     * Score compuesto (0-100):
     * - Rating (40%):      normalizado de 1-5 → 0-100
     * - Lead time (35%):   inverso normalizado (menos días = mayor score)
     * - Reliability (25%): score del período más reciente
     */
    #computeOptimalSupplier(alert: StockCriticalAlert): OptimalSupplierSuggestion | null {
        const candidates = this.getSuppliersForProduct(alert.productId);

        if (candidates.length === 0) {
            console.warn(`[Supplier] Sin proveedores para producto ${alert.productSku}`);
            return null;
        }

        // Normalizar lead times para scoring relativo entre candidatos
        const leadTimes = candidates.map((s) => s.averageLeadTimeDays);
        const minLeadTime = Math.min(...leadTimes);
        const maxLeadTime = Math.max(...leadTimes);
        const leadTimeRange = maxLeadTime - minLeadTime || 1; // evitar división por cero

        const scoredCandidates = candidates.map((supplier) => {
            // 1. Rating normalizado (1-5 → 0-100)
            const ratingScore = ((supplier.rating - 1) / 4) * 100;

            // 2. Lead time score: menor tiempo = mayor score (0-100)
            const leadTimeScore = ((maxLeadTime - supplier.averageLeadTimeDays) / leadTimeRange) * 100;

            // 3. Reliability: promedio de los dos períodos más recientes
            const recentScores = supplier.reliabilityHistory
                .slice(0, 2)
                .map((h) => h.reliabilityScore);
            const reliabilityScore =
                recentScores.length > 0
                    ? recentScores.reduce((s, v) => s + v, 0) / recentScores.length
                    : 50; // valor neutro si no hay historial

            const totalScore =
                ratingScore * SUPPLIER_SCORE_WEIGHTS.rating +
                leadTimeScore * SUPPLIER_SCORE_WEIGHTS.leadTime +
                reliabilityScore * SUPPLIER_SCORE_WEIGHTS.reliability;

            return {
                supplier,
                score: Math.round(totalScore * 10) / 10,
                scoreBreakdown: {
                    ratingWeight: Math.round(ratingScore * SUPPLIER_SCORE_WEIGHTS.rating * 10) / 10,
                    leadTimeWeight: Math.round(leadTimeScore * SUPPLIER_SCORE_WEIGHTS.leadTime * 10) / 10,
                    reliabilityWeight: Math.round(reliabilityScore * SUPPLIER_SCORE_WEIGHTS.reliability * 10) / 10,
                },
            };
        });

        // Seleccionar el proveedor con mayor score
        const best = scoredCandidates.sort((a, b) => b.score - a.score)[0];

        // Calcular cantidad sugerida: reponer hasta stock máximo
        const suggestedQty = alert.stockMaximum - alert.stockCurrent;
        const product = this.#inventory.getProductById(alert.productId);
        const estimatedCost = (product?.costCents ?? 0) * suggestedQty;

        return {
            alert,
            suggestedSupplier: best.supplier,
            score: best.score,
            scoreBreakdown: best.scoreBreakdown,
            suggestedQuantity: suggestedQty,
            estimatedCostCents: estimatedCost,
            generatedAt: new Date().toISOString(),
        };
    }
}