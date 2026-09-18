import React, { useState, useEffect } from 'react';
import {
  Truck,
  ArrowLeft,
  Search,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Package,
  History,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { api } from '../../services/api';
import type {
  Delivery,
  DeliveryStatus,
  DeliveryStats,
  AvailableSaleForDelivery,
} from '../../types';

interface SellerDeliveriesProps {
  onBack: () => void;
}

export const SellerDeliveries: React.FC<SellerDeliveriesProps> = ({ onBack }) => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [stats, setStats] = useState<DeliveryStats | null>(null);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODOS');

  // Modales
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [deliveryDetail, setDeliveryDetail] = useState<{
    delivery: Delivery;
    items: Delivery['items'];
    history: Delivery['history'];
  } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Modal Crear Entrega desde venta propia
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [availableSales, setAvailableSales] = useState<AvailableSaleForDelivery[]>([]);
  const [selectedSaleId, setSelectedSaleId] = useState('');
  const [scheduledDate, setScheduledDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [creating, setCreating] = useState(false);

  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const fetchStats = async () => {
    try {
      const res = await api.getDeliveryStats();
      if (res.success) setStats(res.stats);
    } catch (err) {
      console.error('Error al cargar métricas de entregas:', err);
    }
  };

  const fetchDeliveries = async () => {
    setLoading(true);
    try {
      const res = await api.getDeliveries({
        search: searchTerm || undefined,
        status: statusFilter !== 'TODOS' ? statusFilter : undefined,
      });
      if (res.success) {
        setDeliveries(res.deliveries);
      }
    } catch (err) {
      console.error('Error al cargar entregas del vendedor:', err);
      showNotification('error', 'No se pudieron cargar las entregas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchDeliveries();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDeliveries();
  };

  const openCreateModal = async () => {
    try {
      const res = await api.getAvailableSalesForDelivery();
      if (res.success) {
        setAvailableSales(res.sales);
        if (res.sales.length > 0) {
          setSelectedSaleId(res.sales[0].id);
        } else {
          setSelectedSaleId('');
        }
      }
      setScheduledDate(new Date().toISOString().split('T')[0]);
      setDeliveryNotes('');
      setIsCreateOpen(true);
    } catch (err) {
      console.error('Error al consultar ventas disponibles:', err);
      showNotification('error', 'Error al consultar ventas disponibles.');
    }
  };

  const handleCreateDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSaleId) {
      showNotification('error', 'Debes seleccionar una venta.');
      return;
    }

    setCreating(true);
    try {
      const res = await api.createDelivery({
        sale_id: selectedSaleId,
        scheduled_date: scheduledDate,
        notes: deliveryNotes || undefined,
      });

      if (res.success) {
        showNotification('success', res.message);
        setIsCreateOpen(false);
        fetchDeliveries();
        fetchStats();
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Error al crear la entrega.');
    } finally {
      setCreating(false);
    }
  };

  const openDetail = async (delivery: Delivery) => {
    setSelectedDelivery(delivery);
    setLoadingDetail(true);
    try {
      const res = await api.getDeliveryById(delivery.id);
      if (res.success) {
        setDeliveryDetail(res);
      }
    } catch (err) {
      console.error('Error al cargar detalle de entrega:', err);
      showNotification('error', 'Error al cargar detalles de la entrega.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const getStatusBadge = (status: DeliveryStatus) => {
    switch (status) {
      case 'PENDIENTE':
        return <span className="badge badge-warning">Pendiente</span>;
      case 'ASIGNADA':
        return <span className="badge badge-delivery">Asignada</span>;
      case 'EN_CAMINO':
        return <span className="badge badge-seller">En Camino</span>;
      case 'ENTREGADA':
        return <span className="badge badge-success">Entregada</span>;
      case 'NO_ENTREGADA':
        return <span className="badge badge-danger">No Entregada</span>;
      case 'CANCELADA':
        return (
          <span
            className="badge"
            style={{ background: 'rgba(148, 163, 184, 0.2)', color: '#cbd5e1' }}
          >
            Cancelada
          </span>
        );
      default:
        return <span className="badge">{status}</span>;
    }
  };

  const selectedSaleObj = availableSales.find((s) => s.id === selectedSaleId);

  return (
    <div className="mobile-app-shell" style={{ paddingBottom: '30px' }}>
      {/* Top Header Mobile */}
      <header className="mobile-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={onBack}
            className="btn btn-secondary btn-sm"
            style={{ padding: '8px' }}
            title="Volver"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff' }}>
              Entregas de Mis Ventas
            </div>
            <div style={{ fontSize: '0.7rem', color: '#93c5fd', textTransform: 'uppercase' }}>
              Logística &bull; Despachos en Tiempo Real
            </div>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="btn btn-primary btn-sm"
          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
        >
          <Plus size={15} />
          <span>Despachar</span>
        </button>
      </header>

      {/* Notificación Toast */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 1000,
            padding: '10px 16px',
            borderRadius: 'var(--radius-md)',
            background:
              notification.type === 'success'
                ? 'rgba(16, 185, 129, 0.95)'
                : 'rgba(239, 68, 68, 0.95)',
            color: '#fff',
            fontWeight: 600,
            fontSize: '0.85rem',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 size={16} />
          ) : (
            <AlertCircle size={16} />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Contenido Principal */}
      <main className="mobile-body">
        {/* Métricas Rápidas para el Vendedor */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            marginBottom: '12px',
          }}
        >
          <div
            className="glass-card"
            style={{ padding: '10px', textAlign: 'center' }}
          >
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fbbf24' }}>
              {stats?.pending_count ?? 0}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Por Asignar
            </div>
          </div>

          <div
            className="glass-card"
            style={{ padding: '10px', textAlign: 'center' }}
          >
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#38bdf8' }}>
              {(stats?.assigned_count ?? 0) + (stats?.on_the_way_count ?? 0)}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              En Ruta
            </div>
          </div>

          <div
            className="glass-card"
            style={{ padding: '10px', textAlign: 'center' }}
          >
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#34d399' }}>
              {stats?.delivered_count ?? 0}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Entregadas
            </div>
          </div>
        </div>

        {/* Buscador y Filtro */}
        <div className="glass-card" style={{ padding: '12px', marginBottom: '14px' }}>
          <form
            onSubmit={handleSearchSubmit}
            style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}
          >
            <div style={{ flex: 1, position: 'relative' }}>
              <Search
                size={16}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '10px', top: '10px' }}
              />
              <input
                type="text"
                placeholder="Buscar cliente, código..."
                className="form-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '32px', width: '100%', fontSize: '0.85rem' }}
              />
            </div>
            <button type="submit" className="btn btn-secondary btn-sm" style={{ padding: '8px 12px' }}>
              Buscar
            </button>
          </form>

          {/* Chips de filtro por estado */}
          <div
            style={{
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
              paddingBottom: '4px',
            }}
          >
            {['TODOS', 'PENDIENTE', 'ASIGNADA', 'EN_CAMINO', 'ENTREGADA', 'NO_ENTREGADA'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '16px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background:
                    statusFilter === st ? 'var(--primary)' : 'rgba(255, 255, 255, 0.08)',
                  color: statusFilter === st ? '#fff' : 'var(--text-secondary)',
                  whiteSpace: 'nowrap',
                }}
              >
                {st === 'TODOS'
                  ? 'Todas'
                  : st === 'EN_CAMINO'
                  ? 'En Camino'
                  : st === 'NO_ENTREGADA'
                  ? 'Novedad'
                  : st}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de Entregas del Vendedor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
              <RefreshCw size={22} className="animate-spin text-primary" style={{ margin: '0 auto 8px auto' }} />
              <p style={{ fontSize: '0.85rem' }}>Cargando entregas de tus ventas...</p>
            </div>
          ) : deliveries.length === 0 ? (
            <div
              className="glass-card"
              style={{ padding: '30px 16px', textAlign: 'center', color: 'var(--text-muted)' }}
            >
              <Truck size={36} style={{ margin: '0 auto 8px auto', opacity: 0.4 }} />
              <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem' }}>Sin entregas registradas</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem' }}>
                Despacha una venta desde el botón superior para crear una entrega.
              </p>
            </div>
          ) : (
            deliveries.map((d) => (
              <div
                key={d.id}
                className="glass-card"
                onClick={() => openDetail(d)}
                style={{
                  padding: '14px',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '6px',
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontWeight: 800,
                        fontSize: '0.9rem',
                        color: 'var(--primary)',
                      }}
                    >
                      {d.delivery_code}
                    </span>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        marginLeft: '8px',
                      }}
                    >
                      Ref: {d.sale_code}
                    </span>
                  </div>
                  <div>{getStatusBadge(d.status)}</div>
                </div>

                <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '4px' }}>
                  {d.customer_name}
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)',
                    marginBottom: '4px',
                  }}
                >
                  <MapPin size={13} color="#38bdf8" />
                  <span>
                    {d.delivery_address} &bull; {d.delivery_city}
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.78rem',
                    paddingTop: '8px',
                    marginTop: '6px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <div style={{ color: 'var(--text-muted)' }}>
                    Entregador:{' '}
                    <strong style={{ color: d.deliverer_name ? '#93c5fd' : '#fbbf24' }}>
                      {d.deliverer_name || 'Por asignar'}
                    </strong>
                  </div>
                  <div style={{ fontWeight: 700, color: '#10b981', fontFamily: 'monospace' }}>
                    {formatCOP(d.sale_total_cop || 0)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* =========================================================================
          MODAL: CREAR ENTREGA (Vendedor)
          ========================================================================= */}
      {isCreateOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Truck size={18} color="var(--primary)" />
                <h3 style={{ fontSize: '1.1rem' }}>Despachar Venta a Entrega</h3>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="btn-close">
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateDelivery}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Seleccionar Venta *
                  </label>
                  {availableSales.length === 0 ? (
                    <div
                      style={{
                        padding: '10px',
                        background: 'rgba(245, 158, 11, 0.1)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.8rem',
                        color: '#fde68a',
                      }}
                    >
                      No tienes ventas pendientes sin despachar.
                    </div>
                  ) : (
                    <select
                      className="form-input"
                      value={selectedSaleId}
                      onChange={(e) => setSelectedSaleId(e.target.value)}
                      required
                      style={{ width: '100%', fontSize: '0.85rem' }}
                    >
                      {availableSales.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.sale_code} &bull; {s.customer_name} &bull; {formatCOP(s.total_cop)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {selectedSaleObj && (
                  <div
                    style={{
                      background: 'rgba(15, 23, 42, 0.6)',
                      padding: '10px',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.8rem',
                      lineHeight: '1.4',
                    }}
                  >
                    <div><strong>Cliente:</strong> {selectedSaleObj.customer_name}</div>
                    <div><strong>Teléfono:</strong> {selectedSaleObj.customer_phone || 'No registrado'}</div>
                    <div><strong>Dirección:</strong> {selectedSaleObj.customer_address} - {selectedSaleObj.customer_city}</div>
                    <div style={{ color: '#10b981', fontWeight: 'bold', marginTop: '2px' }}>
                      Total: {formatCOP(selectedSaleObj.total_cop)}
                    </div>
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Fecha Programada de Entrega *
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    required
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Instrucciones de Despacho (Opcional)
                  </label>
                  <textarea
                    className="form-input"
                    rows={2}
                    placeholder="Instrucciones para el entregador..."
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    style={{ width: '100%', resize: 'vertical', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating || availableSales.length === 0}
                  className="btn btn-primary btn-sm"
                >
                  {creating ? 'Despachando...' : 'Crear Entrega'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: DETALLE Y ESTADO DE LA ENTREGA (Vendedor)
          ========================================================================= */}
      {selectedDelivery && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1.1rem', margin: 0 }}>
                  Detalle {selectedDelivery.delivery_code}
                </h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Venta: {selectedDelivery.sale_code}
                </div>
              </div>
              <button onClick={() => setSelectedDelivery(null)} className="btn-close">
                &times;
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {loadingDetail ? (
                <div style={{ textAlign: 'center', padding: '30px' }}>
                  <RefreshCw size={20} className="animate-spin text-primary" style={{ margin: '0 auto 6px auto' }} />
                  <p style={{ fontSize: '0.82rem' }}>Cargando información...</p>
                </div>
              ) : deliveryDetail ? (
                <>
                  {/* Estado y Destino */}
                  <div
                    style={{
                      background: 'rgba(15, 23, 42, 0.6)',
                      padding: '12px',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.82rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Estado:</span>
                      {getStatusBadge(deliveryDetail.delivery.status)}
                    </div>
                    <div><strong>Cliente:</strong> {deliveryDetail.delivery.customer_name}</div>
                    <div>
                      <strong>Teléfono:</strong>{' '}
                      <a href={`tel:${deliveryDetail.delivery.customer_phone}`} style={{ color: '#10b981' }}>
                        {deliveryDetail.delivery.customer_phone || 'No registrado'}
                      </a>
                    </div>
                    <div><strong>Dirección:</strong> {deliveryDetail.delivery.delivery_address} ({deliveryDetail.delivery.delivery_city})</div>
                    <div><strong>Programada:</strong> {deliveryDetail.delivery.scheduled_date}</div>
                    <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      <strong>Entregador:</strong>{' '}
                      <span style={{ color: '#93c5fd' }}>
                        {deliveryDetail.delivery.deliverer_name || 'En espera de asignación'}
                      </span>
                    </div>
                  </div>

                  {/* Productos */}
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Package size={14} color="var(--primary)" />
                      <span>Artículos de la Entrega</span>
                    </div>
                    <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: 'var(--radius-md)', padding: '8px' }}>
                      {deliveryDetail.items?.map((it) => (
                        <div
                          key={it.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '6px 0',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            fontSize: '0.8rem',
                          }}
                        >
                          <div>
                            <strong>{it.quantity}x</strong> {it.product_name}
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{it.product_code}</div>
                          </div>
                          <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>
                            {formatCOP(it.total_cop)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Línea de Tiempo / Historial de Estados */}
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <History size={14} color="var(--text-muted)" />
                      <span>Historial de la Entrega</span>
                    </div>
                    <div style={{ background: 'rgba(15, 23, 42, 0.4)', borderRadius: 'var(--radius-md)', padding: '10px' }}>
                      {deliveryDetail.history && deliveryDetail.history.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {deliveryDetail.history.map((h, idx) => (
                            <div key={h.id || idx} style={{ fontSize: '0.78rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                                <span style={{ color: 'var(--primary)' }}>{h.to_status}</span>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                                  {new Date(h.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <div style={{ color: 'var(--text-secondary)' }}>{h.notes || 'Sin nota'}</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Por: {h.changed_by_user_name}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Sin historial registrado</div>
                      )}
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            <div className="modal-footer">
              <button onClick={() => setSelectedDelivery(null)} className="btn btn-secondary btn-sm" style={{ width: '100%' }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
