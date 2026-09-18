import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, LogIn, AlertCircle, Shield, ShoppingBag, Truck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ConnectionStatusBadge } from '../../components/common/ConnectionStatusBadge';

export const LoginPage: React.FC = () => {
  const { login, isLoading, error } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!identifier.trim() || !password.trim()) {
      setLocalError('Por favor ingrese su usuario o correo y contraseña.');
      return;
    }

    try {
      await login(identifier, password);
    } catch (err: any) {
      setLocalError(err.message || 'Credenciales inválidas.');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      background: 'radial-gradient(ellipse at top, rgba(30, 58, 138, 0.25) 0%, rgba(9, 13, 22, 1) 70%)',
    }}>
      {/* Top Connection Indicator */}
      <div style={{ marginBottom: '20px' }}>
        <ConnectionStatusBadge />
      </div>

      <div className="glass-card" style={{ maxWidth: '440px', width: '100%' }}>
        {/* Brand Header con Logo Oficial */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            display: 'inline-flex',
            padding: '12px 20px',
            background: '#ffffff',
            borderRadius: '22px',
            boxShadow: '0 10px 32px rgba(0, 0, 0, 0.4), 0 0 24px rgba(59, 130, 246, 0.25)',
            marginBottom: '14px',
          }}>
            <img
              src="/logo.png"
              alt="MEVACOL Distribuciones"
              style={{
                height: '115px',
                width: 'auto',
                display: 'block',
                objectFit: 'contain',
              }}
            />
          </div>
          <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
            Acceso Seguro al Sistema de Gestión
          </p>
        </div>

        {(localError || error) && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            marginBottom: '20px',
            fontSize: '0.88rem',
            color: '#fca5a5',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{localError || error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Usuario o Correo Electrónico</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Ej. admin o vendedor1"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
                required
                style={{ paddingLeft: '40px' }}
              />
              <User
                size={18}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                style={{ paddingLeft: '40px', paddingRight: '40px' }}
              />
              <Lock
                size={18}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
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
                aria-label="Mostrar u ocultar contraseña"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '14px', padding: '13px' }}
            disabled={isLoading}
          >
            {isLoading ? (
              <span>Autenticando...</span>
            ) : (
              <>
                <LogIn size={18} />
                <span>Ingresar al Sistema</span>
              </>
            )}
          </button>
        </form>

        {/* Guía informativa de roles */}
        <div style={{
          marginTop: '28px',
          paddingTop: '20px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '8px',
          textAlign: 'center',
        }}>
          <div style={{ padding: '8px 4px' }}>
            <div style={{ color: '#c084fc', marginBottom: '4px', display: 'flex', justifyContent: 'center' }}>
              <Shield size={20} />
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>Admin</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Escritorio</div>
          </div>

          <div style={{ padding: '8px 4px' }}>
            <div style={{ color: '#60a5fa', marginBottom: '4px', display: 'flex', justifyContent: 'center' }}>
              <ShoppingBag size={20} />
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>Vendedor</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Móvil Táctil</div>
          </div>

          <div style={{ padding: '8px 4px' }}>
            <div style={{ color: '#fbbf24', marginBottom: '4px', display: 'flex', justifyContent: 'center' }}>
              <Truck size={20} />
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>Entregador</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Móvil Mapas</div>
          </div>
        </div>
      </div>
    </div>
  );
};
