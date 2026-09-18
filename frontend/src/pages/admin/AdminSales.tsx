import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Plus,
  Search,
  DollarSign,
  TrendingUp,
  Receipt,
  Calendar,
  UserCheck,
  CheckCircle,
  AlertCircle,
  X,
  RefreshCw,
  Eye,
  Trash2,
  User as UserIcon,
  Printer,
} from 'lucide-react';
import type { Sale, SaleStats, Customer, Product, User, Invoice } from '../../types';
import { api } from '../../services/api';
import { InvoiceDocument } from '../../components/invoices/InvoiceDocument';

export const AdminSales: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [stats, setStats] = useState<SaleStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sellerFilter, setSellerFilter] = useState('');
  const [sellersList, setSellersList] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedSaleDetail, setSelectedSaleDetail] = useState<Sale | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Datos para creación de venta
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [selectedSellerId, setSelectedSellerId] = useState('');
  const [saleItems, setSaleItems] = useState<Array<{
    product_id: string;
    product_code: string;
    product_name: string;
    unit_measure: string;
    price_cop: number;
    current_stock: number;
    quantity: number;
  }>>([]);

  const [selectedProductToAdd, setSelectedProductToAdd] = useState('');
  const [quantityToAdd, setQuantityToAdd] = useState(1);
  const [saleNotes, setSaleNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await api.getSalesStats();
      setStats(res.stats);
    } catch (err) {
      console.error('Error al cargar estadísticas de ventas:', err);
    }
  };

  const fetchSellers = async () => {
    try {
      const res = await api.getUsers();
      setSellersList(res.users.filter((u) => u.role_code === 'VENDEDOR' || u.role_code === 'ADMINISTRADOR'));
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
    }
  };

  const fetchSales = async () => {
    setIsLoading(true);
    try {
      const res = await api.getSales({
        search: searchTerm || undefined,
        seller_id: sellerFilter || undefined,
      });
      setSales(res.sales);
    } catch (err: any) {
      console.error('Error al cargar ventas:', err);
      setFeedback({ type: 'error', text: err.message || 'Error al consultar ventas.' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadCreateFormData = async () => {
    try {
      const [custRes, prodRes] = await Promise.all([
        api.getCustomers({ status: 'active' }),
        api.getProducts({ status: 'active' }),
      ]);
      setCustomers(custRes.customers);
      // Solo productos con stock disponible
      setProducts(prodRes.products.filter((p) => p.current_stock > 0));
    } catch (err) {
      console.error('Error al cargar datos para venta:', err);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchSellers();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSales();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm, sellerFilter]);

  // Manejo de Modal de Registro
  const openCreateModal = () => {
    loadCreateFormData();
    setSelectedCustomerId('');
    setCustomerSearchTerm('');
    setProductSearchTerm('');
    setSelectedSellerId('');
    setSaleItems([]);
    setSelectedProductToAdd('');
    setQuantityToAdd(1);
    setSaleNotes('');
    setIsCreateModalOpen(true);
  };

  const handleAddProductToSale = (targetProductId?: string, targetQty?: number) => {
    const prodId = targetProductId || selectedProductToAdd;
    const qty = targetQty || quantityToAdd;

    if (!prodId) return;
    const prod = products.find((p) => p.id === prodId);
    if (!prod) return;

    if (qty <= 0) {
      setFeedback({ type: 'error', text: 'La cantidad debe ser mayor a 0.' });
      return;
    }

    if (qty > prod.current_stock) {
      setFeedback({
        type: 'error',
        text: `Stock insuficiente para ${prod.name}. Disponible: ${prod.current_stock}.`,
      });
      return;
    }

    // Verificar si ya existe en la lista
    const existingIndex = saleItems.findIndex((item) => item.product_id === prod.id);
    if (existingIndex >= 0) {
      const currentQty = saleItems[existingIndex].quantity;
      const newQty = currentQty + qty;
      if (newQty > prod.current_stock) {
        setFeedback({
          type: 'error',
          text: `No puedes agregar ${qty} más. Stock disponible total: ${prod.current_stock}.`,
        });
        return;
      }
      const updated = [...saleItems];
      updated[existingIndex].quantity = newQty;
      setSaleItems(updated);
    } else {
      setSaleItems([
        ...saleItems,
        {
          product_id: prod.id,
          product_code: prod.code,
          product_name: prod.name,
          unit_measure: prod.unit_measure,
          price_cop: prod.price_cop,
          current_stock: prod.current_stock,
          quantity: qty,
        },
      ]);
    }

    setSelectedProductToAdd('');
    setQuantityToAdd(1);
    setProductSearchTerm('');
  };

  const updateItemQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(index);
      return;
    }
    const item = saleItems[index];
    if (newQty > item.current_stock) {
      setFeedback({
        type: 'error',
        text: `Stock insuficiente para ${item.product_name}. Máximo disponible: ${item.current_stock}.`,
      });
      return;
    }
    const updated = [...saleItems];
    updated[index].quantity = newQty;
    setSaleItems(updated);
    setFeedback(null);
  };

  const handleRemoveItem = (index: number) => {
    setSaleItems(saleItems.filter((_, i) => i !== index));
  };

  const calculateSaleTotal = () => {
    return saleItems.reduce((acc, item) => acc + item.quantity * item.price_cop, 0);
  };

  const handleSubmitSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!selectedCustomerId) {
      setFeedback({ type: 'error', text: 'Debe seleccionar un cliente existente.' });
      return;
    }

    if (saleItems.length === 0) {
      setFeedback({ type: 'error', text: 'Debe agregar al menos un producto a la venta.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.createSale({
        customer_id: selectedCustomerId,
        seller_id: selectedSellerId || undefined,
        items: saleItems.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
        })),
        notes: saleNotes.trim() || undefined,
      });

      setFeedback({ type: 'success', text: res.message });
      setIsCreateModalOpen(false);
      fetchSales();
      fetchStats();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Error al registrar la venta.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ver Detalle de Venta
  const handleViewDetail = async (saleId: string) => {
    try {
      const res = await api.getSaleById(saleId);
      setSelectedSaleDetail(res.sale);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Error al consultar detalle.' });
    }
  };

  // Ver Factura Asociada
  const handleOpenInvoice = async (saleId: string) => {
    try {
      const res = await api.getInvoiceBySaleId(saleId);
      setSelectedInvoice(res.invoice);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'No se encontró la factura comercial de esta venta.' });
    }
  };

  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('es-CO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Alerta de Notificación */}
      {feedback && (
        <div
          className="glass-card"
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
            <ShoppingCart size={28} color="var(--primary)" />
            Control de Ventas
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '4px' }}>
            Supervisión integral de operaciones comerciales, transacciones en tiempo real y descuento automático de inventario.
          </p>
        </div>

        <button
          onClick={openCreateModal}
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
          Registrar Venta
        </button>
      </div>

      {/* Tarjetas KPI de Ventas */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '16px',
      }}>
        {/* Total Ventas */}
        <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Ventas Registradas
            </span>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
              <Receipt size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{stats?.total_sales || 0}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Transacciones totales en sistema
          </div>
        </div>

        {/* Ingresos Totales */}
        <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Ingresos Totales (COP)
            </span>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399' }}>
              <DollarSign size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#34d399' }}>
            {formatCOP(stats?.total_revenue_cop || 0)}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Facturación acumulada global
          </div>
        </div>

        {/* Ventas de Hoy */}
        <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Ventas de Hoy (COP)
            </span>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c084fc' }}>
              <Calendar size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#e2e8f0' }}>
            {formatCOP(stats?.today_sales_cop || 0)}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#60a5fa' }}>
            {stats?.today_sales_count || 0} operaciones hoy
          </div>
        </div>

        {/* Ticket Promedio */}
        <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Ticket Promedio
            </span>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24' }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fbbf24' }}>
            {formatCOP(stats?.average_ticket_cop || 0)}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Promedio por venta en COP
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="glass-card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Campo de búsqueda */}
          <div style={{ position: 'relative', flex: '1 1 260px', display: 'flex', alignItems: 'center' }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Buscar por N° Venta (VTA-0001), cliente o vendedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field"
              style={{ width: '100%', paddingLeft: '42px', borderRadius: 'var(--radius-md)', fontSize: '0.9rem' }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Filtro por Vendedor */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserCheck size={16} color="var(--text-muted)" />
            <select
              value={sellerFilter}
              onChange={(e) => setSellerFilter(e.target.value)}
              className="input-field"
              style={{ padding: '8px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.88rem', minWidth: '180px' }}
            >
              <option value="">Todos los Vendedores</option>
              {sellersList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name} ({s.role_code})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de Ventas */}
      <div className="glass-card" style={{ overflow: 'hidden', padding: 0 }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '14px 18px', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                  N° Venta
                </th>
                <th style={{ padding: '14px 18px', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                  Fecha y Hora
                </th>
                <th style={{ padding: '14px 18px', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                  Cliente
                </th>
                <th style={{ padding: '14px 18px', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                  Vendedor
                </th>
                <th style={{ padding: '14px 18px', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'center' }}>
                  Items
                </th>
                <th style={{ padding: '14px 18px', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'right' }}>
                  Total Venta (COP)
                </th>
                <th style={{ padding: '14px 18px', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'right' }}>
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                      <RefreshCw className="spinner" size={20} />
                      <span>Cargando ventas...</span>
                    </div>
                  </td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                    <ShoppingCart size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                    <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      No se encontraron ventas registradas
                    </p>
                    <p style={{ fontSize: '0.85rem' }}>Haz clic en 'Registrar Venta' para crear la primera transacción.</p>
                  </td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale.id} className="table-row-hover" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    {/* N° Venta */}
                    <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                      <span style={{
                        fontFamily: 'monospace',
                        fontSize: '0.88rem',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        background: 'rgba(59, 130, 246, 0.15)',
                        color: '#60a5fa',
                        fontWeight: 700,
                      }}>
                        {sale.invoice_number}
                      </span>
                    </td>

                    {/* Fecha y Hora */}
                    <td style={{ padding: '14px 18px', verticalAlign: 'middle', fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
                      {formatDate(sale.created_at)}
                    </td>

                    {/* Cliente */}
                    <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                        {sale.customer_name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Doc: {sale.customer_id_number} {sale.customer_city ? `• ${sale.customer_city}` : ''}
                      </div>
                    </td>

                    {/* Vendedor */}
                    <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          background: 'rgba(168, 85, 247, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#c084fc',
                        }}>
                          <UserIcon size={14} />
                        </div>
                        <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{sale.seller_name}</span>
                      </div>
                    </td>

                    {/* Items */}
                    <td style={{ padding: '14px 18px', verticalAlign: 'middle', textAlign: 'center' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '12px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                      }}>
                        {sale.items_count} prod.
                      </span>
                    </td>

                    {/* Total Venta */}
                    <td style={{ padding: '14px 18px', verticalAlign: 'middle', textAlign: 'right', fontWeight: 800, fontSize: '1.05rem', color: '#10b981' }}>
                      {formatCOP(sale.total_cop)}
                    </td>

                    {/* Acciones */}
                    <td style={{ padding: '14px 18px', verticalAlign: 'middle', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          onClick={() => handleViewDetail(sale.id)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
                        >
                          <Eye size={14} />
                          <span>Ver Detalle</span>
                        </button>
                        <button
                          onClick={() => handleOpenInvoice(sale.id)}
                          className="btn btn-sm"
                          style={{
                            padding: '6px 12px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '0.82rem',
                            background: 'rgba(16, 185, 129, 0.15)',
                            border: '1px solid rgba(16, 185, 129, 0.35)',
                            color: '#34d399',
                          }}
                          title="Ver e Imprimir Factura Comercial"
                        >
                          <Printer size={14} />
                          <span>Factura</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Registrar Nueva Venta */}
      {isCreateModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '680px', width: '92%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShoppingCart size={22} color="var(--primary)" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Registrar Nueva Venta</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitSale}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxHeight: '72vh', overflowY: 'auto' }}>
                {/* 1. Selección de Cliente */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      1. Cliente para la Venta *
                    </label>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      Solo clientes activos
                    </span>
                  </div>

                  {/* Búsqueda rápida de clientes */}
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <Search size={15} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      placeholder="Filtrar cliente por nombre, NIT o ciudad..."
                      value={customerSearchTerm}
                      onChange={(e) => setCustomerSearchTerm(e.target.value)}
                      className="input-field"
                      style={{ width: '100%', paddingLeft: '34px', fontSize: '0.84rem' }}
                    />
                    {customerSearchTerm && (
                      <button
                        type="button"
                        onClick={() => setCustomerSearchTerm('')}
                        style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  <select
                    required
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', fontSize: '0.9rem' }}
                  >
                    <option value="">-- Seleccionar cliente existente --</option>
                    {customers
                      .filter((c) => {
                        if (!customerSearchTerm) return true;
                        const term = customerSearchTerm.toLowerCase();
                        return (
                          c.name.toLowerCase().includes(term) ||
                          c.id_number.toLowerCase().includes(term) ||
                          (c.city && c.city.toLowerCase().includes(term))
                        );
                      })
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} (Doc: {c.id_number}{c.city ? ` • ${c.city}` : ''})
                        </option>
                      ))}
                  </select>

                  {selectedCustomerId && (() => {
                    const selCust = customers.find((c) => c.id === selectedCustomerId);
                    if (!selCust) return null;
                    return (
                      <div style={{
                        marginTop: '8px',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(59, 130, 246, 0.1)',
                        border: '1px solid rgba(59, 130, 246, 0.25)',
                        fontSize: '0.78rem',
                        color: '#93c5fd',
                        display: 'flex',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '6px',
                      }}>
                        <span><strong>Cliente:</strong> {selCust.name}</span>
                        <span><strong>Doc:</strong> {selCust.id_number}</span>
                        {selCust.phone && <span><strong>Tel:</strong> {selCust.phone}</span>}
                        {selCust.city && <span><strong>Ciudad:</strong> {selCust.city}</span>}
                      </div>
                    );
                  })()}
                </div>

                {/* 2. Búsqueda y Selección de Productos del Inventario */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      2. Buscar Productos en Inventario
                    </label>
                    <span style={{ fontSize: '0.74rem', color: '#10b981', fontWeight: 600 }}>
                      Descuento automático de stock
                    </span>
                  </div>

                  {/* Buscador de producto */}
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      placeholder="Buscar por nombre, código o categoría (ej. Acetaminofén, AMOX, Analgésicos)..."
                      value={productSearchTerm}
                      onChange={(e) => setProductSearchTerm(e.target.value)}
                      className="input-field"
                      style={{ width: '100%', paddingLeft: '36px', fontSize: '0.86rem' }}
                    />
                    {productSearchTerm && (
                      <button
                        type="button"
                        onClick={() => setProductSearchTerm('')}
                        style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Lista de sugerencias cuando se busca */}
                  {productSearchTerm && (
                    <div style={{
                      maxHeight: '160px',
                      overflowY: 'auto',
                      marginBottom: '10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      background: 'rgba(15, 23, 42, 0.95)',
                      display: 'flex',
                      flexDirection: 'column',
                    }}>
                      {products
                        .filter((p) => {
                          const term = productSearchTerm.toLowerCase();
                          return (
                            p.name.toLowerCase().includes(term) ||
                            p.code.toLowerCase().includes(term) ||
                            p.category.toLowerCase().includes(term)
                          );
                        })
                        .map((p) => (
                          <div
                            key={p.id}
                            onClick={() => {
                              setSelectedProductToAdd(p.id);
                              setQuantityToAdd(1);
                            }}
                            style={{
                              padding: '8px 12px',
                              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              background: selectedProductToAdd === p.id ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                            }}
                          >
                            <div>
                              <strong style={{ fontSize: '0.84rem', color: '#ffffff' }}>{p.name}</strong>
                              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginLeft: '8px' }}>
                                Ref: {p.code} &bull; {p.unit_measure}
                              </span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#10b981' }}>
                                {formatCOP(p.price_cop)}
                              </span>
                              <span style={{ fontSize: '0.72rem', color: '#60a5fa', marginLeft: '8px' }}>
                                Disp: {p.current_stock}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Selector y controles de cantidad */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px auto', gap: '10px', alignItems: 'flex-end' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Producto a agregar:</span>
                      <select
                        value={selectedProductToAdd}
                        onChange={(e) => {
                          setSelectedProductToAdd(e.target.value);
                          setQuantityToAdd(1);
                        }}
                        className="input-field"
                        style={{ width: '100%', marginTop: '4px', fontSize: '0.86rem' }}
                      >
                        <option value="">-- Elige un producto --</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.code}) — {formatCOP(p.price_cop)} [Stock: {p.current_stock}]
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cantidad:</span>
                      <input
                        type="number"
                        min="1"
                        max={
                          selectedProductToAdd
                            ? products.find((p) => p.id === selectedProductToAdd)?.current_stock || 999
                            : 999
                        }
                        value={quantityToAdd}
                        onChange={(e) => setQuantityToAdd(Math.max(1, Number(e.target.value)))}
                        className="input-field"
                        style={{ width: '100%', marginTop: '4px', textAlign: 'center', fontWeight: 700 }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddProductToSale()}
                      disabled={!selectedProductToAdd}
                      className="btn btn-primary btn-sm"
                      style={{ height: '38px', padding: '0 16px', fontWeight: 700 }}
                    >
                      + Agregar
                    </button>
                  </div>

                  {/* Vista previa de subtotal del producto a agregar */}
                  {selectedProductToAdd && (() => {
                    const chosen = products.find((p) => p.id === selectedProductToAdd);
                    if (!chosen) return null;
                    return (
                      <div style={{
                        marginTop: '8px',
                        fontSize: '0.78rem',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}>
                        <span>Stock disponible: <strong>{chosen.current_stock} {chosen.unit_measure}</strong></span>
                        <span>Subtotal de este producto: <strong style={{ color: '#10b981' }}>{formatCOP(chosen.price_cop * quantityToAdd)}</strong></span>
                      </div>
                    );
                  })()}
                </div>

                {/* 3. Detalle de Productos en la Venta */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.86rem', fontWeight: 700 }}>
                      3. Detalle de Productos Agregados ({saleItems.length})
                    </span>
                    {saleItems.length > 0 && (
                      <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                        {saleItems.reduce((s, i) => s + i.quantity, 0)} unidades en total
                      </span>
                    )}
                  </div>

                  {saleItems.length === 0 ? (
                    <div style={{
                      padding: '24px',
                      textAlign: 'center',
                      background: 'rgba(255, 255, 255, 0.02)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px dashed var(--border-subtle)',
                      color: 'var(--text-muted)',
                      fontSize: '0.86rem',
                    }}>
                      Aún no has agregado productos a esta venta. Usa el buscador o el selector superior.
                    </div>
                  ) : (
                    <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {saleItems.map((item, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          <div style={{ flex: 1, minWidth: '160px' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{item.product_name}</div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                              Ref: {item.product_code} &bull; {item.unit_measure} &bull; {formatCOP(item.price_cop)} c/u
                            </div>
                          </div>

                          {/* Control de cantidad */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => updateItemQuantity(idx, item.quantity - 1)}
                              style={{
                                width: '26px',
                                height: '26px',
                                borderRadius: '4px',
                                border: '1px solid var(--border-subtle)',
                                background: 'rgba(255, 255, 255, 0.06)',
                                color: '#ffffff',
                                cursor: 'pointer',
                                fontWeight: 700,
                              }}
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              max={item.current_stock}
                              value={item.quantity}
                              onChange={(e) => updateItemQuantity(idx, Number(e.target.value))}
                              style={{
                                width: '48px',
                                height: '26px',
                                textAlign: 'center',
                                borderRadius: '4px',
                                border: '1px solid var(--border-subtle)',
                                background: 'rgba(0, 0, 0, 0.3)',
                                color: '#60a5fa',
                                fontWeight: 700,
                                fontSize: '0.84rem',
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => updateItemQuantity(idx, item.quantity + 1)}
                              style={{
                                width: '26px',
                                height: '26px',
                                borderRadius: '4px',
                                border: '1px solid var(--border-subtle)',
                                background: 'rgba(59, 130, 246, 0.2)',
                                color: '#60a5fa',
                                cursor: 'pointer',
                                fontWeight: 700,
                              }}
                            >
                              +
                            </button>
                          </div>

                          {/* Subtotal del item */}
                          <div style={{ textAlign: 'right', minWidth: '100px', marginLeft: '12px' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Subtotal:</div>
                            <span style={{ fontWeight: 800, fontSize: '0.98rem', color: '#10b981' }}>
                              {formatCOP(item.quantity * item.price_cop)}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', marginLeft: '8px' }}
                            title="Quitar de la lista"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. Asignación de Vendedor Responsable */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <UserIcon size={16} color="#c084fc" />
                    <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Registrar venta a nombre de:</span>
                  </div>
                  <select
                    value={selectedSellerId}
                    onChange={(e) => setSelectedSellerId(e.target.value)}
                    className="input-field"
                    style={{ padding: '6px 10px', fontSize: '0.82rem', minWidth: '200px' }}
                  >
                    <option value="">Yo mismo (Administrador)</option>
                    {sellersList
                      .filter((s) => s.role_code === 'VENDEDOR')
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.full_name} (Vendedor)
                        </option>
                      ))}
                  </select>
                </div>

                {/* 5. Tarjeta de Liquidación (Subtotal y Total) */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  padding: '16px 20px',
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(15, 23, 42, 0.9) 100%)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Subtotal Productos:</span>
                    <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
                      {formatCOP(calculateSaleTotal())}
                    </strong>
                  </div>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px solid rgba(16, 185, 129, 0.3)',
                    paddingTop: '8px',
                  }}>
                    <span style={{ fontSize: '1.05rem', fontWeight: 800 }}>TOTAL A COBRAR:</span>
                    <span style={{ fontSize: '1.65rem', fontWeight: 800, color: '#10b981' }}>
                      {formatCOP(calculateSaleTotal())}
                    </span>
                  </div>
                </div>

                {/* 6. Observaciones / Notas */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                    Observaciones / Notas de la Operación (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Pedido acordado por teléfono, entrega inmediata..."
                    value={saleNotes}
                    onChange={(e) => setSaleNotes(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', fontSize: '0.86rem' }}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting || saleItems.length === 0}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="spinner" size={18} />
                      <span>Procesando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle size={18} />
                      <span>Confirmar y Guardar Venta</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Detalle de Venta */}
      {selectedSaleDetail && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px', width: '92%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Receipt size={22} color="var(--primary)" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                  Comprobante: {selectedSaleDetail.invoice_number}
                </h3>
              </div>
              <button
                onClick={() => setSelectedSaleDetail(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Información General */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 'var(--radius-md)',
                padding: '14px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                fontSize: '0.86rem',
              }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>CLIENTE</span>
                  <strong>{selectedSaleDetail.customer_name}</strong>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Doc: {selectedSaleDetail.customer_id_number}
                  </div>
                  {selectedSaleDetail.customer_phone && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Tel: {selectedSaleDetail.customer_phone}
                    </div>
                  )}
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>VENDEDOR RESPONSABLE</span>
                  <strong>{selectedSaleDetail.seller_name}</strong>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {formatDate(selectedSaleDetail.created_at)}
                  </div>
                </div>
              </div>

              {/* Tabla de Productos Vendidos */}
              <div>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>
                  Productos Despachados
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedSaleDetail.items?.map((item, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 12px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.86rem',
                      }}
                    >
                      <div>
                        <strong>{item.product_name}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Ref: {item.product_code} &bull; {item.product_unit_measure || 'Unidad'} &bull; {formatCOP(item.unit_price_cop)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ color: '#60a5fa', fontWeight: 700 }}>x {item.quantity}</span>
                        <div style={{ fontWeight: 800, color: '#10b981' }}>{formatCOP(item.total_cop)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total General */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>SUBTOTAL:</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    {formatCOP(selectedSaleDetail.subtotal_cop || selectedSaleDetail.total_cop)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(16, 185, 129, 0.2)', paddingTop: '6px' }}>
                  <span style={{ fontWeight: 800, fontSize: '1rem' }}>VALOR TOTAL:</span>
                  <strong style={{ fontSize: '1.4rem', color: '#10b981' }}>
                    {formatCOP(selectedSaleDetail.total_cop)}
                  </strong>
                </div>
              </div>

              {selectedSaleDetail.notes && (
                <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                  <strong>Observaciones:</strong> {selectedSaleDetail.notes}
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  const sId = selectedSaleDetail.id;
                  setSelectedSaleDetail(null);
                  handleOpenInvoice(sId);
                }}
                className="btn btn-primary"
                style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#059669' }}
              >
                <Printer size={16} />
                <span>Ver Factura Oficial</span>
              </button>
              <button
                onClick={() => setSelectedSaleDetail(null)}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Factura Imprimible MEVACOL */}
      {selectedInvoice && (
        <div className="modal-overlay" style={{ zIndex: 1000, overflowY: 'auto' }}>
          <div style={{ maxWidth: '900px', width: '96%', margin: 'auto' }}>
            <InvoiceDocument
              invoice={selectedInvoice}
              onClose={() => setSelectedInvoice(null)}
              showCloseButton={true}
            />
          </div>
        </div>
      )}
    </div>
  );
};
