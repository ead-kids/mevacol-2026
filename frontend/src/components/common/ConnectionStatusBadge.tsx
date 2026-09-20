import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { useNetwork } from '../../context/NetworkContext';

export const ConnectionStatusBadge: React.FC = () => {
  const { isOnline, pendingCount } = useNetwork();

  if (isOnline) {
    return (
      <div className="network-status-badge online" title="Conexión en tiempo real con el servidor MEVACOL">
        <span className="status-dot online"></span>
        <Wifi size={14} />
        <span className="network-status-text">Conectado</span>
      </div>
    );
  }

  return (
    <div
      className="network-status-badge offline"
      title="Trabajando en modo offline. Los registros se sincronizarán al volver internet."
    >
      <span className="status-dot offline"></span>
      <WifiOff size={14} />
      <span className="network-status-text">
        Offline {pendingCount > 0 ? `(${pendingCount})` : ''}
      </span>
    </div>
  );
};
