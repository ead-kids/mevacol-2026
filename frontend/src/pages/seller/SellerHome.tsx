import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Users,
  Receipt,
  Award,
  LogOut,
  ShieldAlert,
  ChevronRight,
  Package,
  Truck,
  TrendingUp,
  RefreshCw,
  Gift,
  X,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { ConnectionStatusBadge } from '../../components/common/ConnectionStatusBadge';
import { MEVACOL_LOGO } from '../../assets/logo';
import { SellerCustomers } from './SellerCustomers';
import { SellerProducts } from './SellerProducts';
import { SellerSales } from './SellerSales';
import { SellerDeliveries } from './SellerDeliveries';
import { SellerGpsTracker } from '../../components/seller/SellerGpsTracker';
import { api } from '../../services/api';
import type { DashboardSellerStats, ChartDataPoint, Campaign } from '../../types';

export const SellerHome: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'home' | 'sales' | 'customers' | 'products' | 'deliveries'>('home');
  const [salesMode, setSalesMode] = useState<'create' | 'history'>('create');
  const [sellerStats, setSellerStats] = useState<DashboardSellerStats | null>(null);
  const [trendData, setTrendData] = useState<ChartDataPoint[]>([]);
  const [activeCampaigns, setActiveCampaigns] = useState<Campaign[]>([]);
  const [isCampaignsModalOpen, setIsCampaignsModalOpen] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const fetchStats = async () => {
    setIsLoadingStats(true);
    try {
      const [dashRes, trendRes, campRes] = await Promise.allSettled([
        api.getDashboardSeller(),
        api.getDashboardChartsSellerTrend(),
        api.getActiveCampaigns(),
      ]);
      if (dashRes.status === 'fulfilled') setSellerStats(dashRes.value.data);
      if (trendRes.status === 'fulfilled') setTrendData(trendRes.value.data.daily || []);
      if (campRes.status === 'fulfilled') setActiveCampaigns(campRes.value.campaigns || []);
    } catch (err) {
      console.error('Error al cargar métricas de vendedor:', err);
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [activeTab]);

  const formatCOP = (val: number | undefined | null) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(val) || 0);

  const formatNum = (val: number) => new Intl.NumberFormat('es-CO').format(val);

  // Mini chart data from trend
  const chartData = trendData.slice(-14).map(d => ({
    day: (d.day || '').slice(5),
    revenue: d.revenue_cop,
    sales: d.sales_count,
  }));

  if (activeTab === 'customers') {
    return <SellerCustomers onBack={() => setActiveTab('home')} />;
  }

  if (activeTab === 'products') {
    return <SellerProducts onBack={() => setActiveTab('home')} />;
  }

  if (activeTab === 'sales') {
    return (
      <SellerSales
        onBack={() => {
          setActiveTab('home');
          fetchStats();
        }}
        initialMode={salesMode}
      />
    );
  }

  if (activeTab === 'deliveries') {
    return <SellerDeliveries onBack={() => setActiveTab('home')} />;
  }

  const handleLogout = async () => {
    try {
      await api.stopSellerLocation();
    } catch {}
    logout();
  };

  return (
    <div className="mobile-app-shell">
      {/* Top Mobile Bar */}
      <header className="mobile-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '10px',
            padding: '3px 6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            flexShrink: 0,
          }}>
            <img
              src={MEVACOL_LOGO}
              alt="MEVACOL"
              style={{
                height: '34px',
                width: 'auto',
                display: 'block',
                objectFit: 'contain',
              }}
            />
          </div>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '0.03em', color: '#ffffff' }}>
              MEVACOL
            </div>
            <div style={{ fontSize: '0.7rem', color: '#60a5fa', fontWeight: 600, textTransform: 'uppercase' }}>
              Distribuciones &bull; Vendedor
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="btn btn-secondary btn-sm"
          title="Cerrar Sesión"
          style={{ padding: '8px' }}
        >
          <LogOut size={16} />
        </button>
      </header>

      {/* Mobile Body */}
      <main className="mobile-body">
        {/* Banner de Saludo y Estado de Red */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Bienvenido de nuevo</div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700 }}>{user?.full_name}</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ConnectionStatusBadge />
            <button className="btn btn-secondary btn-sm" onClick={fetchStats} disabled={isLoadingStats} style={{ padding: '6px 8px' }} title="Actualizar">
              <RefreshCw size={14} style={{ animation: isLoadingStats ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          </div>
        </div>

        {/* Transmisor GPS en Jornada Laboral (Fase 7) */}
        <SellerGpsTracker />

        {/* KPI Cards: Ventas del día/semana/mes */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          <div className="glass-card" style={{ padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Hoy</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#34d399' }}>{formatCOP(sellerStats?.sales.today_revenue_cop || 0)}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{sellerStats?.sales.today_count || 0} ventas</div>
          </div>
          <div className="glass-card" style={{ padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Semana</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#60a5fa' }}>{formatCOP(sellerStats?.sales.week_revenue_cop || 0)}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{sellerStats?.sales.week_count || 0} ventas</div>
          </div>
          <div className="glass-card" style={{ padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Mes</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#c084fc' }}>{formatCOP(sellerStats?.sales.month_revenue_cop || 0)}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{sellerStats?.sales.month_count || 0} ventas</div>
          </div>
        </div>

        {/* Mini chart de tendencia */}
        {chartData.length > 1 && (
          <div className="glass-card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <TrendingUp size={16} color="#60a5fa" />
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Mis ventas — últimos 14 días</span>
            </div>
            <ResponsiveContainer width="100%" height={90}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="sellerGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => formatCOP(Number(v))} labelStyle={{ color: '#94a3b8', fontSize: '10px' }} contentStyle={{ background: '#1e293b', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px', fontSize: '11px' }} />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fill="url(#sellerGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Resumen adicional: clientes, facturas, entregas */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          <div className="glass-card" style={{ padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Clientes</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#34d399' }}>{formatNum(sellerStats?.customers.unique_customers || 0)}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>atendidos</div>
          </div>
          <div className="glass-card" style={{ padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Facturas</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#60a5fa' }}>{formatNum(sellerStats?.invoices.total || 0)}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>generadas</div>
          </div>
          <div className="glass-card" style={{ padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Entregas</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fbbf24' }}>{formatNum(sellerStats?.deliveries.total || 0)}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{sellerStats?.deliveries.pending || 0} pendientes</div>
          </div>
        </div>

        {/* Sección Destacada: Meta Comercial & Incentivo Activo */}
        {activeCampaigns.length > 0 && (() => {
          const camp = activeCampaigns[0];
          return (
            <div
              className="glass-card"
              style={{
                padding: '16px',
                border: '1px solid rgba(168, 85, 247, 0.4)',
                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.12) 0%, rgba(15, 23, 42, 0.8) 100%)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'rgba(168, 85, 247, 0.25)',
                      color: '#c084fc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Award size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: '#c084fc', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Meta Comercial Activa
                    </div>
                    <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#ffffff' }}>
                      {camp.name}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setIsCampaignsModalOpen(true)}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.72rem', padding: '4px 8px' }}
                >
                  Ver Detalle
                </button>
              </div>

              {/* Premio destacado */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#fbbf24', fontWeight: 700 }}>
                  <Gift size={15} />
                  <span>Premio: {camp.reward_description}</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {camp.days_remaining} días rest.
                </div>
              </div>

              {/* Barra de progreso */}
              <div style={{ marginBottom: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Progreso:</span>
                  <span style={{ fontWeight: 800, color: camp.is_completed ? '#34d399' : '#c084fc' }}>
                    {camp.progress_percent}%
                  </span>
                </div>
                <div style={{ height: '10px', borderRadius: '5px', background: 'rgba(255, 255, 255, 0.08)', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${camp.progress_percent}%`,
                      borderRadius: '5px',
                      background: camp.is_completed
                        ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
                        : 'linear-gradient(90deg, #8b5cf6 0%, #ec4899 100%)',
                      transition: 'width 0.5s ease',
                    }}
                  />
                </div>
              </div>

              {/* Detalle numérico: Acumulado vs Meta */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', marginTop: '6px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Vendido: </span>
                  <strong style={{ color: 'var(--text-primary)' }}>{formatCOP(camp.accumulated_cop)}</strong>
                  <span style={{ color: 'var(--text-muted)' }}> / {formatCOP(camp.target_amount_cop)}</span>
                </div>
                <div>
                  {camp.is_completed ? (
                    <span style={{ color: '#34d399', fontWeight: 800 }}>¡Premio Ganado! 🏆</span>
                  ) : (
                    <span style={{ color: '#fbbf24', fontWeight: 600 }}>Faltan {formatCOP(camp.remaining_cop)}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Accesos Rápidos Táctiles (Touch Targets Grandes para Celulares) */}
        <div>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
            Operaciones Comerciales
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Botón 1: Nueva Venta */}
            <div
              className="mobile-touch-card"
              onClick={() => {
                setSalesMode('create');
                setActiveTab('sales');
              }}
            >
              <div className="touch-icon-box blue">
                <ShoppingCart size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>Nueva Venta</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Seleccionar cliente y productos con descuento de stock</div>
              </div>
              <ChevronRight size={20} color="var(--text-muted)" />
            </div>

            {/* Botón 2: Catálogo de Productos & Precios (Fase 3) */}
            <div
              className="mobile-touch-card"
              onClick={() => setActiveTab('products')}
            >
              <div className="touch-icon-box" style={{ background: 'rgba(59, 130, 246, 0.18)', color: '#60a5fa' }}>
                <Package size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>Catálogo & Precios</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Consultar disponibilidad y precios COP</div>
              </div>
              <ChevronRight size={20} color="var(--text-muted)" />
            </div>

            {/* Botón 3: Mis Clientes */}
            <div
              className="mobile-touch-card"
              onClick={() => setActiveTab('customers')}
            >
              <div className="touch-icon-box green">
                <Users size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>Mis Clientes</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Directorio de clientes y registro</div>
              </div>
              <ChevronRight size={20} color="var(--text-muted)" />
            </div>

            {/* Botón 4: Mis Ventas / Historial */}
            <div
              className="mobile-touch-card"
              onClick={() => {
                setSalesMode('history');
                setActiveTab('sales');
              }}
            >
              <div className="touch-icon-box amber">
                <Receipt size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>Mis Ventas Realizadas</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Historial de pedidos y control de ventas</div>
              </div>
              <ChevronRight size={20} color="var(--text-muted)" />
            </div>

            {/* Botón 5: Facturas Comerciales (Fase 5) */}
            <div
              className="mobile-touch-card"
              onClick={() => {
                setSalesMode('history');
                setActiveTab('sales');
              }}
            >
              <div className="touch-icon-box" style={{ background: 'rgba(16, 185, 129, 0.18)', color: '#34d399' }}>
                <Receipt size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>Facturas Comerciales</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Consultar e imprimir facturas oficiales en PDF</div>
              </div>
              <ChevronRight size={20} color="var(--text-muted)" />
            </div>

            {/* Botón 6: Entregas y Despachos (Fase 6) */}
            <div
              className="mobile-touch-card"
              onClick={() => setActiveTab('deliveries')}
            >
              <div className="touch-icon-box" style={{ background: 'rgba(234, 179, 8, 0.18)', color: '#facc15' }}>
                <Truck size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>Mis Entregas y Despachos</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Seguimiento y estado de entrega de mis pedidos</div>
              </div>
              <ChevronRight size={20} color="var(--text-muted)" />
            </div>

            {/* Botón 7: Campañas e Incentivos */}
            <div
              className="mobile-touch-card"
              onClick={() => setIsCampaignsModalOpen(true)}
            >
              <div className="touch-icon-box purple">
                <Award size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>Metas e Incentivos</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {activeCampaigns.length > 0 ? `${activeCampaigns.length} meta(s) activa(s) · Premios` : 'Consultar metas y premios asignados'}
                </div>
              </div>
              <ChevronRight size={20} color="var(--text-muted)" />
            </div>
          </div>
        </div>

        {/* Tarjeta Informativa de Permisos y Restricciones */}
        <div className="glass-card" style={{ padding: '16px', background: 'rgba(15, 23, 42, 0.5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#93c5fd', marginBottom: '8px' }}>
            <ShieldAlert size={18} />
            <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>Seguridad y Permisos del Vendedor</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
            Como vendedor tienes acceso exclusivo a operaciones de campo. El sistema protege el inventario maestro, impidiendo alteraciones manuales de precios o modificaciones de usuarios.
          </p>
        </div>
      </main>

      {/* Bottom Mobile Navigation Bar */}
      <nav className="mobile-bottom-nav">
        <div
          className={`nav-tab-item ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => setActiveTab('home')}
        >
          <ShoppingCart size={20} />
          <span>Inicio</span>
        </div>

        <div
          className={`nav-tab-item ${(activeTab as string) === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          <Package size={20} />
          <span>Productos</span>
        </div>

        <div
          className={`nav-tab-item ${(activeTab as string) === 'customers' ? 'active' : ''}`}
          onClick={() => setActiveTab('customers')}
        >
          <Users size={20} />
          <span>Clientes</span>
        </div>

        <div
          className={`nav-tab-item ${(activeTab as string) === 'sales' ? 'active' : ''}`}
          onClick={() => {
            setSalesMode('history');
            setActiveTab('sales');
          }}
        >
          <Receipt size={20} />
          <span>Ventas</span>
        </div>

        <div
          className={`nav-tab-item ${(activeTab as string) === 'deliveries' ? 'active' : ''}`}
          onClick={() => setActiveTab('deliveries')}
        >
          <Truck size={20} />
          <span>Entregas</span>
        </div>

        <div className="nav-tab-item" onClick={logout} style={{ color: '#ef4444' }}>
          <LogOut size={20} />
          <span>Salir</span>
        </div>
      </nav>

      {/* Modal Móvil: Mis Metas e Incentivos Activos */}
      {isCampaignsModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px', width: '95%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={20} color="#c084fc" />
                <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Mis Metas e Incentivos</h3>
              </div>
              <button
                onClick={() => setIsCampaignsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '70vh', overflowY: 'auto' }}>
              {activeCampaigns.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)' }}>
                  <Award size={36} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                  <p style={{ fontSize: '0.9rem', margin: 0 }}>
                    Actualmente no tienes campañas comerciales asignadas activas.
                  </p>
                </div>
              ) : (
                activeCampaigns.map((camp) => (
                  <div
                    key={camp.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: camp.is_completed ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border-subtle)',
                      borderRadius: '10px',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                          {camp.name}
                        </div>
                        {camp.description && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {camp.description}
                          </div>
                        )}
                      </div>
                      <span
                        className={camp.is_completed ? 'badge badge-success' : 'badge'}
                        style={!camp.is_completed ? { background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' } : {}}
                      >
                        {camp.is_completed ? '🏆 Cumplida' : 'En Curso'}
                      </span>
                    </div>

                    <div
                      style={{
                        background: 'rgba(245, 158, 11, 0.1)',
                        border: '1px solid rgba(245, 158, 11, 0.25)',
                        borderRadius: '8px',
                        padding: '8px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#fbbf24', fontWeight: 700 }}>
                        <Gift size={16} />
                        <span>Premio: {camp.reward_description}</span>
                      </div>
                    </div>

                    {/* Barra de progreso */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Avance acumulado:</span>
                        <span style={{ fontWeight: 800, color: camp.is_completed ? '#34d399' : '#c084fc' }}>
                          {camp.progress_percent}%
                        </span>
                      </div>
                      <div style={{ height: '8px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.08)', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${camp.progress_percent}%`,
                            height: '100%',
                            borderRadius: '4px',
                            background: camp.is_completed
                              ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
                              : 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)',
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.78rem' }}>
                      <div>
                        <div style={{ color: 'var(--text-muted)' }}>Meta requerida:</div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatCOP(camp.target_amount_cop)}</div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-muted)' }}>Tus ventas válidas:</div>
                        <div style={{ fontWeight: 700, color: '#34d399' }}>{formatCOP(camp.accumulated_cop)}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>
                        Vence: {camp.end_date.split(' ')[0]} ({camp.days_remaining} días)
                      </span>
                      {camp.is_completed ? (
                        <span style={{ color: '#34d399', fontWeight: 700 }}>¡Meta lograda!</span>
                      ) : (
                        <span style={{ color: '#fbbf24', fontWeight: 600 }}>Faltan {formatCOP(camp.remaining_cop)}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setIsCampaignsModalOpen(false)}
                className="btn btn-primary btn-sm"
                style={{ width: '100%' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
