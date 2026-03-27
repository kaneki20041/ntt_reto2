// =============================================================================
// MINERVA ECOSYSTEM — Core Data Models
// Arquitectura de datos para E-commerce, POS e Inventario
// Versión: 1.0.0 | Angular 21 | TypeScript Strict Mode
// =============================================================================

// ---------------------------------------------------------------------------
// TIPOS UTILITARIOS
// ---------------------------------------------------------------------------

/** Identificador único universal en formato string UUID v4 */
export type UUID = string;

/** Timestamp ISO 8601 */
export type ISODateString = string;

/** Precio monetario en centavos (evita errores de punto flotante) */
export type Cents = number;

// ---------------------------------------------------------------------------
// ENUMS DE DOMINIO
// ---------------------------------------------------------------------------

export enum ProductStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    DRAFT = 'DRAFT',
    ARCHIVED = 'ARCHIVED',
}

export enum StockAlertLevel {
    OK = 'OK',       // stock > mínimo
    WARNING = 'WARNING',  // stock <= mínimo * 1.5
    CRITICAL = 'CRITICAL', // stock <= mínimo
    OUT = 'OUT',      // stock === 0
}

export enum OrderStatus {
    PENDING = 'PENDING',
    CONFIRMED = 'CONFIRMED',
    PROCESSING = 'PROCESSING',
    SHIPPED = 'SHIPPED',
    DELIVERED = 'DELIVERED',
    CANCELLED = 'CANCELLED',
    REFUNDED = 'REFUNDED',
}

export enum OrderChannel {
    ECOMMERCE = 'ECOMMERCE',
    POS = 'POS',
    WHOLESALE = 'WHOLESALE',
    API = 'API',
}

export enum PurchaseOrderStatus {
    DRAFT = 'DRAFT',
    SENT = 'SENT',
    CONFIRMED = 'CONFIRMED',
    PARTIAL = 'PARTIAL',   // entrega parcial
    RECEIVED = 'RECEIVED',
    CANCELLED = 'CANCELLED',
}

export enum PaymentMethod {
    CASH = 'CASH',
    CREDIT_CARD = 'CREDIT_CARD',
    DEBIT_CARD = 'DEBIT_CARD',
    BANK_TRANSFER = 'BANK_TRANSFER',
    DIGITAL_WALLET = 'DIGITAL_WALLET',
    CREDIT_LINE = 'CREDIT_LINE',
}

export enum SupplierStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    BLOCKED = 'BLOCKED',
    PENDING = 'PENDING_APPROVAL',
}

// ---------------------------------------------------------------------------
// INTERFACES DE SOPORTE
// ---------------------------------------------------------------------------

/** Metadatos de auditoría presentes en todas las entidades persistidas */
export interface AuditFields {
    readonly createdAt: ISODateString;
    readonly updatedAt: ISODateString;
    readonly createdBy: UUID;
    readonly updatedBy: UUID;
}

/** Dirección postal */
export interface Address {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    reference?: string;
}

/** Información de contacto */
export interface ContactInfo {
    email: string;
    phone: string;
    website?: string;
}

/** Rango de fechas genérico */
export interface DateRange {
    from: ISODateString;
    to: ISODateString;
}

/** Resultado paginado para listas del backend */
export interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

// ---------------------------------------------------------------------------
// MÓDULO 1: INVENTARIO Y ALMACENES
// ---------------------------------------------------------------------------

/** Categoría de producto con soporte para jerarquía */
export interface ProductCategory {
    id: UUID;
    name: string;
    slug: string;
    parentId: UUID | null;
}

/** Dimensiones físicas del producto */
export interface ProductDimensions {
    weightKg: number;
    lengthCm: number;
    widthCm: number;
    heightCm: number;
}

/** Registro histórico de movimiento de stock */
export interface StockMovement {
    id: UUID;
    productId: UUID;
    type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER' | 'RETURN';
    quantity: number;
    reason: string;
    referenceId: UUID | null; // ID de orden de venta o compra relacionada
    timestamp: ISODateString;
    performedBy: UUID;
}

/**
 * Entidad principal del catálogo de productos.
 * Cada campo está diseñado para mapear 1:1 con respuestas reales de un API REST.
 */
export interface Product extends AuditFields {
    readonly id: UUID;
    sku: string;
    barcode?: string;
    name: string;
    description: string;
    categoryId: UUID;
    category?: ProductCategory; // eager-loaded en consultas de detalle

    /** Precio de venta al público en centavos */
    priceCents: Cents;
    /** Precio de costo en centavos */
    costCents: Cents;

    stockCurrent: number;
    stockMinimum: number; // Stock de seguridad — umbral para alertas críticas
    stockMaximum: number; // Para calcular cantidad óptima de recompra

    /** ID del proveedor predeterminado para este producto */
    defaultSupplierId: UUID | null;

    status: ProductStatus;
    alertLevel: StockAlertLevel; // calculado en backend, validado en frontend
    tags: string[];
    imageUrls: string[];
    dimensions?: ProductDimensions;

    /** Metadatos para cross-selling (IDs relacionados desde el backend ML) */
    relatedProductIds: UUID[];
}

// ---------------------------------------------------------------------------
// MÓDULO 2: VENTAS Y PEDIDOS
// ---------------------------------------------------------------------------

/** Línea de producto dentro de un pedido */
export interface OrderItem {
    id: UUID;
    orderId: UUID;
    productId: UUID;
    product?: Pick<Product, 'id' | 'sku' | 'name' | 'imageUrls'>; // snapshot en el momento de compra
    quantity: number;
    unitPriceCents: Cents; // precio histórico al momento de la venta
    discountCents: Cents;
    taxCents: Cents;
    subtotalCents: Cents; // (unitPrice * qty) - discount + tax
}

