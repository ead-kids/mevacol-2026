import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Edit2,
  AlertCircle,
  X,
  Phone,
  Mail,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Eye,
  RefreshCw,
  Trash2,
  Award,
  ShieldCheck,
  FileText
} from 'lucide-react';
import type { SellerUser, SellerStats, Sale } from '../../types';
import { api } from '../../services/api';

export const AdminSellers: React.FC = () => {
  const [sellers, setSellers] = useState<SellerUser[]>([]);
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState<SellerUser | null>(null);

  // Modal de Historial y Detalle del Vendedor
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailSeller, setDetailSeller] = useState<SellerUser | null>(null);
  const [sellerSales, setSellerSales] = useState<Sale[]>([]);
  const [isLoadingSales, setIsLoadingSales] = useState(false);

  // Formulario de Creación
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    password: '',
    document_id: '',
    phone: '',
    email: '',
    address: '',
  });

  // Formulario de Edición
  const [editFormData, setEditFormData] = useState({
    full_name: '',
    document_id: '',
    phone: '',
    email: '',
    address: '',
    password: '',
  });

  const formatCOP = (val: number | string | undefined | null) => {
    const num = Number(val) || 0;
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(num);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [sellersRes, statsRes] = await Promise.all([
        api.getSellers(searchTerm || undefined, statusFilter !== 'ALL' ? statusFilter : undefined),
        api.getSellersStats(),
      ]);
      setSellers(sellersRes.sellers || []);
      setStats(statsRes.stats || null);
    } catch (err: any) {
      console.error('Error al cargar vendedores:', err);
      setFeedback({ type: 'error', text: err.message || 'Error al conectar con el servidor.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm, statusFilter]);

  const handleCreateSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!formData.username.trim() || !formData.full_name.trim() || !formData.password.trim()) {
      setFeedback({ type: 'error', text: 'Usuario, nombre completo y contraseña son obligatorios.' });
      return;
    }

    if (formData.password.length < 6) {
      setFeedback({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres.' });
      return;
    }

    try {
      const res = await api.createSeller(formData);
      setFeedback({ type: 'success', text: res.message || 'Vendedor creado exitosamente.' });
      setIsCreateModalOpen(false);
      setFormData({
        username: '',
        full_name: '',
        password: '',
        document_id: '',
        phone: '',
        email: '',
        address: '',
      });
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Error al crear el vendedor.' });
    }
  };

  const openEditModal = (seller: SellerUser) => {
    setSelectedSeller(seller);
    setEditFormData({
      full_name: seller.full_name,
      document_id: seller.document_id || '',
      phone: seller.phone || '',
      email: seller.email || '',
      address: seller.address || '',
      password: '',
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeller) return;
    setFeedback(null);

    if (!editFormData.full_name.trim()) {
      setFeedback({ type: 'error', text: 'El nombre completo es requerido.' });
      return;
    }

    try {
      const payload: any = {
        full_name: editFormData.full_name,
        document_id: editFormData.document_id,
        phone: editFormData.phone,
        email: editFormData.email,
        address: editFormData.address,
      };
      if (editFormData.password.trim()) {
        payload.password = editFormData.password.trim();
      }

      const res = await api.updateSeller(selectedSeller.id, payload);
      setFeedback({ type: 'success', text: res.message || 'Vendedor actualizado con éxito.' });
      setIsEditModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Error al actualizar el vendedor.' });
    }
  };

  const handleToggleStatus = async (seller: SellerUser) => {
    const nextStatus = seller.is_active === 1 ? 0 : 1;
    const actionWord = nextStatus === 1 ? 'activar' : 'desactivar';
    if (!window.confirm(`¿Estás seguro de que deseas ${actionWord} al vendedor ${seller.full_name}?`)) {
      return;
    }

    try {
      const res = await api.toggleSellerStatus(seller.id, nextStatus);
      setFeedback({ type: 'success', text: res.message });
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Error al cambiar estado del vendedor.' });
    }
  };

  const openDetailModal = async (seller: SellerUser) => {
    setDetailSeller(seller);
    setIsDetailModalOpen(true);
    setIsLoadingSales(true);
    try {
      const res = await api.getSellerSales(seller.id, 1, 30);
      setSellerSales(res.sales || []);
    } catch (err: any) {
      console.error('Error al cargar ventas del vendedor:', err);
    } finally {
      setIsLoadingSales(false);
    }
  };

  const handleDeleteSeller = async (seller: SellerUser) => {
    if (seller.total_sales > 0) {
      alert(`No se puede eliminar al vendedor ${seller.full_name} porque tiene ${seller.total_sales} ventas registradas en el historial. Puedes desactivar su acceso para que no pueda ingresar.`);
      return;
    }

    if (!window.confirm(`¿Deseas eliminar definitivamente la cuenta del vendedor ${seller.full_name}? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const res = await api.deleteSeller(seller.id);
      setFeedback({ type: 'success', text: res.message });
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Error al eliminar el vendedor.' });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Alerta de Notificación */}
      {feedback && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${feedback.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            color: feedback.type === 'success' ? '#34d399' : '#f87171',
            animation: 'fadeIn 0.2s ease-in-out',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {feedback.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Tarjetas KPI Superiores */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'rgba(59, 130, 246, 0.15)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldCheck size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Vendedores Totales
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
              {stats?.total_sellers ?? sellers.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {stats?.active_sellers ?? sellers.filter((s) => s.is_active === 1).length} activos · {stats?.inactive_sellers ?? sellers.filter((s) => s.is_active === 0).length} inactivos
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.15)',
              color: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TrendingUp size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Vendedores Activos
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#34d399', marginTop: '2px' }}>
              {stats?.active_sellers ?? sellers.filter((s) => s.is_active === 1).length}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Habilitados para pedidos en campo
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'rgba(245, 158, 11, 0.15)',
              color: '#fbbf24',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <DollarSign size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Ventas (Vendedores)
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#fbbf24', marginTop: '2px' }}>
              {formatCOP(stats?.total_sales_cop)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {stats?.total_sales_count ?? 0} pedidos generados
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'rgba(168, 85, 247, 0.15)',
              color: '#c084fc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShoppingBag size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Ventas de Hoy
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#c084fc', marginTop: '2px' }}>
              {formatCOP(stats?.today_sales_cop)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {stats?.today_sales_count ?? 0} pedidos cerrados hoy
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Filtros, Búsqueda y Acción */}
      <div
        className="glass-card"
        style={{
          padding: '16px 20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 300px', minWidth: '240px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search
              size={18}
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              placeholder="Buscar por nombre, usuario, cédula o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '38px', width: '100%' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={16} color="var(--text-muted)" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="form-select"
              style={{ padding: '8px 12px', minWidth: '140px' }}
            >
              <option value="ALL">Todos los Estados</option>
              <option value="ACTIVE">Solo Activos</option>
              <option value="INACTIVE">Solo Inactivos</option>
            </select>
          </div>

          <button
            onClick={loadData}
            className="btn btn-secondary btn-sm"
            title="Recargar listado"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={15} className={isLoading ? 'spinning' : ''} />
            <span>Actualizar</span>
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn btn-primary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <UserPlus size={16} />
            <span>+ Nuevo Vendedor</span>
          </button>
        </div>
      </div>

      {/* Tabla de Vendedores */}
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Vendedor</th>
              <th>Cédula / NIT</th>
              <th>Contacto</th>
              <th>Estado</th>
              <th>Ventas Hoy</th>
              <th>Total Histórico</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && sellers.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Cargando equipo de vendedores...
                </td>
              </tr>
            ) : sellers.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No se encontraron vendedores registrados. Presiona <strong>+ Nuevo Vendedor</strong> para comenzar.
                </td>
              </tr>
            ) : (
              sellers.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '10px',
                          background: s.is_active === 1 ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'rgba(100, 116, 139, 0.3)',
                          color: '#ffffff',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.9rem',
                          flexShrink: 0,
                        }}
                      >
                        {s.full_name ? s.full_name.substring(0, 2).toUpperCase() : 'VD'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                          {s.full_name}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          @{s.username}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td>
                    {s.document_id ? (
                      <span style={{ fontFamily: 'monospace', background: 'rgba(255, 255, 255, 0.05)', padding: '3px 8px', borderRadius: '4px' }}>
                        {s.document_id}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>—</span>
                    )}
                  </td>

                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {s.phone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                          <Phone size={13} color="var(--primary)" />
                          <span>{s.phone}</span>
                        </div>
                      )}
                      {s.email && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                          <Mail size={13} />
                          <span>{s.email}</span>
                        </div>
                      )}
                      {!s.phone && !s.email && <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Sin contacto</span>}
                    </div>
                  </td>

                  <td>
                    {s.is_active === 1 ? (
                      <span className="badge badge-success">
                        <CheckCircle size={12} /> Activo
                      </span>
                    ) : (
                      <span className="badge badge-danger">
                        <XCircle size={12} /> Inactivo
                      </span>
                    )}
                  </td>

                  <td>
                    <div style={{ fontWeight: 600, color: s.today_cop > 0 ? '#34d399' : 'var(--text-muted)', fontSize: '0.88rem' }}>
                      {formatCOP(s.today_cop)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {s.today_sales} pedidos
                    </div>
                  </td>

                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                      {formatCOP(s.total_cop)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {s.total_sales} pedidos cerrados
                    </div>
                  </td>

                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                      <button
                        onClick={() => openDetailModal(s)}
                        className="btn btn-secondary btn-sm"
                        title="Ver perfil, métricas e historial de ventas"
                        style={{ padding: '6px 8px' }}
                      >
                        <Eye size={15} color="var(--primary)" />
                      </button>

                      <button
                        onClick={() => openEditModal(s)}
                        className="btn btn-secondary btn-sm"
                        title="Editar información del vendedor"
                        style={{ padding: '6px 8px' }}
                      >
                        <Edit2 size={15} />
                      </button>

                      <button
                        onClick={() => handleToggleStatus(s)}
                        className="btn btn-secondary btn-sm"
                        title={s.is_active === 1 ? 'Desactivar vendedor' : 'Activar vendedor'}
                        style={{
                          padding: '6px 8px',
                          color: s.is_active === 1 ? '#f87171' : '#34d399',
                        }}
                      >
                        {s.is_active === 1 ? <XCircle size={15} /> : <CheckCircle size={15} />}
                      </button>

                      <button
                        onClick={() => handleDeleteSeller(s)}
                        className="btn btn-secondary btn-sm"
                        title="Eliminar vendedor"
                        style={{ padding: '6px 8px', color: '#ef4444' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal 1: Registrar Nuevo Vendedor */}
      {isCreateModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus size={20} color="var(--primary)" />
                <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Registrar Nuevo Vendedor</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSeller}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Nombre Completo *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Juan Pérez"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="form-input"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Cédula / Documento (C.C.)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. 1098765432"
                      value={formData.document_id}
                      onChange={(e) => setFormData({ ...formData, document_id: e.target.value })}
                      className="form-input"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Nombre de Usuario (Login) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="ej. juan.perez"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                      className="form-input"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Contraseña Inicial *
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Mínimo 6 caracteres"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="form-input"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Teléfono / WhatsApp
                    </label>
                    <input
                      type="tel"
                      placeholder="Ej. 3001234567"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="form-input"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      placeholder="correo@ejemplo.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="form-input"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Dirección Residencial o Zona de Cobertura
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Carrera 15 # 45-20, Montería"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="form-input"
                    style={{ width: '100%' }}
                  />
                </div>

                <div
                  style={{
                    background: 'rgba(59, 130, 246, 0.08)',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    color: '#93c5fd',
                  }}
                >
                  ℹ️ Al crear el vendedor, el sistema le asignará el rol <strong>VENDEDOR</strong>, con permisos para consultar productos, seleccionar clientes y levantar pedidos en la versión móvil o web.
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Guardar Vendedor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Editar Vendedor */}
      {isEditModalOpen && selectedSeller && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit2 size={20} color="var(--primary)" />
                <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Editar Datos: {selectedSeller.full_name}</h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateSeller}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Nombre Completo *
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.full_name}
                      onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                      className="form-input"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Cédula / Documento (C.C.)
                    </label>
                    <input
                      type="text"
                      value={editFormData.document_id}
                      onChange={(e) => setEditFormData({ ...editFormData, document_id: e.target.value })}
                      className="form-input"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Teléfono / WhatsApp
                    </label>
                    <input
                      type="tel"
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                      className="form-input"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                      className="form-input"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Dirección Residencial o Zona de Cobertura
                  </label>
                  <input
                    type="text"
                    value={editFormData.address}
                    onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                    className="form-input"
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Cambiar Contraseña (dejar en blanco para mantener la actual)
                  </label>
                  <input
                    type="password"
                    placeholder="Nueva contraseña opcional (mín. 6 chars)"
                    value={editFormData.password}
                    onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                    className="form-input"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Perfil Detallado & Historial de Ventas del Vendedor */}
      {isDetailModalOpen && detailSeller && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '800px', width: '95%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Award size={22} color="var(--primary)" />
                <div>
                  <h3 style={{ fontSize: '1.2rem', margin: 0 }}>
                    {detailSeller.full_name}
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Asesor Comercial · @{detailSeller.username}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxHeight: '75vh', overflowY: 'auto' }}>
              {/* Información General del Asesor */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  padding: '16px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cédula / Documento</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                    {detailSeller.document_id || 'No registrada'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Teléfono</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                    {detailSeller.phone || 'No registrado'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Correo</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                    {detailSeller.email || 'No registrado'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dirección / Zona</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                    {detailSeller.address || 'No registrada'}
                  </div>
                </div>
              </div>

              {/* Métricas Comerciales */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '12px 14px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#93c5fd' }}>Total Facturado</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#60a5fa', marginTop: '4px' }}>
                    {formatCOP(detailSeller.total_cop)}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{detailSeller.total_sales} ventas cerradas</div>
                </div>

                <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '12px 14px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#6ee7b7' }}>Ventas de Hoy</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#34d399', marginTop: '4px' }}>
                    {formatCOP(detailSeller.today_cop)}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{detailSeller.today_sales} ventas hoy</div>
                </div>

                <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '12px 14px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#fcd34d' }}>Ventas del Mes</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fbbf24', marginTop: '4px' }}>
                    {formatCOP(detailSeller.month_cop)}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{detailSeller.month_sales} ventas este mes</div>
                </div>
              </div>

              {/* Tabla de Historial de Ventas */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileText size={16} color="var(--primary)" /> Historial Reciente de Pedidos / Facturas
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {sellerSales.length} pedidos mostrados
                  </span>
                </div>

                <div className="table-responsive" style={{ border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
                  <table className="data-table" style={{ width: '100%', fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th>Factura</th>
                        <th>Cliente</th>
                        <th>Fecha</th>
                        <th>Estado</th>
                        <th style={{ textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoadingSales ? (
                        <tr>
                          <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            Cargando historial de ventas...
                          </td>
                        </tr>
                      ) : sellerSales.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            Este vendedor aún no ha generado ventas registradas en el sistema.
                          </td>
                        </tr>
                      ) : (
                        sellerSales.map((sale) => (
                          <tr key={sale.id}>
                            <td style={{ fontWeight: 600, color: 'var(--primary)' }}>
                              {sale.invoice_number || sale.invoice_code || `#${sale.id.substring(0, 8)}`}
                            </td>
                            <td style={{ color: 'var(--text-primary)' }}>
                              {sale.customer_name || 'Cliente Ocasional'}
                            </td>
                            <td style={{ color: 'var(--text-muted)' }}>
                              {sale.created_at ? new Date(sale.created_at).toLocaleDateString('es-CO') : '—'}
                            </td>
                            <td>
                              <span
                                className={sale.status === 'COMPLETADA' || sale.status === 'ENTREGADA' ? 'badge badge-success' : 'badge'}
                                style={sale.status !== 'COMPLETADA' && sale.status !== 'ENTREGADA' ? { background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' } : {}}
                              >
                                {sale.status}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {formatCOP(sale.total_cop)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="btn btn-primary btn-sm"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
