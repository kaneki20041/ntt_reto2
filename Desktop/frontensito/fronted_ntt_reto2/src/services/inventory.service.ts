// =============================================================================
// MINERVA ECOSYSTEM — InventoryService
// Gestión de productos y almacenes con estado reactivo via Angular Signals
// =============================================================================

import { Injectable, signal, computed, effect } from '@angular/core';
import {
    Product,
    ProductCategory,
    StockMovement,
    StockAlertLevel,
    ProductStatus,
    StockCriticalAlert,
    UUID,
    Cents,
} from '../models/nnt.models';

// ---------------------------------------------------------------------------
// DATOS MOCK — Categorías
// ---------------------------------------------------------------------------

const MOCK_CATEGORIES: ProductCategory[] = [
    { id: 'cat-001', name: 'Electrónica', slug: 'electronica', parentId: null },
    { id: 'cat-002', name: 'Computadoras', slug: 'computadoras', parentId: 'cat-001' },
    { id: 'cat-003', name: 'Audio & Video', slug: 'audio-video', parentId: 'cat-001' },
    { id: 'cat-004', name: 'Periféricos', slug: 'perifericos', parentId: 'cat-001' },
    { id: 'cat-005', name: 'Electrodomésticos', slug: 'electrodomesticos', parentId: null },
    { id: 'cat-006', name: 'Línea Blanca', slug: 'linea-blanca', parentId: 'cat-005' },
    { id: 'cat-007', name: 'Redes & Conectividad', slug: 'redes', parentId: 'cat-001' },
];

// ---------------------------------------------------------------------------
// DATOS MOCK — Productos (8+ productos coherentes con proveedores)
// ---------------------------------------------------------------------------

