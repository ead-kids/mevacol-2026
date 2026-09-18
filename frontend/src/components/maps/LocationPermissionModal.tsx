import React from 'react';
import { Compass, ShieldCheck, MapPin, X } from 'lucide-react';

interface LocationPermissionModalProps {
  isOpen: boolean;
  onAllow: () => void;
  onDeny: () => void;
  onClose: () => void;
}

export const LocationPermissionModal: React.FC<LocationPermissionModalProps> = ({
  isOpen,
  onAllow,
  onDeny,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 1200 }}>
      <div className="modal-content" style={{ maxWidth: '440px', width: '92%' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(59, 130, 246, 0.2)',
              color: '#60a5fa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Compass size={18} />
            </div>
            <h3 style={{ fontSize: '1.15rem' }}>Permiso de Ubicación</h3>
          </div>
          <button
            onClick={onClose}
            className="btn btn-secondary btn-sm"
            style={{ padding: '4px' }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.25) 0%, rgba(15, 23, 42, 0.6) 100%)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}>
            <MapPin size={22} color="#60a5fa" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#ffffff', marginBottom: '4px' }}>
                ¿Para qué se utilizará tu ubicación?
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.45', margin: 0 }}>
                MEVACOL requiere acceso temporal a tu ubicación actual <strong>únicamente</strong> para calcular la ruta más óptima, estimar el tiempo de llegada hacia el cliente y trazar el recorrido en el mapa interactivo.
              </p>
            </div>
          </div>

          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.78rem',
            color: '#34d399',
          }}>
            <ShieldCheck size={18} style={{ flexShrink: 0 }} />
            <span>
              <strong>Garantía de Privacidad:</strong> Tu ubicación en vivo no se almacena en el servidor ni se comparte con terceros.
            </span>
          </div>

          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
            Si decides no conceder el permiso, la aplicación continuará funcionando con normalidad utilizando la dirección registrada del cliente y el punto base de la empresa.
          </p>
        </div>

        <div className="modal-footer" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={onDeny}
            className="btn btn-secondary"
            style={{ flex: 1, fontSize: '0.86rem' }}
          >
            Continuar sin GPS
          </button>
          <button
            onClick={onAllow}
            className="btn btn-primary"
            style={{ flex: 1, background: '#2563eb', fontSize: '0.86rem' }}
          >
            Permitir Ubicación
          </button>
        </div>
      </div>
    </div>
  );
};
