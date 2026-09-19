import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  XCircle,
  CheckCircle,
  Edit2,
  Trash2,
  Boxes,
  TrendingUp,
  DollarSign,
  Layers,
  X,
  RefreshCw,
  AlertCircle,
  Check,
  Camera,
  Lock,
  Eye,
  EyeOff,
  Shield,
} from 'lucide-react';
import type { Product, InventoryStats } from '../../types';
import { api } from '../../services/api';

export const AdminProducts: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [stockLevelFilter, setStockLevelFilter] = useState<'all' | 'normal' | 'low_stock' | 'out_of_stock'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Modal de eliminación segura con contraseña
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Formularios
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    category: 'Analgésicos',
    unit_measure: 'Caja',
    price_cop: 0,
    cost_cop: 0,
    current_stock: 0,
    min_stock: 5,
    image_url: '',
  });

  const [editFormData, setEditFormData] = useState({
    code: '',
    name: '',
    description: '',
    category: '',
    unit_measure: '',
    price_cop: 0,
    cost_cop: 0,
    min_stock: 5,
    is_active: 1,
    image_url: '',
  });

  const [stockFormData, setStockFormData] = useState({
    type: 'add' as 'add' | 'subtract' | 'set',
    quantity: 1,
    reason: '',
  });

  const categoriesList = [
    'Todas',
    'Analgésicos',
    'Antibióticos',
    'Antiinflamatorios',
    'Antihistamínicos',
    'Gastrointestinales',
    'Material Médico',
    'Hidratación',
    'Vitaminas & Suplementos',
    'Inyectables',
    'General',
  ];

  const fetchStats = async () => {
    try {
      const res = await api.getInventoryStats();
      setStats(res.stats);
    } catch (err) {
      console.error('Error al cargar métricas de inventario:', err);
    }
  };

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const res = await api.getProducts({
        search: searchTerm || undefined,
        category: categoryFilter !== 'Todas' ? categoryFilter : undefined,
        status: statusFilter,
        stock_level: stockLevelFilter,
      });
      setProducts(res.products);
    } catch (err: any) {
      console.error('Error al cargar productos:', err);
      setFeedback({ type: 'error', text: err.message || 'Error al cargar productos.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm, categoryFilter, statusFilter, stockLevelFilter]);

  // Manejo de Creación
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!formData.code.trim() || !formData.name.trim()) {
      setFeedback({ type: 'error', text: 'El código y el nombre del producto son requeridos.' });
      return;
    }

    if (formData.price_cop < 0 || formData.cost_cop < 0) {
      setFeedback({ type: 'error', text: 'Los precios y costos deben ser números positivos.' });
      return;
    }

    try {
      await api.createProduct({
        code: formData.code.trim(),
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        category: formData.category,
        unit_measure: formData.unit_measure,
        price_cop: Number(formData.price_cop),
        cost_cop: Number(formData.cost_cop),
        current_stock: Number(formData.current_stock),
        min_stock: Number(formData.min_stock),
        image_url: formData.image_url.trim() || undefined,
      });

      setFeedback({ type: 'success', text: `Producto '${formData.name}' registrado exitosamente.` });
      setIsCreateModalOpen(false);
      setFormData({
        code: '',
        name: '',
        description: '',
        category: 'Analgésicos',
        unit_measure: 'Caja',
        price_cop: 0,
        cost_cop: 0,
        current_stock: 0,
        min_stock: 5,
        image_url: '',
      });
      fetchProducts();
      fetchStats();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Error al registrar producto.' });
    }
  };

  // Manejo de carga de archivos fotográficos (Base64)
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      setFeedback({ type: 'error', text: 'La imagen seleccionada no debe superar los 3MB.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (isEdit) {
        setEditFormData((prev) => ({ ...prev, image_url: base64 }));
      } else {
        setFormData((prev) => ({ ...prev, image_url: base64 }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Abrir Modal de Eliminación Segura
  const openDeleteModal = (product: Product) => {
    setProductToDelete(product);
    setDeletePassword('');
    setShowDeletePassword(false);
    setDeleteError(null);
    setIsDeleteModalOpen(true);
  };

  // Confirmar eliminación de producto con contraseña
  const handleConfirmDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productToDelete) return;
    if (!deletePassword.trim()) {
      setDeleteError('Ingresa tu contraseña de administrador para continuar.');
      return;
    }

    setDeleteError(null);
    setDeleteLoading(true);

    try {
      const res = await api.deleteProduct(productToDelete.id, deletePassword);
      setFeedback({ type: 'success', text: res.message });
      setIsDeleteModalOpen(false);
      setProductToDelete(null);
      setDeletePassword('');
      await fetchProducts();
      await fetchStats();
    } catch (err: any) {
      setDeleteError(err.message || 'Error al autorizar la eliminación del producto.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Abrir Modal de Edición
  const openEditModal = (product: Product) => {
    setSelectedProduct(product);
    setEditFormData({
      code: product.code,
      name: product.name,
      description: product.description || '',
      category: product.category || 'General',
      unit_measure: product.unit_measure || 'Unidad',
      price_cop: product.price_cop,
      cost_cop: product.cost_cop || 0,
      min_stock: product.min_stock,
      is_active: product.is_active,
      image_url: product.image_url || '',
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setFeedback(null);

    try {
      await api.updateProduct(selectedProduct.id, {
        code: editFormData.code.trim(),
        name: editFormData.name.trim(),
        description: editFormData.description.trim() || undefined,
        category: editFormData.category,
        unit_measure: editFormData.unit_measure,
        price_cop: Number(editFormData.price_cop),
        cost_cop: Number(editFormData.cost_cop),
        min_stock: Number(editFormData.min_stock),
        is_active: editFormData.is_active,
        image_url: editFormData.image_url.trim() || null,
      });

      setFeedback({ type: 'success', text: 'Producto actualizado exitosamente.' });
      setIsEditModalOpen(false);
      fetchProducts();
      fetchStats();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Error al actualizar producto.' });
    }
  };

  // Abrir Modal de Ajuste de Stock
  const openStockModal = (product: Product) => {
    setSelectedProduct(product);
    setStockFormData({
      type: 'add',
      quantity: 1,
      reason: 'Ingreso por factura de compra',
    });
    setIsStockModalOpen(true);
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setFeedback(null);

    try {
      const res = await api.adjustProductStock(selectedProduct.id, {
        type: stockFormData.type,
        quantity: Number(stockFormData.quantity),
        reason: stockFormData.reason.trim() || undefined,
      });

      setFeedback({ type: 'success', text: res.message });
      setIsStockModalOpen(false);
      fetchProducts();
      fetchStats();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Error al ajustar stock.' });
    }
  };

  // Activar / Desactivar
  const handleToggleStatus = async (product: Product) => {
    const newStatus = product.is_active === 1 ? false : true;
    try {
      await api.toggleProductStatus(product.id, newStatus);
      setFeedback({
        type: 'success',
        text: `Producto '${product.name}' ${newStatus ? 'activado' : 'desactivado'} correctamente.`,
      });
      fetchProducts();
      fetchStats();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Error al cambiar estado del producto.' });
    }
  };

  // Formato de moneda COP
  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Notificación de Feedback */}
      {feedback && (
        <div
          className={`glass-card ${feedback.type === 'success' ? 'status-banner-success' : 'status-banner-error'}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            borderRadius: 'var(--radius-lg)',
            borderLeft: feedback.type === 'success' ? '4px solid #10b981' : '4px solid #ef4444',
            background: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {feedback.type === 'success' ? (
              <CheckCircle size={20} color="#10b981" />
            ) : (
              <AlertCircle size={20} color="#ef4444" />
            )}
            <span style={{ fontSize: '0.92rem', fontWeight: 500 }}>{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Encabezado y Acción Principal */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Package size={28} color="var(--primary)" />
            Módulo de Productos e Inventario
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '4px' }}>
            Control maestro de catálogo farmacéutico, precios en COP, cálculo de valor de existencias y alertas de reposición.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="btn btn-primary"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            fontSize: '0.95rem',
            fontWeight: 600,
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 4px 14px rgba(59, 130, 246, 0.35)',
          }}
        >
          <Plus size={18} />
          Nuevo Producto
        </button>
      </div>

      {/* Tarjetas KPI de Inventario */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '16px',
      }}>
        {/* Total Productos */}
        <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Catálogo Total
            </span>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
              <Boxes size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{stats?.total_products || 0}</div>
          <div style={{ fontSize: '0.78rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Check size={14} /> {stats?.active_count || 0} activos &bull; {stats?.inactive_count || 0} inactivos
          </div>
        </div>

        {/* Valor Total Inventario Costo */}
        <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Valor en Costo (COP)
            </span>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c084fc' }}>
              <DollarSign size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#e2e8f0' }}>
            {formatCOP(stats?.total_cost_value || 0)}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Capital total invertido en almacén
          </div>
        </div>

        {/* Valor Total Comercial Proyectado */}
        <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Valor Comercial (COP)
            </span>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399' }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#34d399' }}>
            {formatCOP(stats?.total_retail_value || 0)}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Proyección de venta total disponible
          </div>
        </div>

        {/* Alerta Stock Bajo */}
        <div
          className="glass-card"
          onClick={() => setStockLevelFilter(stockLevelFilter === 'low_stock' ? 'all' : 'low_stock')}
          style={{
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            cursor: 'pointer',
            border: stockLevelFilter === 'low_stock' ? '2px solid #f59e0b' : undefined,
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase' }}>
              Stock Bajo
            </span>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24' }}>
              <AlertTriangle size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fbbf24' }}>
            {stats?.low_stock_count || 0}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#fbbf24' }}>
            Por debajo del mínimo &bull; Clic para filtrar
          </div>
        </div>

        {/* Productos Agotados */}
        <div
          className="glass-card"
          onClick={() => setStockLevelFilter(stockLevelFilter === 'out_of_stock' ? 'all' : 'out_of_stock')}
          style={{
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            cursor: 'pointer',
            border: stockLevelFilter === 'out_of_stock' ? '2px solid #ef4444' : undefined,
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f87171', textTransform: 'uppercase' }}>
              Agotados
            </span>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171' }}>
              <XCircle size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ef4444' }}>
            {stats?.out_of_stock_count || 0}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#f87171' }}>
            Sin existencias &bull; Clic para filtrar
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="glass-card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Campo de búsqueda */}
          <div style={{
            position: 'relative',
            flex: '1 1 260px',
            display: 'flex',
            alignItems: 'center',
          }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Buscar por código, nombre o categoría..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field"
              style={{
                width: '100%',
                paddingLeft: '42px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.9rem',
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Filtro por Categoría */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={16} color="var(--text-muted)" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="input-field"
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.88rem',
                minWidth: '150px',
              }}
            >
              {categoriesList.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'Todas' ? 'Todas las Categorías' : cat}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Estado */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={16} color="var(--text-muted)" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="input-field"
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.88rem',
              }}
            >
              <option value="all">Todos los Estados</option>
              <option value="active">Solo Activos</option>
              <option value="inactive">Solo Inactivos</option>
            </select>
          </div>

          {/* Botones de Filtro Rápido de Stock */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setStockLevelFilter('all')}
              className={`btn btn-sm ${stockLevelFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.82rem', padding: '6px 12px' }}
            >
              Todos ({stats?.total_products || 0})
            </button>
            <button
              onClick={() => setStockLevelFilter('normal')}
              className={`btn btn-sm ${stockLevelFilter === 'normal' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.82rem', padding: '6px 12px' }}
            >
              Normal
            </button>
            <button
              onClick={() => setStockLevelFilter('low_stock')}
              className={`btn btn-sm ${stockLevelFilter === 'low_stock' ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                fontSize: '0.82rem',
                padding: '6px 12px',
                color: stockLevelFilter === 'low_stock' ? undefined : '#fbbf24',
              }}
            >
              ⚠️ Stock Bajo ({stats?.low_stock_count || 0})
            </button>
            <button
              onClick={() => setStockLevelFilter('out_of_stock')}
              className={`btn btn-sm ${stockLevelFilter === 'out_of_stock' ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                fontSize: '0.82rem',
                padding: '6px 12px',
                color: stockLevelFilter === 'out_of_stock' ? undefined : '#ef4444',
              }}
            >
              ❌ Agotados ({stats?.out_of_stock_count || 0})
            </button>
          </div>
        </div>
      </div>

      {/* Tabla Principal de Catálogo e Inventario */}
      <div className="glass-card" style={{ overflow: 'hidden', padding: 0 }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{
                background: 'rgba(255, 255, 255, 0.03)',
                borderBottom: '1px solid var(--border-subtle)',
              }}>
                <th style={{ padding: '14px 18px', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                  Código / Ref
                </th>
                <th style={{ padding: '14px 18px', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                  Producto & Categoría
                </th>
                <th style={{ padding: '14px 18px', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                  Presentación
                </th>
                <th style={{ padding: '14px 18px', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'right' }}>
                  Costo Unitario
                </th>
                <th style={{ padding: '14px 18px', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'right' }}>
                  Precio Venta (COP)
                </th>
                <th style={{ padding: '14px 18px', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'center' }}>
                  Margen %
                </th>
                <th style={{ padding: '14px 18px', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'center' }}>
                  Stock Disponible
                </th>
                <th style={{ padding: '14px 18px', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'center' }}>
                  Estado
                </th>
                <th style={{ padding: '14px 18px', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'right' }}>
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                      <RefreshCw className="spinner" size={20} />
                      <span>Cargando productos e inventario...</span>
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                    <Package size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                    <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      No se encontraron productos coincidentes
                    </p>
                    <p style={{ fontSize: '0.85rem' }}>Prueba modificando los filtros o registra un nuevo producto.</p>
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  const isOutOfStock = product.current_stock === 0;
                  const isLowStock = product.current_stock <= product.min_stock && !isOutOfStock;

                  return (
                    <tr
                      key={product.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background 0.2s ease',
                      }}
                      className="table-row-hover"
                    >
                      {/* Código */}
                      <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                        <span style={{
                          fontFamily: 'monospace',
                          fontSize: '0.85rem',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          background: 'rgba(59, 130, 246, 0.12)',
                          color: '#60a5fa',
                          fontWeight: 700,
                        }}>
                          {product.code}
                        </span>
                      </td>

                      {/* Producto & Categoría con Anexo Fotográfico */}
                      <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '8px',
                                objectFit: 'cover',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                background: 'rgba(0, 0, 0, 0.25)',
                                flexShrink: 0,
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '8px',
                                background: 'rgba(59, 130, 246, 0.1)',
                                border: '1px solid rgba(59, 130, 246, 0.25)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#60a5fa',
                                flexShrink: 0,
                              }}
                              title="Sin foto adjunta"
                            >
                              <Package size={20} />
                            </div>
                          )}
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                              {product.name}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                              <span style={{
                                fontSize: '0.72rem',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                background: 'rgba(255, 255, 255, 0.08)',
                                color: 'var(--text-secondary)',
                              }}>
                                {product.category}
                              </span>
                              {product.description && (
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '240px' }}>
                                  {product.description}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Presentación */}
                      <td style={{ padding: '14px 18px', verticalAlign: 'middle', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                        {product.unit_measure}
                      </td>

                      {/* Costo Unitario */}
                      <td style={{ padding: '14px 18px', verticalAlign: 'middle', textAlign: 'right', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        {formatCOP(product.cost_cop || 0)}
                      </td>

                      {/* Precio Venta */}
                      <td style={{ padding: '14px 18px', verticalAlign: 'middle', textAlign: 'right', fontWeight: 800, fontSize: '1rem', color: '#10b981' }}>
                        {formatCOP(product.price_cop)}
                      </td>

                      {/* Margen */}
                      <td style={{ padding: '14px 18px', verticalAlign: 'middle', textAlign: 'center' }}>
                        <span style={{
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: (product.margin_percent || 0) >= 30 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                          color: (product.margin_percent || 0) >= 30 ? '#34d399' : '#fbbf24',
                        }}>
                          +{product.margin_percent || 0}%
                        </span>
                      </td>

                      {/* Stock Disponible */}
                      <td style={{ padding: '14px 18px', verticalAlign: 'middle', textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                          <span style={{
                            fontSize: '0.95rem',
                            fontWeight: 800,
                            color: isOutOfStock ? '#ef4444' : isLowStock ? '#fbbf24' : '#ffffff',
                          }}>
                            {product.current_stock}
                          </span>
                          {isOutOfStock ? (
                            <span style={{
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: 'rgba(239, 68, 68, 0.18)',
                              color: '#f87171',
                              textTransform: 'uppercase',
                            }}>
                              Agotado
                            </span>
                          ) : isLowStock ? (
                            <span style={{
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: 'rgba(245, 158, 11, 0.18)',
                              color: '#fbbf24',
                              textTransform: 'uppercase',
                            }}>
                              Mín: {product.min_stock}
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              Mín: {product.min_stock}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Estado */}
                      <td style={{ padding: '14px 18px', verticalAlign: 'middle', textAlign: 'center' }}>
                        <button
                          onClick={() => handleToggleStatus(product)}
                          title={product.is_active === 1 ? 'Clic para desactivar' : 'Clic para activar'}
                          style={{
                            border: 'none',
                            background: product.is_active === 1 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: product.is_active === 1 ? '#10b981' : '#ef4444',
                            padding: '4px 10px',
                            borderRadius: '16px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          {product.is_active === 1 ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>

                      {/* Acciones */}
                      <td style={{ padding: '14px 18px', verticalAlign: 'middle', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => openStockModal(product)}
                            className="btn btn-secondary btn-sm"
                            title="Ajustar inventario físico"
                            style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: '#60a5fa' }}
                          >
                            <Boxes size={14} />
                            <span>Stock</span>
                          </button>
                          <button
                            onClick={() => openEditModal(product)}
                            className="btn btn-secondary btn-sm"
                            title="Editar información de producto"
                            style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}
                          >
                            <Edit2 size={14} />
                            <span>Editar</span>
                          </button>
                          <button
                            onClick={() => openDeleteModal(product)}
                            className="btn btn-sm"
                            title="Eliminar producto permanentemente"
                            style={{
                              padding: '6px 10px',
                              background: 'rgba(239, 68, 68, 0.15)',
                              color: '#ef4444',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.8rem',
                              cursor: 'pointer',
                            }}
                          >
                            <Trash2 size={14} />
                            <span>Eliminar</span>
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

      {/* MODAL 1: Crear Producto */}
      {isCreateModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '580px', width: '90%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Package size={22} color="var(--primary)" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Registrar Nuevo Producto</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateProduct}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                      Código / Referencia *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. ACET-500MG"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      className="input-field"
                      style={{ width: '100%', fontFamily: 'monospace' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                      Nombre del Producto *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Acetaminofén 500mg MK"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="input-field"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                      Categoría
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="input-field"
                      style={{ width: '100%' }}
                    >
                      {categoriesList.filter((c) => c !== 'Todas').map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                      Unidad de Medida
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Caja x 100, Frasco 500ml"
                      value={formData.unit_measure}
                      onChange={(e) => setFormData({ ...formData, unit_measure: e.target.value })}
                      className="input-field"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                      Costo Unitario (COP)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.cost_cop}
                      onChange={(e) => setFormData({ ...formData, cost_cop: Number(e.target.value) })}
                      className="input-field"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                      Precio de Venta COP *
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={formData.price_cop}
                      onChange={(e) => setFormData({ ...formData, price_cop: Number(e.target.value) })}
                      className="input-field"
                      style={{ width: '100%', fontWeight: 700, color: '#10b981' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                      Stock Inicial Disponible
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.current_stock}
                      onChange={(e) => setFormData({ ...formData, current_stock: Number(e.target.value) })}
                      className="input-field"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                      Stock Mínimo (Alerta)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.min_stock}
                      onChange={(e) => setFormData({ ...formData, min_stock: Number(e.target.value) })}
                      className="input-field"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                {/* Anexo Fotográfico (Subir foto o URL) */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Foto del Producto (Anexo Fotográfico)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    {formData.image_url ? (
                      <div style={{ position: 'relative', width: '64px', height: '64px', flexShrink: 0 }}>
                        <img
                          src={formData.image_url}
                          alt="Vista previa"
                          style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '8px',
                            objectFit: 'cover',
                            border: '2px solid var(--primary)',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, image_url: '' })}
                          title="Quitar foto"
                          style={{
                            position: 'absolute',
                            top: '-6px',
                            right: '-6px',
                            background: '#ef4444',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '50%',
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div
                        style={{
                          width: '64px',
                          height: '64px',
                          borderRadius: '8px',
                          border: '2px dashed var(--border-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--text-muted)',
                          flexShrink: 0,
                        }}
                      >
                        <Camera size={24} />
                      </div>
                    )}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label
                        className="btn btn-secondary btn-sm"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          width: 'fit-content',
                        }}
                      >
                        <Camera size={14} />
                        <span>{formData.image_url ? 'Cambiar Foto' : 'Subir Foto'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => handleImageFileChange(e, false)}
                        />
                      </label>
                      <input
                        type="url"
                        placeholder="O pega aquí una URL directa de imagen..."
                        value={formData.image_url}
                        onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                        className="input-field"
                        style={{ width: '100%', fontSize: '0.8rem' }}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Descripción o Indicaciones Farmacéuticas
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Concentración, posología, indicaciones o notas adicionales..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input-field"
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Check size={18} />
                  Guardar Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Editar Producto */}
      {isEditModalOpen && selectedProduct && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '580px', width: '90%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Edit2 size={22} color="var(--primary)" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Editar Producto: {selectedProduct.name}</h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateProduct}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                      Código / Ref *
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.code}
                      onChange={(e) => setEditFormData({ ...editFormData, code: e.target.value.toUpperCase() })}
                      className="input-field"
                      style={{ width: '100%', fontFamily: 'monospace' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                      Nombre del Producto *
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      className="input-field"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                      Categoría
                    </label>
                    <select
                      value={editFormData.category}
                      onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                      className="input-field"
                      style={{ width: '100%' }}
                    >
                      {categoriesList.filter((c) => c !== 'Todas').map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                      Unidad de Medida
                    </label>
                    <input
                      type="text"
                      value={editFormData.unit_measure}
                      onChange={(e) => setEditFormData({ ...editFormData, unit_measure: e.target.value })}
                      className="input-field"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                      Costo Unitario (COP)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editFormData.cost_cop}
                      onChange={(e) => setEditFormData({ ...editFormData, cost_cop: Number(e.target.value) })}
                      className="input-field"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                      Precio Venta COP *
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={editFormData.price_cop}
                      onChange={(e) => setEditFormData({ ...editFormData, price_cop: Number(e.target.value) })}
                      className="input-field"
                      style={{ width: '100%', fontWeight: 700, color: '#10b981' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                      Stock Mínimo (Alerta)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editFormData.min_stock}
                      onChange={(e) => setEditFormData({ ...editFormData, min_stock: Number(e.target.value) })}
                      className="input-field"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                      Estado
                    </label>
                    <select
                      value={editFormData.is_active}
                      onChange={(e) => setEditFormData({ ...editFormData, is_active: Number(e.target.value) })}
                      className="input-field"
                      style={{ width: '100%' }}
                    >
                      <option value={1}>Activo</option>
                      <option value={0}>Inactivo</option>
                    </select>
                  </div>
                </div>

                {/* Anexo Fotográfico en Edición */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Foto del Producto (Anexo Fotográfico)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    {editFormData.image_url ? (
                      <div style={{ position: 'relative', width: '64px', height: '64px', flexShrink: 0 }}>
                        <img
                          src={editFormData.image_url}
                          alt="Foto del producto"
                          style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '8px',
                            objectFit: 'cover',
                            border: '2px solid var(--primary)',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setEditFormData({ ...editFormData, image_url: '' })}
                          title="Quitar foto"
                          style={{
                            position: 'absolute',
                            top: '-6px',
                            right: '-6px',
                            background: '#ef4444',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '50%',
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div
                        style={{
                          width: '64px',
                          height: '64px',
                          borderRadius: '8px',
                          border: '2px dashed var(--border-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--text-muted)',
                          flexShrink: 0,
                        }}
                      >
                        <Camera size={24} />
                      </div>
                    )}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label
                        className="btn btn-secondary btn-sm"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          width: 'fit-content',
                        }}
                      >
                        <Camera size={14} />
                        <span>{editFormData.image_url ? 'Cambiar Foto' : 'Subir Foto'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => handleImageFileChange(e, true)}
                        />
                      </label>
                      <input
                        type="url"
                        placeholder="O pega aquí una URL directa de imagen..."
                        value={editFormData.image_url}
                        onChange={(e) => setEditFormData({ ...editFormData, image_url: e.target.value })}
                        className="input-field"
                        style={{ width: '100%', fontSize: '0.8rem' }}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Descripción o Indicaciones Farmacéuticas
                  </label>
                  <textarea
                    rows={2}
                    value={editFormData.description}
                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                    className="input-field"
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Check size={18} />
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Ajuste Rápido de Stock con Auditoría */}
      {isStockModalOpen && selectedProduct && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '460px', width: '90%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Boxes size={22} color="#60a5fa" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Ajuste Físico de Inventario</h3>
              </div>
              <button
                onClick={() => setIsStockModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAdjustStock}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Producto a modificar:</div>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: '#ffffff', marginTop: '2px' }}>
                    {selectedProduct.name}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Ref: {selectedProduct.code}</span>
                    <span style={{ fontWeight: 700, color: '#60a5fa' }}>
                      Stock actual: {selectedProduct.current_stock} {selectedProduct.unit_measure}
                    </span>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Tipo de Movimiento *
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setStockFormData({ ...stockFormData, type: 'add', reason: 'Ingreso por factura de compra' })}
                      className={`btn btn-sm ${stockFormData.type === 'add' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '0.85rem', fontWeight: 700 }}
                    >
                      ➕ Sumar
                    </button>
                    <button
                      type="button"
                      onClick={() => setStockFormData({ ...stockFormData, type: 'subtract', reason: 'Merma o avería' })}
                      className={`btn btn-sm ${stockFormData.type === 'subtract' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '0.85rem', fontWeight: 700 }}
                    >
                      ➖ Restar
                    </button>
                    <button
                      type="button"
                      onClick={() => setStockFormData({ ...stockFormData, type: 'set', reason: 'Conteo físico de inventario' })}
                      className={`btn btn-sm ${stockFormData.type === 'set' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '0.85rem', fontWeight: 700 }}
                    >
                      🎯 Fijar
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    {stockFormData.type === 'set' ? 'Nueva Cantidad Total Exacta *' : 'Cantidad a Ajustar *'}
                  </label>
                  <input
                    type="number"
                    min={stockFormData.type === 'set' ? '0' : '1'}
                    required
                    value={stockFormData.quantity}
                    onChange={(e) => setStockFormData({ ...stockFormData, quantity: Number(e.target.value) })}
                    className="input-field"
                    style={{ width: '100%', fontSize: '1.2rem', fontWeight: 800, textAlign: 'center' }}
                  />
                </div>

                {/* Previsualización del nuevo stock */}
                <div style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  fontSize: '0.85rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span>Nuevo Stock Resultante:</span>
                  <strong style={{ fontSize: '1rem', color: '#93c5fd' }}>
                    {stockFormData.type === 'add'
                      ? selectedProduct.current_stock + Number(stockFormData.quantity)
                      : stockFormData.type === 'subtract'
                      ? Math.max(0, selectedProduct.current_stock - Number(stockFormData.quantity))
                      : Number(stockFormData.quantity)}{' '}
                    {selectedProduct.unit_measure}
                  </strong>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Motivo / Justificación (Auditoría)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Factura N° 1024, Devolución de cliente, Avería..."
                    value={stockFormData.reason}
                    onChange={(e) => setStockFormData({ ...stockFormData, reason: e.target.value })}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setIsStockModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Check size={18} />
                  Confirmar Ajuste
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL 4: Confirmación de Seguridad con Contraseña para Eliminar Producto */}
      {isDeleteModalOpen && productToDelete && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '460px', width: '90%' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid rgba(239, 68, 68, 0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}>
                <Shield size={20} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Autorizar Eliminación de Producto</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleConfirmDelete}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div
                  style={{
                    padding: '14px',
                    borderRadius: '8px',
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    fontSize: '0.875rem',
                    lineHeight: 1.5,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    {productToDelete.image_url ? (
                      <img
                        src={productToDelete.image_url}
                        alt={productToDelete.name}
                        style={{ width: '42px', height: '42px', borderRadius: '6px', objectFit: 'cover' }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '6px',
                          background: 'rgba(239, 68, 68, 0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ef4444',
                        }}
                      >
                        <Package size={20} />
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: 700, color: '#f87171' }}>{productToDelete.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Ref: {productToDelete.code} &bull; Stock: {productToDelete.current_stock}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    ⚠️ Esta acción es permanente e irreversible. Se eliminará del catálogo farmacéutico e inventario general.
                  </div>
                </div>

                {deleteError && (
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: '6px',
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid #ef4444',
                      color: '#fca5a5',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                    <span>{deleteError}</span>
                  </div>
                )}

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Lock size={14} style={{ color: '#ef4444' }} />
                    <span>Ingresa tu contraseña de Administrador para confirmar:</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showDeletePassword ? 'text' : 'password'}
                      className="input-field"
                      placeholder="Tu contraseña de administrador..."
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      autoFocus
                      required
                      style={{ width: '100%', paddingRight: '40px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowDeletePassword(!showDeletePassword)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title={showDeletePassword ? 'Ocultar' : 'Mostrar'}
                    >
                      {showDeletePassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid var(--border-subtle)', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={deleteLoading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-danger"
                  disabled={deleteLoading || !deletePassword.trim()}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Trash2 size={16} />
                  <span>{deleteLoading ? 'Verificando...' : 'Confirmar y Eliminar'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