const MOCK_PRODUCTS: Product[] = [
    {
        id: 'prod-001',
        sku: 'LAP-DELL-XPS15-001',
        barcode: '7501055300001',
        name: 'Laptop Dell XPS 15" Intel Core i7',
        description: 'Laptop profesional con pantalla OLED 4K, 16GB RAM DDR5, SSD NVMe 512GB. Ideal para trabajo creativo y desarrollo.',
        categoryId: 'cat-002',
        priceCents: 189900,  // $1,899.00
        costCents: 142000,
        stockCurrent: 3,
        stockMinimum: 5,    // ← CRÍTICO
        stockMaximum: 20,
        defaultSupplierId: 'sup-001',
        status: ProductStatus.ACTIVE,
        alertLevel: StockAlertLevel.CRITICAL,
        tags: ['laptop', 'dell', 'i7', 'premium'],
        imageUrls: ['https://picsum.photos/seed/dell-xps/400/300'],
        relatedProductIds: ['prod-004', 'prod-005', 'prod-007'],
        dimensions: { weightKg: 1.86, lengthCm: 34.4, widthCm: 23.0, heightCm: 1.8 },
        createdAt: '2024-01-15T08:00:00Z',
        updatedAt: '2025-06-10T14:22:00Z',
        createdBy: 'user-admin-001',
        updatedBy: 'user-admin-001',
    },
    {
        id: 'prod-002',
        sku: 'MON-LG-27UK850-002',
        barcode: '7501055300002',
        name: 'Monitor LG 27" 4K UHD USB-C',
        description: 'Monitor profesional IPS 4K 60Hz con soporte USB-C 60W, HDR400, sRGB 99%. Perfecto para diseñadores y editores.',
        categoryId: 'cat-004',
        priceCents: 64900,
        costCents: 47000,
        stockCurrent: 12,
        stockMinimum: 8,
        stockMaximum: 35,
        defaultSupplierId: 'sup-002',
        status: ProductStatus.ACTIVE,
        alertLevel: StockAlertLevel.OK,
        tags: ['monitor', 'lg', '4k', 'usb-c'],
        imageUrls: ['https://picsum.photos/seed/lg-monitor/400/300'],
        relatedProductIds: ['prod-001', 'prod-004', 'prod-006'],
        dimensions: { weightKg: 6.1, lengthCm: 61.4, widthCm: 20.8, heightCm: 46.3 },
        createdAt: '2024-01-20T09:00:00Z',
        updatedAt: '2025-06-08T10:00:00Z',
        createdBy: 'user-admin-001',
        updatedBy: 'user-op-003',
    },
    {
        id: 'prod-003',
        sku: 'AUD-SONY-WH1000XM5-003',
        barcode: '7501055300003',
        name: 'Auriculares Sony WH-1000XM5 ANC',
        description: 'Auriculares over-ear con cancelación de ruido líder en la industria, 30h de batería, carga rápida USB-C y LDAC Hi-Res.',
        categoryId: 'cat-003',
        priceCents: 34900,
        costCents: 24500,
        stockCurrent: 2,
        stockMinimum: 6,    // ← CRÍTICO
        stockMaximum: 25,
        defaultSupplierId: 'sup-001',
        status: ProductStatus.ACTIVE,
        alertLevel: StockAlertLevel.CRITICAL,
        tags: ['auriculares', 'sony', 'anc', 'bluetooth'],
        imageUrls: ['https://picsum.photos/seed/sony-wh/400/300'],
        relatedProductIds: ['prod-001', 'prod-008'],
        dimensions: { weightKg: 0.25, lengthCm: 17.5, widthCm: 7.0, heightCm: 19.5 },
        createdAt: '2024-02-01T10:00:00Z',
        updatedAt: '2025-06-09T16:30:00Z',
        createdBy: 'user-admin-001',
        updatedBy: 'user-op-002',
    },
    {
        id: 'prod-004',
        sku: 'KEY-LOG-MX-KEYS-004',
        barcode: '7501055300004',
        name: 'Teclado Logitech MX Keys Advanced',
        description: 'Teclado inalámbrico multi-dispositivo con retroiluminación adaptativa, conectividad Bluetooth y Logi Bolt. Layout español.',
        categoryId: 'cat-004',
        priceCents: 11900,
        costCents: 7800,
        stockCurrent: 9,
        stockMinimum: 10,   // ← CRÍTICO (stock <= mínimo)
        stockMaximum: 50,
        defaultSupplierId: 'sup-002',
        status: ProductStatus.ACTIVE,
        alertLevel: StockAlertLevel.CRITICAL,
        tags: ['teclado', 'logitech', 'mx-keys', 'inalámbrico'],
        imageUrls: ['https://picsum.photos/seed/logitech-mx/400/300'],
        relatedProductIds: ['prod-005', 'prod-002'],
        dimensions: { weightKg: 0.81, lengthCm: 43.1, widthCm: 13.2, heightCm: 2.06 },
        createdAt: '2024-02-10T11:00:00Z',
        updatedAt: '2025-06-11T09:15:00Z',
        createdBy: 'user-admin-001',
        updatedBy: 'user-admin-001',
    },
    {
        id: 'prod-005',
        sku: 'MSE-LOG-MX-MASTER3-005',
        barcode: '7501055300005',
        name: 'Mouse Logitech MX Master 3S',
        description: 'Mouse ergonómico avanzado con sensor Darkfield 8000 DPI, desplazamiento electromagnético silencioso y 70 días de batería.',
        categoryId: 'cat-004',
        priceCents: 9900,
        costCents: 6500,
        stockCurrent: 22,
        stockMinimum: 12,
        stockMaximum: 60,
        defaultSupplierId: 'sup-002',
        status: ProductStatus.ACTIVE,
        alertLevel: StockAlertLevel.OK,
        tags: ['mouse', 'logitech', 'mx-master', 'ergonómico'],
        imageUrls: ['https://picsum.photos/seed/logitech-mxm/400/300'],
        relatedProductIds: ['prod-004', 'prod-002'],
        dimensions: { weightKg: 0.141, lengthCm: 12.4, widthCm: 8.4, heightCm: 5.1 },
        createdAt: '2024-02-10T11:30:00Z',
        updatedAt: '2025-06-07T13:00:00Z',
        createdBy: 'user-admin-001',
        updatedBy: 'user-op-003',
    },
    {
        id: 'prod-006',
        sku: 'HUB-CALDIGIT-TS4-006',
        barcode: '7501055300006',
        name: 'Dock Thunderbolt 4 CalDigit TS4',
        description: 'Docking station Thunderbolt 4 con 98W de carga, 18 puertos incluidos, soporte dual 8K o 4 x 4K simultáneo.',
        categoryId: 'cat-007',
        priceCents: 39900,
        costCents: 29500,
        stockCurrent: 0,    // ← SIN STOCK
        stockMinimum: 4,
        stockMaximum: 15,
        defaultSupplierId: 'sup-003',
        status: ProductStatus.ACTIVE,
        alertLevel: StockAlertLevel.OUT,
        tags: ['dock', 'thunderbolt', 'caldigit', 'hub'],
        imageUrls: ['https://picsum.photos/seed/caldigit-ts4/400/300'],
        relatedProductIds: ['prod-001', 'prod-002', 'prod-004'],
        dimensions: { weightKg: 0.54, lengthCm: 16.8, widthCm: 6.6, heightCm: 3.8 },
        createdAt: '2024-03-05T10:00:00Z',
        updatedAt: '2025-06-12T08:00:00Z',
        createdBy: 'user-admin-001',
        updatedBy: 'user-admin-001',
    },
    {
        id: 'prod-007',
        sku: 'WEB-LOGITECH-BRIO4K-007',
        barcode: '7501055300007',
        name: 'Webcam Logitech Brio 4K Pro',
        description: 'Cámara web 4K con HDR, campo de visión ajustable 65/78/90°, compatible con Hello de Windows e infrarrojos.',
        categoryId: 'cat-004',
        priceCents: 19900,
        costCents: 13500,
        stockCurrent: 18,
        stockMinimum: 8,
        stockMaximum: 40,
        defaultSupplierId: 'sup-002',
        status: ProductStatus.ACTIVE,
        alertLevel: StockAlertLevel.OK,
        tags: ['webcam', 'logitech', '4k', 'streaming'],
        imageUrls: ['https://picsum.photos/seed/logi-brio/400/300'],
        relatedProductIds: ['prod-004', 'prod-003'],
        dimensions: { weightKg: 0.063, lengthCm: 10.2, widthCm: 3.5, heightCm: 3.2 },
        createdAt: '2024-03-20T12:00:00Z',
        updatedAt: '2025-06-01T11:20:00Z',
        createdBy: 'user-admin-001',
        updatedBy: 'user-op-002',
    },
    {
        id: 'prod-008',
        sku: 'SPK-BOSE-SB500-008',
        barcode: '7501055300008',
        name: 'Bocina Bose SoundLink Max Portátil',
        description: 'Altavoz Bluetooth portátil resistente al agua IPX4, sonido 360° con bajos profundos, 20h de batería y carga rápida.',
        categoryId: 'cat-003',
        priceCents: 39900,
        costCents: 28000,
        stockCurrent: 7,
        stockMinimum: 8,    // ← CRÍTICO
        stockMaximum: 30,
        defaultSupplierId: 'sup-001',
        status: ProductStatus.ACTIVE,
        alertLevel: StockAlertLevel.CRITICAL,
        tags: ['bocina', 'bose', 'bluetooth', 'portátil'],
        imageUrls: ['https://picsum.photos/seed/bose-soundlink/400/300'],
        relatedProductIds: ['prod-003'],
        dimensions: { weightKg: 0.92, lengthCm: 24.1, widthCm: 10.2, heightCm: 10.9 },
        createdAt: '2024-04-01T09:00:00Z',
        updatedAt: '2025-06-10T15:45:00Z',
        createdBy: 'user-admin-001',
        updatedBy: 'user-op-003',
    },
    {
        id: 'prod-009',
        sku: 'SSD-SAMSUNG-T7-009',
        barcode: '7501055300009',
        name: 'SSD Externo Samsung T7 2TB',
        description: 'Almacenamiento externo portátil USB 3.2 Gen2, velocidades de lectura 1050 MB/s, chasis aluminio con protección de contraseña AES 256.',
        categoryId: 'cat-002',
        priceCents: 14900,
        costCents: 10200,
        stockCurrent: 31,
        stockMinimum: 10,
        stockMaximum: 80,
        defaultSupplierId: 'sup-003',
        status: ProductStatus.ACTIVE,
        alertLevel: StockAlertLevel.OK,
        tags: ['ssd', 'samsung', 'externo', 'almacenamiento'],
        imageUrls: ['https://picsum.photos/seed/samsung-t7/400/300'],
        relatedProductIds: ['prod-001', 'prod-006'],
        dimensions: { weightKg: 0.098, lengthCm: 8.5, widthCm: 5.7, heightCm: 0.8 },
        createdAt: '2024-04-10T10:00:00Z',
        updatedAt: '2025-06-03T10:00:00Z',
        createdBy: 'user-admin-001',
        updatedBy: 'user-op-001',
    },
    {
        id: 'prod-010',
        sku: 'RTR-ASUS-AXE16000-010',
        barcode: '7501055300010',
        name: 'Router ASUS ROG Rapture GT-AXE16000',
        description: 'Router Quad-band WiFi 6E con cobertura hasta 525 m², 2.5G WAN, 10G LAN, tecnología ASUS AiMesh y GameFirst VI.',
        categoryId: 'cat-007',
        priceCents: 79900,
        costCents: 59000,
        stockCurrent: 4,
        stockMinimum: 5,    // ← CRÍTICO
        stockMaximum: 18,
        defaultSupplierId: 'sup-003',
        status: ProductStatus.ACTIVE,
        alertLevel: StockAlertLevel.CRITICAL,
        tags: ['router', 'asus', 'wifi6e', 'gaming'],
        imageUrls: ['https://picsum.photos/seed/asus-router/400/300'],
        relatedProductIds: ['prod-009', 'prod-006'],
        dimensions: { weightKg: 1.58, lengthCm: 31.7, widthCm: 19.2, heightCm: 16.2 },
        createdAt: '2024-05-01T08:00:00Z',
        updatedAt: '2025-06-11T11:00:00Z',
        createdBy: 'user-admin-001',
        updatedBy: 'user-op-001',
    },
];

