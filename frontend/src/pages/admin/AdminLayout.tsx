import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '../../components/layout/AdminSidebar';
import { AdminDashboard } from './AdminDashboard';
import { AdminUsers } from './AdminUsers';
import { AdminCustomers } from './AdminCustomers';
import { AdminProducts } from './AdminProducts';
import { AdminSales } from './AdminSales';
import { AdminInvoices } from './AdminInvoices';
import { AdminDeliveries } from './AdminDeliveries';
import { AdminRoutesMap } from './AdminRoutesMap';
import { AdminReports } from './AdminReports';
import { ConnectionStatusBadge } from '../../components/common/ConnectionStatusBadge';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { User } from '../../types';
import { Info, User as UserIcon } from 'lucide-react';

export const AdminLayout: React.FC = () => {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [users, setUsers] = useState<User[]>([]);
  const [futureModal, setFutureModal] = useState<{ name: string; phase: number } | null>(null);

  const fetchUsers = async () => {
    try {
      const res = await api.getUsers();
      setUsers(res.users);
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleFutureModuleClick = (name: string, phase: number) => {
    setFutureModal({ name, phase });
  };

  return (
    <div className="admin-container">
      {/* Barra Lateral Navegable */}
      <AdminSidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onFutureModuleClick={handleFutureModuleClick}
      />

      {/* Área Principal de Contenido */}
      <div className="admin-main">
        {/* Barra Superior Fija */}
        <header className="admin-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
              {currentTab === 'dashboard'
                ? 'Panel de Control Maestro'
                : currentTab === 'customers'
                ? 'Directorio de Clientes'
                : currentTab === 'products' || currentTab === 'inventory'
                ? 'Gestión de Productos e Inventario'
                : currentTab === 'sales'
                ? 'Control de Ventas'
                : currentTab === 'invoices'
                ? 'Facturación Comercial'
                : currentTab === 'deliveries'
                ? 'Gestión y Despacho de Entregas'
                : currentTab === 'routes'
                ? 'Mapa Logístico, Rutas & GPS'
                : currentTab === 'reports'
                ? 'Reportes y Análisis'
                : 'Administración de Usuarios'}
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Indicador de Conexión */}
            <ConnectionStatusBadge />

            {/* Perfil del Administrador */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}>
                <UserIcon size={16} />
              </div>
              <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{user?.full_name}</span>
            </div>
          </div>
        </header>

        {/* Cuerpo de la Página */}
        <div className="admin-content">
          {currentTab === 'dashboard' ? (
            <AdminDashboard
              onGoToUsers={() => setCurrentTab('users')}
              onGoToTab={setCurrentTab}
            />
          ) : currentTab === 'customers' ? (
            <AdminCustomers />
          ) : currentTab === 'products' || currentTab === 'inventory' ? (
            <AdminProducts />
          ) : currentTab === 'sales' ? (
            <AdminSales />
          ) : currentTab === 'invoices' ? (
            <AdminInvoices />
          ) : currentTab === 'deliveries' ? (
            <AdminDeliveries />
          ) : currentTab === 'routes' ? (
            <AdminRoutesMap />
          ) : currentTab === 'reports' ? (
            <AdminReports />
          ) : (
            <AdminUsers users={users} onRefreshUsers={fetchUsers} />
          )}
        </div>
      </div>

      {/* Modal para Módulos de Fases Posteriores */}
      {futureModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Info size={20} color="var(--primary)" />
                <h3 style={{ fontSize: '1.2rem' }}>Módulo: {futureModal.name}</h3>
              </div>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.95rem', marginBottom: '14px' }}>
                La arquitectura técnica y base de datos relacional para este módulo ya están listas en el backend y el esquema maestro.
              </p>
              <div style={{
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.85rem',
                color: '#93c5fd',
              }}>
                ⚙️ <strong>Fase Planificada:</strong> Este componente se habilitará de forma interactiva en la <strong>Fase {futureModal.phase}</strong> según el flujo de aprobación paso a paso.
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setFutureModal(null)} className="btn btn-primary btn-sm">
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
