import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Package, AlertTriangle, DollarSign, ShoppingCart,
  Receipt, Truck, CheckCircle2, XCircle, Clock, ArrowRight,
  TrendingUp, BarChart3, RefreshCw, Calendar, Box,
  UserCheck, Layers
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { api } from '../../services/api';
import type { DashboardAdminStats, ChartDataPoint } from '../../types';

interface AdminDashboardProps {
  onGoToUsers: () => void;
  onGoToTab?: (tab: string) => void;
}

const formatCOP = (val: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

const formatNum = (val: number) =>
  new Intl.NumberFormat('es-CO').format(val);

type SalesTrendPeriod = 'daily' | 'weekly' | 'monthly';

const DELIVERY_COLORS: Record<string, string> = {
  PENDIENTE: '#f59e0b',
  ASIGNADA: '#3b82f6',
  EN_CAMINO: '#8b5cf6',
  ENTREGADA: '#10b981',
  NO_ENTREGADA: '#ef4444',
  CANCELADA: '#6b7280',
};

const CHART_BLUE = '#3b82f6';
const CHART_GREEN = '#10b981';
const CHART_PURPLE = '#8b5cf6';
const CHART_AMBER = '#f59e0b';

// ── KPI Card ──────────────────────────────────────────────────────────────────
interface KpiCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  onClick?: () => void;
  badge?: { text: string; type: 'warning' | 'success' | 'info' | 'danger' };
}