// ---------------------------------------------------------------------------
// MOCK — Movimientos de stock iniciales
// ---------------------------------------------------------------------------

const MOCK_STOCK_MOVEMENTS: StockMovement[] = [
    {
        id: 'mov-001', productId: 'prod-001', type: 'IN',
        quantity: 10, reason: 'Recepción orden de compra PO-2025-00041',
        referenceId: 'po-mock-041', timestamp: '2025-05-20T10:00:00Z', performedBy: 'user-op-001',
    },
    {
        id: 'mov-002', productId: 'prod-001', type: 'OUT',
        quantity: 7, reason: 'Venta online ORD-2025-00200',
        referenceId: 'ord-mock-200', timestamp: '2025-06-01T14:30:00Z', performedBy: 'user-op-002',
    },
    {
        id: 'mov-003', productId: 'prod-003', type: 'OUT',
        quantity: 4, reason: 'Venta POS ORD-2025-00215',
        referenceId: 'ord-mock-215', timestamp: '2025-06-05T16:00:00Z', performedBy: 'user-op-003',
    },
    {
        id: 'mov-004', productId: 'prod-006', type: 'OUT',
        quantity: 5, reason: 'Venta mayorista ORD-2025-00220',
        referenceId: 'ord-mock-220', timestamp: '2025-06-08T09:00:00Z', performedBy: 'user-op-001',
    },
];