/** Información del cliente asociado al pedido */
export interface CustomerSnapshot {
    id: UUID;
    name: string;
    email: string;
    phone?: string;
    address?: Address;
}

/**
 * Pedido de venta (aplica para e-commerce y POS).
 * Diseñado para soportar múltiples canales.
 */
export interface Order extends AuditFields {
    readonly id: UUID;
    orderNumber: string; // ej. "ORD-2025-00247"
    channel: OrderChannel;
    status: OrderStatus;
    customer: CustomerSnapshot;
    items: OrderItem[];

    subtotalCents: Cents;
    discountCents: Cents;
    taxCents: Cents;
    shippingCents: Cents;
    totalCents: Cents;

    paymentMethod: PaymentMethod;
    paymentReference?: string; // número de transacción externa
    isPaid: boolean;
    paidAt?: ISODateString;

    shippingAddress?: Address;
    estimatedDelivery?: ISODateString;
    notes?: string;
}

/**
 * Sugerencia de cross-selling calculada (simula respuesta de un motor de recomendación).
 * Permite que la UI muestre "También te puede interesar" de forma reactiva.
 */
export interface CrossSellingSuggestion {
    /** Producto disparador de la sugerencia */
    sourceProductId: UUID;
    /** Productos recomendados en orden de relevancia */
    suggestedProductIds: UUID[];
    /** Score de afinidad 0-1 por producto sugerido */
    affinityScores: Record<UUID, number>;
    /** Fuente del algoritmo que generó la sugerencia */
    algorithmSource: 'COLLABORATIVE' | 'CONTENT_BASED' | 'MANUAL' | 'HYBRID';
    generatedAt: ISODateString;
}

// ---------------------------------------------------------------------------
// MÓDULO 3: COMPRAS Y PROVEEDORES
// ---------------------------------------------------------------------------

/** Historial de fiabilidad de un proveedor por período */
export interface SupplierReliabilityRecord {
    period: DateRange;
    totalOrdersPlaced: number;
    ordersOnTime: number;
    ordersWithDefects: number;
    averageLeadTimeDays: number;
    reliabilityScore: number; // 0-100
}

/**
 * Proveedor con métricas de desempeño para el motor de selección automática.
 */
export interface Supplier extends AuditFields {
    readonly id: UUID;
    code: string; // ej. "PROV-001"
    name: string;
    legalName: string;
    taxId: string;
    status: SupplierStatus;
    contact: ContactInfo;
    address: Address;

    /** Calificación global de 1 a 5 estrellas */
    rating: number;
    /** Tiempo de entrega promedio en días hábiles */
    averageLeadTimeDays: number;
    /** Monto mínimo de pedido en centavos */
    minimumOrderCents: Cents;
    /** Productos que este proveedor puede proveer */
    suppliedProductIds: UUID[];
    /** Historial de fiabilidad por período (últimos N períodos) */
    reliabilityHistory: SupplierReliabilityRecord[];
    paymentTermsDays: number; // días de crédito
    notes?: string;
}

/** Línea de producto dentro de una orden de compra */
export interface PurchaseOrderItem {
    id: UUID;
    purchaseOrderId: UUID;
    productId: UUID;
    product?: Pick<Product, 'id' | 'sku' | 'name'>;
    quantityOrdered: number;
    quantityReceived: number;
    unitCostCents: Cents;
    subtotalCents: Cents;
    expectedDelivery: ISODateString;
}

/**
 * Orden de compra emitida a un proveedor.
 * Generada automáticamente por alertas de stock crítico o manualmente.
 */
export interface PurchaseOrder extends AuditFields {
    readonly id: UUID;
    orderNumber: string; // ej. "PO-2025-00089"
    supplierId: UUID;
    supplier?: Pick<Supplier, 'id' | 'name' | 'code' | 'averageLeadTimeDays'>;
    status: PurchaseOrderStatus;
    items: PurchaseOrderItem[];

    subtotalCents: Cents;
    taxCents: Cents;
    totalCents: Cents;

    /** Fecha esperada de recepción total */
    expectedDeliveryDate: ISODateString;
    /** Indica si fue generada automáticamente por alerta de stock */
    isAutoGenerated: boolean;
    /** ID del producto que disparó la generación automática (si aplica) */
    triggeredByProductId?: UUID;
    notes?: string;
}

/**
 * Payload de alerta de stock crítico.
 * Se propaga entre servicios para desencadenar acciones automáticas.
 */
export interface StockCriticalAlert {
    productId: UUID;
    productName: string;
    productSku: string;
    stockCurrent: number;
    stockMinimum: number;
    stockMaximum: number;
    alertLevel: StockAlertLevel.CRITICAL | StockAlertLevel.OUT;
    detectedAt: ISODateString;
}

/**
 * Resultado de la sugerencia de proveedor óptimo.
 * Devuelto por el motor de selección del SupplierService.
 */
export interface OptimalSupplierSuggestion {
    alert: StockCriticalAlert;
    suggestedSupplier: Supplier;
    score: number; // puntuación compuesta 0-100
    scoreBreakdown: {
        ratingWeight: number;
        leadTimeWeight: number;
        reliabilityWeight: number;
    };
    suggestedQuantity: number; // hasta stockMaximum
    estimatedCostCents: Cents;
    generatedAt: ISODateString;
}