import React from 'react';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Truck,
  UserSquare2,
  Package,
  Boxes,
  ShoppingCart,
  Receipt,
  BarChart3,
  Percent,
  Award,
  MapPin,
  Navigation,
  Settings,
  LogOut,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { MEVACOL_LOGO } from '../../assets/logo';

interface AdminSidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onFutureModuleClick: (moduleName: string, phase: number) => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentTab,
  onSelectTab,
  onFutureModuleClick,
  mobileOpen = false,
  onCloseMobile,
}) => {
  const { user, logout } = useAuth();

  const menuGroups = [
    {
      title: 'Principal',
      items: [
        { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, active: true, phase: 1 },
        { id: 'users', name: 'Usuarios del Sistema', icon: Users, active: true, phase: 1 },
      ],
    },
    {
      title: 'Comercial & Clientes',
      items: [
        { id: 'sellers', name: 'Vendedores', icon: UserCheck, active: true, phase: 2 },
        { id: 'customers', name: 'Clientes', icon: UserSquare2, active: true, phase: 2 },
        { id: 'sales', name: 'Ventas', icon: ShoppingCart, active: true, phase: 4 },
        { id: 'invoices', name: 'Facturación', icon: Receipt, active: true, phase: 5 },
        { id: 'discounts', name: 'Descuentos', icon: Percent, active: false, phase: 6 },
        { id: 'campaigns', name: 'Campañas e Incentivos', icon: Award, active: false, phase: 2 },
      ],
    },
    {
      title: 'Inventario & Logística',
      items: [
        { id: 'products', name: 'Productos', icon: Package, active: true, phase: 3 },
        { id: 'inventory', name: 'Inventario', icon: Boxes, active: true, phase: 3 },
        { id: 'deliveries', name: 'Entregas & Logística', icon: Truck, active: true, phase: 6 },
        { id: 'routes', name: 'Rutas & GPS', icon: Navigation, active: true, phase: 7 },
        { id: 'locations', name: 'Ubicación de Vendedores', icon: MapPin, active: false, phase: 7 },
      ],
    },
    {
      title: 'Control & Auditoría',
      items: [
        { id: 'reports', name: 'Reportes y Análisis', icon: BarChart3, active: true, phase: 8 },
        { id: 'settings', name: 'Configuración', icon: Settings, active: true, phase: 1 },
      ],
    },
  ];

  return (
    <aside className={`admin-sidebar ${mobileOpen ? 'open' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-header" style={{ gap: '14px', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '10px',
            padding: '4px 6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)',
            flexShrink: 0,
          }}>
            <img
              src={MEVACOL_LOGO}
              alt="MEVACOL"
              style={{
                height: '42px',
                width: 'auto',
                display: 'block',
                objectFit: 'contain',
              }}
            />
          </div>
          <div>
            <div className="sidebar-brand-title" style={{ fontSize: '1.15rem' }}>MEVACOL</div>
            <div className="sidebar-brand-sub">Distribuciones</div>
          </div>
        </div>

        {/* Botón Cerrar en Móviles */}
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="mobile-close-btn"
            aria-label="Cerrar menú"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              borderRadius: '8px',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Navigation Groups */}
      <nav className="sidebar-nav">
        {menuGroups.map((group, gIdx) => (
          <div key={gIdx}>
            <div className="sidebar-category">{group.title}</div>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isSelected = currentTab === item.id;

              return (
                <div
                  key={item.id}
                  className={`sidebar-item ${isSelected ? 'active' : ''}`}
                  onClick={() => {
                    if (item.active) {
                      onSelectTab(item.id);
                      if (onCloseMobile) onCloseMobile();
                    } else {
                      onFutureModuleClick(item.name, item.phase);
                    }
                  }}
                >
                  <div className="sidebar-item-content">
                    <Icon size={18} />
                    <span>{item.name}</span>
                  </div>

                  {item.active ? (
                    <span className="sidebar-tag active-tag">Activo</span>
                  ) : (
                    <span className="sidebar-tag">Fase {item.phase}</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User info & Logout */}
      <div className="sidebar-footer">
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
            {user?.full_name}
          </span>
          <span style={{ fontSize: '0.72rem', color: '#c084fc', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Administrador
          </span>
        </div>
        <button
          onClick={logout}
          className="btn btn-secondary btn-sm"
          title="Cerrar Sesión"
          style={{ padding: '8px' }}
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
};
