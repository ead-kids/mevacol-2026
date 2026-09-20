import React, { useState } from 'react';
import { NetworkProvider } from './context/NetworkContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BootstrapWizard } from './pages/auth/BootstrapWizard';
import { LoginPage } from './pages/auth/LoginPage';
import { AdminLayout } from './pages/admin/AdminLayout';
import { SellerHome } from './pages/seller/SellerHome';
import { DeliveryHome } from './pages/delivery/DeliveryHome';
import { ShoppingBag, Truck, Smartphone, Monitor } from 'lucide-react';
import { MEVACOL_LOGO } from './assets/logo';
import './assets/index.css';

const AppContent: React.FC = () => {
  const { user, isBootstrapped, isLoading } = useAuth();
  // Permite al Administrador previsualizar la experiencia de Vendedor o Entregador
  const [previewRoleOverride, setPreviewRoleOverride] = useState<string | null>(null);

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
      {user.role_code === 'ADMINISTRADOR' && (
        <div style={{
          background: 'linear-gradient(90deg, #1e1b4b 0%, #0f172a 100%)',
          borderBottom: '1px solid rgba(168, 85, 247, 0.3)',
          padding: '6px 16px',
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
            <span style={{ fontWeight: 700, color: '#c084fc' }}>MODO ADMINISTRADOR:</span>
            <span>Previsualizar vistas adaptativas según dispositivo y rol:</span>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setPreviewRoleOverride(null)}
              className={`btn btn-sm ${!previewRoleOverride ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '3px 10px', fontSize: '0.75rem' }}
            >
              <Monitor size={12} />
              <span>Escritorio (Admin)</span>
            </button>

            <button
              onClick={() => setPreviewRoleOverride('VENDEDOR')}
              className={`btn btn-sm ${previewRoleOverride === 'VENDEDOR' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '3px 10px', fontSize: '0.75rem' }}
            >
              <Smartphone size={12} />
              <ShoppingBag size={12} />
              <span>Móvil Vendedor</span>
            </button>

            <button
              onClick={() => setPreviewRoleOverride('ENTREGADOR')}
              className={`btn btn-sm ${previewRoleOverride === 'ENTREGADOR' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '3px 10px', fontSize: '0.75rem' }}
            >
              <Smartphone size={12} />
              <Truck size={12} />
              <span>Móvil Entregador</span>
            </button>
          </div>
        </div>
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
