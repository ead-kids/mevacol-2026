import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Pause, Play, AlertCircle, Radio, RefreshCw, CheckCircle2, Navigation } from 'lucide-react';
import { api } from '../../services/api';

export const SellerGpsTracker: React.FC = () => {
  const [isSharing, setIsSharing] = useState<boolean>(() => {
    return localStorage.getItem('mevacol_seller_gps_active') !== 'false';
  });
  const [lastPing, setLastPing] = useState<Date | null>(null);
  const [lastAccuracy, setLastAccuracy] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [permissionDenied, setPermissionDenied] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const intervalRef = useRef<any>(null);
  const watchIdRef = useRef<number | null>(null);

  // Manejar recepción exitosa de coordenadas
  const handlePositionSuccess = useCallback(async (pos: GeolocationPosition) => {
    try {
      const { latitude, longitude, accuracy } = pos.coords;
      await api.updateSellerLocation({ latitude, longitude, accuracy });
      setLastPing(new Date());
      setLastAccuracy(Math.round(accuracy));
      setPermissionDenied(false);
      setErrorMessage('');
    } catch (err: any) {
      console.warn('No se pudo enviar la ubicación al servidor:', err);
      const msg = err.message || 'Error al conectar con servidor';
      setErrorMessage(msg);
    } finally {
      setIsLocating(false);
    }
  }, []);

  // Función principal de adquisición de GPS con fallback automático
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setErrorMessage('Geolocalización no soportada');
      return;
    }

    if (!navigator.onLine) {
      return;
    }

    setIsLocating(true);

    // Intento 1: Alta precisión (Satélite GPS) con timeout rápido (6 segundos)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handlePositionSuccess(pos);
      },
      (err) => {
        // Si el usuario denegó explícitamente el permiso
        if (err.code === err.PERMISSION_DENIED) {
          setPermissionDenied(true);
          setErrorMessage('Permiso de GPS no concedido en el navegador');
          setIsLocating(false);
          return;
        }

        // Intento 2 (Fallback): Baja precisión (Red / WiFi / Antenas celulares)
        // Resuelve en < 500ms en interiores o cuando no hay vista directa a satélites
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            handlePositionSuccess(pos);
          },
          (err2) => {
            setIsLocating(false);
            if (err2.code === err2.PERMISSION_DENIED) {
              setPermissionDenied(true);
              setErrorMessage('Permiso de GPS no concedido');
            } else {
              setErrorMessage('Buscando señal satelital...');
            }
          },
          {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 60000,
          }
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 6000,
        maximumAge: 15000,
      }
    );
  }, [handlePositionSuccess]);

  // Ciclo de transmisión periódica y watchPosition
  useEffect(() => {
    if (!isSharing) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      api.stopSellerLocation().catch(() => {});
      return;
    }

    // Solicitar inmediatamente
    requestLocation();

    // Activar watchPosition pasivo para actualizar al moverse
    if (navigator.geolocation && watchIdRef.current === null) {
      try {
        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            handlePositionSuccess(pos);
          },
          () => {}, // Errores secundarios de watchPosition ignorados para no molestar
          { enableHighAccuracy: false, maximumAge: 30000 }
        );
      } catch {}
    }

    // Intervalo de respaldo cada 60 segundos
    intervalRef.current = setInterval(() => {
      requestLocation();
    }, 60000);

    const handleOnline = () => {
      if (isSharing) requestLocation();
    };
    window.addEventListener('online', handleOnline);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      window.removeEventListener('online', handleOnline);
    };
  }, [isSharing, requestLocation, handlePositionSuccess]);

  const toggleSharing = () => {
    const nextState = !isSharing;
    setIsSharing(nextState);
    localStorage.setItem('mevacol_seller_gps_active', String(nextState));
    if (nextState) {
      setPermissionDenied(false);
      setErrorMessage('');
    }
  };

  // Solicitar permiso mediante gesto de usuario directo (imprescindible en iOS Safari)
  const handleRequestPermission = () => {
    setPermissionDenied(false);
    setErrorMessage('');
    requestLocation();
  };

  return (
    <div
      style={{
        background: 'rgba(30, 41, 59, 0.7)',
        border: permissionDenied
          ? '1px solid rgba(239, 68, 68, 0.3)'
          : errorMessage
          ? '1px solid rgba(245, 158, 11, 0.3)'
          : lastPing
          ? '1px solid rgba(16, 185, 129, 0.25)'
          : '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '14px',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        boxSizing: 'border-box',
        width: '100%',
      }}
    >
      {/* Fila Superior: Título, Badge y Acciones */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <div
            onClick={isSharing ? requestLocation : undefined}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: !isSharing
                ? 'rgba(245, 158, 11, 0.15)'
                : permissionDenied
                ? 'rgba(239, 68, 68, 0.15)'
                : lastPing
                ? 'rgba(16, 185, 129, 0.15)'
                : 'rgba(59, 130, 246, 0.15)',
              color: !isSharing
                ? '#fbbf24'
                : permissionDenied
                ? '#f87171'
                : lastPing
                ? '#34d399'
                : '#60a5fa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              cursor: isSharing ? 'pointer' : 'default',
            }}
            title={isSharing ? 'Toca para forzar actualización GPS' : ''}
          >
            {!isSharing ? (
              <Pause size={17} />
            ) : permissionDenied ? (
              <AlertCircle size={17} />
            ) : isLocating ? (
              <RefreshCw size={17} className="animate-spin" />
            ) : (
              <Radio size={17} style={{ animation: lastPing ? 'pulse 2s infinite' : 'none' }} />
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffffff' }}>
              {!isSharing
                ? 'GPS en Pausa'
                : permissionDenied
                ? 'Permiso de GPS'
                : 'Ubicación en Vivo'}
            </span>
            <span
              style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: '9999px',
                background: !isSharing
                  ? 'rgba(148, 163, 184, 0.2)'
                  : permissionDenied
                  ? 'rgba(239, 68, 68, 0.2)'
                  : 'rgba(16, 185, 129, 0.2)',
                color: !isSharing
                  ? '#94a3b8'
                  : permissionDenied
                  ? '#fca5a5'
                  : '#34d399',
              }}
            >
              {!isSharing ? 'Pausado' : permissionDenied ? 'Atención' : 'Activo'}
            </span>
          </div>
        </div>

        {/* Botones de Acción */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {isSharing && !permissionDenied && (
            <button
              onClick={requestLocation}
              disabled={isLocating}
              title="Transmitir posición ahora"
              style={{
                padding: '6px 8px',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#cbd5e1',
              }}
            >
              <RefreshCw size={13} className={isLocating ? 'animate-spin' : ''} />
            </button>
          )}

          <button
            onClick={toggleSharing}
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              cursor: 'pointer',
              border: 'none',
              background: isSharing ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.2)',
              color: isSharing ? '#fca5a5' : '#93c5fd',
              transition: 'all 0.2s',
            }}
          >
            {isSharing ? (
              <>
                <Pause size={13} />
                Pausar
              </>
            ) : (
              <>
                <Play size={13} />
                Reanudar
              </>
            )}
          </button>
        </div>
      </div>

      {/* Fila Inferior: Detalle de Estado e Indicadores Claros */}
      <div
        style={{
          fontSize: '0.74rem',
          color: '#94a3b8',
          lineHeight: '1.3',
          padding: '6px 10px',
          borderRadius: '8px',
          background: 'rgba(0, 0, 0, 0.25)',
          wordBreak: 'break-word',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
        }}
      >
        <div style={{ flex: 1 }}>
          {!isSharing ? (
            <span style={{ color: '#94a3b8' }}>Transmisión detenida por el vendedor</span>
          ) : permissionDenied ? (
            <span style={{ color: '#fca5a5' }}>
              Acceso a ubicación bloqueado. Autoriza en ajustes de Safari/Chrome.
            </span>
          ) : errorMessage ? (
            <span style={{ color: '#fca5a5' }}>{errorMessage}</span>
          ) : lastPing ? (
            <span style={{ color: '#34d399', display: 'inline-flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
              <CheckCircle2 size={13} style={{ flexShrink: 0 }} />
              <span>
                Transmitiendo · Ping: {lastPing.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                {lastAccuracy !== null ? ` (±${lastAccuracy}m)` : ''}
              </span>
            </span>
          ) : isLocating ? (
            <span style={{ color: '#60a5fa' }}>Adquiriendo coordenadas satelitales GPS...</span>
          ) : (
            'Iniciando transmisión de jornada...'
          )}
        </div>

        {permissionDenied && (
          <button
            onClick={handleRequestPermission}
            style={{
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '0.72rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
              border: 'none',
              background: '#2563eb',
              color: '#ffffff',
              flexShrink: 0,
            }}
          >
            <Navigation size={11} />
            Activar
          </button>
        )}

        {errorMessage && isSharing && !permissionDenied && (
          <button
            onClick={() => {
              setErrorMessage('');
              requestLocation();
            }}
            style={{
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '0.72rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
              border: 'none',
              background: 'rgba(239, 68, 68, 0.2)',
              color: '#fca5a5',
              flexShrink: 0,
            }}
          >
            Reintentar
          </button>
        )}
      </div>
    </div>
  );
};
