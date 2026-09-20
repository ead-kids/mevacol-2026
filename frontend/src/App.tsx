import React, { useState } from 'react';
import { NetworkProvider } from './context/NetworkContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BootstrapWizard } from './pages/auth/BootstrapWizard';
import { LoginPage } from './pages/auth/LoginPage';
import { AdminLayout } from './pages/admin/AdminLayout';
import { SellerHome } from './pages/seller/SellerHome';
import { DeliveryHome } from './pages/delivery/DeliveryHome';
import { Truck, Smartphone, Monitor, Eye, X } from 'lucide-react';
import { MEVACOL_LOGO } from './assets/logo';
import './assets/index.css';

const AppContent: React.FC = () => {
  const { user, isBootstrapped, isLoading } = useAuth();
  // Permite al Administrador previsualizar la experiencia de Vendedor o Entregador
  const [previewRoleOverride, setPreviewRoleOverride] = useState<string | null>(null);
  const [showPreviewBar, setShowPreviewBar] = useState(true);

  // 1. Pantalla de Carga Inicial
  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        background: 'var(--bg-app)',
      }}>
        <div style={{
          padding: '12px 18px',
          borderRadius: '20px',
          background: '#ffffff',
          boxShadow: '0 0 35px rgba(59, 130, 246, 0.35), 0 8px 24px rgba(0, 0, 0, 0.5)',
        }}>
          <img
            src={MEVACOL_LOGO}
            alt="MEVACOL Distribuciones"
            style={{
              height: '85px',
              width: 'auto',
              display: 'block',
              objectFit: 'contain',
            }}
          />
        </div>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          Cargando entorno y verificando credenciales...
        </div>
      </div>
    );
  }

  // 2. Si no hay Administrador configurado en el sistema, mostrar Asistente de Inicio (Bootstrap)
  if (isBootstrapped === false) {
    return <BootstrapWizard />;
  }

  // 3. Si no hay sesión activa, mostrar Login
  if (!user) {
    return <LoginPage />;
  }

  // 4. Determinar la interfaz según el Rol
  const effectiveRole = (user.role_code === 'ADMINISTRADOR' && previewRoleOverride)
    ? previewRoleOverride
    : user.role_code;

  return (
    <>
      {/* Barra de Previsualización para el Administrador */}
      {user.role_code === 'ADMINISTRADOR' && showPreviewBar && (
        <div className="admin-preview-bar" style={{
          background: 'linear-gradient(90deg, #1e1b4b 0%, #0f172a 100%)',
          borderBottom: '1px solid rgba(168, 85, 247, 0.3)',
          padding: '6px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          fontSize: '0.78rem',
          color: '#e9d5ff',
          zIndex: 999,
          position: 'sticky',
          top: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 700, color: '#c084fc' }}>MODO ADMIN:</span>
            <span className="hidden-mobile" style={{ fontSize: '0.75rem' }}>Previsualizar roles:</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => setPreviewRoleOverride(null)}
              className={`btn btn-sm ${!previewRoleOverride ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '3px 8px', fontSize: '0.73rem' }}
            >
              <Monitor size={12} />
              <span>Admin</span>
            </button>

            <button
              onClick={() => setPreviewRoleOverride('VENDEDOR')}
              className={`btn btn-sm ${previewRoleOverride === 'VENDEDOR' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '3px 8px', fontSize: '0.73rem' }}
            >
              <Smartphone size={12} />
              <span>Vendedor</span>
            </button>

            <button
              onClick={() => setPreviewRoleOverride('ENTREGADOR')}
              className={`btn btn-sm ${previewRoleOverride === 'ENTREGADOR' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '3px 8px', fontSize: '0.73rem' }}
            >
              <Truck size={12} />
              <span>Entregador</span>
            </button>

            <button
              onClick={() => setShowPreviewBar(false)}
              title="Ocultar barra de previsualización"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#a855f7',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                marginLeft: '4px',
              }}
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Botón flotante para restaurar la barra si fue minimizada */}
      {user.role_code === 'ADMINISTRADOR' && !showPreviewBar && (
        <button
          onClick={() => setShowPreviewBar(true)}
          style={{
            position: 'fixed',
            bottom: '16px',
            right: '16px',
            zIndex: 999,
            background: 'rgba(30, 27, 75, 0.95)',
            border: '1px solid rgba(168, 85, 247, 0.4)',
            borderRadius: 'var(--radius-full)',
            color: '#c084fc',
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.5)',
          }}
        >
          <Eye size={13} />
          <span>Roles</span>
        </button>
      )}

      {/* Renderizado de la Interfaz según Rol Efectivo */}
      {effectiveRole === 'ADMINISTRADOR' && <AdminLayout />}
      {effectiveRole === 'VENDEDOR' && <SellerHome />}
      {effectiveRole === 'ENTREGADOR' && <DeliveryHome />}
    </>
  );
};

export function App() {
  return (
    <NetworkProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </NetworkProvider>
  );
}

export default App;
