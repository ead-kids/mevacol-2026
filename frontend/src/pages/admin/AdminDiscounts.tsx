import React, { useState, useEffect } from 'react';
import {
  Percent,
  Plus,
  Search,
  CheckCircle,
  Edit2,
  Trash2,
  AlertCircle,
  X,
  Calendar,
  DollarSign,
  Package,
  Clock,
  Sparkles,
  RefreshCw,
  Tag,
  ToggleLeft,
  ToggleRight,
  Calculator,
} from 'lucide-react';
import type { Discount, DiscountStats, Product, CreateDiscountInput, UpdateDiscountInput, DiscountType } from '../../types';
import { api } from '../../services/api';

export const AdminDiscounts: React.FC = () => {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [stats, setStats] = useState<DiscountStats>({
    total: 0,
    active: 0,
    expired: 0,
    inactive: 0,
    total_discount_granted_cop: 0,
    total_discounted_sales: 0,
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'inactive'>('all');
  const [productFilter, setProductFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState<Discount | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [discountToDelete, setDiscountToDelete] = useState<Discount | null>(null);

  // Form State
  const [formData, setFormData] = useState<CreateDiscountInput>({
    code: '',
    name: '',
    description: '',
    discount_type: 'PERCENTAGE',
    value: 10,
    product_id: null,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    is_active: true,
  });

  const [editFormData, setEditFormData] = useState<UpdateDiscountInput>({
    name: '',
    description: '',
    discount_type: 'PERCENTAGE',
    value: 10,
    product_id: null,
    start_date: '',
    end_date: '',
    is_active: true,
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
      const [discRes, statsRes, prodRes] = await Promise.all([
        api.getDiscounts({
          search: searchTerm || undefined,
          status: statusFilter,
          product_id: productFilter || undefined,
        }),
        api.getDiscountStats(),
        api.getProducts(),
      ]);

      setDiscounts(discRes.discounts || []);
      if (statsRes.success && statsRes.stats) {
        setStats(statsRes.stats);
      }
      setProducts(prodRes.products || []);
    } catch (err: any) {
      console.error('Error al cargar descuentos:', err);
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
  }, [searchTerm, statusFilter, productFilter]);

  const handleOpenCreateModal = () => {
    setFormData({
      code: `PROMO-${Math.floor(1000 + Math.random() * 9000)}`,
      name: '',
      description: '',
      discount_type: 'PERCENTAGE',
      value: 10,
      product_id: null,
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      is_active: true,
    });
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = (formData.code || '').trim();
    if (!code || !formData.name.trim()) {
      setFeedback({ type: 'error', text: 'El código y el nombre son obligatorios.' });
      return;
    }
    if (formData.discount_type === 'PERCENTAGE' && (formData.value <= 0 || formData.value > 100)) {
      setFeedback({ type: 'error', text: 'El porcentaje debe estar entre 1% y 100%.' });
      return;
    }
    if (formData.discount_type === 'FIXED' && formData.value <= 0) {
      setFeedback({ type: 'error', text: 'El valor fijo en COP debe ser mayor a cero.' });
      return;
    }

    try {
      const res = await api.createDiscount({
        ...formData,
        code: code.toUpperCase(),
        name: formData.name.trim(),
        value: Number(formData.value),
        product_id: formData.product_id ? formData.product_id : null,
      });

      if (res.success) {
        setFeedback({ type: 'success', text: 'Descuento creado con éxito.' });
        setIsCreateModalOpen(false);
        loadData();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Error al crear descuento.' });
    }
  };

  const handleOpenEditModal = (d: Discount) => {
    setSelectedDiscount(d);
    setEditFormData({
      name: d.name,
      description: d.description || '',
      discount_type: d.discount_type,
      value: d.value,
      product_id: d.product_id || null,
      start_date: d.start_date ? d.start_date.split('T')[0] : '',
      end_date: d.end_date ? d.end_date.split('T')[0] : '',
      is_active: Boolean(d.is_active),
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDiscount) return;

    if (!editFormData.name?.trim()) {
      setFeedback({ type: 'error', text: 'El nombre es obligatorio.' });
      return;
    }
    if (editFormData.discount_type === 'PERCENTAGE' && ((editFormData.value || 0) <= 0 || (editFormData.value || 0) > 100)) {
      setFeedback({ type: 'error', text: 'El porcentaje debe estar entre 1% y 100%.' });
      return;
    }
    if (editFormData.discount_type === 'FIXED' && (editFormData.value || 0) <= 0) {
      setFeedback({ type: 'error', text: 'El valor fijo en COP debe ser mayor a cero.' });
      return;
    }

    try {
      const res = await api.updateDiscount(selectedDiscount.id, {
        ...editFormData,
        name: editFormData.name?.trim(),
        value: Number(editFormData.value),
        product_id: editFormData.product_id ? editFormData.product_id : null,
      });

      if (res.success) {
        setFeedback({ type: 'success', text: 'Descuento actualizado con éxito.' });
        setIsEditModalOpen(false);
        loadData();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Error al actualizar descuento.' });
    }
  };

  const handleToggleStatus = async (d: Discount) => {
    try {
      const newStatus = !d.is_active;
      const res = await api.toggleDiscountStatus(d.id, newStatus);
      if (res.success) {
        setFeedback({
          type: 'success',
          text: `Descuento ${newStatus ? 'activado' : 'desactivado'} correctamente.`,
        });
        loadData();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Error al cambiar estado.' });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!discountToDelete) return;
    try {
      const res = await api.deleteDiscount(discountToDelete.id);
      if (res.success) {
        setFeedback({ type: 'success', text: 'Descuento eliminado exitosamente.' });
        setIsDeleteModalOpen(false);
        setDiscountToDelete(null);
        loadData();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Error al eliminar descuento.' });
    }
  };

  // Live calculation preview helper
  const calculatePreview = (type: DiscountType, value: number, samplePrice: number = 100000) => {
    const val = Number(value) || 0;
    let discountAmount = 0;
    if (type === 'PERCENTAGE') {
      discountAmount = Math.round((samplePrice * val) / 100);
    } else {
      discountAmount = Math.min(samplePrice, Math.round(val));
    }
    const finalPrice = Math.max(0, samplePrice - discountAmount);
    return { samplePrice, discountAmount, finalPrice };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header & Feedback */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Percent style={{ color: 'var(--primary)' }} />
            Gestión de Descuentos & Promociones
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '4px 0 0 0' }}>
            Crea promociones por porcentaje o monto fijo en COP aplicables automáticamente en Ventas y Facturación.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => loadData()}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Refrescar listado"
          >
            <RefreshCw size={16} className={isLoading ? 'spin' : ''} />
            Refrescar
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Plus size={18} />
            Crear Descuento
          </button>
        </div>
      </div>

      {feedback && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${feedback.type === 'success' ? '#10b981' : '#ef4444'}`,
            color: feedback.type === 'success' ? '#10b981' : '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {feedback.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
        }}
      >
        <div className="card" style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'rgba(59, 130, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#3b82f6',
            }}
          >
            <Tag size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Total Promociones
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {stats.total}
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10b981',
            }}
          >
            <Sparkles size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Descuentos Activos
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>
              {stats.active}
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444',
            }}
          >
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Vencidos o Inactivos
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>
              {stats.expired + stats.inactive}
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'rgba(245, 158, 11, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f59e0b',
            }}
          >
            <DollarSign size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Ahorro Otorgado en Ventas
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {formatCOP(stats.total_discount_granted_cop)}
            </div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div
        className="card"
        style={{
          padding: '16px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 300px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search
              size={18}
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}
            />
            <input
              type="text"
              className="input"
              placeholder="Buscar por código, nombre o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '38px', width: '100%' }}
            />
          </div>

          <select
            className="input"
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            style={{ maxWidth: '220px' }}
          >
            <option value="">Todos los productos</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', background: 'var(--bg-tertiary)', borderRadius: '8px', padding: '3px', gap: '3px' }}>
          {(['all', 'active', 'expired', 'inactive'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              style={{
                background: statusFilter === tab ? 'var(--primary)' : 'transparent',
                color: statusFilter === tab ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'capitalize',
                transition: 'all 0.2s',
              }}
            >
              {tab === 'all' ? 'Todos' : tab === 'active' ? 'Activos' : tab === 'expired' ? 'Vencidos' : 'Inactivos'}
            </button>
          ))}
        </div>
      </div>

      {/* Discounts Table / List */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>CÓDIGO & NOMBRE</th>
                <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>TIPO & VALOR</th>
                <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>APLICA A</th>
                <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>VIGENCIA</th>
                <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>ESTADO</th>
                <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textAlign: 'right' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {discounts.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-secondary)' }}>
                    <Percent size={40} style={{ margin: '0 auto 12px auto', opacity: 0.3 }} />
                    <p style={{ margin: 0, fontWeight: 500 }}>No se encontraron promociones o descuentos.</p>
                    <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem' }}>Haz clic en "Crear Descuento" para iniciar una nueva promoción.</p>
                  </td>
                </tr>
              ) : (
                discounts.map((d) => {
                  const now = new Date();
                  const isExpired = d.end_date ? new Date(d.end_date) < now : false;
                  return (
                    <tr key={d.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              background: 'rgba(59, 130, 246, 0.1)',
                              color: 'var(--primary)',
                              fontWeight: 700,
                              fontSize: '0.8rem',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontFamily: 'monospace',
                            }}
                          >
                            {d.code}
                          </span>
                        </div>
                        <div style={{ fontWeight: 600, marginTop: '4px', color: 'var(--text-primary)' }}>{d.name}</div>
                        {d.description && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            {d.description}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontWeight: 700,
                              fontSize: '0.95rem',
                              color: d.discount_type === 'PERCENTAGE' ? '#10b981' : '#3b82f6',
                            }}
                          >
                            {d.discount_type === 'PERCENTAGE' ? (
                              <>
                                <Percent size={14} /> -{d.value}%
                              </>
                            ) : (
                              <>
                                <DollarSign size={14} /> -{formatCOP(d.value)}
                              </>
                            )}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {d.discount_type === 'PERCENTAGE' ? 'Porcentual' : 'Valor Fijo COP'}
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        {d.product_name ? (
                          <div>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.85rem',
                                color: 'var(--text-primary)',
                                fontWeight: 500,
                              }}
                            >
                              <Package size={14} color="var(--primary)" />
                              {d.product_name}
                            </span>
                            {d.product_price_cop !== undefined && d.product_price_cop !== null && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                Base: {formatCOP(d.product_price_cop)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.85rem',
                              color: '#8b5cf6',
                              fontWeight: 600,
                              background: 'rgba(139, 92, 246, 0.1)',
                              padding: '2px 8px',
                              borderRadius: '4px',
                            }}
                          >
                            <Sparkles size={12} />
                            Todos los Productos
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '14px 16px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={13} />
                          <span>
                            {d.start_date ? new Date(d.start_date).toLocaleDateString('es-CO') : 'Inmediata'}
                            {' → '}
                            {d.end_date ? new Date(d.end_date).toLocaleDateString('es-CO') : 'Sin límite'}
                          </span>
                        </div>
                        {isExpired && (
                          <span style={{ color: '#ef4444', fontWeight: 600, fontSize: '0.75rem', display: 'block', marginTop: '2px' }}>
                            ⚠️ Finalizado
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            onClick={() => handleToggleStatus(d)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 0,
                              display: 'flex',
                              alignItems: 'center',
                              color: d.is_active ? '#10b981' : '#9ca3af',
                            }}
                            title={d.is_active ? 'Desactivar descuento' : 'Activar descuento'}
                          >
                            {d.is_active ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                          </button>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: '999px',
                              background: !d.is_active
                                ? 'rgba(156, 163, 175, 0.15)'
                                : isExpired
                                ? 'rgba(239, 68, 68, 0.15)'
                                : 'rgba(16, 185, 129, 0.15)',
                              color: !d.is_active ? '#9ca3af' : isExpired ? '#ef4444' : '#10b981',
                            }}
                          >
                            {!d.is_active ? 'Inactivo' : isExpired ? 'Vencido' : 'Activo'}
                          </span>
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          <button
                            onClick={() => handleOpenEditModal(d)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '6px 8px' }}
                            title="Editar Descuento"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => {
                              setDiscountToDelete(d);
                              setIsDeleteModalOpen(true);
                            }}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '6px 8px', color: '#ef4444' }}
                            title="Eliminar Descuento"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear Descuento */}
      {isCreateModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Percent size={22} color="var(--primary)" />
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Crear Nuevo Descuento</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                      Código Único *
                    </label>
                    <input
                      type="text"
                      className="input"
                      required
                      placeholder="PROMO-10"
                      value={formData.code || ''}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                      Nombre de la Promoción *
                    </label>
                    <input
                      type="text"
                      className="input"
                      required
                      placeholder="Descuento de Temporada"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                    Descripción (Opcional)
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Detalles para clientes o vendedores"
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                      Tipo de Descuento *
                    </label>
                    <select
                      className="input"
                      value={formData.discount_type}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          discount_type: e.target.value as DiscountType,
                          value: e.target.value === 'PERCENTAGE' ? 10 : 5000,
                        })
                      }
                    >
                      <option value="PERCENTAGE">Porcentaje (%)</option>
                      <option value="FIXED">Valor Fijo ($ COP)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                      {formData.discount_type === 'PERCENTAGE' ? 'Porcentaje (%) *' : 'Valor en Pesos (COP) *'}
                    </label>
                    <input
                      type="number"
                      className="input"
                      min={1}
                      max={formData.discount_type === 'PERCENTAGE' ? 100 : 10000000}
                      step={formData.discount_type === 'PERCENTAGE' ? 1 : 500}
                      required
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                    />
                  </div>
                </div>

                {/* Calculation Live Preview */}
                {(() => {
                  const targetProd = products.find((p) => p.id === formData.product_id);
                  const basePrice = targetProd ? targetProd.price_cop : 100000;
                  const preview = calculatePreview(formData.discount_type, formData.value, basePrice);
                  return (
                    <div
                      style={{
                        background: 'rgba(59, 130, 246, 0.08)',
                        border: '1px dashed rgba(59, 130, 246, 0.4)',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        fontSize: '0.825rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--primary)' }}>
                        <Calculator size={15} />
                        Simulador de Impacto ({targetProd ? targetProd.name : 'Ejemplo estándar'}):
                      </div>
                      <div style={{ marginTop: '4px', display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                        <span>Precio base: {formatCOP(preview.samplePrice)}</span>
                        <span style={{ color: '#10b981', fontWeight: 600 }}>Descuento: -{formatCOP(preview.discountAmount)}</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>Final: {formatCOP(preview.finalPrice)}</span>
                      </div>
                    </div>
                  );
                })()}

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                    Producto Específico (Opcional)
                  </label>
                  <select
                    className="input"
                    value={formData.product_id || ''}
                    onChange={(e) => setFormData({ ...formData, product_id: e.target.value || null })}
                  >
                    <option value="">Aplica a TODOS los productos del catálogo</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({formatCOP(p.price_cop)})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                      Fecha Inicio
                    </label>
                    <input
                      type="date"
                      className="input"
                      value={formData.start_date || ''}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                      Fecha Finalización
                    </label>
                    <input
                      type="date"
                      className="input"
                      value={formData.end_date || ''}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                  <input
                    type="checkbox"
                    id="create_is_active"
                    checked={Boolean(formData.is_active)}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <label htmlFor="create_is_active" style={{ fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
                    Activar promoción inmediatamente
                  </label>
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Guardar Descuento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Descuento */}
      {isEditModalOpen && selectedDiscount && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Edit2 size={20} color="var(--primary)" />
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Editar Descuento: {selectedDiscount.code}</h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                    Nombre de la Promoción *
                  </label>
                  <input
                    type="text"
                    className="input"
                    required
                    value={editFormData.name || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                    Descripción (Opcional)
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={editFormData.description || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                      Tipo de Descuento *
                    </label>
                    <select
                      className="input"
                      value={editFormData.discount_type}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          discount_type: e.target.value as DiscountType,
                        })
                      }
                    >
                      <option value="PERCENTAGE">Porcentaje (%)</option>
                      <option value="FIXED">Valor Fijo ($ COP)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                      {editFormData.discount_type === 'PERCENTAGE' ? 'Porcentaje (%) *' : 'Valor en Pesos (COP) *'}
                    </label>
                    <input
                      type="number"
                      className="input"
                      min={1}
                      max={editFormData.discount_type === 'PERCENTAGE' ? 100 : 10000000}
                      step={editFormData.discount_type === 'PERCENTAGE' ? 1 : 500}
                      required
                      value={editFormData.value || 0}
                      onChange={(e) => setEditFormData({ ...editFormData, value: Number(e.target.value) })}
                    />
                  </div>
                </div>

                {/* Calculation Live Preview */}
                {(() => {
                  const targetProd = products.find((p) => p.id === editFormData.product_id);
                  const basePrice = targetProd ? targetProd.price_cop : 100000;
                  const preview = calculatePreview(editFormData.discount_type || 'PERCENTAGE', editFormData.value || 0, basePrice);
                  return (
                    <div
                      style={{
                        background: 'rgba(59, 130, 246, 0.08)',
                        border: '1px dashed rgba(59, 130, 246, 0.4)',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        fontSize: '0.825rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--primary)' }}>
                        <Calculator size={15} />
                        Simulador de Impacto ({targetProd ? targetProd.name : 'Ejemplo estándar'}):
                      </div>
                      <div style={{ marginTop: '4px', display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                        <span>Precio base: {formatCOP(preview.samplePrice)}</span>
                        <span style={{ color: '#10b981', fontWeight: 600 }}>Descuento: -{formatCOP(preview.discountAmount)}</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>Final: {formatCOP(preview.finalPrice)}</span>
                      </div>
                    </div>
                  );
                })()}

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                    Producto Específico (Opcional)
                  </label>
                  <select
                    className="input"
                    value={editFormData.product_id || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, product_id: e.target.value || null })}
                  >
                    <option value="">Aplica a TODOS los productos del catálogo</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({formatCOP(p.price_cop)})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                      Fecha Inicio
                    </label>
                    <input
                      type="date"
                      className="input"
                      value={editFormData.start_date || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, start_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                      Fecha Finalización
                    </label>
                    <input
                      type="date"
                      className="input"
                      value={editFormData.end_date || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, end_date: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                  <input
                    type="checkbox"
                    id="edit_is_active"
                    checked={Boolean(editFormData.is_active)}
                    onChange={(e) => setEditFormData({ ...editFormData, is_active: e.target.checked })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <label htmlFor="edit_is_active" style={{ fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
                    Promoción Activa
                  </label>
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Actualizar Descuento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmación de Eliminación */}
      {isDeleteModalOpen && discountToDelete && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}>
                <AlertCircle size={22} />
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Eliminar Descuento</h3>
              </div>
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.95rem', margin: 0, color: 'var(--text-primary)' }}>
                ¿Estás seguro de que deseas eliminar la promoción{' '}
                <strong>
                  {discountToDelete.code} — {discountToDelete.name}
                </strong>
                ?
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                Las ventas y facturas ya emitidas con este descuento conservarán intactos sus registros históricos.
              </p>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setIsDeleteModalOpen(false)} className="btn btn-secondary">
                Cancelar
              </button>
              <button onClick={handleDeleteConfirm} className="btn" style={{ background: '#ef4444', color: '#fff' }}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