const KpiCard: React.FC<KpiCardProps> = ({ label, value, subtitle, icon, color, bgColor, onClick, badge }) => (
  <div
    className="glass-card"
    style={{ padding: '18px', cursor: onClick ? 'pointer' : 'default', transition: 'transform 0.15s' }}
    onClick={onClick}
    onMouseEnter={e => { if (onClick) (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
    onMouseLeave={e => { if (onClick) (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </span>
      <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: bgColor, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
    </div>
    <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1, marginBottom: '6px' }}>
      {value}
    </div>
    {subtitle && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{subtitle}</div>}
    {badge && (
      <span className={`badge ${badge.type === 'warning' ? 'badge-warning' : badge.type === 'danger' ? 'badge-danger' : badge.type === 'success' ? 'badge-success' : ''}`}
        style={{ marginTop: '8px', fontSize: '0.7rem' }}>
        {badge.text}
      </span>
    )}
  </div>
);

// ── Custom Tooltip ─────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label, isCurrency = true }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: '#1e293b', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '10px', padding: '10px 14px' }}>
        <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '6px' }}>{label}</div>
        {payload.map((p: any, i: number) => (
          <div key={i} style={{ fontSize: '0.88rem', color: p.color || '#fff', fontWeight: 600 }}>
            {isCurrency ? formatCOP(p.value) : formatNum(p.value)}
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// ── Main Component ─────────────────────────────────────────────────────────────
export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onGoToUsers, onGoToTab }) => {
  const [stats, setStats] = useState<DashboardAdminStats | null>(null);
  const [salesTrend, setSalesTrend] = useState<{ daily: ChartDataPoint[]; weekly: ChartDataPoint[]; monthly: ChartDataPoint[] } | null>(null);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [deliveryStatus, setDeliveryStatus] = useState<any[]>([]);
  const [inventoryCharts, setInventoryCharts] = useState<any[]>([]);
  const [salesBySeller, setSalesBySeller] = useState<any[]>([]);
  const [trendPeriod, setTrendPeriod] = useState<SalesTrendPeriod>('daily');
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [adminRes, trendRes, prodRes, delivRes, invRes, sellerRes] = await Promise.allSettled([
        api.getDashboardAdmin(),
        api.getDashboardChartsSalesTrend(),
        api.getDashboardChartsTopProducts(),
        api.getDashboardChartsDeliveryStatus(),
        api.getDashboardChartsInventory(),
        api.getDashboardChartsSalesBySeller(),
      ]);

      if (adminRes.status === 'fulfilled') setStats(adminRes.value.data);
      if (trendRes.status === 'fulfilled') setSalesTrend(trendRes.value.data);
      if (prodRes.status === 'fulfilled') setTopProducts(prodRes.value.data);
      if (delivRes.status === 'fulfilled') setDeliveryStatus(delivRes.value.data);
      if (invRes.status === 'fulfilled') setInventoryCharts(invRes.value.data);
      if (sellerRes.status === 'fulfilled') setSalesBySeller(sellerRes.value.data);

      setLastUpdated(new Date());
    } catch (err: any) {
      setError('Error al cargar el dashboard. Verifica tu conexión.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Format trend data for chart display
  const trendData = salesTrend
    ? (salesTrend[trendPeriod] || []).map((d: ChartDataPoint) => ({
        label: d.day?.slice(5) || d.week || d.month || '',
        revenue: d.revenue_cop,
        sales: d.sales_count,
      }))
    : [];

  if (isLoading && !stats) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px' }}>
        <div className="spinner" style={{ width: '48px', height: '48px', borderWidth: '4px' }} />
        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Cargando dashboard...</span>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '48px' }}>
        <XCircle size={40} color="#ef4444" />
        <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
        <button className="btn btn-primary" onClick={fetchAll}><RefreshCw size={16} /> Reintentar</button>
      </div>
    );
  }

  const s = stats!;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '4px' }}>Panel de Control Maestro</h2>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {lastUpdated && `Actualizado: ${lastUpdated.toLocaleTimeString('es-CO')}`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchAll} disabled={isLoading}>
            <RefreshCw size={14} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
            Actualizar
          </button>
          {onGoToTab && (
            <button className="btn btn-primary btn-sm" onClick={() => onGoToTab('reports')}>
              <BarChart3 size={14} />
              Ver Reportes
            </button>
          )}
        </div>
      </div>

      {/* ── Ventas Resumen (top 3 KPIs grandes) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <KpiCard
          label="Ventas Hoy"
          value={formatCOP(s.sales.today_revenue_cop)}
          subtitle={`${s.sales.today_count} ventas realizadas`}
          icon={<TrendingUp size={20} />}
          color="#34d399"
          bgColor="rgba(16,185,129,0.15)"
          onClick={() => onGoToTab?.('sales')}
        />
        <KpiCard
          label="Ventas Esta Semana"
          value={formatCOP(s.sales.week_revenue_cop)}
          subtitle={`${s.sales.week_count} ventas`}
          icon={<Calendar size={20} />}
          color="#60a5fa"
          bgColor="rgba(59,130,246,0.15)"
          onClick={() => onGoToTab?.('sales')}
        />
        <KpiCard
          label="Ventas Este Mes"
          value={formatCOP(s.sales.month_revenue_cop)}
          subtitle={`${s.sales.month_count} ventas · Ticket prom. ${formatCOP(s.sales.avg_ticket_cop)}`}
          icon={<DollarSign size={20} />}
          color="#c084fc"
          bgColor="rgba(168,85,247,0.15)"
          onClick={() => onGoToTab?.('sales')}
        />
      </div>

      {/* ── KPI Grid completo ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px' }}>
        <KpiCard label="Clientes Activos" value={formatNum(s.customers.active)} subtitle="En directorio" icon={<Users size={18} />} color="#34d399" bgColor="rgba(16,185,129,0.12)" onClick={() => onGoToTab?.('customers')} />
        <KpiCard label="Productos Activos" value={formatNum(s.products.active)} subtitle={`${s.products.total} en total`} icon={<Package size={18} />} color="#60a5fa" bgColor="rgba(59,130,246,0.12)" onClick={() => onGoToTab?.('products')} />
        <KpiCard
          label="Stock Bajo"
          value={s.products.low_stock + s.products.out_of_stock}
          subtitle={`${s.products.low_stock} bajo · ${s.products.out_of_stock} agotados`}
          icon={<AlertTriangle size={18} />}
          color="#f59e0b"
          bgColor="rgba(245,158,11,0.12)"
          onClick={() => onGoToTab?.('inventory')}
          badge={s.products.low_stock + s.products.out_of_stock > 0 ? { text: 'Requiere atención', type: 'warning' } : undefined}
        />
        <KpiCard
          label="Valor Inventario"
          value={formatCOP(s.products.total_retail_value)}
          subtitle={`Costo: ${formatCOP(s.products.total_cost_value)}`}
          icon={<Box size={18} />}
          color="#a78bfa"
          bgColor="rgba(139,92,246,0.12)"
        />
        <KpiCard label="Facturas" value={formatNum(s.invoices.total)} subtitle={`${s.invoices.today} generadas hoy`} icon={<Receipt size={18} />} color="#34d399" bgColor="rgba(16,185,129,0.12)" onClick={() => onGoToTab?.('invoices')} />
        <KpiCard label="Total Ventas" value={formatNum(s.sales.total_count)} subtitle={formatCOP(s.sales.total_revenue_cop)} icon={<ShoppingCart size={18} />} color="#60a5fa" bgColor="rgba(59,130,246,0.12)" onClick={() => onGoToTab?.('sales')} />
      </div>

      {/* ── Entregas KPI ── */}
      <div>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
          Estado de Entregas
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
          <KpiCard label="Pendientes" value={s.deliveries.pending} icon={<Clock size={18} />} color="#f59e0b" bgColor="rgba(245,158,11,0.12)" onClick={() => onGoToTab?.('deliveries')} />
          <KpiCard label="Asignadas" value={s.deliveries.assigned} icon={<UserCheck size={18} />} color="#3b82f6" bgColor="rgba(59,130,246,0.12)" onClick={() => onGoToTab?.('deliveries')} />
          <KpiCard label="En Camino" value={s.deliveries.on_the_way} icon={<Truck size={18} />} color="#8b5cf6" bgColor="rgba(139,92,246,0.12)" onClick={() => onGoToTab?.('deliveries')} />
          <KpiCard label="Completadas" value={s.deliveries.delivered} subtitle={`${s.deliveries.delivered_today} hoy`} icon={<CheckCircle2 size={18} />} color="#10b981" bgColor="rgba(16,185,129,0.12)" onClick={() => onGoToTab?.('deliveries')} />
          <KpiCard label="No Entregadas" value={s.deliveries.failed} icon={<XCircle size={18} />} color="#ef4444" bgColor="rgba(239,68,68,0.12)" onClick={() => onGoToTab?.('deliveries')} badge={s.deliveries.failed > 0 ? { text: 'Revisar', type: 'danger' } : undefined} />
          <KpiCard label="Canceladas" value={s.deliveries.cancelled} icon={<XCircle size={18} />} color="#6b7280" bgColor="rgba(107,114,128,0.12)" />
        </div>
      </div>

      {/* ── Gráficos: Tendencia de Ventas ── */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <TrendingUp size={20} color={CHART_BLUE} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Tendencia de Ventas</h3>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {(['daily', 'weekly', 'monthly'] as SalesTrendPeriod[]).map(p => (
              <button
                key={p}
                onClick={() => setTrendPeriod(p)}
                className={`btn btn-sm ${trendPeriod === p ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '4px 12px', fontSize: '0.75rem' }}
              >
                {p === 'daily' ? '30 Días' : p === 'weekly' ? '12 Semanas' : '12 Meses'}
              </button>
            ))}
          </div>
        </div>
        {trendData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
            <BarChart3 size={36} style={{ marginBottom: '10px', opacity: 0.4 }} />
            <div>Sin datos de ventas para este período</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_BLUE} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={CHART_BLUE} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000000).toFixed(1)}M`} />
              <Tooltip content={<CustomTooltip isCurrency={true} />} />
              <Area type="monotone" dataKey="revenue" stroke={CHART_BLUE} strokeWidth={2.5} fill="url(#salesGrad)" name="Ingresos" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Gráficos: Top Productos + Estado Entregas ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>

        {/* Top productos */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Package size={20} color={CHART_GREEN} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Productos Más Vendidos</h3>
          </div>
          {topProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '0.88rem' }}>Sin datos de ventas</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topProducts.slice(0, 7)} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${formatNum(v)} u`} />
                <YAxis type="category" dataKey="product_name" tick={{ fill: '#94a3b8', fontSize: 10 }} width={100} axisLine={false} tickLine={false}
                  tickFormatter={v => v.length > 14 ? v.slice(0, 13) + '…' : v} />
                <Tooltip content={<CustomTooltip isCurrency={false} />} />
                <Bar dataKey="total_quantity" fill={CHART_GREEN} radius={[0, 4, 4, 0]} name="Unidades" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Estado entregas */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Truck size={20} color={CHART_AMBER} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Estado de Entregas</h3>
          </div>
          {deliveryStatus.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '0.88rem' }}>Sin entregas registradas</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={deliveryStatus} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                    {deliveryStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={DELIVERY_COLORS[entry.status] || '#6b7280'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val, name) => [val, name]} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                {deliveryStatus.map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: DELIVERY_COLORS[d.status] || '#6b7280', flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{d.name}: <strong style={{ color: 'var(--text-primary)' }}>{d.value}</strong></span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Gráficos: Ventas por vendedor + Inventario por categoría ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>

        {/* Ventas por vendedor */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <UserCheck size={20} color={CHART_PURPLE} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Ventas por Vendedor</h3>
          </div>
          {salesBySeller.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '0.88rem' }}>Sin datos de ventas</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={salesBySeller.slice(0, 6)} margin={{ left: 10, right: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="seller_name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={v => v.split(' ')[0]} angle={-15} textAnchor="end" />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `$${(v / 1000000).toFixed(1)}M`} />
                <Tooltip content={<CustomTooltip isCurrency={true} />} />
                <Bar dataKey="total_revenue_cop" fill={CHART_PURPLE} radius={[4, 4, 0, 0]} name="Ingresos" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Inventario por categoría */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Layers size={20} color={CHART_AMBER} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Inventario por Categoría</h3>
          </div>
          {inventoryCharts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '0.88rem' }}>Sin productos en inventario</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '240px', overflowY: 'auto' }}>
              {inventoryCharts.map((cat, i) => {
                const maxVal = Math.max(...inventoryCharts.map((c: any) => c.retail_value || 0), 1);
                const pct = Math.round(((cat.retail_value || 0) / maxVal) * 100);
                const colors = [CHART_BLUE, CHART_GREEN, CHART_PURPLE, CHART_AMBER, '#f43f5e', '#06b6d4'];
                const color = colors[i % colors.length];
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{cat.category}</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{formatCOP(cat.retail_value || 0)}</span>
                    </div>
                    <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '3px', transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Acciones Rápidas ── */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>
          Accesos Rápidos
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {[
            { label: 'Usuarios', icon: <Users size={15} />, tab: 'users' },
            { label: 'Clientes', icon: <Users size={15} />, tab: 'customers' },
            { label: 'Productos', icon: <Package size={15} />, tab: 'products' },
            { label: 'Ventas', icon: <ShoppingCart size={15} />, tab: 'sales' },
            { label: 'Facturas', icon: <Receipt size={15} />, tab: 'invoices' },
            { label: 'Entregas', icon: <Truck size={15} />, tab: 'deliveries' },
            { label: 'Rutas GPS', icon: <TrendingUp size={15} />, tab: 'routes' },
            { label: 'Reportes', icon: <BarChart3 size={15} />, tab: 'reports' },
          ].map(({ label, icon, tab }) => (
            <button
              key={tab}
              className="btn btn-secondary btn-sm"
              onClick={() => onGoToTab ? onGoToTab(tab) : onGoToUsers()}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
            >
              {icon}
              {label}
              <ArrowRight size={12} />
            </button>
          ))}
        </div>
      </div>

    </div>
  );
};