// ---------------------------------------------------------------------------
// SERVICIO
// ---------------------------------------------------------------------------

@Injectable({ providedIn: 'root' })
export class InventoryService {

    // ── Estado privado ──────────────────────────────────────────────────────

    /** Signal raíz: catálogo completo de productos */
    private readonly _products = signal<Product[]>(MOCK_PRODUCTS);

    /** Signal raíz: historial de movimientos de stock */
    private readonly _stockMovements = signal<StockMovement[]>(MOCK_STOCK_MOVEMENTS);

    /** Signal raíz: catálogo de categorías */
    private readonly _categories = signal<ProductCategory[]>(MOCK_CATEGORIES);

    // ── API pública de lectura (signals de solo lectura) ────────────────────

    /** Todos los productos del catálogo (solo lectura) */
    readonly products = this._products.asReadonly();

    /** Todas las categorías (solo lectura) */
    readonly categories = this._categories.asReadonly();

    /** Historial de movimientos (solo lectura) */
    readonly stockMovements = this._stockMovements.asReadonly();

    // ── Signals computados ──────────────────────────────────────────────────

    /**
     * Productos en estado CRÍTICO o SIN STOCK.
     * Se recalcula automáticamente cada vez que cambia `_products`.
     * Este signal se propaga hacia SalesService y SupplierService.
     */
    readonly criticalStockProducts = computed<Product[]>(() =>
        this._products().filter(
            (p) =>
                p.status === ProductStatus.ACTIVE &&
                (p.alertLevel === StockAlertLevel.CRITICAL ||
                    p.alertLevel === StockAlertLevel.OUT)
        )
    );

