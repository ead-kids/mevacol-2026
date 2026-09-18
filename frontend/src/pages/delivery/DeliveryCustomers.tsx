import React, { useState, useEffect } from 'react';
import {
  Search,
  ArrowLeft,
  Phone,
  MapPin,
  Building,
  Users,
  X,
  ShieldCheck,
} from 'lucide-react';
import type { Customer } from '../../types';
import { api } from '../../services/api';

interface DeliveryCustomersProps {
  onBack: () => void;
}

export const DeliveryCustomers: React.FC<DeliveryCustomersProps> = ({ onBack }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      // El entregador consulta los clientes activos con datos de entrega
      const res = await api.getCustomers({
        search: searchTerm || undefined,
        status: 'active',
      });
      setCustomers(res.customers);
    } catch (err) {
      console.error('Error al cargar directorio de entregas:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 200);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  return (
    <div className="mobile-app-shell">
      {/* Top Mobile Bar con Botón Regresar */}
      <header className="mobile-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={onBack}
            className="btn btn-secondary btn-sm"
            style={{ padding: '8px' }}
            title="Regresar al Panel"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff' }}>
              Directorio de Entregas
            </div>
            <div style={{ fontSize: '0.7rem', color: '#fbbf24', fontWeight: 600 }}>
              Consulta de Direcciones &bull; Solo Lectura
            </div>
          </div>
        </div>

        <div style={{
          padding: '4px 10px',
          borderRadius: 'var(--radius-full)',
          background: 'rgba(245, 158, 11, 0.15)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          color: '#fbbf24',
          fontSize: '0.72rem',
          fontWeight: 700,
        }}>
          Entregador
        </div>
      </header>

      {/* Cuerpo Móvil */}
      <main className="mobile-body">
        {/* Aviso de Modo Consulta / Solo Lectura */}
        <div style={{
          padding: '10px 14px',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          color: '#93c5fd',
          fontSize: '0.82rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <ShieldCheck size={18} style={{ flexShrink: 0 }} />
          <span>Información logística de clientes autorizada para el equipo de entregas.</span>
        </div>

        {/* Buscador Rápido Táctil */}
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Buscar por cliente, dirección o ciudad..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '38px', borderRadius: 'var(--radius-lg)' }}
          />
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Lista de Tarjetas de Entrega */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {customers.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-muted)' }}>
              <Users size={36} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                {isLoading ? 'Consultando directorio...' : 'No se encontraron clientes'}
              </div>
            </div>
          ) : (
            customers.map((c) => (
              <div
                key={c.id}
                className="glass-card"
                style={{
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  background: 'rgba(30, 41, 59, 0.65)',
                  borderColor: 'rgba(245, 158, 11, 0.2)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {c.name}
                  </div>
                  <span className="badge badge-success">Activo</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.86rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: '#fde68a' }}>
                    <MapPin size={16} color="#fbbf24" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span style={{ fontWeight: 600 }}>{c.address || 'Dirección no registrada'}</span>
                  </div>

                  {c.city && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                      <Building size={15} color="var(--text-muted)" />
                      <span>{c.city}</span>
                    </div>
                  )}

                  {c.phone && (
                    <div style={{ marginTop: '4px' }}>
                      <a
                        href={`tel:${c.phone}`}
                        className="btn btn-secondary btn-sm"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          color: '#34d399',
                          borderColor: 'rgba(16, 185, 129, 0.3)',
                          padding: '6px 12px',
                        }}
                      >
                        <Phone size={14} />
                        <span>Llamar al Cliente ({c.phone})</span>
                      </a>
                    </div>
                  )}

                  {c.notes && (
                    <div style={{
                      background: 'rgba(15, 23, 42, 0.5)',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.78rem',
                      color: 'var(--text-muted)',
                      borderLeft: '2px solid #fbbf24',
                      marginTop: '4px',
                    }}>
                      <strong>Instrucciones:</strong> {c.notes}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};
