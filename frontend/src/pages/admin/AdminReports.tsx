import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, Download, FileText, Filter, X,
  ShoppingCart, Package, Boxes, Users, Receipt, Truck,
  Search, Printer
} from 'lucide-react';
import { api } from '../../services/api';
import type { ReportType, ReportFilters, ReportResult, FilterOptions } from '../../types';

// ── Helpers ─────────────────────────────────────────────────────────────────
const formatCOP = (val: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

const formatNum = (val: number) => new Intl.NumberFormat('es-CO').format(val);

const formatDate = (str: string) => {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// ── Export CSV ───────────────────────────────────────────────────────────────
function exportToCSV(data: Record<string, any>[], filename: string) {
  if (!data || data.length === 0) return;
  const keys = Object.keys(data[0]);
  const header = keys.join(';');
  const rows = data.map(row =>
    keys.map(k => {
      const v = row[k];
      if (v === null || v === undefined) return '';
      if (typeof v === 'string' && (v.includes(';') || v.includes('\n') || v.includes('"'))) {
        return `"${v.replace(/"/g, '""')}"`;
      }
      return String(v);
    }).join(';')
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ── Print PDF via window.print() ─────────────────────────────────────────────
function printReport(reportLabel: string, summaryEl: HTMLElement | null, tableEl: HTMLElement | null) {
  const w = window.open('', '_blank');
  if (!w) return;
  const summaryHtml = summaryEl?.innerHTML || '';
  const tableHtml = tableEl?.innerHTML || '';
  w.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Reporte MEVACOL - ${reportLabel}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 11px; color: #111; padding: 20px; }
        h1 { font-size: 16px; margin-bottom: 4px; }
        .subtitle { color: #666; font-size: 10px; margin-bottom: 16px; }
        .summary { display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 16px; padding: 12px; background: #f8f8f8; border-radius: 6px; }
        .kpi { text-align: center; }
        .kpi .val { font-size: 15px; font-weight: 700; }
        .kpi .lbl { font-size: 9px; color: #666; }
        table { width: 100%; border-collapse: collapse; font-size: 10px; }
        th { background: #1e3a5f; color: #fff; padding: 6px 8px; text-align: left; }
        td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; }
        tr:nth-child(even) { background: #f9fafb; }
        @media print { body { padding: 10px; } }
      </style>
    </head>
    <body>
      <h1>MEVACOL Distribuciones — Reporte: ${reportLabel}</h1>
      <div class="subtitle">Generado el ${new Date().toLocaleString('es-CO')} &nbsp;|&nbsp; Sistema MEVACOL</div>
      <div class="summary">${summaryHtml}</div>
      <table>${tableHtml}</table>
    </body>
    </html>
  `);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); w.close(); }, 400);
}

// ── Report config ────────────────────────────────────────────────────────────
const REPORT_TYPES: { id: ReportType; label: string; icon: React.ReactNode; color: string; description: string }[] = [
  { id: 'sales', label: 'Ventas', icon: <ShoppingCart size={20} />, color: '#3b82f6', description: 'Historial completo de ventas con totales y vendedores' },
  { id: 'products-sold', label: 'Productos Vendidos', icon: <Package size={20} />, color: '#10b981', description: 'Productos más vendidos con unidades e ingresos' },
  { id: 'inventory', label: 'Inventario', icon: <Boxes size={20} />, color: '#8b5cf6', description: 'Stock actual, valores y estado por categoría' },
  { id: 'customers', label: 'Clientes', icon: <Users size={20} />, color: '#f59e0b', description: 'Directorio completo con historial de compras' },
  { id: 'invoices', label: 'Facturas', icon: <Receipt size={20} />, color: '#06b6d4', description: 'Facturas emitidas con montos y estado DIAN' },
  { id: 'deliveries', label: 'Entregas', icon: <Truck size={20} />, color: '#f43f5e', description: 'Historial de despachos por estado y entregador' },
];

// ── Column renderers per report type ─────────────────────────────────────────
function getColumns(type: ReportType): { key: string; label: string; render?: (v: any, row?: any) => React.ReactNode }[] {
  switch (type) {
    case 'sales':
      return [
        { key: 'sale_code', label: 'Código' },
        { key: 'created_at', label: 'Fecha', render: formatDate },
        { key: 'customer_name', label: 'Cliente' },
        { key: 'seller_name', label: 'Vendedor' },
        { key: 'invoice_code', label: 'Factura' },
        { key: 'subtotal_cop', label: 'Subtotal', render: formatCOP },
        { key: 'discount_cop', label: 'Descuento', render: formatCOP },
        { key: 'total_cop', label: 'Total', render: v => <strong style={{ color: '#34d399' }}>{formatCOP(v)}</strong> },
        { key: 'items_count', label: 'Items', render: formatNum },
      ];
    case 'products-sold':
      return [
        { key: 'product_code', label: 'Código' },
        { key: 'product_name', label: 'Producto' },
        { key: 'category', label: 'Categoría' },
        { key: 'unit_measure', label: 'Unidad' },
        { key: 'total_quantity', label: 'Unidades', render: formatNum },
        { key: 'total_orders', label: 'Pedidos', render: formatNum },
        { key: 'total_revenue_cop', label: 'Ingresos', render: v => <strong style={{ color: '#34d399' }}>{formatCOP(v)}</strong> },
      ];
    case 'inventory':
      return [
        { key: 'product_code', label: 'Código' },
        { key: 'product_name', label: 'Producto' },
        { key: 'category', label: 'Categoría' },
        { key: 'current_stock', label: 'Stock', render: formatNum },
        { key: 'min_stock', label: 'Stock Mín.', render: formatNum },
        { key: 'stock_status', label: 'Estado', render: v => {
          const c = v === 'DISPONIBLE' ? '#10b981' : v === 'STOCK_BAJO' ? '#f59e0b' : '#ef4444';
          const l = v === 'DISPONIBLE' ? 'Disponible' : v === 'STOCK_BAJO' ? 'Stock Bajo' : 'Agotado';
          return <span style={{ color: c, fontWeight: 700, fontSize: '0.75rem' }}>{l}</span>;
        }},
        { key: 'price_cop', label: 'P. Venta', render: formatCOP },
        { key: 'stock_retail_value', label: 'Valor Retail', render: v => <strong style={{ color: '#60a5fa' }}>{formatCOP(v)}</strong> },
      ];
    case 'customers':
      return [
        { key: 'id_number', label: 'NIT/CC' },
        { key: 'name', label: 'Nombre' },
        { key: 'city', label: 'Ciudad' },
        { key: 'phone', label: 'Teléfono' },
        { key: 'total_purchases', label: 'Compras', render: formatNum },
        { key: 'total_spent_cop', label: 'Total Comprado', render: v => <strong style={{ color: '#34d399' }}>{formatCOP(v)}</strong> },
        { key: 'is_active', label: 'Estado', render: v => <span style={{ color: v === 1 ? '#10b981' : '#ef4444', fontWeight: 700, fontSize: '0.75rem' }}>{v === 1 ? 'Activo' : 'Inactivo'}</span> },
        { key: 'created_at', label: 'Registro', render: formatDate },
      ];
    case 'invoices':
      return [
        { key: 'invoice_code', label: 'Factura' },
        { key: 'created_at', label: 'Fecha', render: formatDate },
        { key: 'customer_name', label: 'Cliente' },
        { key: 'seller_name', label: 'Vendedor' },
        { key: 'subtotal_cop', label: 'Subtotal', render: formatCOP },
        { key: 'discount_cop', label: 'Descuento', render: formatCOP },
        { key: 'total_cop', label: 'Total', render: v => <strong style={{ color: '#34d399' }}>{formatCOP(v)}</strong> },
        { key: 'dian_status', label: 'Estado DIAN' },
      ];
    case 'deliveries':
      return [
        { key: 'delivery_code', label: 'Código' },
        { key: 'created_at', label: 'Creada', render: formatDate },
        { key: 'scheduled_date', label: 'Programada', render: formatDate },
        { key: 'customer_name', label: 'Cliente' },
        { key: 'delivery_city', label: 'Ciudad' },
        { key: 'deliverer_name', label: 'Entregador', render: v => v || '—' },
        { key: 'status', label: 'Estado', render: v => {
          const c: Record<string, string> = { PENDIENTE: '#f59e0b', ASIGNADA: '#3b82f6', EN_CAMINO: '#8b5cf6', ENTREGADA: '#10b981', NO_ENTREGADA: '#ef4444', CANCELADA: '#6b7280' };
          const l: Record<string, string> = { PENDIENTE: 'Pendiente', ASIGNADA: 'Asignada', EN_CAMINO: 'En Camino', ENTREGADA: 'Entregada', NO_ENTREGADA: 'No Entregada', CANCELADA: 'Cancelada' };
          return <span style={{ color: c[v] || '#fff', fontWeight: 700, fontSize: '0.75rem' }}>{l[v] || v}</span>;
        }},
        { key: 'sale_total_cop', label: 'Valor Venta', render: v => v ? formatCOP(v) : '—' },
      ];
    default:
      return [];
  }
}

// ── Summary labels ────────────────────────────────────────────────────────────
const SUMMARY_LABELS: Record<string, string> = {
  total_rows: 'Total registros', total_revenue_cop: 'Ingresos totales', total_discount_cop: 'Descuentos',
  avg_ticket_cop: 'Ticket promedio', total_units: 'Unidades totales', total_cost_value: 'Valor costo',
  total_retail_value: 'Valor retail', low_stock_count: 'Stock bajo', out_of_stock_count: 'Agotados',
  active_count: 'Activos', delivered_count: 'Entregadas', failed_count: 'No entregadas', pending_count: 'Pendientes',
};

// ── Main Component ────────────────────────────────────────────────────────────
export const AdminReports: React.FC = () => {
  const [selectedType, setSelectedType] = useState<ReportType | null>(null);
  const [filters, setFilters] = useState<ReportFilters>({});
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [result, setResult] = useState<ReportResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  const summaryRef = React.useRef<HTMLDivElement>(null);
  const tableRef = React.useRef<HTMLTableSectionElement>(null);

  useEffect(() => {
    api.getReportFilterOptions().then(opts => setFilterOptions(opts)).catch(() => {});
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!selectedType) return;
    setIsLoading(true);
    setError(null);
    setCurrentPage(1);
    try {
      const res = await api.getReportData(selectedType, filters);
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Error al generar el reporte.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedType, filters]);

  const handleExportCSV = () => {
    if (!result) return;
    exportToCSV(result.data, `reporte_${result.report}`);
  };

  const handlePrint = () => {
    if (!result) return;
    const reportLabel = REPORT_TYPES.find(r => r.id === result.report)?.label || result.report;
    printReport(reportLabel, summaryRef.current, tableRef.current as any);
  };

  const setFilter = (key: keyof ReportFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value || undefined }));
  };

  const currentReport = REPORT_TYPES.find(r => r.id === selectedType);
  const columns = selectedType ? getColumns(selectedType) : [];

  // Filter rows by search text
  const filteredData = (result?.data || []).filter(row => {
    if (!searchText) return true;
    return Object.values(row).some(v => String(v || '').toLowerCase().includes(searchText.toLowerCase()));
  });
  const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));
  const pageData = filteredData.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '4px' }}>Reportes y Análisis</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Genera, filtra y exporta reportes detallados del sistema</p>
        </div>
      </div>

      {/* ── Selector de tipo de reporte ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
        {REPORT_TYPES.map(type => (
          <div
            key={type.id}
            className="glass-card"
            onClick={() => { setSelectedType(type.id); setResult(null); setSearchText(''); }}
            style={{
              padding: '18px',
              cursor: 'pointer',
              border: selectedType === type.id ? `2px solid ${type.color}` : '1px solid var(--border-subtle)',
              transition: 'all 0.15s',
              transform: selectedType === type.id ? 'scale(1.01)' : 'scale(1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${type.color}20`, color: type.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {type.icon}
              </div>
              <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>{type.label}</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{type.description}</p>
          </div>
        ))}
      </div>

      {selectedType && (
        <>
          {/* ── Filtros ── */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Filter size={18} color="var(--primary)" />
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Filtros — {currentReport?.label}</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px' }}>
              {/* Fechas siempre visibles */}
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px', display: 'block' }}>Fecha inicial</label>
                <input type="date" className="form-input" value={filters.start_date || ''} onChange={e => setFilter('start_date', e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px', display: 'block' }}>Fecha final</label>
                <input type="date" className="form-input" value={filters.end_date || ''} onChange={e => setFilter('end_date', e.target.value)} />
              </div>

              {/* Cliente (para ventas, facturas, entregas) */}
              {['sales', 'invoices', 'customers'].includes(selectedType) && filterOptions && (
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px', display: 'block' }}>Cliente</label>
                  <select className="form-input" value={filters.customer_id || ''} onChange={e => setFilter('customer_id', e.target.value)}>
                    <option value="">Todos los clientes</option>
                    {filterOptions.customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}

              {/* Vendedor */}
              {['sales', 'products-sold', 'invoices'].includes(selectedType) && filterOptions && (
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px', display: 'block' }}>Vendedor</label>
                  <select className="form-input" value={filters.seller_id || ''} onChange={e => setFilter('seller_id', e.target.value)}>
                    <option value="">Todos los vendedores</option>
                    {filterOptions.sellers.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                  </select>
                </div>
              )}

              {/* Entregador */}
              {selectedType === 'deliveries' && filterOptions && (
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px', display: 'block' }}>Entregador</label>
                  <select className="form-input" value={filters.deliverer_id || ''} onChange={e => setFilter('deliverer_id', e.target.value)}>
                    <option value="">Todos los entregadores</option>
                    {filterOptions.deliverers.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                  </select>
                </div>
              )}

              {/* Estado entrega */}
              {selectedType === 'deliveries' && (
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px', display: 'block' }}>Estado</label>
                  <select className="form-input" value={filters.status || ''} onChange={e => setFilter('status', e.target.value)}>
                    <option value="">Todos los estados</option>
                    {['PENDIENTE', 'ASIGNADA', 'EN_CAMINO', 'ENTREGADA', 'NO_ENTREGADA', 'CANCELADA'].map(s =>
                      <option key={s} value={s}>{s}</option>
                    )}
                  </select>
                </div>
              )}

              {/* Categoría */}
              {['inventory', 'products-sold'].includes(selectedType) && filterOptions && (
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px', display: 'block' }}>Categoría</label>
                  <select className="form-input" value={filters.category || ''} onChange={e => setFilter('category', e.target.value)}>
                    <option value="">Todas las categorías</option>
                    {filterOptions.categories.map((c, i) => <option key={i} value={c.category}>{c.category}</option>)}
                  </select>
                </div>
              )}

              {/* Nivel de stock */}
              {selectedType === 'inventory' && (
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px', display: 'block' }}>Stock</label>
                  <select className="form-input" value={filters.stock_level || ''} onChange={e => setFilter('stock_level', e.target.value)}>
                    <option value="">Todos</option>
                    <option value="ok">Disponible</option>
                    <option value="low">Stock Bajo</option>
                    <option value="out">Agotado</option>
                  </select>
                </div>
              )}

              {/* Estado cliente */}
              {selectedType === 'customers' && (
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px', display: 'block' }}>Estado</label>
                  <select className="form-input" value={filters.status || ''} onChange={e => setFilter('status', e.target.value)}>
                    <option value="">Todos</option>
                    <option value="active">Activos</option>
                    <option value="inactive">Inactivos</option>
                  </select>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => { setFilters({}); setResult(null); }}
              >
                <X size={14} /> Limpiar filtros
              </button>
              <button
                className="btn btn-primary"
                onClick={handleGenerate}
                disabled={isLoading}
              >
                {isLoading ? <><div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} /> Generando...</> : <><BarChart3 size={16} /> Generar Reporte</>}
              </button>
            </div>
          </div>

          {/* ── Error ── */}
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', padding: '14px 18px', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <X size={16} /> {error}
            </div>
          )}

          {/* ── Resultados ── */}
          {result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Summary KPIs */}
              <div ref={summaryRef} className="glass-card" style={{ padding: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={18} color="var(--primary)" />
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Resumen — {REPORT_TYPES.find(r => r.id === result.report)?.label}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{filteredData.length} registros</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary btn-sm" onClick={handleExportCSV}>
                      <Download size={14} /> Exportar CSV
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={handlePrint}>
                      <Printer size={14} /> Imprimir / PDF
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                  {Object.entries(result.summary).map(([key, val]) => {
                    const isMoney = key.includes('cop') || key.includes('value') || key.includes('revenue') || key.includes('ticket');
                    return (
                      <div key={key} style={{ minWidth: '120px' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                          {SUMMARY_LABELS[key] || key.replace(/_/g, ' ')}
                        </div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                          {isMoney ? formatCOP(val) : formatNum(val)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Table */}
              <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                {/* Search */}
                <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Search size={16} color="var(--text-muted)" />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Buscar en resultados..."
                    value={searchText}
                    onChange={e => { setSearchText(e.target.value); setCurrentPage(1); }}
                    style={{ border: 'none', background: 'transparent', outline: 'none', flex: 1, color: 'var(--text-primary)', fontSize: '0.9rem' }}
                  />
                  {searchText && (
                    <button onClick={() => setSearchText('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                      <X size={14} />
                    </button>
                  )}
                </div>

                {filteredData.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                    <BarChart3 size={40} style={{ marginBottom: '12px', opacity: 0.4 }} />
                    <div style={{ fontSize: '0.95rem' }}>No se encontraron datos con los filtros seleccionados</div>
                  </div>
                ) : (
                  <>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid var(--border-subtle)', whiteSpace: 'nowrap' }}>#</th>
                            {columns.map(col => (
                              <th key={col.key} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid var(--border-subtle)', whiteSpace: 'nowrap' }}>
                                {col.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody ref={tableRef}>
                          {pageData.map((row, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.12s' }}
                              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'}
                              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                            >
                              <td style={{ padding: '10px 14px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                {(currentPage - 1) * PAGE_SIZE + i + 1}
                              </td>
                              {columns.map(col => (
                                <td key={col.key} style={{ padding: '10px 14px', fontSize: '0.82rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                                  {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: '10px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Mostrando {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredData.length)} de {filteredData.length}
                        </span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button className="btn btn-secondary btn-sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                            ← Anterior
                          </button>
                          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                            const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                            return (
                              <button
                                key={page}
                                className={`btn btn-sm ${currentPage === page ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setCurrentPage(page)}
                              >{page}</button>
                            );
                          })}
                          <button className="btn btn-secondary btn-sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                            Siguiente →
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Empty state ── */}
      {!selectedType && (
        <div className="glass-card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <BarChart3 size={52} style={{ margin: '0 auto 14px', opacity: 0.3, display: 'block' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>Selecciona un tipo de reporte</h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto' }}>
            Elige una de las 6 categorías arriba, configura los filtros y genera el reporte. Podrás exportarlo a CSV o imprimirlo como PDF.
          </p>
        </div>
      )}
    </div>
  );
};
