import React, { useState, useEffect, useRef } from 'react';
import { Pause, Play, AlertCircle, Radio } from 'lucide-react';
import { api } from '../../services/api';

export const SellerGpsTracker: React.FC = () => {
  const [isSharing, setIsSharing] = useState<boolean>(() => {
    return localStorage.getItem('mevacol_seller_gps_active') !== 'false';
  });
  const [lastPing, setLastPing] = useState<Date | null>(null);
  const [status, setStatus] = useState<'TRANSMITTING' | 'PAUSED' | 'DENIED' | 'ERROR'>('TRANSMITTING');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const intervalRef = useRef<any>(null);

  const sendCurrentPosition = () => {
    if (!navigator.geolocation) {
      setStatus('ERROR');
      setErrorMessage('Geolocalización no soportada por el navegador.');
      return;
    }

    if (!navigator.onLine) {
      // Si no hay internet, no bloquear; se reintentará en el siguiente ciclo
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude, accuracy } = pos.coords;
          await api.updateSellerLocation({ latitude, longitude, accuracy });
          setLastPing(new Date());
          setStatus('TRANSMITTING');
          setErrorMessage('');
        } catch (err: any) {
          console.warn('No se pudo enviar la ubicación al servidor:', err);
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus('DENIED');
          setErrorMessage('Permiso de GPS denegado en el navegador.');
        } else {
          console.warn('Error al obtener coordenadas GPS:', err.message);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 30000,
      }
    );
  };

  // Efecto para controlar el ciclo de transmisión cada 60 segundos
  useEffect(() => {
    if (!isSharing) {
      setStatus('PAUSED');
      if (intervalRef.current) clearInterval(intervalRef.current);
      // Notificar al servidor que el vendedor pausó su ubicación
      api.stopSellerLocation().catch(() => {});
      return;
    }

    // Enviar inmediatamente al activar
    sendCurrentPosition();

    // Transmitir cada 60 segundos
    intervalRef.current = setInterval(() => {
      sendCurrentPosition();
    }, 60000);

    // Si la conexión vuelve a estar en línea, transmitir
    const handleOnline = () => {
      if (isSharing) sendCurrentPosition();
    };
    window.addEventListener('online', handleOnline);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      window.removeEventListener('online', handleOnline);
    };
  }, [isSharing]);

  const toggleSharing = () => {
    const nextState = !isSharing;
    setIsSharing(nextState);
    localStorage.setItem('mevacol_seller_gps_active', String(nextState));
  };

  return (
    <div
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '14px',
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        marginTop: '6px',
        marginBottom: '6px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background:
              status === 'TRANSMITTING'
                ? 'rgba(16, 185, 129, 0.15)'
                : status === 'PAUSED'
                ? 'rgba(245, 158, 11, 0.15)'
                : 'rgba(239, 68, 68, 0.15)',
            color:
              status === 'TRANSMITTING'
                ? '#34d399'
                : status === 'PAUSED'
                ? '#fbbf24'
                : '#f87171',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {status === 'TRANSMITTING' ? (
            <Radio size={18} style={{ animation: 'pulse 2s infinite' }} />
          ) : status === 'PAUSED' ? (
            <Pause size={18} />
          ) : (
            <AlertCircle size={18} />
          )}
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>
              {status === 'TRANSMITTING'
                ? 'Ubicación en Vivo'
                : status === 'PAUSED'
                ? 'GPS en Pausa'
                : 'GPS No Disponible'}
            </span>
            <span
              style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '9999px',
                background:
                  status === 'TRANSMITTING'
                    ? 'rgba(16, 185, 129, 0.2)'
                    : 'rgba(148, 163, 184, 0.2)',
                color: status === 'TRANSMITTING' ? '#34d399' : '#94a3b8',
              }}
            >
              {status === 'TRANSMITTING' ? 'Activo' : 'Pausado'}
            </span>
          </div>

          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
            {status === 'TRANSMITTING' && lastPing
              ? `Último ping: ${lastPing.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
              : status === 'PAUSED'
              ? 'Transmisión detenida por el vendedor'
              : errorMessage || 'Permiso o soporte requerido'}
          </div>
        </div>
      </div>

      <button
        onClick={toggleSharing}
        style={{
          padding: '6px 12px',
          borderRadius: '8px',
          fontSize: '0.75rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
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
  );
};
