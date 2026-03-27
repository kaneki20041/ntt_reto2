import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

export interface Producto {
  sku: string;
  nombre: string;
  categoria: string;
  almacen: string;
  stock: number;
  minimo: number;
  maximo: number;
  costo: number;
  estado: 'critico' | 'normal' | 'exceso';
}

export interface Alerta {
  id: string;
  producto: string;
  nivel: 'critico' | 'advertencia';
  mensaje: string;
}

export interface MensajeIA {
  role: 'user' | 'agent';
  text: string;
  hora: string;
}

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './inventario.component.html',
  styleUrls: ['./inventario.component.scss']
})
export class InventarioComponent implements OnInit {

  @ViewChild('chatContainer') chatContainer!: ElementRef;

  // ── DATOS SIMULADOS ──────────────────────────────────────────────
  productos: Producto[] = [
    { sku: 'INV-001', nombre: 'Laptop Dell Inspiron 15', categoria: 'Tecnología', almacen: 'Almacén A', stock: 3, minimo: 10, maximo: 50, costo: 2800, estado: 'critico' },
    { sku: 'INV-002', nombre: 'Monitor LG 24"', categoria: 'Tecnología', almacen: 'Almacén A', stock: 22, minimo: 5, maximo: 30, costo: 650, estado: 'normal' },
    { sku: 'INV-003', nombre: 'Teclado Mecánico Logitech', categoria: 'Periféricos', almacen: 'Almacén B', stock: 85, minimo: 10, maximo: 40, costo: 180, estado: 'exceso' },
    { sku: 'INV-004', nombre: 'Silla Ergonómica ProDesk', categoria: 'Mobiliario', almacen: 'Almacén C', stock: 2, minimo: 5, maximo: 20, costo: 890, estado: 'critico' },
    { sku: 'INV-005', nombre: 'Papel Bond A4 (resma)', categoria: 'Oficina', almacen: 'Almacén B', stock: 150, minimo: 50, maximo: 200, costo: 18, estado: 'normal' },
    { sku: 'INV-006', nombre: 'Mouse Inalámbrico HP', categoria: 'Periféricos', almacen: 'Almacén A', stock: 1, minimo: 8, maximo: 25, costo: 95, estado: 'critico' },
    { sku: 'INV-007', nombre: 'Impresora HP LaserJet', categoria: 'Tecnología', almacen: 'Almacén C', stock: 12, minimo: 3, maximo: 15, costo: 1200, estado: 'normal' },
    { sku: 'INV-008', nombre: 'Cable HDMI 2m', categoria: 'Accesorios', almacen: 'Almacén B', stock: 200, minimo: 20, maximo: 80, costo: 22, estado: 'exceso' },
  ];

  alertas: Alerta[] = [
    { id: '1', producto: 'Laptop Dell Inspiron 15', nivel: 'critico', mensaje: 'Stock en 3 unidades. Mínimo requerido: 10. Se sugiere generar OC inmediata.' },
    { id: '2', producto: 'Silla Ergonómica ProDesk', nivel: 'critico', mensaje: 'Quedan 2 unidades. Riesgo de quiebre de stock en 2 días según proyección de ventas.' },
    { id: '3', producto: 'Mouse Inalámbrico HP', nivel: 'critico', mensaje: 'Stock crítico: 1 unidad disponible. Proveedor tiene plazo de 5 días.' },
  ];

  // ── KPIs ─────────────────────────────────────────────────────────
  kpis = {
    criticos: 3,
    total: 8,
    valorTotal: 0,
    alertas: 3,
    sugerencias: 4
  };

  // ── ESTADO UI ─────────────────────────────────────────────────────
  productosFiltrados: Producto[] = [];
  filtroActivo = 'todos';
  searchTerm = '';
  paginaActual = 1;
  itemsPorPagina = 8;
  totalPaginas = 1;

  modalDetalle = false;
  modalAjuste = false;
  productoSeleccionado: Producto | null = null;
  sugerenciaIA = '';

  tipoAjuste: 'entrada' | 'salida' | 'ajuste' = 'entrada';
  cantidadAjuste = 0;
  motivoAjuste = '';

  // ── IA CHAT ───────────────────────────────────────────────────────
  mensajesIA: MensajeIA[] = [
    {
      role: 'agent',
      text: '¡Hola! Soy el Agente Logístico. Puedo ayudarte a consultar stock en tiempo real, detectar quiebres y sugerir reposiciones. ¿En qué te ayudo?',
      hora: this.getHora()
    }
  ];
  consultaTexto = '';
  iaThinking = false;

  // ── LIFECYCLE ─────────────────────────────────────────────────────
  ngOnInit(): void {
    this.calcularKpis();
    this.productosFiltrados = [...this.productos];
  }

  // ── KPI CALCULATION ───────────────────────────────────────────────
  calcularKpis(): void {
    this.kpis.total = this.productos.length;
    this.kpis.criticos = this.productos.filter(p => p.estado === 'critico').length;
    this.kpis.valorTotal = this.productos.reduce((sum, p) => sum + p.stock * p.costo, 0);
    this.kpis.alertas = this.alertas.length;
    this.kpis.sugerencias = this.alertas.length + 1;
    this.totalPaginas = Math.ceil(this.productosFiltrados.length / this.itemsPorPagina) || 1;
  }

  // ── FILTROS ───────────────────────────────────────────────────────
  setFiltro(filtro: string): void {
    this.filtroActivo = filtro;
    this.filtrarProductos();
  }

