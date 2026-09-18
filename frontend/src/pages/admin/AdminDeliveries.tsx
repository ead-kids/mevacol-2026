import React, { useState, useEffect, useId } from 'react';
import {
  Truck,
  Search,
  Filter,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Navigation,
  UserCheck,
  Calendar,
  Phone,
  MapPin,
  FileText,
  Package,
  History,
  Eye,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { api } from '../../services/api';
import { mapService } from '../../services/mapService';
import type {
  Delivery,
  DeliveryStatus,
  DeliveryStats,
  DelivererUser,
  AvailableSaleForDelivery,
} from '../../types';

export const AdminDeliveries: React.FC = () => {
  const searchInputId = useId();
  const filterStatusId = useId();
  const filterDelivererId = useId();
  const createSaleSelectId = useId();
  const createDateId = useId();
  const createDelivererId = useId();
  const detailAssignSelectId = useId();
  const detailStatusSelectId = useId();

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [stats, setStats] = useState<DeliveryStats | null>(null);
  const [deliverers, setDeliverers] = useState<DelivererUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [delivererFilter, setDelivererFilter] = useState('');

  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [deliveryDetail, setDeliveryDetail] = useState<{
    delivery: Delivery;
    items: Delivery['items'];
    history: Delivery['history'];
  } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Formulario Nueva Entrega
  const [availableSales, setAvailableSales] = useState<AvailableSaleForDelivery[]>([]);
  const [selectedSaleId, setSelectedSaleId] = useState('');
  const [selectedDelivererId, setSelectedDelivererId] = useState('');
  const [scheduledDate, setScheduledDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [creatingDelivery, setCreatingDelivery] = useState(false);

  // Formulario Reasignar / Cambiar Estado en Detalle
  const [newDelivererId, setNewDelivererId] = useState('');
  const [reassignNotes, setReassignNotes] = useState('');
  const [assigningDeliverer, setAssigningDeliverer] = useState(false);

  const [newStatus, setNewStatus] = useState<DeliveryStatus | ''>('');
  const [statusNotes, setStatusNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

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

  const fetchStatsAndDeliverers = async () => {
    try {
      const [statsRes, delivRes] = await Promise.all([
        api.getDeliveryStats(),
        api.getDeliverers(),
      ]);
      if (statsRes.success) setStats(statsRes.stats);
      if (delivRes.success) setDeliverers(delivRes.deliverers);
    } catch (err) {
      console.error('Error al cargar datos auxiliares:', err);
    }
  };

  const fetchDeliveries = async () => {
    setLoading(true);
    try {
      const res = await api.getDeliveries({
        search: searchTerm || undefined,
        status: statusFilter !== 'TODOS' ? statusFilter : undefined,
        deliverer_id: delivererFilter || undefined,
      });
      if (res.success) {
        setDeliveries(res.deliveries);
      }
    } catch (err) {
      console.error('Error al cargar entregas:', err);
      showNotification('error', 'No se pudieron cargar las entregas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatsAndDeliverers();
  }, []);

  useEffect(() => {
    fetchDeliveries();
  }, [statusFilter, delivererFilter]);

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
      setSelectedDelivererId('');
      setScheduledDate(new Date().toISOString().split('T')[0]);
      setDeliveryNotes('');
      setIsCreateModalOpen(true);
    } catch (err) {
      console.error('Error al cargar ventas disponibles:', err);
      showNotification('error', 'Error al consultar ventas disponibles.');
    }
  };

  const handleCreateDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSaleId) {
      showNotification('error', 'Debes seleccionar una venta.');
      return;
    }

    setCreatingDelivery(true);
    try {
      const res = await api.createDelivery({
        sale_id: selectedSaleId,
        scheduled_date: scheduledDate,
        delivery_user_id: selectedDelivererId || undefined,
        notes: deliveryNotes || undefined,
      });

      if (res.success) {
        showNotification('success', res.message);
        setIsCreateModalOpen(false);
        fetchDeliveries();
        fetchStatsAndDeliverers();
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Error al crear la entrega.');
    } finally {
      setCreatingDelivery(false);
    }
  };

  const openDeliveryDetail = async (delivery: Delivery) => {
    setSelectedDelivery(delivery);
    setLoadingDetail(true);
    setNewDelivererId(delivery.delivery_user_id || '');
    setReassignNotes('');
    setNewStatus('');
    setStatusNotes('');

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

  const handleAssignDeliverer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveryDetail) return;

    setAssigningDeliverer(true);
    try {
      const res = await api.assignDeliverer(deliveryDetail.delivery.id, {
        delivery_user_id: newDelivererId || null,
        notes: reassignNotes || undefined,
      });

      if (res.success) {
        showNotification('success', res.message);
        setReassignNotes('');
        const refreshed = await api.getDeliveryById(deliveryDetail.delivery.id);
        if (refreshed.success) {
          setDeliveryDetail(refreshed);
          setSelectedDelivery(refreshed.delivery);
        }
        fetchDeliveries();
        fetchStatsAndDeliverers();
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Error al asignar entregador.');
    } finally {
      setAssigningDeliverer(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveryDetail || !newStatus) return;

    if (
      (newStatus === 'NO_ENTREGADA' || newStatus === 'CANCELADA') &&
      (!statusNotes || !statusNotes.trim())
    ) {
      showNotification('error', 'Es obligatorio ingresar una observación o motivo.');
      return;
    }

    setUpdatingStatus(true);
    try {
      const res = await api.updateDeliveryStatus(deliveryDetail.delivery.id, {
        status: newStatus as DeliveryStatus,
        notes: statusNotes || undefined,
      });

      if (res.success) {
        showNotification('success', res.message);
        setNewStatus('');
        setStatusNotes('');
        const refreshed = await api.getDeliveryById(deliveryDetail.delivery.id);
        if (refreshed.success) {
          setDeliveryDetail(refreshed);
          setSelectedDelivery(refreshed.delivery);
        }
        fetchDeliveries();
        fetchStatsAndDeliverers();
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Error al cambiar estado.');
    } finally {
      setUpdatingStatus(false);
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
    <div className="admin-deliveries-page" style={{ paddingBottom: '40px' }}>
      {/* Notificación flotante */}
      {notification && (
        <div
          className={`toast-notification ${
            notification.type === 'success' ? 'toast-success' : 'toast-error'
          }`}
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 1000,
            padding: '12px 20px',
            borderRadius: 'var(--radius-md)',
            background:
              notification.type === 'success'
                ? 'rgba(16, 185, 129, 0.95)'
                : 'rgba(239, 68, 68, 0.95)',
            color: '#fff',
            fontWeight: 600,
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 size={18} />
          ) : (
            <AlertCircle size={18} />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Encabezado y Acción Principal */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>
            Módulo de Entregas &bull; Fase 6
          </h2>
          <p
            style={{
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
              marginTop: '4px',
            }}
          >
            Gestión logística, despacho de ventas, asignación de entregadores y trazabilidad
          </p>
        </div>

        <button onClick={openCreateModal} className="btn btn-primary">
          <Plus size={18} />
          <span>Nueva Entrega</span>
        </button>
      </div>

      {/* Tarjetas de Métricas (KPIs de Entregas) */}
      <div className="kpi-grid" style={{ marginBottom: '24px' }}>
        <div className="kpi-card">
          <div className="kpi-icon blue">
            <Truck size={24} />
          </div>
          <div className="kpi-value">{stats?.total_deliveries ?? 0}</div>
          <div className="kpi-label">Total Entregas</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon amber">
            <Clock size={24} />
          </div>
          <div className="kpi-value">{stats?.pending_count ?? 0}</div>
          <div className="kpi-label">Pendientes por Asignar</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon purple">
            <UserCheck size={24} />
          </div>
          <div className="kpi-value">{stats?.assigned_count ?? 0}</div>
          <div className="kpi-label">Asignadas a Entregador</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon blue">
            <Navigation size={24} />
          </div>
          <div className="kpi-value">{stats?.on_the_way_count ?? 0}</div>
          <div className="kpi-label">En Camino</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon green">
            <CheckCircle2 size={24} />
          </div>
          <div className="kpi-value">{stats?.delivered_count ?? 0}</div>
          <div className="kpi-label">Entregadas con Éxito</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon red">
            <XCircle size={24} />
          </div>
          <div className="kpi-value">{stats?.failed_count ?? 0}</div>
          <div className="kpi-label">No Entregadas / Novedad</div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="glass-card" style={{ padding: '16px', marginBottom: '20px' }}>
        <form
          onSubmit={handleSearchSubmit}
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          {/* Buscador */}
          <div
            style={{
              flex: '1 1 240px',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Search
              size={18}
              color="var(--text-muted)"
              style={{ position: 'absolute', left: '12px' }}
            />
            <label htmlFor={searchInputId} className="sr-only">
              Buscar entrega
            </label>
            <input
              id={searchInputId}
              type="text"
              placeholder="Buscar por código, cliente, dirección o factura..."
              className="form-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '38px', width: '100%' }}
            />
          </div>

          {/* Filtro por Estado */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={16} color="var(--text-muted)" />
            <label htmlFor={filterStatusId} className="sr-only">
              Filtrar por estado
            </label>
            <select
              id={filterStatusId}
              className="form-input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ minWidth: '150px' }}
            >
              <option value="TODOS">Todos los Estados</option>
              <option value="PENDIENTE">Pendientes</option>
              <option value="ASIGNADA">Asignadas</option>
              <option value="EN_CAMINO">En Camino</option>
              <option value="ENTREGADA">Entregadas</option>
              <option value="NO_ENTREGADA">No Entregadas</option>
              <option value="CANCELADA">Canceladas</option>
            </select>
          </div>

          {/* Filtro por Entregador */}
          <label htmlFor={filterDelivererId} className="sr-only">
            Filtrar por entregador
          </label>
          <select
            id={filterDelivererId}
            className="form-input"
            value={delivererFilter}
            onChange={(e) => setDelivererFilter(e.target.value)}
            style={{ minWidth: '170px' }}
          >
            <option value="">Todos los Entregadores</option>
            {deliverers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.full_name}
              </option>
            ))}
          </select>

          <button type="submit" className="btn btn-secondary btn-sm">
            Buscar
          </button>

          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('TODOS');
              setDelivererFilter('');
            }}
            className="btn btn-ghost btn-sm"
            title="Restablecer filtros"
          >
            <RefreshCw size={14} />
          </button>
        </form>
      </div>

      {/* Tabla de Entregas */}
      <div className="table-responsive glass-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Venta / Factura</th>
              <th>Cliente &bull; Ciudad</th>
              <th>Dirección</th>
              <th>Programada</th>
              <th>Entregador</th>
              <th style={{ textAlign: 'center' }}>Estado</th>
              <th style={{ textAlign: 'right' }}>Total COP</th>
              <th style={{ textAlign: 'center' }}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '32px' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <RefreshCw size={18} className="animate-spin text-primary" />
                    <span>Cargando entregas...</span>
                  </div>
                </td>
              </tr>
            ) : deliveries.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}
                >
                  <Truck size={36} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
                  <p style={{ margin: 0, fontWeight: 600 }}>No se encontraron entregas</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem' }}>
                    Crea una nueva entrega desde el botón superior o ajusta los filtros.
                  </p>
                </td>
              </tr>
            ) : (
              deliveries.map((d) => (
                <tr key={d.id}>
                  <td>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>
                      {d.delivery_code}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                      {d.sale_code || 'VTA'}
                    </div>
                    {d.invoice_code && (
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: '#10b981',
                          fontFamily: 'monospace',
                        }}
                      >
                        {d.invoice_code}
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{d.customer_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {d.delivery_city}
                    </div>
                  </td>
                  <td>
                    <div
                      style={{
                        maxWidth: '180px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={d.delivery_address}
                    >
                      {d.delivery_address}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
                      <Calendar size={13} color="var(--text-muted)" />
                      <span>{d.scheduled_date}</span>
                    </div>
                  </td>
                  <td>
                    {d.deliverer_name ? (
                      <span style={{ fontWeight: 600, color: '#93c5fd' }}>
                        {d.deliverer_name}
                      </span>
                    ) : (
                      <span
                        style={{
                          color: 'var(--warning)',
                          fontSize: '0.8rem',
                          fontStyle: 'italic',
                        }}
                      >
                        Sin asignar
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>{getStatusBadge(d.status)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>
                    {formatCOP(d.sale_total_cop || 0)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      onClick={() => openDeliveryDetail(d)}
                      className="btn btn-secondary btn-sm"
                      title="Ver detalle y gestionar"
                      style={{ padding: '6px 10px' }}
                    >
                      <Eye size={15} />
                      <span>Detalle</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* =========================================================================
          MODAL: NUEVA ENTREGA
          ========================================================================= */}
      {isCreateModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Truck size={20} color="var(--primary)" />
                <h3 style={{ fontSize: '1.2rem' }}>Crear y Despachar Entrega</h3>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="btn-close">
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateDelivery}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Selector de Venta */}
                <div>
                  <label
                    htmlFor={createSaleSelectId}
                    style={{
                      display: 'block',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      marginBottom: '6px',
                    }}
                  >
                    Seleccionar Venta a Despachar *
                  </label>
                  {availableSales.length === 0 ? (
                    <div
                      style={{
                        padding: '12px',
                        background: 'rgba(245, 158, 11, 0.1)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.85rem',
                        color: '#fde68a',
                      }}
                    >
                      No hay ventas pendientes sin entrega activa en este momento.
                    </div>
                  ) : (
                    <select
                      id={createSaleSelectId}
                      className="form-input"
                      value={selectedSaleId}
                      onChange={(e) => setSelectedSaleId(e.target.value)}
                      required
                      style={{ width: '100%' }}
                    >
                      {availableSales.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.sale_code} &bull; {s.customer_name} &bull; {formatCOP(s.total_cop)} (
                          {s.invoice_code || 'Sin FAC'})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Resumen de la Venta Seleccionada */}
                {selectedSaleObj && (
                  <div
                    style={{
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 16px',
                      fontSize: '0.85rem',
                    }}
                  >
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: '8px',
                      }}
                    >
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>
                          Cliente:
                        </span>
                        <strong>{selectedSaleObj.customer_name}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>
                          Teléfono:
                        </span>
                        <span>{selectedSaleObj.customer_phone || 'No registrado'}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>
                          Ciudad &bull; Dirección:
                        </span>
                        <span>
                          {selectedSaleObj.customer_city || 'Medellín'} &bull;{' '}
                          {selectedSaleObj.customer_address || 'Sin dirección'}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>
                          Total Venta:
                        </span>
                        <strong style={{ color: '#10b981' }}>
                          {formatCOP(selectedSaleObj.total_cop)}
                        </strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* Fecha Programada y Asignación */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '16px',
                  }}
                >
                  <div>
                    <label
                      htmlFor={createDateId}
                      style={{
                        display: 'block',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        marginBottom: '6px',
                      }}
                    >
                      Fecha Programada de Entrega *
                    </label>
                    <input
                      id={createDateId}
                      type="date"
                      className="form-input"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      required
                      style={{ width: '100%' }}
                    >
                    </input>
                  </div>

                  <div>
                    <label
                      htmlFor={createDelivererId}
                      style={{
                        display: 'block',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        marginBottom: '6px',
                      }}
                    >
                      Asignar Entregador (Opcional)
                    </label>
                    <select
                      id={createDelivererId}
                      className="form-input"
                      value={selectedDelivererId}
                      onChange={(e) => setSelectedDelivererId(e.target.value)}
                      style={{ width: '100%' }}
                    >
                      <option value="">Dejar pendiente por asignar</option>
                      {deliverers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.full_name} ({d.phone || 'Sin tel.'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Observaciones de Entrega */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      marginBottom: '6px',
                    }}
                  >
                    Observaciones / Indicaciones para el Entregador
                  </label>
                  <textarea
                    className="form-input"
                    rows={2}
                    placeholder="Ej. Entregar en portería, timbrar en el apto 302, llamar antes de llegar..."
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingDelivery || availableSales.length === 0}
                  className="btn btn-primary btn-sm"
                >
                  {creatingDelivery ? 'Creando...' : 'Confirmar y Despachar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: DETALLE Y GESTIÓN DE ENTREGA (Historial, Asignación, Productos)
          ========================================================================= */}
      {selectedDelivery && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '780px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.2rem' }}>📦</span>
                <div>
                  <h3 style={{ fontSize: '1.2rem', margin: 0 }}>
                    Entrega {selectedDelivery.delivery_code}
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Venta ref: <strong style={{ color: 'var(--text-primary)' }}>{selectedDelivery.sale_code}</strong>{' '}
                    {selectedDelivery.invoice_code && `• Factura: ${selectedDelivery.invoice_code}`}
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedDelivery(null)} className="btn-close">
                &times;
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {loadingDetail ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <RefreshCw size={24} className="animate-spin text-primary" style={{ margin: '0 auto 8px auto' }} />
                  <p>Cargando información completa...</p>
                </div>
              ) : deliveryDetail ? (
                <>
                  {/* Tarjeta 1: Estado y Destino */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: '14px',
                      background: 'rgba(15, 23, 42, 0.7)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                        Estado Actual:
                      </span>
                      <div style={{ marginTop: '4px' }}>
                        {getStatusBadge(deliveryDetail.delivery.status)}
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                        Cliente:
                      </span>
                      <strong style={{ fontSize: '0.95rem' }}>
                        {deliveryDetail.delivery.customer_name}
                      </strong>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        NIT/CC: {deliveryDetail.delivery.customer_id_number || 'Sin registrar'}
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                        Contacto &bull; Teléfono:
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                        <Phone size={14} color="#10b981" />
                        <a
                          href={`tel:${deliveryDetail.delivery.customer_phone}`}
                          style={{ color: '#10b981', fontWeight: 600, textDecoration: 'none' }}
                        >
                          {deliveryDetail.delivery.customer_phone || 'No registrado'}
                        </a>
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                        Dirección de Entrega:
                      </span>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginTop: '2px' }}>
                        <MapPin size={14} color="#38bdf8" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <span>
                          {deliveryDetail.delivery.delivery_address} ({deliveryDetail.delivery.delivery_city})
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                        <a
                          href={mapService.getGoogleMapsUrl({
                            lat: deliveryDetail.delivery.latitude,
                            lng: deliveryDetail.delivery.longitude,
                            address: deliveryDetail.delivery.delivery_address,
                            city: deliveryDetail.delivery.delivery_city,
                          })}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.74rem', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#60a5fa' }}
                        >
                          <Navigation size={12} /> Google Maps
                        </a>
                        <a
                          href={mapService.getWazeUrl({
                            lat: deliveryDetail.delivery.latitude,
                            lng: deliveryDetail.delivery.longitude,
                            address: deliveryDetail.delivery.delivery_address,
                            city: deliveryDetail.delivery.delivery_city,
                          })}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.74rem', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#38bdf8' }}
                        >
                          <ExternalLink size={12} /> Waze
                        </a>
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                        Fecha Programada:
                      </span>
                      <strong>{deliveryDetail.delivery.scheduled_date}</strong>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                        Entregador Asignado:
                      </span>
                      <strong style={{ color: '#93c5fd' }}>
                        {deliveryDetail.delivery.deliverer_name || 'Sin asignar'}
                      </strong>
                    </div>

                    {deliveryDetail.delivery.notes && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                          Observaciones de Despacho:
                        </span>
                        <div
                          style={{
                            background: 'rgba(255, 255, 255, 0.04)',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            fontSize: '0.85rem',
                            marginTop: '4px',
                          }}
                        >
                          {deliveryDetail.delivery.notes}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tarjeta 2: Productos y Cantidades que deben entregarse */}
                  <div>
                    <h4
                      style={{
                        fontSize: '0.95rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginBottom: '8px',
                      }}
                    >
                      <Package size={16} color="var(--primary)" />
                      <span>Productos a Entregar</span>
                    </h4>

                    <div
                      style={{
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden',
                      }}
                    >
                      <table className="data-table" style={{ fontSize: '0.82rem' }}>
                        <thead>
                          <tr>
                            <th>Código</th>
                            <th>Descripción</th>
                            <th style={{ textAlign: 'center' }}>Cant.</th>
                            <th>Presentación</th>
                            <th style={{ textAlign: 'right' }}>Total COP</th>
                          </tr>
                        </thead>
                        <tbody>
                          {deliveryDetail.items && deliveryDetail.items.length > 0 ? (
                            deliveryDetail.items.map((it) => (
                              <tr key={it.id}>
                                <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                                  {it.product_code}
                                </td>
                                <td>{it.product_name}</td>
                                <td
                                  style={{
                                    textAlign: 'center',
                                    fontWeight: 700,
                                    color: '#10b981',
                                  }}
                                >
                                  {it.quantity}
                                </td>
                                <td style={{ color: 'var(--text-muted)' }}>
                                  {it.unit_measure || 'Unidad'}
                                </td>
                                <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                                  {formatCOP(it.total_cop)}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                Sin detalle de productos
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Tarjeta 3: Acciones Administrativas (Asignar / Cambiar Estado) */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                      gap: '16px',
                    }}
                  >
                    {/* Sub-formulario Asignación */}
                    <div
                      style={{
                        background: 'rgba(15, 23, 42, 0.6)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '14px',
                      }}
                    >
                      <h5
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          marginBottom: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <UserCheck size={16} color="#38bdf8" />
                        <span>Asignar / Reasignar Entregador</span>
                      </h5>

                      <form onSubmit={handleAssignDeliverer}>
                        <div style={{ marginBottom: '10px' }}>
                          <label htmlFor={detailAssignSelectId} className="sr-only">
                            Seleccionar entregador
                          </label>
                          <select
                            id={detailAssignSelectId}
                            className="form-input"
                            value={newDelivererId}
                            onChange={(e) => setNewDelivererId(e.target.value)}
                            style={{ width: '100%', fontSize: '0.85rem' }}
                          >
                            <option value="">Sin entregador asignado</option>
                            {deliverers.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.full_name} ({d.phone || 'Sin tel.'})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div style={{ marginBottom: '10px' }}>
                          <input
                            type="text"
                            placeholder="Motivo o nota de asignación..."
                            className="form-input"
                            value={reassignNotes}
                            onChange={(e) => setReassignNotes(e.target.value)}
                            style={{ width: '100%', fontSize: '0.82rem' }}
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={assigningDeliverer}
                          className="btn btn-secondary btn-sm"
                          style={{ width: '100%' }}
                        >
                          {assigningDeliverer ? 'Guardando...' : 'Actualizar Asignación'}
                        </button>
                      </form>
                    </div>

                    {/* Sub-formulario Cambio de Estado */}
                    <div
                      style={{
                        background: 'rgba(15, 23, 42, 0.6)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '14px',
                      }}
                    >
                      <h5
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          marginBottom: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <FileText size={16} color="#fbbf24" />
                        <span>Actualizar Estado de Entrega</span>
                      </h5>

                      <form onSubmit={handleUpdateStatus}>
                        <div style={{ marginBottom: '10px' }}>
                          <label htmlFor={detailStatusSelectId} className="sr-only">
                            Seleccionar nuevo estado
                          </label>
                          <select
                            id={detailStatusSelectId}
                            className="form-input"
                            value={newStatus}
                            onChange={(e) =>
                              setNewStatus(e.target.value as DeliveryStatus)
                            }
                            required
                            style={{ width: '100%', fontSize: '0.85rem' }}
                          >
                            <option value="">Seleccionar nuevo estado...</option>
                            <option value="PENDIENTE">PENDIENTE</option>
                            <option value="ASIGNADA">ASIGNADA</option>
                            <option value="EN_CAMINO">EN CAMINO</option>
                            <option value="ENTREGADA">ENTREGADA</option>
                            <option value="NO_ENTREGADA">NO ENTREGADA</option>
                            <option value="CANCELADA">CANCELADA</option>
                          </select>
                        </div>

                        <div style={{ marginBottom: '10px' }}>
                          <input
                            type="text"
                            placeholder="Observación o novedad del cambio..."
                            className="form-input"
                            value={statusNotes}
                            onChange={(e) => setStatusNotes(e.target.value)}
                            style={{ width: '100%', fontSize: '0.82rem' }}
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={updatingStatus || !newStatus}
                          className="btn btn-primary btn-sm"
                          style={{ width: '100%' }}
                        >
                          {updatingStatus ? 'Actualizando...' : 'Cambiar Estado'}
                        </button>
                      </form>
                    </div>
                  </div>

                  {/* Tarjeta 4: Historial de Auditoría y Trazabilidad */}
                  <div>
                    <h4
                      style={{
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginBottom: '10px',
                      }}
                    >
                      <History size={16} color="var(--text-muted)" />
                      <span>Historial de Estados y Novedades</span>
                    </h4>

                    <div
                      style={{
                        background: 'rgba(15, 23, 42, 0.4)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '12px 16px',
                      }}
                    >
                      {deliveryDetail.history && deliveryDetail.history.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {deliveryDetail.history.map((h, idx) => (
                            <div
                              key={h.id || idx}
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '10px',
                                paddingBottom: '8px',
                                borderBottom:
                                  idx < deliveryDetail.history!.length - 1
                                    ? '1px solid rgba(255, 255, 255, 0.05)'
                                    : 'none',
                              }}
                            >
                              <div
                                style={{
                                  width: '8px',
                                  height: '8px',
                                  borderRadius: '50%',
                                  background: '#38bdf8',
                                  marginTop: '6px',
                                  flexShrink: 0,
                                }}
                              />
                              <div style={{ flex: 1, fontSize: '0.82rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <strong style={{ color: 'var(--text-primary)' }}>
                                    {h.to_status}
                                  </strong>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    {new Date(h.created_at).toLocaleString('es-CO')}
                                  </span>
                                </div>
                                <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                                  {h.notes || 'Sin observaciones'}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                  Por: {h.changed_by_user_name}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Sin historial registrado.
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                  No se pudo cargar la entrega.
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                onClick={() => setSelectedDelivery(null)}
                className="btn btn-secondary btn-sm"
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
