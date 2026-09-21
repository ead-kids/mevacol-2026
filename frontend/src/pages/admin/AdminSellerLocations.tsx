import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  MapPin,
  RefreshCw,
  Search,
  Phone,
  Radio,
  Clock,
  WifiOff,
  Users,
  ShieldCheck,
  TrendingUp,
  Navigation,
  AlertCircle,
} from 'lucide-react';
import { api } from '../../services/api';
import type { SellerLocation, SellerLocationsSummary } from '../../types';
import { SellerLocationMap } from '../../components/maps/SellerLocationMap';

export const AdminSellerLocations: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [sellers, setSellers] = useState<SellerLocation[]>([]);
  const [summary, setSummary] = useState<SellerLocationsSummary>({
    total: 0,
    live: 0,
    stale: 0,
    offline: 0,
  });
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LIVE' | 'STALE' | 'OFFLINE'>('ALL');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [fetchError, setFetchError] = useState<string | null>(null);
  const timerRef = useRef<any>(null);

  const fetchLocations = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    setFetchError(null);
    try {
      const res = await api.getSellerLocations();
      if (res && res.success) {
        setSellers(res.sellers || []);
        setSummary(res.summary || { total: res.sellers?.length || 0, live: 0, stale: 0, offline: res.sellers?.length || 0 });
        setLastRefreshedAt(new Date());
      }
    } catch (err: any) {
      console.warn('Fallo al obtener ubicaciones activas, intentando respaldo con catálogo de vendedores:', err);
      try {
        const fallbackRes = await api.getSellers();
        if (fallbackRes && fallbackRes.sellers && fallbackRes.sellers.length > 0) {
          const fallbackSellers: SellerLocation[] = fallbackRes.sellers.map((s) => ({
            id: s.id,
            username: s.username,
            full_name: s.full_name,
            phone: s.phone || null,
            email: s.email || null,
            latitude: null,
            longitude: null,
            accuracy: null,
            is_active: false,
            updated_at: null,
            minutes_ago: null,
            freshness: 'OFFLINE',
            today_sales_count: Number((s as any).today_sales || (s as any).today_sales_count || 0),
            today_sales_cop: Number((s as any).today_cop || (s as any).today_sales_cop || 0),
          }));
          setSellers(fallbackSellers);
          setSummary({
            total: fallbackSellers.length,
            live: 0,
            stale: 0,
            offline: fallbackSellers.length,
          });
          setLastRefreshedAt(new Date());
        } else {
          setFetchError(err.message || 'No fue posible conectar con el servidor.');
        }
      } catch {
        setFetchError(err.message || 'No fue posible conectar con el servidor.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  // Auto-refresco cada 30 segundos si está activado
  useEffect(() => {
    if (!autoRefresh) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      fetchLocations(true);
    }, 30000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoRefresh, fetchLocations]);

  // Filtrado de vendedores
  const filteredSellers = sellers.filter((s) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      s.full_name.toLowerCase().includes(q) ||
      s.username.toLowerCase().includes(q) ||
      (s.phone && s.phone.toLowerCase().includes(q));

    const matchesStatus =
      statusFilter === 'ALL' || s.freshness === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const formatCOP = (val: number) => `$ ${val.toLocaleString('es-CO')}`;

  return (
    <div className="space-y-6">
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              FASE 7 — EN VIVO
            </span>
            <span className="text-xs text-slate-500 font-medium">GPS Satelital Leaflet</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">Ubicación de Vendedores en Campo</h1>
          <p className="text-sm text-slate-500">
            Monitoreo geográfico en tiempo real de la fuerza de ventas activa durante su jornada laboral.
          </p>
        </div>

        {/* Controles de Refresco */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded text-primary-600 focus:ring-primary-500"
            />
            Auto-refresco (30s)
          </label>

          <button
            onClick={() => fetchLocations(false)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold shadow-sm transition disabled:opacity-50"
            title="Actualizar ahora"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>
      </div>

      {/* Alerta de Error de Conexión si ocurre */}
      {fetchError && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-2xl flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <strong className="font-semibold">Aviso de conexión:</strong> {fetchError}. Asegúrate de haber iniciado sesión como Administrador en este dispositivo.
            </div>
          </div>
          <button
            onClick={() => fetchLocations(false)}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-xs shrink-0 transition"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Tarjetas KPI de Estado */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Vendedores */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{summary.total}</div>
            <div className="text-xs font-semibold text-slate-500">Vendedores Activos</div>
          </div>
        </div>

        {/* En Vivo Ahora */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'LIVE' ? 'ALL' : 'LIVE')}
          className={`bg-white p-5 rounded-2xl border transition cursor-pointer shadow-sm flex items-center gap-4 ${
            statusFilter === 'LIVE' ? 'ring-2 ring-emerald-500 border-emerald-500' : 'border-slate-100 hover:border-emerald-200'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 relative">
            <Radio className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white animate-ping"></span>
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-600">{summary.live}</div>
            <div className="text-xs font-semibold text-slate-500">En Vivo (&lt; 10 min)</div>
          </div>
        </div>

        {/* Señal Antigua */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'STALE' ? 'ALL' : 'STALE')}
          className={`bg-white p-5 rounded-2xl border transition cursor-pointer shadow-sm flex items-center gap-4 ${
            statusFilter === 'STALE' ? 'ring-2 ring-amber-500 border-amber-500' : 'border-slate-100 hover:border-amber-200'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-amber-600">{summary.stale}</div>
            <div className="text-xs font-semibold text-slate-500">Señal 10 a 60 min</div>
          </div>
        </div>

        {/* Desconectados */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'OFFLINE' ? 'ALL' : 'OFFLINE')}
          className={`bg-white p-5 rounded-2xl border transition cursor-pointer shadow-sm flex items-center gap-4 ${
            statusFilter === 'OFFLINE' ? 'ring-2 ring-slate-500 border-slate-500' : 'border-slate-100 hover:border-slate-300'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <WifiOff className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-700">{summary.offline}</div>
            <div className="text-xs font-semibold text-slate-500">Desconectados / Sin GPS</div>
          </div>
        </div>
      </div>

      {/* Contenedor Principal: Mapa y Lista de Vendedores */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Columna Izquierda: Mapa Interactivo Leaflet (8 cols) */}
        <div className="lg:col-span-8 bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary-600" />
              <h2 className="text-base font-bold text-slate-900">Mapa de Cobertura en Terreno</h2>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> En Vivo
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> Señal &gt;10m
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block"></span> Desconectado
              </span>
              <span className="text-slate-400">|</span>
              <span>Última sinc: {lastRefreshedAt.toLocaleTimeString('es-CO')}</span>
            </div>
          </div>

          <div className="flex-1 min-h-[460px] relative rounded-xl overflow-hidden border border-slate-200">
            {loading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 z-20">
                <RefreshCw className="w-8 h-8 text-primary-600 animate-spin mb-2" />
                <span className="text-sm font-semibold text-slate-600">Cargando coordenadas GPS...</span>
              </div>
            ) : (
              <SellerLocationMap
                sellers={filteredSellers}
                selectedSellerId={selectedSellerId}
                onSelectSeller={(s) => setSelectedSellerId(s.id)}
                height="560px"
              />
            )}
          </div>
        </div>

        {/* Columna Derecha: Directorio y Ficha de Vendedor (4 cols) */}
        <div className="lg:col-span-4 flex flex-col space-y-4">
          {/* Tarjeta de Filtros de Búsqueda */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nombre o teléfono..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
              />
            </div>

            {/* Pestañas rápidas de filtro de estado */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`flex-1 py-1.5 rounded-lg transition ${
                  statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos ({sellers.length})
              </button>
              <button
                onClick={() => setStatusFilter('LIVE')}
                className={`flex-1 py-1.5 rounded-lg transition ${
                  statusFilter === 'LIVE' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-emerald-700'
                }`}
              >
                En Vivo ({summary.live})
              </button>
              <button
                onClick={() => setStatusFilter('OFFLINE')}
                className={`flex-1 py-1.5 rounded-lg transition ${
                  statusFilter === 'OFFLINE' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Offline ({summary.offline})
              </button>
            </div>
          </div>

          {/* Lista de Vendedores */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex-1 flex flex-col max-h-[500px] overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Vendedores Registrados ({filteredSellers.length})
              </h3>
              {selectedSellerId && (
                <button
                  onClick={() => setSelectedSellerId(null)}
                  className="text-xs text-primary-600 hover:underline font-semibold"
                >
                  Deseleccionar
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-50">
              {filteredSellers.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  No se encontraron vendedores con los filtros actuales.
                </div>
              ) : (
                filteredSellers.map((seller) => {
                  const isSelected = selectedSellerId === seller.id;
                  const hasCoords = typeof seller.latitude === 'number' && typeof seller.longitude === 'number';

                  let badgeColor = 'bg-slate-100 text-slate-600 border-slate-200';
                  let statusText = 'Desconectado';
                  if (seller.freshness === 'LIVE') {
                    badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold';
                    statusText = seller.minutes_ago !== null ? `En Vivo (${seller.minutes_ago}m)` : 'En Vivo';
                  } else if (seller.freshness === 'STALE') {
                    badgeColor = 'bg-amber-50 text-amber-700 border-amber-200 font-bold';
                    statusText = `Hace ${seller.minutes_ago}m`;
                  }

                  const initials = seller.full_name
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((w) => w[0].toUpperCase())
                    .join('');

                  return (
                    <div
                      key={seller.id}
                      onClick={() => {
                        setSelectedSellerId(seller.id);
                      }}
                      className={`pt-2 pb-2 px-3 rounded-xl transition cursor-pointer flex flex-col gap-2 ${
                        isSelected
                          ? 'bg-blue-50/80 border border-blue-200'
                          : 'hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-extrabold text-white shrink-0 ${
                              seller.freshness === 'LIVE'
                                ? 'bg-emerald-600 ring-2 ring-emerald-300'
                                : seller.freshness === 'STALE'
                                ? 'bg-amber-500'
                                : 'bg-slate-400'
                            }`}
                          >
                            {initials || 'V'}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 leading-tight">
                              {seller.full_name}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              @{seller.username} {seller.phone ? `• ${seller.phone}` : ''}
                            </div>
                          </div>
                        </div>

                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${badgeColor}`}>
                          {statusText}
                        </span>
                      </div>

                      {/* Métricas del vendedor hoy */}
                      <div className="flex items-center justify-between text-[11px] bg-slate-50 px-2.5 py-1.5 rounded-lg">
                        <span className="text-slate-600 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-primary-500" />
                          Ventas hoy: <strong className="text-slate-900">{seller.today_sales_count}</strong>
                        </span>
                        <span className="font-bold text-emerald-700">
                          {formatCOP(seller.today_sales_cop)}
                        </span>
                      </div>

                      {/* Acciones contextuales */}
                      {isSelected && (
                        <div className="flex items-center gap-2 pt-1">
                          {seller.phone && (
                            <a
                              href={`tel:${seller.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="flex-1 flex items-center justify-center gap-1 py-1 px-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition"
                            >
                              <Phone className="w-3 h-3 text-blue-600" />
                              Llamar
                            </a>
                          )}
                          {hasCoords ? (
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${seller.latitude},${seller.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex-1 flex items-center justify-center gap-1 py-1 px-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition"
                            >
                              <Navigation className="w-3 h-3 text-primary-600" />
                              Google Maps
                            </a>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Sin coordenadas aún</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Caja Informativa de Privacidad y Limitaciones Técnicas */}
      <div className="bg-slate-900 text-slate-200 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-slate-800 text-emerald-400 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div className="flex-1 text-xs space-y-1">
          <h4 className="font-bold text-white text-sm">Privacidad, Eficiencia y Limitaciones Técnicas del GPS</h4>
          <p className="text-slate-400 leading-relaxed">
            La geolocalización de los vendedores se transmite periódicamente mientras el vendedor tenga la aplicación PWA abierta
            o activa en su navegador durante su horario laboral. Por políticas de ahorro de batería y seguridad de los navegadores móviles (iOS y Android),
            no se realiza seguimiento continuo en segundo plano si la aplicación está cerrada. Tampoco se almacena historial innecesario; únicamente la última posición conocida para optimizar la privacidad del equipo.
          </p>
        </div>
      </div>
    </div>
  );
};
