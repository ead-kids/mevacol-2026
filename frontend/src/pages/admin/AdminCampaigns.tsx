import React, { useState, useEffect } from 'react';
import {
  Award,
  Plus,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Edit2,
  Trash2,
  Eye,
  AlertCircle,
  X,
  Calendar,
  Gift,
  DollarSign,
  Users,
  Target,
  Clock,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import type { Campaign, CampaignSellerProgress, SellerUser } from '../../types';
import { api } from '../../services/api';

export const AdminCampaigns: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [sellersList, setSellersList] = useState<SellerUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  // Modal de Detalle / Monitoreo
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailCampaign, setDetailCampaign] = useState<Campaign | null>(null);
  const [sellersProgress, setSellersProgress] = useState<CampaignSellerProgress[]>([]);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Formulario Creación
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    target_amount_cop: '',
    reward_description: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    is_general: true,
    seller_ids: [] as string[],
  });

  // Formulario Edición
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    target_amount_cop: '',
    reward_description: '',
    start_date: '',
    end_date: '',
    is_general: true,
    seller_ids: [] as string[],
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
      const [campRes, sellersRes] = await Promise.all([
        api.getCampaigns(searchTerm || undefined, statusFilter !== 'ALL' ? statusFilter : undefined),
        api.getSellers(undefined, 'ACTIVE'),
      ]);
      setCampaigns(campRes.campaigns || []);
      setSellersList(sellersRes.sellers || []);
    } catch (err: any) {
      console.error('Error al cargar campañas:', err);
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

  // Cálculos para KPIs globales
  const totalCampaigns = campaigns.length;
  const activeCampaignsCount = campaigns.filter((c) => c.is_active === 1).length;
  const totalVolumeAll = campaigns.reduce((acc, c) => acc + (c.total_volume_cop || 0), 0);
  const totalWinnersAll = campaigns.reduce((acc, c) => acc + (c.winners_count || 0), 0);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const targetCop = Number(formData.target_amount_cop);
    if (!formData.name.trim() || !targetCop || !formData.reward_description.trim()) {
      setFeedback({ type: 'error', text: 'Nombre, meta de ventas y premio son obligatorios.' });
      return;
    }

    if (!formData.is_general && formData.seller_ids.length === 0) {
      setFeedback({ type: 'error', text: 'Debes seleccionar al menos un vendedor o marcar la campaña como general.' });
      return;
    }

    try {
      const res = await api.createCampaign({
        name: formData.name,
        description: formData.description,
        target_amount_cop: targetCop,
        reward_description: formData.reward_description,
        start_date: formData.start_date,
        end_date: formData.end_date,
        is_general: formData.is_general ? 1 : 0,
        seller_ids: formData.is_general ? undefined : formData.seller_ids,
      });

      setFeedback({ type: 'success', text: res.message || 'Campaña creada con éxito.' });
      setIsCreateModalOpen(false);
      setFormData({
        name: '',
        description: '',
        target_amount_cop: '',
        reward_description: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        is_general: true,
        seller_ids: [],
      });
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Error al crear la campaña.' });
    }
  };

  const openEditModal = async (c: Campaign) => {
    setSelectedCampaign(c);
    try {
      const detail = await api.getCampaignById(c.id);
      const assignedIds = detail.campaign.is_general === 1
        ? []
        : detail.sellers_progress.map((s) => s.seller_id);

      setEditFormData({
        name: c.name,
        description: c.description || '',
        target_amount_cop: String(c.target_amount_cop),
        reward_description: c.reward_description,
        start_date: c.start_date.split(' ')[0],
        end_date: c.end_date.split(' ')[0],
        is_general: c.is_general === 1,
        seller_ids: assignedIds,
      });
      setIsEditModalOpen(true);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Error al cargar datos de la campaña.' });
    }
  };

  const handleUpdateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaign) return;
    setFeedback(null);

    const targetCop = Number(editFormData.target_amount_cop);
    if (!editFormData.name.trim() || !targetCop || !editFormData.reward_description.trim()) {
      setFeedback({ type: 'error', text: 'Nombre, meta de ventas y premio son obligatorios.' });
      return;
    }

    if (!editFormData.is_general && editFormData.seller_ids.length === 0) {
      setFeedback({ type: 'error', text: 'Debes seleccionar al menos un vendedor o marcar la campaña como general.' });
      return;
    }

    try {
      const res = await api.updateCampaign(selectedCampaign.id, {
        name: editFormData.name,
        description: editFormData.description,
        target_amount_cop: targetCop,
        reward_description: editFormData.reward_description,
        start_date: editFormData.start_date,
        end_date: editFormData.end_date,
        is_general: editFormData.is_general ? 1 : 0,
        seller_ids: editFormData.is_general ? undefined : editFormData.seller_ids,
      });

      setFeedback({ type: 'success', text: res.message || 'Campaña actualizada correctamente.' });
      setIsEditModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Error al actualizar la campaña.' });
    }
  };

  const handleToggleStatus = async (c: Campaign) => {
    const nextStatus = c.is_active === 1 ? 0 : 1;
    const actionWord = nextStatus === 1 ? 'activar' : 'desactivar';
    if (!window.confirm(`¿Estás seguro de que deseas ${actionWord} la campaña "${c.name}"?`)) {
      return;
    }

    try {
      const res = await api.toggleCampaignStatus(c.id, nextStatus);
      setFeedback({ type: 'success', text: res.message });
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Error al cambiar estado de la campaña.' });
    }
  };

  const handleDeleteCampaign = async (c: Campaign) => {
    if (!window.confirm(`¿Deseas eliminar definitivamente la campaña "${c.name}"? Esta acción borrará las asignaciones registradas.`)) {
      return;
    }

    try {
      const res = await api.deleteCampaign(c.id);
      setFeedback({ type: 'success', text: res.message });
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Error al eliminar la campaña.' });
    }
  };

  const openDetailModal = async (c: Campaign) => {
    setDetailCampaign(c);
    setIsDetailModalOpen(true);
    setIsLoadingDetail(true);
    try {
      const res = await api.getCampaignById(c.id);
      setDetailCampaign(res.campaign);
      setSellersProgress(res.sellers_progress || []);
    } catch (err: any) {
      console.error('Error al cargar progreso de la campaña:', err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const toggleSellerSelection = (sellerId: string, isCreate: boolean) => {
    if (isCreate) {
      const exists = formData.seller_ids.includes(sellerId);
      const next = exists
        ? formData.seller_ids.filter((id) => id !== sellerId)
        : [...formData.seller_ids, sellerId];
      setFormData({ ...formData, seller_ids: next });
    } else {
      const exists = editFormData.seller_ids.includes(sellerId);
      const next = exists
        ? editFormData.seller_ids.filter((id) => id !== sellerId)
        : [...editFormData.seller_ids, sellerId];
      setEditFormData({ ...editFormData, seller_ids: next });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Alerta de Feedback */}
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
              background: 'rgba(168, 85, 247, 0.15)',
              color: '#c084fc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Award size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Campañas Totales
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
              {totalCampaigns}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {activeCampaignsCount} activas · {totalCampaigns - activeCampaignsCount} finalizadas
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
            <Sparkles size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Metas Alcanzadas
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#34d399', marginTop: '2px' }}>
              {totalWinnersAll}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Premios ganados por vendedores
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
              Facturado en Campañas
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#fbbf24', marginTop: '2px' }}>
              {formatCOP(totalVolumeAll)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Generado por fuerza de ventas
            </div>
          </div>
        </div>

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
            <Users size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Vendedores Activos
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
              {sellersList.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Participando en programas
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Filtros, Búsqueda y Botón Nueva Campaña */}
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
              placeholder="Buscar por nombre de campaña o premio..."
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
              <option value="ALL">Todas</option>
              <option value="ACTIVE">Solo Activas</option>
              <option value="INACTIVE">Solo Finalizadas</option>
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
            <Plus size={16} />
            <span>+ Nueva Campaña</span>
          </button>
        </div>
      </div>

      {/* Grid de Campañas */}
      {isLoading && campaigns.length === 0 ? (
        <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Cargando catálogo de campañas e incentivos...
        </div>
      ) : campaigns.length === 0 ? (
        <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          No hay campañas registradas. Presiona <strong>+ Nueva Campaña</strong> para definir la primera meta comercial.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '18px' }}>
          {campaigns.map((c) => {
            const now = new Date();
            const endDateObj = new Date(c.end_date);
            const diffDays = Math.ceil((endDateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            const isEnded = diffDays < 0;

            return (
              <div
                key={c.id}
                className="glass-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '20px',
                  border: c.is_active === 1 && !isEnded ? '1px solid rgba(168, 85, 247, 0.35)' : '1px solid var(--border-subtle)',
                  background: c.is_active === 1 && !isEnded ? 'linear-gradient(180deg, rgba(168, 85, 247, 0.05) 0%, rgba(15, 23, 42, 0.7) 100%)' : undefined,
                  position: 'relative',
                }}
              >
                <div>
                  {/* Encabezado de la Tarjeta */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, fontSize: '1.15rem', color: 'var(--text-primary)' }}>
                          {c.name}
                        </span>
                      </div>
                      {c.description && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', marginBottom: 0 }}>
                          {c.description}
                        </p>
                      )}
                    </div>

                    <div>
                      {c.is_active === 1 && !isEnded ? (
                        <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>
                          <CheckCircle size={11} /> Activa
                        </span>
                      ) : isEnded ? (
                        <span className="badge" style={{ background: 'rgba(100, 116, 139, 0.2)', color: '#94a3b8', fontSize: '0.72rem' }}>
                          <Clock size={11} /> Concluida
                        </span>
                      ) : (
                        <span className="badge badge-danger" style={{ fontSize: '0.72rem' }}>
                          <XCircle size={11} /> Inactiva
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bloque Destacado: Meta y Premio */}
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      marginBottom: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fbbf24', fontSize: '0.85rem', fontWeight: 600 }}>
                        <Target size={16} /> Meta de Ventas:
                      </div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fbbf24' }}>
                        {formatCOP(c.target_amount_cop)}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#c084fc', fontSize: '0.85rem', fontWeight: 600 }}>
                        <Gift size={16} /> Premio / Incentivo:
                      </div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#c084fc', textAlign: 'right' }}>
                        {c.reward_description}
                      </div>
                    </div>
                  </div>

                  {/* Resumen de Fechas y Asignación */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={13} color="var(--primary)" />
                      <span>{c.start_date.split(' ')[0]} al {c.end_date.split(' ')[0]}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Users size={13} color="#34d399" />
                      <span>{c.is_general === 1 ? 'General (Todos)' : `${c.participating_sellers_count || 0} asignados`}</span>
                    </div>
                  </div>

                  {/* Métricas de Avance Global */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Ventas generadas en campaña:</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatCOP(c.total_volume_cop)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', marginBottom: '14px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Vendedores que lograron meta:</span>
                    <span
                      style={{
                        fontWeight: 700,
                        color: (c.winners_count || 0) > 0 ? '#34d399' : 'var(--text-muted)',
                      }}
                    >
                      🏆 {c.winners_count || 0} ganador{(c.winners_count || 0) === 1 ? '' : 'es'}
                    </span>
                  </div>
                </div>

                {/* Acciones de la Campaña */}
                <div
                  style={{
                    borderTop: '1px solid var(--border-subtle)',
                    paddingTop: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <button
                    onClick={() => openDetailModal(c)}
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
                  >
                    <Eye size={14} color="var(--primary)" />
                    <span>Ver Cumplimiento ({c.participating_sellers_count || 0})</span>
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      onClick={() => openEditModal(c)}
                      className="btn btn-secondary btn-sm"
                      title="Editar campaña"
                      style={{ padding: '6px 8px' }}
                    >
                      <Edit2 size={14} />
                    </button>

                    <button
                      onClick={() => handleToggleStatus(c)}
                      className="btn btn-secondary btn-sm"
                      title={c.is_active === 1 ? 'Desactivar campaña' : 'Activar campaña'}
                      style={{
                        padding: '6px 8px',
                        color: c.is_active === 1 ? '#f87171' : '#34d399',
                      }}
                    >
                      {c.is_active === 1 ? <XCircle size={14} /> : <CheckCircle size={14} />}
                    </button>

                    <button
                      onClick={() => handleDeleteCampaign(c)}
                      className="btn btn-secondary btn-sm"
                      title="Eliminar campaña"
                      style={{ padding: '6px 8px', color: '#ef4444' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal 1: Crear Nueva Campaña */}
      {isCreateModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '580px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={20} color="var(--primary)" />
                <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Crear Campaña e Incentivo</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateCampaign}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '72vh', overflowY: 'auto' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Nombre de la Campaña *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Meta Mensual Septiembre - Línea Analgésicos"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="form-input"
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Meta de Ventas (COP) *
                    </label>
                    <input
                      type="number"
                      required
                      min={1000}
                      placeholder="Ej. 10000000"
                      value={formData.target_amount_cop}
                      onChange={(e) => setFormData({ ...formData, target_amount_cop: e.target.value })}
                      className="form-input"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Premio / Incentivo *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Nevera Haceb 250L / Bono $500k"
                      value={formData.reward_description}
                      onChange={(e) => setFormData({ ...formData, reward_description: e.target.value })}
                      className="form-input"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Fecha de Inicio *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="form-input"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Fecha de Finalización *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="form-input"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Descripción o Instrucciones (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Detalles de la campaña, condiciones de cobro, etc."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="form-input"
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                </div>

                {/* Asignación de Vendedores */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '12px 14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Asignación de Vendedores
                    </span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={formData.is_general}
                        onChange={(e) => setFormData({ ...formData, is_general: e.target.checked })}
                      />
                      <span>Campaña General (Todos los vendedores)</span>
                    </label>
                  </div>

                  {!formData.is_general && (
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                        Selecciona los vendedores autorizados para participar en esta meta:
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
                        {sellersList.map((s) => (
                          <label
                            key={s.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              background: formData.seller_ids.includes(s.id) ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                              cursor: 'pointer',
                              fontSize: '0.82rem',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={formData.seller_ids.includes(s.id)}
                              onChange={() => toggleSellerSelection(s.id, true)}
                            />
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.full_name}</span>
                            <span style={{ color: 'var(--text-muted)' }}>@{s.username}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
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
                  Crear Campaña
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Editar Campaña */}
      {isEditModalOpen && selectedCampaign && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '580px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit2 size={20} color="var(--primary)" />
                <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Editar Campaña</h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateCampaign}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '72vh', overflowY: 'auto' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Nombre de la Campaña *
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="form-input"
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Meta de Ventas (COP) *
                    </label>
                    <input
                      type="number"
                      required
                      min={1000}
                      value={editFormData.target_amount_cop}
                      onChange={(e) => setEditFormData({ ...editFormData, target_amount_cop: e.target.value })}
                      className="form-input"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Premio / Incentivo *
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.reward_description}
                      onChange={(e) => setEditFormData({ ...editFormData, reward_description: e.target.value })}
                      className="form-input"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Fecha de Inicio *
                    </label>
                    <input
                      type="date"
                      required
                      value={editFormData.start_date}
                      onChange={(e) => setEditFormData({ ...editFormData, start_date: e.target.value })}
                      className="form-input"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Fecha de Finalización *
                    </label>
                    <input
                      type="date"
                      required
                      value={editFormData.end_date}
                      onChange={(e) => setEditFormData({ ...editFormData, end_date: e.target.value })}
                      className="form-input"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Descripción o Instrucciones
                  </label>
                  <textarea
                    rows={2}
                    value={editFormData.description}
                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                    className="form-input"
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                </div>

                {/* Asignación */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '12px 14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Asignación de Vendedores
                    </span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={editFormData.is_general}
                        onChange={(e) => setEditFormData({ ...editFormData, is_general: e.target.checked })}
                      />
                      <span>Campaña General (Todos)</span>
                    </label>
                  </div>

                  {!editFormData.is_general && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
                      {sellersList.map((s) => (
                        <label
                          key={s.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            background: editFormData.seller_ids.includes(s.id) ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                            cursor: 'pointer',
                            fontSize: '0.82rem',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={editFormData.seller_ids.includes(s.id)}
                            onChange={() => toggleSellerSelection(s.id, false)}
                          />
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.full_name}</span>
                          <span style={{ color: 'var(--text-muted)' }}>@{s.username}</span>
                        </label>
                      ))}
                    </div>
                  )}
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

      {/* Modal 3: Monitoreo Detallado de Cumplimiento por Vendedor */}
      {isDetailModalOpen && detailCampaign && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '840px', width: '95%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Award size={22} color="var(--primary)" />
                <div>
                  <h3 style={{ fontSize: '1.2rem', margin: 0 }}>
                    Cumplimiento: {detailCampaign.name}
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Meta: {formatCOP(detailCampaign.target_amount_cop)} · Premio: <strong style={{ color: '#c084fc' }}>{detailCampaign.reward_description}</strong>
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

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '74vh', overflowY: 'auto' }}>
              {/* Tarjetas de Resumen de la Campaña */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '12px 14px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#93c5fd' }}>Total Facturado en Campaña</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#60a5fa', marginTop: '4px' }}>
                    {formatCOP(detailCampaign.total_volume_cop)}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Fuerza comercial</div>
                </div>

                <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '12px 14px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#6ee7b7' }}>Vendedores Calificados</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34d399', marginTop: '4px' }}>
                    {detailCampaign.winners_count || 0} / {sellersProgress.length}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Han ganado el premio</div>
                </div>

                <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '12px 14px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#fcd34d' }}>Período de Evaluación</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fbbf24', marginTop: '4px' }}>
                    {detailCampaign.start_date.split(' ')[0]} al {detailCampaign.end_date.split(' ')[0]}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Ventas validadas sin anulación</div>
                </div>
              </div>

              {/* Tabla de Vendedores y Progreso Individual */}
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  Progreso por Asesor Comercial ({sellersProgress.length})
                </h4>

                <div className="table-responsive" style={{ border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
                  <table className="data-table" style={{ width: '100%', fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th>Vendedor</th>
                        <th>Vendido en Período</th>
                        <th>Progreso Visual</th>
                        <th>Restante para Meta</th>
                        <th style={{ textAlign: 'right' }}>Estado / Premio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoadingDetail ? (
                        <tr>
                          <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            Calculando progreso individual de los vendedores...
                          </td>
                        </tr>
                      ) : sellersProgress.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            No hay vendedores asignados a esta campaña.
                          </td>
                        </tr>
                      ) : (
                        sellersProgress.map((sp) => (
                          <tr key={sp.seller_id}>
                            <td>
                              <div>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{sp.full_name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  @{sp.username} {sp.phone ? `· ${sp.phone}` : ''}
                                </div>
                              </div>
                            </td>

                            <td>
                              <div style={{ fontWeight: 700, color: sp.accumulated_cop > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                {formatCOP(sp.accumulated_cop)}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                {sp.sales_count} pedido{sp.sales_count === 1 ? '' : 's'}
                              </div>
                            </td>

                            <td style={{ minWidth: '150px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div
                                  style={{
                                    flex: 1,
                                    height: '8px',
                                    borderRadius: '4px',
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    overflow: 'hidden',
                                  }}
                                >
                                  <div
                                    style={{
                                      width: `${sp.progress_percent}%`,
                                      height: '100%',
                                      borderRadius: '4px',
                                      background: sp.is_completed
                                        ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
                                        : 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)',
                                      transition: 'width 0.4s ease',
                                    }}
                                  />
                                </div>
                                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: sp.is_completed ? '#34d399' : 'var(--text-primary)' }}>
                                  {sp.progress_percent}%
                                </span>
                              </div>
                            </td>

                            <td>
                              {sp.is_completed ? (
                                <span style={{ color: '#34d399', fontWeight: 600, fontSize: '0.8rem' }}>
                                  ¡Completado! ($0)
                                </span>
                              ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                  Faltan {formatCOP(sp.remaining_cop)}
                                </span>
                              )}
                            </td>

                            <td style={{ textAlign: 'right' }}>
                              {sp.is_completed ? (
                                <span
                                  className="badge badge-success"
                                  style={{
                                    fontSize: '0.75rem',
                                    background: 'rgba(16, 185, 129, 0.2)',
                                    color: '#34d399',
                                    border: '1px solid rgba(16, 185, 129, 0.4)',
                                    padding: '4px 8px',
                                  }}
                                >
                                  🏆 GANADOR ({detailCampaign.reward_description})
                                </span>
                              ) : (
                                <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', fontSize: '0.72rem' }}>
                                  En Progreso
                                </span>
                              )}
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
                Cerrar Monitoreo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