    /**
     * Alertas estructuradas derivadas de los productos críticos.
     * Listas para consumir en el SupplierService sin manipular Product directamente.
     */
    readonly criticalAlerts = computed<StockCriticalAlert[]>(() =>
        this.criticalStockProducts().map((p) => ({
            productId: p.id,
            productName: p.name,
            productSku: p.sku,
            stockCurrent: p.stockCurrent,
            stockMinimum: p.stockMinimum,
            stockMaximum: p.stockMaximum,
            alertLevel: p.alertLevel as StockAlertLevel.CRITICAL | StockAlertLevel.OUT,
            detectedAt: new Date().toISOString(),
        }))
    );

    /** Resumen de inventario para dashboards */
    readonly inventorySummary = computed(() => {
        const all = this._products();
        return {
            totalProducts: all.length,
            activeProducts: all.filter((p) => p.status === ProductStatus.ACTIVE).length,
            criticalCount: all.filter((p) => p.alertLevel === StockAlertLevel.CRITICAL).length,
            outOfStockCount: all.filter((p) => p.alertLevel === StockAlertLevel.OUT).length,
            totalInventoryValue: all.reduce(
                (sum, p) => sum + p.costCents * p.stockCurrent, 0
            ),
        };
    });

    // ── Efecto de logging (desactivar en producción) ─────────────────────────

    constructor() {
        // Registra en consola cada vez que hay nuevos productos críticos
        // (útil durante desarrollo; quitar o condicionar con environment.production)
        effect(() => {
            const critical = this.criticalStockProducts();
            if (critical.length > 0) {
                console.warn(
                    `[Minerva·Inventory] ⚠️ ${critical.length} producto(s) con stock crítico:`,
                    critical.map((p) => `${p.sku} (stock: ${p.stockCurrent}/${p.stockMinimum})`)
                );
            }
        });
    }

    // ── Métodos de escritura (plug-and-play con HTTP) ────────────────────────

    /**
     * Obtiene un producto por ID.
     * @future Reemplazar con: return this.http.get<Product>(`/api/products/${id}`)
     */
    getProductById(id: UUID): Product | undefined {
        return this._products().find((p) => p.id === id);
    }