  filtrarProductos(): void {
    let base = [...this.productos];
    if (this.filtroActivo !== 'todos') {
      base = base.filter(p => p.estado === this.filtroActivo);
    }
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      base = base.filter(p =>
        p.nombre.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term) ||
        p.categoria.toLowerCase().includes(term)
      );
    }
    this.productosFiltrados = base;
    this.totalPaginas = Math.ceil(base.length / this.itemsPorPagina) || 1;
    this.paginaActual = 1;
  }

  paginar(dir: number): void {
    const nueva = this.paginaActual + dir;
    if (nueva >= 1 && nueva <= this.totalPaginas) {
      this.paginaActual = nueva;
    }
  }

  // ── HELPERS ───────────────────────────────────────────────────────
  getStockPct(p: Producto): number {
    return Math.min((p.stock / p.maximo) * 100, 100);
  }

  getEstadoLabel(estado: string): string {
    const labels: Record<string, string> = {
      critico: '▲ CRÍTICO',
      normal: '● NORMAL',
      exceso: '▼ EXCESO'
    };
    return labels[estado] ?? estado;
  }

  getHora(): string {
    return new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  }

  // ── MODALES ───────────────────────────────────────────────────────
  abrirModalProducto(): void {
    // TODO: abrir modal de creación de producto
    alert('Modal de nuevo producto — implementar formulario completo');
  }

  verDetalle(p: Producto): void {
    this.productoSeleccionado = p;
    this.sugerenciaIA = '';
    this.modalDetalle = true;
  }

  ajustarStock(p: Producto): void {
    this.productoSeleccionado = p;
    this.tipoAjuste = 'entrada';
    this.cantidadAjuste = 0;
    this.motivoAjuste = '';
    this.modalAjuste = true;
  }

  cerrarModal(): void {
    this.modalDetalle = false;
    this.modalAjuste = false;
    this.productoSeleccionado = null;
  }

  confirmarAjuste(): void {
    if (!this.productoSeleccionado || !this.cantidadAjuste) return;
    const p = this.productos.find(x => x.sku === this.productoSeleccionado!.sku);
    if (p) {
      if (this.tipoAjuste === 'entrada') p.stock += this.cantidadAjuste;
      else if (this.tipoAjuste === 'salida') p.stock = Math.max(0, p.stock - this.cantidadAjuste);
      else p.stock = this.cantidadAjuste;

      // Recalcular estado
      if (p.stock <= p.minimo) p.estado = 'critico';
      else if (p.stock >= p.maximo * 0.9) p.estado = 'exceso';
      else p.estado = 'normal';
    }
    this.calcularKpis();
    this.filtrarProductos();
    this.cerrarModal();
  }

  // ── ALERTAS ───────────────────────────────────────────────────────
  generarOrdenCompra(a: Alerta): void {
    alert(`Generando Orden de Compra para: ${a.producto}\n(Integrar con módulo de Compras)`);
  }

  ignorarAlerta(a: Alerta): void {
    this.alertas = this.alertas.filter(al => al.id !== a.id);
    this.kpis.alertas = this.alertas.length;
  }

  // ── AGENTE IA ─────────────────────────────────────────────────────
  consultarIA(p: Producto): void {
    this.consultaTexto = `Analiza el estado de "${p.nombre}" con SKU ${p.sku}`;
    this.enviarConsulta();
  }

  async analizarProductoConIA(p: Producto): Promise<void> {
    this.sugerenciaIA = 'Consultando al Agente Logístico...';
    const prompt = `Analiza este producto de inventario y da una recomendación breve en 2 oraciones:
      Producto: ${p.nombre}, SKU: ${p.sku}, Stock actual: ${p.stock}, Mínimo: ${p.minimo}, Estado: ${p.estado}.`;
    const respuesta = await this.llamarAPI(prompt);
    this.sugerenciaIA = respuesta;
  }

  async enviarConsulta(textoForzado?: string): Promise<void> {
    const texto = textoForzado ?? this.consultaTexto.trim();
    if (!texto || this.iaThinking) return;

    this.mensajesIA.push({ role: 'user', text: texto, hora: this.getHora() });
    this.consultaTexto = '';
    this.iaThinking = true;
    this.scrollChat();

    const contexto = `Eres el Agente Logístico de un ERP empresarial. Tienes acceso al inventario actual:
${this.productos.map(p => `- ${p.nombre} (${p.sku}): ${p.stock} unidades, estado ${p.estado}`).join('\n')}
Alertas activas: ${this.alertas.length} productos en estado crítico.
Responde de forma concisa, profesional y en español. Máximo 3 oraciones.`;

    const respuesta = await this.llamarAPI(`${contexto}\n\nUsuario pregunta: ${texto}`);
    this.iaThinking = false;
    this.mensajesIA.push({ role: 'agent', text: respuesta, hora: this.getHora() });
    this.scrollChat();
  }

  private async llamarAPI(prompt: string): Promise<string> {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 300,
          messages: [{ role: 'user', content: prompt }]
        })
      });
      const data = await response.json();
      return data.content?.[0]?.text ?? 'Sin respuesta del agente.';
    } catch {
      return 'Error al conectar con el Agente Logístico. Verifica la conexión.';
    }
  }

  private scrollChat(): void {
    setTimeout(() => {
      if (this.chatContainer) {
        const el = this.chatContainer.nativeElement;
        el.scrollTop = el.scrollHeight;
      }
    }, 50);
  }
}