import React, { useState, useEffect } from 'react';
import {
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  LogOut,
  AlertTriangle,
  Users,
  Search,
  RefreshCw,
  Phone,
  Eye,
  X,
  AlertCircle,
  XCircle,
  Navigation,
  ExternalLink,
  Compass,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ConnectionStatusBadge } from '../../components/common/ConnectionStatusBadge';
import { MEVACOL_LOGO } from '../../assets/logo';
import { DeliveryCustomers } from './DeliveryCustomers';
import { DeliveryMap } from '../../components/maps/DeliveryMap';
import { LocationPermissionModal } from '../../components/maps/LocationPermissionModal';
import { mapService, MEVACOL_DEPOT } from '../../services/mapService';
import { api } from '../../services/api';
import type { Delivery, DeliveryStatus, DeliveryStats, DeliveryLocation, DashboardDelivererStats } from '../../types';

export const DeliveryHome: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'home' | 'deliveries' | 'map' | 'customers'>('home');
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [stats, setStats] = useState<DeliveryStats | null>(null);
  const [delivererDashboard, setDelivererDashboard] = useState<DashboardDelivererStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  const [searchTerm, setSearchTerm] = useState('');

  // Estado de GPS y Navegación
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [selectedMapDelivery, setSelectedMapDelivery] = useState<DeliveryLocation | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  const [routeDistanceKm, setRouteDistanceKm] = useState<number | null>(null);
  const [routeDurationMinutes, setRouteDurationMinutes] = useState<number | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);

  // Modales
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Modal Reportar Novedad (NO_ENTREGADA)
  const [issueDelivery, setIssueDelivery] = useState<Delivery | null>(null);
  const [issueReason, setIssueReason] = useState('');
  const [isSubmittingIssue, setIsSubmittingIssue] = useState(false);

  // Modal Confirmar Entrega
  const [confirmDelivery, setConfirmDelivery] = useState<Delivery | null>(null);
  const [deliveryNote, setDeliveryNote] = useState('');
  const [isSubmittingConfirm, setIsSubmittingConfirm] = useState(false);

  // Notificación flotante
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadData = async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) setIsLoading(true);
    else setIsRefreshing(true);
    try {
      const [deliveriesRes, statsRes, dashRes] = await Promise.allSettled([
        api.getDeliveries(),
        api.getDeliveryStats(),
        api.getDashboardDeliverer(),
      ]);
      if (deliveriesRes.status === 'fulfilled') setDeliveries(deliveriesRes.value.deliveries);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.stats);
      if (dashRes.status === 'fulfilled') setDelivererDashboard(dashRes.value.data);
    } catch (err: any) {
      console.error('Error al cargar entregas del entregador:', err);
      showNotification('error', err.message || 'Error al sincronizar entregas.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openDetail = async (delivery: Delivery) => {
    setLoadingDetail(true);
    setSelectedDelivery(delivery);
    try {
      const res = await api.getDeliveryById(delivery.id);
      setSelectedDelivery(res.delivery);
    } catch (err: any) {
      console.error('Error al cargar detalle de entrega:', err);
      showNotification('error', 'No se pudo cargar el detalle completo.');
    } finally {
      setLoadingDetail(false);
    }
  };

  // Iniciar Recorrido (EN_CAMINO)
  const handleStartTrip = async (deliveryId: string) => {
    try {
      await api.updateDeliveryStatus(deliveryId, {
        status: 'EN_CAMINO',
        notes: 'Entregador inició recorrido hacia la dirección del cliente.',
      });
      showNotification('success', '¡Ruta iniciada! Estado actualizado a EN CAMINO.');
      loadData(false);
      if (selectedDelivery && selectedDelivery.id === deliveryId) {
        const res = await api.getDeliveryById(deliveryId);
        setSelectedDelivery(res.delivery);
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Error al iniciar recorrido.');
    }
  };

  // Confirmar Entrega Realizada (ENTREGADA)
  const handleConfirmSubmit = async () => {
    if (!confirmDelivery) return;
    setIsSubmittingConfirm(true);
    try {
      await api.updateDeliveryStatus(confirmDelivery.id, {
        status: 'ENTREGADA',
        notes: deliveryNote.trim() || 'Entrega completada y recibida a satisfacción por el cliente.',
      });
      showNotification('success', `¡Entrega ${confirmDelivery.delivery_code} confirmada con éxito!`);
      setConfirmDelivery(null);
      setDeliveryNote('');
      loadData(false);
      if (selectedDelivery && selectedDelivery.id === confirmDelivery.id) {
        setSelectedDelivery(null);
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Error al confirmar entrega.');
    } finally {
      setIsSubmittingConfirm(false);
    }
  };

  // Reportar Novedad (NO_ENTREGADA)
  const handleIssueSubmit = async () => {
    if (!issueDelivery) return;
    if (!issueReason.trim()) {
      showNotification('error', 'Por favor describe el motivo por el cual no se pudo entregar.');
      return;
    }
    setIsSubmittingIssue(true);
    try {
      await api.updateDeliveryStatus(issueDelivery.id, {
        status: 'NO_ENTREGADA',
        notes: issueReason.trim(),
      });
      showNotification('success', `Novedad registrada para ${issueDelivery.delivery_code}.`);
      setIssueDelivery(null);
      setIssueReason('');
      loadData(false);
      if (selectedDelivery && selectedDelivery.id === issueDelivery.id) {
        setSelectedDelivery(null);
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Error al registrar novedad.');
    } finally {
      setIsSubmittingIssue(false);
    }
  };

  // Convertir entregas a ubicaciones georreferenciadas para el mapa
  const deliveryLocations: DeliveryLocation[] = deliveries.map((d) => ({
    id: d.id,
    delivery_code: d.delivery_code,
    customer_name: d.customer_name,
    customer_phone: d.customer_phone,
    delivery_address: d.delivery_address,
    delivery_city: d.delivery_city,
    status: d.status,
    scheduled_date: d.scheduled_date,
    latitude: d.latitude || MEVACOL_DEPOT.lat,
    longitude: d.longitude || MEVACOL_DEPOT.lng,
    delivery_user_id: d.delivery_user_id,
    deliverer_name: d.deliverer_name,
    sale_total_cop: d.sale_total_cop,
    invoice_code: d.invoice_code,
  }));

  // Calcular ruta de conducción hacia una entrega
  const calculateRouteToDelivery = async (
    target: DeliveryLocation,
    originCoord?: { lat: number; lng: number }
  ) => {
    const origin = originCoord || userLocation || { lat: MEVACOL_DEPOT.lat, lng: MEVACOL_DEPOT.lng };
    const destination = { lat: target.latitude, lng: target.longitude };

    setIsCalculatingRoute(true);
    try {
      const res = await mapService.getDrivingRoute(origin, destination);
      setRouteCoordinates(res.coordinates);
      setRouteDistanceKm(res.distanceKm);
      setRouteDurationMinutes(res.durationMinutes);
    } catch (err) {
      console.warn('Error al calcular ruta:', err);
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  // Abrir vista de mapa enfocada en una entrega
  const openMapForDelivery = (delivery: Delivery) => {
    const loc: DeliveryLocation = {
      id: delivery.id,
      delivery_code: delivery.delivery_code,
      customer_name: delivery.customer_name,
      customer_phone: delivery.customer_phone,
      delivery_address: delivery.delivery_address,
      delivery_city: delivery.delivery_city,
      status: delivery.status,
      scheduled_date: delivery.scheduled_date,
      latitude: delivery.latitude || MEVACOL_DEPOT.lat,
      longitude: delivery.longitude || MEVACOL_DEPOT.lng,
      delivery_user_id: delivery.delivery_user_id,
      deliverer_name: delivery.deliverer_name,
      sale_total_cop: delivery.sale_total_cop,
      invoice_code: delivery.invoice_code,
    };

    setSelectedMapDelivery(loc);
    setActiveTab('map');

    if (!userLocation && !localStorage.getItem('mevacol_location_denied')) {
      setIsPermissionModalOpen(true);
    } else {
      calculateRouteToDelivery(loc);
    }
  };

  // Manejo de permiso de ubicación
  const handleAllowLocation = () => {
    setIsPermissionModalOpen(false);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(loc);
          showNotification('success', 'Ubicación GPS del repartidor detectada.');
          if (selectedMapDelivery) {
            calculateRouteToDelivery(selectedMapDelivery, loc);
          }
        },
        (err) => {
          console.warn('Aviso de geolocalización:', err);
          const fallback = { lat: MEVACOL_DEPOT.lat, lng: MEVACOL_DEPOT.lng };
          setUserLocation(fallback);
          showNotification('error', 'Continuando sin GPS. Se usará la sede base.');
          if (selectedMapDelivery) {
            calculateRouteToDelivery(selectedMapDelivery, fallback);
          }
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }
  };

  const handleDenyLocation = () => {
    setIsPermissionModalOpen(false);
    localStorage.setItem('mevacol_location_denied', 'true');
    const fallback = { lat: MEVACOL_DEPOT.lat, lng: MEVACOL_DEPOT.lng };
    setUserLocation(fallback);
    showNotification('success', 'Continuando sin GPS del dispositivo.');
    if (selectedMapDelivery) {
      calculateRouteToDelivery(selectedMapDelivery, fallback);
    }
  };

  const formatCOP = (val?: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '-';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('es-CO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const renderStatusBadge = (status: DeliveryStatus) => {
    switch (status) {
      case 'PENDIENTE':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.74rem',
            padding: '2px 8px',
            borderRadius: '999px',
            background: 'rgba(148, 163, 184, 0.15)',
            color: '#94a3b8',
            fontWeight: 700,
          }}>
            <Clock size={12} /> Pendiente
          </span>
        );
      case 'ASIGNADA':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.74rem',
            padding: '2px 8px',
            borderRadius: '999px',
            background: 'rgba(245, 158, 11, 0.18)',
            color: '#f59e0b',
            fontWeight: 700,
          }}>
            <Clock size={12} /> Asignada
          </span>
        );
      case 'EN_CAMINO':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.74rem',
            padding: '2px 8px',
            borderRadius: '999px',
            background: 'rgba(59, 130, 246, 0.2)',
            color: '#60a5fa',
            fontWeight: 700,
          }}>
            <Truck size={12} /> En Camino
          </span>
        );
      case 'ENTREGADA':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.74rem',
            padding: '2px 8px',
            borderRadius: '999px',
            background: 'rgba(16, 185, 129, 0.2)',
            color: '#34d399',
            fontWeight: 700,
          }}>
            <CheckCircle2 size={12} /> Entregada
          </span>
        );
      case 'NO_ENTREGADA':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.74rem',
            padding: '2px 8px',
            borderRadius: '999px',
            background: 'rgba(239, 68, 68, 0.2)',
            color: '#f87171',
            fontWeight: 700,
          }}>
            <AlertCircle size={12} /> Novedad
          </span>
        );
      case 'CANCELADA':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.74rem',
            padding: '2px 8px',
            borderRadius: '999px',
            background: 'rgba(100, 116, 139, 0.2)',
            color: '#94a3b8',
            fontWeight: 700,
          }}>
            <XCircle size={12} /> Cancelada
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  // Filtrado de entregas
  const filteredDeliveries = deliveries.filter((d) => {
    // Filtro por estado
    if (statusFilter === 'ACTIVAS') {
      if (d.status !== 'ASIGNADA' && d.status !== 'EN_CAMINO' && d.status !== 'PENDIENTE') return false;
    } else if (statusFilter !== 'TODOS' && d.status !== statusFilter) {
      return false;
    }
    // Filtro por texto
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const codeMatch = d.delivery_code.toLowerCase().includes(q);
      const nameMatch = d.customer_name.toLowerCase().includes(q);
      const addrMatch = d.delivery_address.toLowerCase().includes(q);
      const cityMatch = d.delivery_city.toLowerCase().includes(q);
      const phoneMatch = (d.customer_phone || '').includes(q);
      return codeMatch || nameMatch || addrMatch || cityMatch || phoneMatch;
    }
    return true;
  });

  // Entregas activas para el inicio rápido
  const activeDeliveries = deliveries.filter(
    (d) => d.status === 'ASIGNADA' || d.status === 'EN_CAMINO'
  );

  if (activeTab === 'customers') {
    return <DeliveryCustomers onBack={() => setActiveTab('home')} />;
  }

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
            <div style={{ fontSize: '0.7rem', color: '#fbbf24', fontWeight: 600, textTransform: 'uppercase' }}>
              Distribuciones &bull; Entregador
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => loadData(false)}
            className="btn btn-secondary btn-sm"
            title="Sincronizar"
            style={{ padding: '8px' }}
            disabled={isRefreshing}
          >
            <RefreshCw size={16} className={isRefreshing ? 'spinner' : ''} />
          </button>
          <button
            onClick={logout}
            className="btn btn-secondary btn-sm"
            title="Cerrar Sesión"
            style={{ padding: '8px', color: '#ef4444' }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Mobile Body */}
      <main className="mobile-body">
        {/* Notificación flotante */}
        {notification && (
          <div style={{
            position: 'fixed',
            top: '70px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            padding: '10px 18px',
            borderRadius: 'var(--radius-md)',
            background: notification.type === 'success' ? 'rgba(5, 150, 105, 0.95)' : 'rgba(220, 38, 38, 0.95)',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: '0.86rem',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(8px)',
            maxWidth: '90%',
            textAlign: 'center',
          }}>
            {notification.text}
          </div>
        )}

        {/* Banner de Saludo y Conexión */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Hola, entregador</div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700 }}>{user?.full_name}</h2>
          </div>
          <ConnectionStatusBadge />
        </div>

        {/* Tarjeta de Resumen de Envíos */}
        <div className="glass-card" style={{
          background: 'linear-gradient(135deg, rgba(217, 119, 6, 0.3) 0%, rgba(15, 23, 42, 0.9) 100%)',
          borderColor: 'rgba(245, 158, 11, 0.3)',
          padding: '18px 20px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.82rem', color: '#fde68a', fontWeight: 700, letterSpacing: '0.03em' }}>
              MIS ENTREGAS HOY
            </span>
            <span className="badge badge-delivery">Turno Activo</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff' }}>
              {stats ? (stats.assigned_count + stats.on_the_way_count) : activeDeliveries.length}
            </div>
            <span style={{ fontSize: '0.9rem', color: '#fde68a', fontWeight: 600 }}>
              pedidos por entregar
            </span>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: '1px solid rgba(245, 158, 11, 0.2)',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Asignadas</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fbbf24' }}>
                {stats?.assigned_count || 0}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>En Camino</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#60a5fa' }}>
                {stats?.on_the_way_count || 0}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Entregadas Hoy</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#34d399' }}>
                {stats?.delivered_today_count || 0}
              </div>
            </div>
          </div>
        </div>

        {/* Estadísticas completas del entregador */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          <div className="glass-card" style={{ padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Pendientes</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#94a3b8' }}>{delivererDashboard?.stats.pending || stats?.pending_count || 0}</div>
          </div>
          <div className="glass-card" style={{ padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>No Entregadas</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ef4444' }}>{delivererDashboard?.stats.failed || stats?.failed_count || 0}</div>
          </div>
          <div className="glass-card" style={{ padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Total</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#e2e8f0' }}>{delivererDashboard?.stats.total || stats?.total_deliveries || 0}</div>
          </div>
        </div>

        {/* Próximas entregas programadas */}
        {delivererDashboard?.upcoming && delivererDashboard.upcoming.length > 0 && activeTab === 'home' && (
          <div className="glass-card" style={{ padding: '16px' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
              🗓️ Próximas Entregas Programadas
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {delivererDashboard.upcoming.slice(0, 3).map((u, i) => (
                <div key={u.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(251,191,36,0.15)', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 800, flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.customer_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.delivery_address}, {u.delivery_city}</div>
                    <div style={{ fontSize: '0.72rem', color: '#fbbf24', marginTop: '2px' }}>{new Date(u.scheduled_date).toLocaleDateString('es-CO')} · {u.delivery_code}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VISTA HOME: Accesos directos y entregas prioritarias */}
        {activeTab === 'home' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Cabecera sección entregas activas */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Ruta Activa &bull; Pedidos Pendientes ({activeDeliveries.length})
              </div>
              <button
                onClick={() => setActiveTab('deliveries')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#fbbf24',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Ver todas &rarr;
              </button>
            </div>

            {/* Listado de entregas activas */}
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                <RefreshCw className="spinner" size={24} style={{ margin: '0 auto 8px' }} />
                <div>Cargando entregas asignadas...</div>
              </div>
            ) : activeDeliveries.length === 0 ? (
              <div className="glass-card" style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--text-muted)' }}>
                <CheckCircle2 size={36} color="#34d399" style={{ margin: '0 auto 10px' }} />
                <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '1rem' }}>
                  ¡Todo al día!
                </div>
                <div style={{ fontSize: '0.82rem', marginTop: '4px' }}>
                  No tienes entregas pendientes en este momento. El administrador te asignará nuevos despachos.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {activeDeliveries.map((delivery) => (
                  <div
                    key={delivery.id}
                    className="glass-card"
                    style={{
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      borderColor: delivery.status === 'EN_CAMINO' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(245, 158, 11, 0.3)',
                      background: delivery.status === 'EN_CAMINO'
                        ? 'linear-gradient(135deg, rgba(30, 58, 138, 0.2) 0%, rgba(15, 23, 42, 0.8) 100%)'
                        : undefined,
                    }}
                  >
                    {/* Fila Superior: Código y Estado */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          fontFamily: 'monospace',
                          fontWeight: 800,
                          fontSize: '0.9rem',
                          color: '#fbbf24',
                          background: 'rgba(245, 158, 11, 0.15)',
                          padding: '2px 8px',
                          borderRadius: '4px',
                        }}>
                          {delivery.delivery_code}
                        </span>
                        {renderStatusBadge(delivery.status)}
                      </div>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        Prog: {delivery.scheduled_date}
                      </span>
                    </div>

                    {/* Datos del Cliente y Destino */}
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#ffffff', marginBottom: '4px' }}>
                        {delivery.customer_name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                        <MapPin size={16} color="#fbbf24" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span>
                          <strong>{delivery.delivery_address}</strong> &bull; {delivery.delivery_city}
                        </span>
                      </div>
                    </div>

                    {/* Teléfono con llamada rápida */}
                    {delivery.customer_phone && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Teléfono:</span>
                        <a
                          href={`tel:${delivery.customer_phone}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: '#60a5fa',
                            fontWeight: 700,
                            textDecoration: 'none',
                            fontSize: '0.88rem',
                          }}
                        >
                          <Phone size={14} />
                          {delivery.customer_phone}
                        </a>
                      </div>
                    )}

                    {/* Resumen de Pedido */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {delivery.items_count || 0} productos &bull; {delivery.invoice_code ? `Factura ${delivery.invoice_code}` : 'Venta'}
                      </span>
                      <strong style={{ color: '#10b981', fontSize: '1.05rem' }}>
                        {formatCOP(delivery.sale_total_cop)}
                      </strong>
                    </div>

                    {/* Botones de Acción del Entregador */}
                    <div style={{ display: 'flex', gap: '8px', paddingTop: '4px' }}>
                      {delivery.status === 'ASIGNADA' && (
                        <button
                          onClick={() => handleStartTrip(delivery.id)}
                          className="btn btn-primary"
                          style={{
                            flex: 1,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            background: '#2563eb',
                            fontSize: '0.88rem',
                            padding: '10px',
                          }}
                        >
                          <Truck size={16} />
                          <span>Iniciar Recorrido</span>
                        </button>
                      )}

                      {delivery.status === 'EN_CAMINO' && (
                        <>
                          <button
                            onClick={() => {
                              setConfirmDelivery(delivery);
                              setDeliveryNote('');
                            }}
                            className="btn btn-primary"
                            style={{
                              flex: 1,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              background: '#059669',
                              fontSize: '0.88rem',
                              padding: '10px',
                            }}
                          >
                            <CheckCircle2 size={16} />
                            <span>Confirmar Entrega</span>
                          </button>
                          <button
                            onClick={() => {
                              setIssueDelivery(delivery);
                              setIssueReason('');
                            }}
                            className="btn btn-danger"
                            style={{
                              padding: '10px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              fontSize: '0.84rem',
                            }}
                            title="Reportar Novedad"
                          >
                            <AlertTriangle size={16} />
                            <span>Novedad</span>
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => openMapForDelivery(delivery)}
                        className="btn btn-secondary"
                        style={{ padding: '10px 12px', color: '#60a5fa' }}
                        title="Ver mapa y trazar ruta"
                      >
                        <Navigation size={16} />
                      </button>

                      <button
                        onClick={() => openDetail(delivery)}
                        className="btn btn-secondary"
                        style={{ padding: '10px 14px' }}
                        title="Ver detalle de productos y ruta"
                      >
                        <Eye size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VISTA DELIVERIES: Listado completo con filtros y búsqueda */}
        {activeTab === 'deliveries' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Barra de Búsqueda */}
            <div style={{ position: 'relative' }}>
              <Search
                size={18}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                placeholder="Buscar por código, cliente o dirección..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field"
                style={{ width: '100%', paddingLeft: '38px', fontSize: '0.88rem' }}
              />
            </div>

            {/* Chips de filtro por estado */}
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
              {[
                { key: 'TODOS', label: 'Todas' },
                { key: 'ACTIVAS', label: 'En Curso' },
                { key: 'ASIGNADA', label: 'Asignadas' },
                { key: 'EN_CAMINO', label: 'En Camino' },
                { key: 'ENTREGADA', label: 'Entregadas' },
                { key: 'NO_ENTREGADA', label: 'Novedades' },
              ].map((chip) => (
                <button
                  key={chip.key}
                  onClick={() => setStatusFilter(chip.key)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '999px',
                    border: '1px solid',
                    borderColor: statusFilter === chip.key ? 'var(--primary)' : 'var(--border-subtle)',
                    background: statusFilter === chip.key ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.03)',
                    color: statusFilter === chip.key ? '#60a5fa' : 'var(--text-secondary)',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                  }}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Lista filtrada */}
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                <RefreshCw className="spinner" size={24} style={{ margin: '0 auto 8px' }} />
                <div>Cargando entregas...</div>
              </div>
            ) : filteredDeliveries.length === 0 ? (
              <div className="glass-card" style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-muted)' }}>
                <Truck size={36} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
                <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                  No se encontraron entregas con los filtros seleccionados
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filteredDeliveries.map((delivery) => (
                  <div
                    key={delivery.id}
                    className="mobile-touch-card"
                    onClick={() => openDetail(delivery)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      padding: '14px 16px',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          fontFamily: 'monospace',
                          fontSize: '0.84rem',
                          fontWeight: 800,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: 'rgba(245, 158, 11, 0.15)',
                          color: '#fbbf24',
                        }}>
                          {delivery.delivery_code}
                        </span>
                        {renderStatusBadge(delivery.status)}
                      </div>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        {delivery.scheduled_date}
                      </span>
                    </div>

                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.98rem', color: '#ffffff' }}>
                        {delivery.customer_name}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {delivery.delivery_address} &bull; {delivery.delivery_city}
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                      paddingTop: '6px',
                      fontSize: '0.78rem',
                    }}>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {delivery.items_count || 0} items &bull; {delivery.invoice_code || 'Venta'}
                      </span>
                      <strong style={{ color: '#10b981', fontSize: '0.96rem' }}>
                        {formatCOP(delivery.sale_total_cop)}
                      </strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VISTA MAP: Mapa de entregas y cálculo de ruta */}
        {activeTab === 'map' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                  {selectedMapDelivery ? `Destino: ${selectedMapDelivery.delivery_code}` : 'Mapa de Entregas Asignadas'}
                </h3>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  {userLocation ? '📍 GPS de tu dispositivo activo' : '🏢 Partida: Sede Central MEVACOL'}
                </span>
              </div>
              <button
                onClick={() => setIsPermissionModalOpen(true)}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.78rem', padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                title="Configurar GPS"
              >
                <Compass size={14} color="#60a5fa" />
                <span>{userLocation ? 'GPS OK' : 'Activar GPS'}</span>
              </button>
            </div>

            {/* Contenedor del Mapa con Leaflet */}
            <DeliveryMap
              deliveries={deliveryLocations}
              selectedDeliveryId={selectedMapDelivery?.id}
              onSelectDelivery={(loc) => {
                setSelectedMapDelivery(loc);
                calculateRouteToDelivery(loc);
              }}
              origin={userLocation ? { lat: userLocation.lat, lng: userLocation.lng, label: 'Mi Ubicación' } : null}
              routeCoordinates={routeCoordinates}
              height="380px"
              showDepot={true}
            />

            {/* Tarjeta de Destino Seleccionado */}
            {selectedMapDelivery ? (
              <div className="glass-card" style={{
                padding: '16px',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.25) 0%, rgba(15, 23, 42, 0.9) 100%)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{
                    fontFamily: 'monospace',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    color: '#fbbf24',
                    background: 'rgba(245, 158, 11, 0.15)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                  }}>
                    {selectedMapDelivery.delivery_code}
                  </span>
                  {renderStatusBadge(selectedMapDelivery.status)}
                </div>

                <div>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#ffffff' }}>
                    {selectedMapDelivery.customer_name}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    📍 {selectedMapDelivery.delivery_address} &bull; {selectedMapDelivery.delivery_city}
                  </div>
                </div>

                {/* Métricas de Distancia y Tiempo */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(59, 130, 246, 0.12)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  fontSize: '0.84rem',
                }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem', display: 'block' }}>Distancia estimada:</span>
                    <strong style={{ color: '#60a5fa', fontSize: '1.05rem' }}>
                      {isCalculatingRoute ? 'Calculando...' : routeDistanceKm ? `${routeDistanceKm} km` : '-'}
                    </strong>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem', display: 'block' }}>Tiempo estimado viaje:</span>
                    <strong style={{ color: '#34d399', fontSize: '1.05rem' }}>
                      {isCalculatingRoute ? 'Calculando...' : routeDurationMinutes ? `~${routeDurationMinutes} mins` : '-'}
                    </strong>
                  </div>
                </div>

                {/* Botones de Navegación Externa (Google Maps, Waze) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <a
                    href={mapService.getGoogleMapsUrl({
                      lat: selectedMapDelivery.latitude,
                      lng: selectedMapDelivery.longitude,
                      address: selectedMapDelivery.delivery_address,
                      city: selectedMapDelivery.delivery_city,
                    })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                    style={{
                      background: '#2563eb',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      fontSize: '0.84rem',
                      padding: '10px',
                      textDecoration: 'none',
                    }}
                  >
                    <Navigation size={16} /> Google Maps
                  </a>
                  <a
                    href={mapService.getWazeUrl({
                      lat: selectedMapDelivery.latitude,
                      lng: selectedMapDelivery.longitude,
                      address: selectedMapDelivery.delivery_address,
                      city: selectedMapDelivery.delivery_city,
                    })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      fontSize: '0.84rem',
                      padding: '10px',
                      textDecoration: 'none',
                      color: '#38bdf8',
                    }}
                  >
                    <ExternalLink size={16} /> Waze
                  </a>
                </div>

                {/* Acciones de entrega directa desde el mapa */}
                <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '10px' }}>
                  {selectedMapDelivery.status === 'ASIGNADA' && (
                    <button
                      onClick={() => handleStartTrip(selectedMapDelivery.id)}
                      className="btn btn-primary"
                      style={{ flex: 1, background: '#2563eb', fontSize: '0.84rem' }}
                    >
                      <Truck size={15} /> Iniciar Recorrido
                    </button>
                  )}
                  {selectedMapDelivery.status === 'EN_CAMINO' && (
                    <button
                      onClick={() => {
                        const original = deliveries.find((d) => d.id === selectedMapDelivery.id);
                        if (original) {
                          setConfirmDelivery(original);
                          setDeliveryNote('');
                        }
                      }}
                      className="btn btn-primary"
                      style={{ flex: 1, background: '#059669', fontSize: '0.84rem' }}
                    >
                      <CheckCircle2 size={15} /> Confirmar Entrega
                    </button>
                  )}
                  {selectedMapDelivery.customer_phone && (
                    <a
                      href={`tel:${selectedMapDelivery.customer_phone}`}
                      className="btn btn-secondary"
                      style={{ padding: '8px 12px', display: 'inline-flex', alignItems: 'center', color: '#60a5fa' }}
                      title="Llamar"
                    >
                      <Phone size={16} />
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div className="glass-card" style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Navigation size={28} color="#60a5fa" style={{ margin: '0 auto 6px' }} />
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                  Selecciona una entrega en el mapa
                </div>
                <div style={{ fontSize: '0.78rem', marginTop: '2px' }}>
                  Toca cualquier punto para trazar la ruta de conducción y abrir Google Maps o Waze.
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tarjeta Informativa de Rol */}
        <div className="glass-card" style={{ padding: '14px', background: 'rgba(15, 23, 42, 0.5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fbbf24', marginBottom: '6px' }}>
            <AlertTriangle size={16} />
            <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Panel de Entregador MEVACOL</span>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
            Tu perfil está optimizado para la logística de última milla. Solo tienes acceso a las entregas que te han sido asignadas.
          </p>
        </div>
      </main>

      {/* Bottom Mobile Navigation Bar */}
      <nav className="mobile-bottom-nav">
        <div
          className={`nav-tab-item ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => setActiveTab('home')}
        >
          <Truck size={20} />
          <span>Inicio</span>
        </div>

        <div
          className={`nav-tab-item ${activeTab === 'deliveries' ? 'active' : ''}`}
          onClick={() => setActiveTab('deliveries')}
        >
          <Clock size={20} />
          <span>Mis Entregas</span>
        </div>

        <div
          className={`nav-tab-item ${activeTab === 'map' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('map');
            if (activeDeliveries.length > 0 && !selectedMapDelivery) {
              openMapForDelivery(activeDeliveries[0]);
            }
          }}
        >
          <Navigation size={20} />
          <span>Mapa GPS</span>
        </div>

        <div
          className={`nav-tab-item ${(activeTab as string) === 'customers' ? 'active' : ''}`}
          onClick={() => setActiveTab('customers')}
        >
          <Users size={20} />
          <span>Clientes</span>
        </div>

        <div className="nav-tab-item" onClick={logout} style={{ color: '#ef4444' }}>
          <LogOut size={20} />
          <span>Salir</span>
        </div>
      </nav>

      {/* MODAL: DETALLE COMPLETO DE ENTREGA Y CHECKLIST */}
      {selectedDelivery && (
        <div className="modal-overlay" style={{ zIndex: 1000, overflowY: 'auto' }}>
          <div className="modal-content" style={{ maxWidth: '520px', width: '94%', margin: 'auto' }}>
            <div className="modal-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontFamily: 'monospace',
                    fontWeight: 800,
                    fontSize: '1.1rem',
                    color: '#fbbf24',
                  }}>
                    {selectedDelivery.delivery_code}
                  </span>
                  {renderStatusBadge(selectedDelivery.status)}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Fecha prog: {selectedDelivery.scheduled_date}
                </div>
              </div>
              <button
                onClick={() => setSelectedDelivery(null)}
                className="btn btn-secondary btn-sm"
                style={{ padding: '6px' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Información del Cliente */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
              }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Datos del Cliente
                </div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#ffffff' }}>
                  {selectedDelivery.customer_name}
                </div>
                {selectedDelivery.customer_id_number && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Doc: {selectedDelivery.customer_id_number}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                  <MapPin size={16} color="#fbbf24" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>
                    <strong>{selectedDelivery.delivery_address}</strong>, {selectedDelivery.delivery_city}
                  </span>
                </div>
                {selectedDelivery.customer_phone && (
                  <div style={{ marginTop: '8px' }}>
                    <a
                      href={`tel:${selectedDelivery.customer_phone}`}
                      className="btn btn-secondary btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#60a5fa' }}
                    >
                      <Phone size={14} />
                      Llamar al cliente ({selectedDelivery.customer_phone})
                    </a>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button
                    onClick={() => {
                      const d = selectedDelivery;
                      setSelectedDelivery(null);
                      openMapForDelivery(d);
                    }}
                    className="btn btn-primary btn-sm"
                    style={{
                      flex: 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      background: '#2563eb',
                      fontSize: '0.82rem',
                    }}
                  >
                    <Navigation size={14} /> Ver Ruta en Mapa
                  </button>
                  <a
                    href={mapService.getGoogleMapsUrl({
                      lat: selectedDelivery.latitude,
                      lng: selectedDelivery.longitude,
                      address: selectedDelivery.delivery_address,
                      city: selectedDelivery.delivery_city,
                    })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary btn-sm"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: '#60a5fa',
                      fontSize: '0.82rem',
                    }}
                    title="Google Maps"
                  >
                    <ExternalLink size={14} /> Google Maps
                  </a>
                </div>
              </div>

              {/* Información de Venta / Factura */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 14px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: 'var(--radius-sm)',
              }}>
                <div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Comprobante Asociado</div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#ffffff' }}>
                    {selectedDelivery.invoice_code || selectedDelivery.sale_code || 'Venta Registrada'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Total a Cobrar</div>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#10b981' }}>
                    {formatCOP(selectedDelivery.sale_total_cop)}
                  </div>
                </div>
              </div>

              {/* Observaciones de la Entrega */}
              {selectedDelivery.notes && (
                <div style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  fontSize: '0.82rem',
                }}>
                  <strong style={{ color: '#fbbf24' }}>Instrucciones / Observaciones:</strong>
                  <div style={{ color: 'var(--text-primary)', marginTop: '2px' }}>
                    {selectedDelivery.notes}
                  </div>
                </div>
              )}

              {/* Checklist de Productos a Entregar */}
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Productos a Entregar ({selectedDelivery.items?.length || 0})
                </div>

                {loadingDetail ? (
                  <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>
                    <RefreshCw className="spinner" size={20} style={{ margin: '0 auto 6px' }} />
                    <div style={{ fontSize: '0.8rem' }}>Cargando productos...</div>
                  </div>
                ) : !selectedDelivery.items || selectedDelivery.items.length === 0 ? (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '12px' }}>
                    Información de productos no disponible
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {selectedDelivery.items.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 12px',
                          background: 'rgba(255, 255, 255, 0.04)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.84rem',
                        }}
                      >
                        <div>
                          <strong>{item.product_name}</strong>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            Cód: {item.product_code} &bull; {item.unit_measure || 'Unidad'}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{
                            background: 'rgba(59, 130, 246, 0.2)',
                            color: '#60a5fa',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.84rem',
                          }}>
                            x {item.quantity}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Historial de Estados (Auditoría) */}
              {selectedDelivery.history && selectedDelivery.history.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Historial de Seguimiento
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedDelivery.history.map((hist) => (
                      <div
                        key={hist.id}
                        style={{
                          padding: '8px 10px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(255,255,255,0.02)',
                          borderLeft: '3px solid var(--primary)',
                          fontSize: '0.78rem',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ color: '#ffffff' }}>
                            {hist.from_status ? `${hist.from_status} → ${hist.to_status}` : hist.to_status}
                          </strong>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                            {formatDate(hist.created_at)}
                          </span>
                        </div>
                        <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                          Por: {hist.changed_by_user_name}
                        </div>
                        {hist.notes && (
                          <div style={{ color: '#93c5fd', fontStyle: 'italic', marginTop: '2px' }}>
                            "{hist.notes}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Modal con Botones Rápidos de Estado */}
            <div className="modal-footer" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {selectedDelivery.status === 'ASIGNADA' && (
                <button
                  onClick={() => handleStartTrip(selectedDelivery.id)}
                  className="btn btn-primary"
                  style={{ flex: 1, background: '#2563eb', padding: '10px' }}
                >
                  <Truck size={16} /> Iniciar Recorrido
                </button>
              )}

              {selectedDelivery.status === 'EN_CAMINO' && (
                <>
                  <button
                    onClick={() => {
                      setConfirmDelivery(selectedDelivery);
                      setDeliveryNote('');
                    }}
                    className="btn btn-primary"
                    style={{ flex: 1, background: '#059669', padding: '10px' }}
                  >
                    <CheckCircle2 size={16} /> Confirmar Entrega
                  </button>
                  <button
                    onClick={() => {
                      setIssueDelivery(selectedDelivery);
                      setIssueReason('');
                    }}
                    className="btn btn-danger"
                    style={{ padding: '10px 14px' }}
                  >
                    <AlertTriangle size={16} /> Novedad
                  </button>
                </>
              )}

              {selectedDelivery.status === 'NO_ENTREGADA' && (
                <button
                  onClick={() => handleStartTrip(selectedDelivery.id)}
                  className="btn btn-primary"
                  style={{ flex: 1, background: '#2563eb', padding: '10px' }}
                >
                  <RefreshCw size={16} /> Reintentar Recorrido
                </button>
              )}

              <button
                onClick={() => setSelectedDelivery(null)}
                className="btn btn-secondary"
                style={{ flex: selectedDelivery.status === 'ENTREGADA' ? 1 : undefined }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR ENTREGA REALIZADA */}
      {confirmDelivery && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '420px', width: '92%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={22} color="#10b981" />
                <h3 style={{ fontSize: '1.15rem' }}>Confirmar Entrega</h3>
              </div>
              <button
                onClick={() => setConfirmDelivery(null)}
                className="btn btn-secondary btn-sm"
                style={{ padding: '4px' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                ¿Confirmas que has entregado el pedido <strong>{confirmDelivery.delivery_code}</strong> a satisfacción al cliente?
              </p>

              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.82rem',
              }}>
                <div><strong>Cliente:</strong> {confirmDelivery.customer_name}</div>
                <div><strong>Dirección:</strong> {confirmDelivery.delivery_address}</div>
                <div><strong>Total:</strong> {formatCOP(confirmDelivery.sale_total_cop)}</div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                  Nota u observación de recibo (opcional):
                </label>
                <input
                  type="text"
                  placeholder="Ej: Recibido por Juan Pérez en portería..."
                  value={deliveryNote}
                  onChange={(e) => setDeliveryNote(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.84rem' }}
                />
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setConfirmDelivery(null)}
                className="btn btn-secondary"
                style={{ flex: 1 }}
                disabled={isSubmittingConfirm}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmSubmit}
                className="btn btn-primary"
                style={{ flex: 1, background: '#059669' }}
                disabled={isSubmittingConfirm}
              >
                {isSubmittingConfirm ? (
                  <RefreshCw className="spinner" size={16} />
                ) : (
                  'Sí, Confirmar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REPORTAR NOVEDAD (NO_ENTREGADA) */}
      {issueDelivery && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '440px', width: '92%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={22} color="#f87171" />
                <h3 style={{ fontSize: '1.15rem' }}>Reportar Novedad</h3>
              </div>
              <button
                onClick={() => setIssueDelivery(null)}
                className="btn btn-secondary btn-sm"
                style={{ padding: '4px' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                Indica el motivo por el cual no se pudo completar la entrega de <strong>{issueDelivery.delivery_code}</strong>:
              </p>

              {/* Botones rápidos de motivo común */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {[
                  'Cliente no se encontraba en el domicilio',
                  'Dirección incorrecta o no encontrada',
                  'Cliente solicita reprogramar la entrega',
                  'Cliente no contaba con el dinero en efectivo',
                  'Cerrado por horario o fuerza mayor',
                ].map((quickReason, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setIssueReason(quickReason)}
                    style={{
                      textAlign: 'left',
                      padding: '6px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: issueReason === quickReason ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.03)',
                      border: '1px solid',
                      borderColor: issueReason === quickReason ? '#ef4444' : 'var(--border-subtle)',
                      color: issueReason === quickReason ? '#f87171' : 'var(--text-secondary)',
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                    }}
                  >
                    &bull; {quickReason}
                  </button>
                ))}
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                  Detalle obligatorio de la novedad:
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe con precisión qué ocurrió..."
                  value={issueReason}
                  onChange={(e) => setIssueReason(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.84rem', resize: 'vertical' }}
                />
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setIssueDelivery(null)}
                className="btn btn-secondary"
                style={{ flex: 1 }}
                disabled={isSubmittingIssue}
              >
                Cancelar
              </button>
              <button
                onClick={handleIssueSubmit}
                className="btn btn-danger"
                style={{ flex: 1 }}
                disabled={isSubmittingIssue || !issueReason.trim()}
              >
                {isSubmittingIssue ? (
                  <RefreshCw className="spinner" size={16} />
                ) : (
                  'Registrar Novedad'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PERMISO DE UBICACIÓN EXPLICATIVO */}
      <LocationPermissionModal
        isOpen={isPermissionModalOpen}
        onAllow={handleAllowLocation}
        onDeny={handleDenyLocation}
        onClose={() => setIsPermissionModalOpen(false)}
      />
    </div>
  );
};
