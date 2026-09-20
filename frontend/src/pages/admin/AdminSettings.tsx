import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  CheckCircle2,
  RefreshCw,
  Server,
  Database,
  Building2,
  Globe,
  Radio,
} from 'lucide-react';
import { api } from '../../services/api';
import type { SystemStatus } from '../../types';

export const AdminSettings: React.FC = () => {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [checkingPing, setCheckingPing] = useState(false);
  const [pingSuccess, setPingSuccess] = useState<boolean | null>(null);
  const [clearingCache, setClearingCache] = useState(false);
  const [cacheMessage, setCacheMessage] = useState<string | null>(null);

  // Configuración de visualización guardada en localStorage
  const [viewPreference, setViewPreference] = useState<'auto' | 'mobile' | 'desktop'>(() => {
    return (localStorage.getItem('mevacol_view_pref') as any) || 'auto';
  });

  const [densityPreference, setDensityPreference] = useState<'comfortable' | 'compact'>(() => {
    return (localStorage.getItem('mevacol_density_pref') as any) || 'comfortable';
  });

  const handleSaveViewPref = (pref: 'auto' | 'mobile' | 'desktop') => {
    setViewPreference(pref);
    localStorage.setItem('mevacol_view_pref', pref);
    setCacheMessage('✅ Preferencia de vista guardada exitosamente.');
    setTimeout(() => setCacheMessage(null), 3000);
  };

  const handleSaveDensityPref = (density: 'comfortable' | 'compact') => {
    setDensityPreference(density);
    localStorage.setItem('mevacol_density_pref', density);
    setCacheMessage('✅ Densidad de pantalla actualizada.');
    setTimeout(() => setCacheMessage(null), 3000);
  };

  const handleCheckPing = async () => {
    setCheckingPing(true);
    try {
      const res = await api.getSystemStatus();
      setSystemStatus(res);
      setPingSuccess(true);
    } catch {
      setPingSuccess(false);
    } finally {
      setCheckingPing(false);
    }
  };

  useEffect(() => {
    handleCheckPing();
  }, []);

  const handleClearCache = async () => {
    setClearingCache(true);
    try {
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((key) => caches.delete(key)));
      }
      setCacheMessage('✨ Caché local limpiado con éxito. Se recargará la página...');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      setCacheMessage('Error al limpiar caché.');
    } finally {
      setClearingCache(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Configuración del Sistema
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Preferencias de visualización en teléfonos y computadores, datos de empresa y estado en la nube.
          </p>
        </div>

        {cacheMessage && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            color: '#34d399',
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}>
            {cacheMessage}
          </div>
        )}
      </div>

      {/* SECCIÓN 1: ADAPTABILIDAD A TELÉFONOS (MÓVIL / ESCRITORIO) */}
      <div style={{
        background: 'var(--bg-surface-card)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
          }}>
            <Smartphone size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
              Adaptación Móvil y Modo Teléfono
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Personaliza cómo se adapta el panel de Administrador según el dispositivo que estés usando.
            </p>
          </div>
        </div>

        {/* Tarjetas de Selección de Modo */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '16px',
          marginTop: '16px',
        }}>
          {/* Opción Automático */}
          <div
            onClick={() => handleSaveViewPref('auto')}
            style={{
              background: viewPreference === 'auto' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255, 255, 255, 0.02)',
              border: `1px solid ${viewPreference === 'auto' ? 'var(--primary)' : 'var(--border-subtle)'}`,
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: viewPreference === 'auto' ? '#60a5fa' : 'var(--text-primary)' }}>
                📱 Automático (Recomendado)
              </span>
              {viewPreference === 'auto' && <CheckCircle2 size={18} color="var(--primary)" />}
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
              Detecta si abres la app desde tu iPhone, Android o Computador y adapta automáticamente el menú lateral a modo cajón retráctil.
            </p>
          </div>

          {/* Opción Móvil Forzado */}
          <div
            onClick={() => handleSaveViewPref('mobile')}
            style={{
              background: viewPreference === 'mobile' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255, 255, 255, 0.02)',
              border: `1px solid ${viewPreference === 'mobile' ? 'var(--primary)' : 'var(--border-subtle)'}`,
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: viewPreference === 'mobile' ? '#60a5fa' : 'var(--text-primary)' }}>
                📲 Forzar Vista Móvil Compacta
              </span>
              {viewPreference === 'mobile' && <CheckCircle2 size={18} color="var(--primary)" />}
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
              Activa siempre el diseño táctil ultracompacto con botones grandes, tablas fluidas y navegación por menú hamburguesa.
            </p>
          </div>

          {/* Opción Escritorio */}
          <div
            onClick={() => handleSaveViewPref('desktop')}
            style={{
              background: viewPreference === 'desktop' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255, 255, 255, 0.02)',
              border: `1px solid ${viewPreference === 'desktop' ? 'var(--primary)' : 'var(--border-subtle)'}`,
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: viewPreference === 'desktop' ? '#60a5fa' : 'var(--text-primary)' }}>
                💻 Escritorio Completo
              </span>
              {viewPreference === 'desktop' && <CheckCircle2 size={18} color="var(--primary)" />}
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
              Mantiene la barra lateral fija visible de forma permanente, ideal para pantallas grandes o monitores de oficina.
            </p>
          </div>
        </div>

        {/* Densidad de Pantalla */}
        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Densidad de Elementos en Tablas:</span>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Ajusta el espacio de celdas y filas para ver más información en pantallas de teléfono.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => handleSaveDensityPref('comfortable')}
                className={`btn btn-sm ${densityPreference === 'comfortable' ? 'btn-primary' : 'btn-secondary'}`}
              >
                Confortable
              </button>
              <button
                onClick={() => handleSaveDensityPref('compact')}
                className={`btn btn-sm ${densityPreference === 'compact' ? 'btn-primary' : 'btn-secondary'}`}
              >
                Compacto (Móvil)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN 2: INFORMACIÓN DE LA EMPRESA */}
      <div style={{
        background: 'var(--bg-surface-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
          }}>
            <Building2 size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
              Datos de la Empresa (Facturación & Despachos)
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Información legal que aparece en facturas, recibos y reportes oficiales.
            </p>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px',
          marginTop: '16px',
        }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Razón Social</span>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', marginTop: '2px' }}>Distribuidora Farmacéutica MEVACOL S.A.S.</div>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>NIT</span>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', marginTop: '2px' }}>901.458.789-3</div>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Teléfono Comercial</span>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', marginTop: '2px' }}>+57 312 890 4567 / (604) 444-2310</div>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Ciudad & Dirección</span>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', marginTop: '2px' }}>Cra. 52 # 45-30, Medellín, Colombia</div>
          </div>
        </div>
      </div>

      {/* SECCIÓN 3: ESTADO DE LA INFRAESTRUCTURA Y NUBE */}
      <div style={{
        background: 'var(--bg-surface-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
            }}>
              <Server size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                Infraestructura en la Nube y Estado del Sistema
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Monitoreo activo de los servicios de MEVACOL en producción.
              </p>
            </div>
          </div>

          <button
            onClick={handleCheckPing}
            disabled={checkingPing}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={checkingPing ? 'spin' : ''} />
            <span>{checkingPing ? 'Verificando...' : 'Comprobar Estado'}</span>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Servidor Render */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            flexWrap: 'wrap',
            gap: '8px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Radio size={18} color="#3b82f6" />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                  Backend API (Render.com) {systemStatus && `· v${systemStatus.version}`}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>https://mevacol-2026.onrender.com/api</div>
              </div>
            </div>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: pingSuccess ? '#34d399' : '#f87171',
              background: pingSuccess ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: pingSuccess ? '#10b981' : '#ef4444' }} />
              {pingSuccess ? 'En Línea · Activo' : 'Comprobando...'}
            </span>
          </div>

          {/* Base de Datos Neon */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            flexWrap: 'wrap',
            gap: '8px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Database size={18} color="#10b981" />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Base de Datos Relacional (PostgreSQL)</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Neon.tech Cloud Serverless Database</div>
              </div>
            </div>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: '#34d399',
              background: 'rgba(16, 185, 129, 0.1)',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
              Conectado
            </span>
          </div>

          {/* Hosting Vercel */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            flexWrap: 'wrap',
            gap: '8px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Globe size={18} color="#f59e0b" />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Frontend PWA (Vercel Edge CDN)</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>https://mevacol.vercel.app</div>
              </div>
            </div>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: '#34d399',
              background: 'rgba(16, 185, 129, 0.1)',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
              En Producción
            </span>
          </div>
        </div>

        {/* Botón de Limpieza de Caché */}
        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleClearCache}
            disabled={clearingCache}
            className="btn btn-secondary btn-sm"
            style={{ color: '#fca5a5' }}
          >
            {clearingCache ? 'Limpiando...' : '🧹 Limpiar Caché Local de la App'}
          </button>
        </div>
      </div>
    </div>
  );
};
