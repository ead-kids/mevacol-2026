import React, { useState } from 'react';
import { UserCheck, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const BootstrapWizard: React.FC = () => {
  const { bootstrapAdmin, isLoading, error } = useAuth();

  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    password: '',
    confirm_password: '',
    email: '',
    phone: '',
  });

  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!formData.full_name || !formData.username || !formData.password) {
      setLocalError('Por favor complete todos los campos obligatorios (*).');
      return;
    }

    if (formData.username.length < 3) {
      setLocalError('El nombre de usuario debe tener mínimo 3 caracteres.');
      return;
    }

    if (formData.password.length < 6) {
      setLocalError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (formData.password !== formData.confirm_password) {
      setLocalError('Las contraseñas ingresadas no coinciden.');
      return;
    }

    try {
      await bootstrapAdmin({
        full_name: formData.full_name,
        username: formData.username,
        password: formData.password,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
      });
    } catch (err: any) {
      setLocalError(err.message || 'Error al inicializar el administrador.');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: 'radial-gradient(circle at 50% 20%, rgba(59, 130, 246, 0.15) 0%, rgba(9, 13, 22, 1) 75%)',
    }}>
      <div className="glass-card" style={{ maxWidth: '580px', width: '100%' }}>
        {/* Header con Logo Oficial MEVACOL */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            display: 'inline-flex',
            padding: '10px 18px',
            background: '#ffffff',
            borderRadius: '20px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4), 0 0 20px rgba(59, 130, 246, 0.25)',
            marginBottom: '16px',
          }}>
            <img
              src="/logo.png"
              alt="MEVACOL Distribuciones"
              style={{
                height: '105px',
                width: 'auto',
                display: 'block',
                objectFit: 'contain',
              }}
            />
          </div>
          <h1 style={{ fontSize: '1.65rem', marginBottom: '8px' }}>Configuración Inicial del Sistema</h1>
          <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
            Bienvenido a MEVACOL Distribuciones. Como primer paso, configure el usuario <strong>ADMINISTRADOR MAESTRO</strong>.
          </p>
        </div>

        <div style={{
          background: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 16px',
          marginBottom: '24px',
          fontSize: '0.85rem',
          color: '#93c5fd',
          display: 'flex',
          gap: '10px',
        }}>
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <span>
            Este asistente es de <strong>único uso</strong>. Una vez creado el Administrador, esta pantalla quedará bloqueada permanentemente por seguridad.
          </span>
        </div>

        {(localError || error) && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            marginBottom: '20px',
            fontSize: '0.9rem',
            color: '#fca5a5',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <AlertCircle size={18} />
            <span>{localError || error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nombre Completo del Administrador *</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Ej. Juan Carlos Pérez"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Nombre de Usuario *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej. admin"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Teléfono de Contacto</label>
              <input
                type="tel"
                className="form-input"
                placeholder="Ej. 3001234567"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Correo Electrónico (Opcional)</label>
            <input
              type="email"
              className="form-input"
              placeholder="admin@mevacol.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Contraseña Segura *</label>
              <input
                type="password"
                className="form-input"
                placeholder="Mínimo 6 caracteres"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirmar Contraseña *</label>
              <input
                type="password"
                className="form-input"
                placeholder="Repita la contraseña"
                value={formData.confirm_password}
                onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '12px', padding: '14px' }}
            disabled={isLoading}
          >
            {isLoading ? (
              <span>Configurando Administrador...</span>
            ) : (
              <>
                <UserCheck size={18} />
                <span>Crear Administrador e Iniciar MEVACOL</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