    /**
     * Agrega un nuevo producto al catálogo.
     * @future Reemplazar con: return this.http.post<Product>('/api/products', data)
     */
    addProduct(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>): Product {
        const newProduct: Product = {
            ...data,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: 'user-current', // reemplazar con AuthService en integración real
            updatedBy: 'user-current',
        };
        this._products.update((prev) => [...prev, newProduct]);
        return newProduct;
    }

    /**
     * Actualiza campos de un producto existente.
     * @future Reemplazar con: return this.http.patch<Product>(`/api/products/${id}`, changes)
     */
    updateProduct(id: UUID, changes: Partial<Omit<Product, 'id' | 'createdAt' | 'createdBy'>>): void {
        this._products.update((prev) =>
            prev.map((p) =>
                p.id === id
                    ? { ...p, ...changes, updatedAt: new Date().toISOString() }
                    : p
            )
        );
    }

    /**
     * Reduce el stock de un producto tras una venta.
     * Actualiza automáticamente el `alertLevel` del producto.
     * Llamado por SalesService al registrar un pedido.
     *
     * @returns true si había stock suficiente, false si no (permite gestión de errores en el caller)
     * @future Mover esta lógica al backend; aquí solo hacer POST /api/stock-movements
     */
    decreaseStock(productId: UUID, quantity: number, referenceOrderId: UUID): boolean {
        const product = this.getProductById(productId);
        if (!product) {
            console.error(`[Inventory] Producto ${productId} no encontrado.`);
            return false;
        }
        if (product.stockCurrent < quantity) {
            console.warn(`[Inventory] Stock insuficiente para ${product.sku}. Disponible: ${product.stockCurrent}, solicitado: ${quantity}`);
            return false;
        }

        const newStock = product.stockCurrent - quantity;
        const newAlert = this.#calculateAlertLevel(newStock, product.stockMinimum);

        this.updateProduct(productId, {
            stockCurrent: newStock,
            alertLevel: newAlert,
        });

        // Registrar movimiento
        const movement: StockMovement = {
            id: crypto.randomUUID(),
            productId,
            type: 'OUT',
            quantity,
            reason: `Venta registrada en orden ${referenceOrderId}`,
            referenceId: referenceOrderId,
            timestamp: new Date().toISOString(),
            performedBy: 'user-current',
        };
        this._stockMovements.update((prev) => [...prev, movement]);

        return true;
    }

    /**
     * Aumenta el stock al recibir una orden de compra.
     * @future POST /api/stock-movements con type: 'IN'
     */
    increaseStock(productId: UUID, quantity: number, referencePOId: UUID): void {
        const product = this.getProductById(productId);
        if (!product) return;

        const newStock = product.stockCurrent + quantity;
        const newAlert = this.#calculateAlertLevel(newStock, product.stockMinimum);

        this.updateProduct(productId, {
            stockCurrent: newStock,
            alertLevel: newAlert,
        });

        const movement: StockMovement = {
            id: crypto.randomUUID(),
            productId,
            type: 'IN',
            quantity,
            reason: `Recepción de orden de compra ${referencePOId}`,
            referenceId: referencePOId,
            timestamp: new Date().toISOString(),
            performedBy: 'user-current',
        };
        this._stockMovements.update((prev) => [...prev, movement]);
    }

    // ── Helpers privados ────────────────────────────────────────────────────

    /** Calcula el nivel de alerta dado el stock actual y el mínimo de seguridad */
    #calculateAlertLevel(stockCurrent: number, stockMinimum: number): StockAlertLevel {
        if (stockCurrent === 0) return StockAlertLevel.OUT;
        if (stockCurrent <= stockMinimum) return StockAlertLevel.CRITICAL;
        if (stockCurrent <= stockMinimum * 1.5) return StockAlertLevel.WARNING;
        return StockAlertLevel.OK;
    }
}