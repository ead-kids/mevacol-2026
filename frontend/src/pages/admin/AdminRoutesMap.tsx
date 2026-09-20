import React, { useState, useEffect } from 'react';
import {
  Navigation,
  RefreshCw,
  Route,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { api } from '../../services/api';
import { mapService, MEVACOL_DEPOT } from '../../services/mapService';
import { DeliveryMap } from '../../components/maps/DeliveryMap';
import type { DeliveryLocation, DelivererUser, RoutePlan } from '../../types';

export const AdminRoutesMap: React.FC = () => {
  const [locations, setLocations] = useState<DeliveryLocation[]>([]);
  const [deliverers, setDeliverers] = useState<DelivererUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [delivererFilter, setDelivererFilter] = useState('ALL');

  // Selección y Ruta Multiparada
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryLocation | null>(null);
  const [selectedIdsForRoute, setSelectedIdsForRoute] = useState<string[]>([]);
  const [routePlan, setRoutePlan] = useState<RoutePlan | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);

  // Cargar entregas y entregadores
  const fetchData = async () => {
    setLoading(true);
    try {
      const [locRes, delivRes] = await Promise.all([
        api.getDeliveryLocations(),
        api.getDeliverers(),
      ]);
      setLocations(locRes.locations);
      setDeliverers(delivRes.deliverers);

      // Por defecto, preseleccionar las entregas pendientes o en camino para organizar ruta
      const activeIds = locRes.locations
        .filter((l) => l.status === 'ASIGNADA' || l.status === 'EN_CAMINO' || l.status === 'PENDIENTE')
        .map((l) => l.id);
      setSelectedIdsForRoute(activeIds);
    } catch (err: any) {
      console.error('Error al cargar mapa logístico:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtrado de entregas
  const filteredLocations = locations.filter((loc) => {
    if (statusFilter === 'ACTIVAS') {
      if (loc.status !== 'ASIGNADA' && loc.status !== 'EN_CAMINO' && loc.status !== 'PENDIENTE') return false;
    } else if (statusFilter !== 'TODOS' && loc.status !== statusFilter) {
      return false;
    }
    if (delivererFilter !== 'ALL') {
      if (delivererFilter === 'UNASSIGNED') {
        if (loc.delivery_user_id) return false;
      } else if (loc.delivery_user_id !== delivererFilter) {
        return false;
      }
    }
    return true;
  });

  // Toggle selección de entrega para la ruta
  const toggleDeliverySelection = (id: string) => {
    if (selectedIdsForRoute.includes(id)) {
      setSelectedIdsForRoute(selectedIdsForRoute.filter((x) => x !== id));
    } else {
      setSelectedIdsForRoute([...selectedIdsForRoute, id]);
    }
  };

  // Calcular ruta multiparada
  const handleCalculateRoute = async () => {
    if (selectedIdsForRoute.length === 0) return;
    setIsCalculatingRoute(true);
    try {
      const planRes = await api.calculateRoutePlan({
        origin: {
          latitude: MEVACOL_DEPOT.lat,
          longitude: MEVACOL_DEPOT.lng,
          label: 'Sede Central MEVACOL',
        },
        delivery_ids: selectedIdsForRoute,
      });

      setRoutePlan(planRes);

      // Construir polilínea secuencial conectando los puntos
      const coords: [number, number][] = [
        [planRes.origin.lat, planRes.origin.lng],
      ];
      planRes.stops.forEach((s) => {
        coords.push([s.latitude, s.longitude]);
      });
      setRouteCoordinates(coords);
    } catch (err: any) {
      console.error('Error al calcular ruta multiparada:', err);
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  // Limpiar ruta trazada
  const handleClearRoute = () => {
    setRoutePlan(null);
    setRouteCoordinates([]);
  };

  const formatCOP = (val?: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Barra de Filtros y Resumen Superior */}
      <div className="glass-card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Navigation size={22} color="var(--primary)" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Mapa Logístico & Trazado de Rutas</h2>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
              Visualización en tiempo real de destinos de entrega, georreferenciación y optimización de rutas de despacho.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Filtro de Estado */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field"
              style={{ padding: '8px 12px', fontSize: '0.84rem' }}
            >
              <option value="TODOS">Todos los estados</option>
              <option value="ACTIVAS">Pendientes y En Camino</option>
              <option value="ASIGNADA">Solo Asignadas</option>
              <option value="EN_CAMINO">Solo En Camino</option>
              <option value="ENTREGADA">Solo Entregadas</option>
              <option value="NO_ENTREGADA">Solo Novedades</option>
            </select>

            {/* Filtro de Entregador */}
            <select
              value={delivererFilter}
              onChange={(e) => setDelivererFilter(e.target.value)}
              className="input-field"
              style={{ padding: '8px 12px', fontSize: '0.84rem' }}
            >
              <option value="ALL">Todos los entregadores</option>
              <option value="UNASSIGNED">Sin asignar</option>
              {deliverers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.full_name}
                </option>
              ))}
            </select>

            <button
              onClick={fetchData}
              className="btn btn-secondary btn-sm"
              style={{ padding: '8px 12px' }}
              title="Refrescar mapa"
            >
              <RefreshCw size={16} className={loading ? 'spinner' : ''} />
            </button>
          </div>
        </div>

        {/* Chips de métricas de mapa */}
        <div style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          marginTop: '14px',
          paddingTop: '12px',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          fontSize: '0.82rem',
        }}>
          <span style={{ color: 'var(--text-muted)' }}>
            Mostrando <strong>{filteredLocations.length}</strong> entregas en el mapa
          </span>
          <span style={{ color: '#fbbf24' }}>
            &bull; Asignadas: <strong>{locations.filter((l) => l.status === 'ASIGNADA').length}</strong>
          </span>
          <span style={{ color: '#60a5fa' }}>
            &bull; En Camino: <strong>{locations.filter((l) => l.status === 'EN_CAMINO').length}</strong>
          </span>
          <span style={{ color: '#34d399' }}>
            &bull; Entregadas: <strong>{locations.filter((l) => l.status === 'ENTREGADA').length}</strong>
          </span>
          <span style={{ color: '#f87171' }}>
            &bull; Novedades: <strong>{locations.filter((l) => l.status === 'NO_ENTREGADA').length}</strong>
          </span>
        </div>
      </div>

      {/* Grid Principal: Mapa y Optimizador (Responsive: columna única en móvil, 2 columnas en PC) */}
      <div className="admin-routes-grid">
        {/* Contenedor del Mapa */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', minWidth: 0 }}>
          <DeliveryMap
            deliveries={filteredLocations}
            selectedDeliveryId={selectedDelivery?.id}
            onSelectDelivery={(deliv) => setSelectedDelivery(deliv)}
            origin={routePlan ? { lat: routePlan.origin.lat, lng: routePlan.origin.lng, label: routePlan.origin.label } : null}
            routeCoordinates={routeCoordinates}
            routeStops={routePlan?.stops}
            height="560px"
            showDepot={true}
          />

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.76rem',
            color: 'var(--text-muted)',
            padding: '4px 8px',
          }}>
            <span>
              💡 <strong>Consejo:</strong> Haz clic en cualquier marcador para ver detalles del cliente o abrir la navegación en Google Maps / Waze.
            </span>
            <span>Proveedor: OpenStreetMap (Sin costos API)</span>
          </div>
        </div>

        {/* Panel Lateral: Optimizador de Ruta y Entregas Seleccionadas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Tarjeta de Acción: Organizar Ruta Multiparada */}
          <div className="glass-card" style={{
            padding: '18px',
            background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.25) 0%, rgba(15, 23, 42, 0.9) 100%)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Sparkles size={18} color="#60a5fa" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Optimizador de Rutas</h3>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4', marginBottom: '14px' }}>
              Calcula automáticamente la secuencia más corta de paradas (TSP) desde la Sede Central hasta cada cliente.
            </p>

            {/* Resumen de Ruta Calculada si existe */}
            {routePlan && (
              <div style={{
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px',
                marginBottom: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Paradas programadas:</span>
                  <strong>{routePlan.stops_count} entregas</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Distancia total estimada:</span>
                  <strong style={{ color: '#60a5fa' }}>{routePlan.total_distance_km} km</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Tiempo estimado viaje + entrega:</span>
                  <strong style={{ color: '#10b981' }}>~{routePlan.estimated_total_minutes} mins</strong>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleCalculateRoute}
                disabled={isCalculatingRoute || selectedIdsForRoute.length === 0}
                className="btn btn-primary"
                style={{
                  flex: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  background: '#2563eb',
                  fontSize: '0.86rem',
                  padding: '10px',
                }}
              >
                {isCalculatingRoute ? (
                  <>
                    <RefreshCw className="spinner" size={16} />
                    <span>Calculando...</span>
                  </>
                ) : (
                  <>
                    <Route size={16} />
                    <span>Trazar Ruta ({selectedIdsForRoute.length})</span>
                  </>
                )}
              </button>

              {routePlan && (
                <button
                  onClick={handleClearRoute}
                  className="btn btn-secondary"
                  style={{ padding: '10px 12px', fontSize: '0.82rem' }}
                  title="Limpiar trazado"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>

          {/* Lista de Paradas Ordenadas o Selector de Entregas */}
          <div className="glass-card" style={{ padding: '16px', maxHeight: '380px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                {routePlan ? 'Secuencia de Entrega Optimizada' : 'Seleccionar Entregas para Ruta'}
              </span>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                {selectedIdsForRoute.length} seleccionadas
              </span>
            </div>

            {/* Si ya hay plan calculado, mostrar paradas numeradas */}
            {routePlan ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {routePlan.stops.map((stop) => (
                  <div
                    key={stop.id}
                    onClick={() => setSelectedDelivery(stop)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: selectedDelivery?.id === stop.id ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid',
                      borderColor: selectedDelivery?.id === stop.id ? 'var(--primary)' : 'var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: '#2563eb',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      flexShrink: 0,
                    }}>
                      {stop.step_number}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.78rem', color: '#fbbf24' }}>
                          {stop.delivery_code}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#60a5fa' }}>
                          +{stop.distance_from_prev_km} km
                        </span>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {stop.customer_name}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stop.delivery_address}</span>
                        <strong style={{ color: '#10b981', marginLeft: '6px' }}>{formatCOP(stop.sale_total_cop)}</strong>
                      </div>
                    </div>

                    <a
                      href={mapService.getGoogleMapsUrl({
                        lat: stop.latitude,
                        lng: stop.longitude,
                        address: stop.delivery_address,
                        city: stop.delivery_city,
                      })}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{ color: '#60a5fa', padding: '4px' }}
                      title="Abrir en Google Maps"
                    >
                      <ExternalLink size={16} />
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              /* Lista de selección antes de calcular */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredLocations.map((loc) => {
                  const isChecked = selectedIdsForRoute.includes(loc.id);
                  return (
                    <div
                      key={loc.id}
                      onClick={() => toggleDeliverySelection(loc.id)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-sm)',
                        background: isChecked ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid',
                        borderColor: isChecked ? 'rgba(59, 130, 246, 0.4)' : 'var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        style={{ cursor: 'pointer' }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.8rem', color: '#fbbf24' }}>
                            {loc.delivery_code}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {loc.status}
                          </span>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#ffffff' }}>
                          {loc.customer_name}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                          {loc.delivery_address}, {loc.delivery_city}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
