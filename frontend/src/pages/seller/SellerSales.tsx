import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Search,
  ShoppingCart,
  Receipt,
  Trash2,
  CheckCircle,
  AlertCircle,
  Package,
  User,
  X,
  RefreshCw,
  Printer,
  Tag,
} from 'lucide-react';
import type { Sale, Customer, Product, SaleStats, Invoice, Discount } from '../../types';
import { api } from '../../services/api';
import { localDb } from '../../db/localDb';
import { InvoiceDocument } from '../../components/invoices/InvoiceDocument';
import { calculateItemDiscount, calculateCartTotals } from '../../utils/discountUtils';

interface SellerSalesProps {
  onBack: () => void;
  initialMode?: 'create' | 'history';
}

export const SellerSales: React.FC<SellerSalesProps> = ({ onBack, initialMode = 'create' }) => {
  const [activeMode, setActiveMode] = useState<'create' | 'history'>(initialMode);
  const [sales, setSales] = useState<Sale[]>([]);
  const [stats, setStats] = useState<SaleStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Datos para creación de venta
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeDiscounts, setActiveDiscounts] = useState<Discount[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [cart, setCart] = useState<Array<{
    product: Product;
    quantity: number;
  }>>([]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedSale, setCompletedSale] = useState<{ sale_id: string; invoice_number: string; invoice_code?: string; total_cop: number; customer_name: string } | null>(null);

  // Detalle de venta en historial
  const [selectedSaleDetail, setSelectedSaleDetail] = useState<Sale | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [salesRes, statsRes, custRes, prodRes] = await Promise.all([
        api.getSales(),
        api.getSalesStats(),
        api.getCustomers({ status: 'active' }),
        api.getProducts({ status: 'active' }),
      ]);
      setSales(salesRes.sales);
      setStats(statsRes.stats);
      setCustomers(custRes.customers);
      if (custRes.customers.length > 0 && !selectedCustomerId) {
        setSelectedCustomerId(custRes.customers[0].id);
      }
      setProducts(prodRes.products.filter((p) => p.current_stock > 0));

      // Cargar descuentos vigentes y almacenar en cache local para modo offline
      try {
        const discRes = await api.getActiveDiscounts();
        if (discRes && discRes.success && discRes.discounts) {
          setActiveDiscounts(discRes.discounts);
          try {
            await localDb.cachedDiscounts.clear();
            await localDb.cachedDiscounts.bulkPut(
              discRes.discounts.map((d) => ({
                id: d.id,
                code: d.code,
                name: d.name,
                description: d.description || null,
                discount_type: d.discount_type,
                value: d.value,
                product_id: d.product_id,
                min_quantity: d.min_quantity,
                start_date: d.start_date,
                end_date: d.end_date,
                is_active: d.is_active ? 1 : 0,
              }))
            );
          } catch (dexErr) {
            console.warn('Error al guardar descuentos en indexedDB:', dexErr);
          }
        }
      } catch (dErr) {
        // Fallback offline
        try {
          const cached = await localDb.cachedDiscounts.where('is_active').equals(1).toArray();
          setActiveDiscounts(
            cached.map((c) => ({
              id: c.id,
              code: c.code,
              name: c.name,
              description: c.description || null,
              discount_type: c.discount_type,
              value: c.value,
              product_id: c.product_id || null,
              min_quantity: c.min_quantity || 1,
              start_date: c.start_date,
              end_date: c.end_date,
              is_active: true,
              created_at: '',
            }))
          );
        } catch {}
      }
    } catch (err: any) {
      console.error('Error al cargar datos de ventas:', err);
      setFeedback({ type: 'error', text: err.message || 'Error al cargar información.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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

  // Carrito de compras
  const addToCart = (product: Product) => {
    const existing = cart.find((item) => item.product.id === product.id);
    if (existing) {
      if (existing.quantity >= product.current_stock) {
        setFeedback({
          type: 'error',
          text: `No puedes superar las ${product.current_stock} unidades disponibles de ${product.name}.`,
        });
        return;
      }
      setCart(cart.map((item) =>
        item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
    setFeedback(null);
  };

  const updateQuantity = (productId: string, newQty: number) => {
    const item = cart.find((i) => i.product.id === productId);
    if (!item) return;

    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    if (newQty > item.product.current_stock) {
      setFeedback({
        type: 'error',
        text: `Stock máximo disponible de ${item.product.name} es ${item.product.current_stock}.`,
      });
      return;
    }

    setCart(cart.map((i) => (i.product.id === productId ? { ...i, quantity: newQty } : i)));
    setFeedback(null);
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.product.id !== productId));
  };

  const cartTotals = calculateCartTotals(
    cart.map((item) => ({
      product_id: item.product.id,
      price_cop: item.product.price_cop,
      quantity: item.quantity,
    })),
    activeDiscounts
  );
  const cartTotal = cartTotals.total_cop;

  const handleCreateSale = async () => {
    const customerIdToUse = selectedCustomerId || (customers.length > 0 ? customers[0].id : '');

    if (!customerIdToUse) {
      setFeedback({ type: 'error', text: 'Por favor selecciona un cliente para la venta.' });
      return;
    }

    if (cart.length === 0) {
      setFeedback({ type: 'error', text: 'Agrega al menos un producto al pedido.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const customer = customers.find((c) => c.id === customerIdToUse);
      const res = await api.createSale({
        customer_id: customerIdToUse,
        items: cart.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
        })),
        notes: notes.trim() || undefined,
      });

      setCompletedSale({
        sale_id: res.sale_id,
        invoice_number: res.invoice_number,
        invoice_code: res.invoice_code,
        total_cop: cartTotals.total_cop,
        customer_name: customer ? customer.name : 'Cliente',
      });

      // Limpiar formulario y recargar datos
      setCart([]);
      setSelectedCustomerId(customers.length > 0 ? customers[0].id : '');
      setNotes('');
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Error al procesar la venta.' });
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
      setFeedback({ type: 'error', text: err.message || 'Error al obtener detalle.' });
    }
  };

  // Ver Factura Asociada
  const handleOpenInvoice = async (saleId: string) => {
    try {
      const res = await api.getInvoiceBySaleId(saleId);
      setSelectedInvoice(res.invoice);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'No se encontró la factura comercial.' });
    }
  };

  // Filtrado de productos en catálogo de venta
  const filteredProducts = products.filter((p) => {
    if (!productSearch) return true;
    const term = productSearch.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      p.code.toLowerCase().includes(term) ||
      p.category.toLowerCase().includes(term)
    );
  });

  return (
    <div className="mobile-app-shell">
      {/* Top Mobile Bar */}
      <header className="mobile-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={onBack}
            className="btn btn-secondary btn-sm"
            style={{ padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Volver"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff' }}>
              Operaciones de Venta
            </div>
            <div style={{ fontSize: '0.72rem', color: '#60a5fa', fontWeight: 600 }}>
              {activeMode === 'create' ? 'Nueva Venta en Campo' : 'Historial de Mis Ventas'}
            </div>
          </div>
        </div>

        {/* Selector de Modo */}
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(255, 255, 255, 0.08)', padding: '3px', borderRadius: '16px' }}>
          <button
            onClick={() => setActiveMode('create')}
            style={{
              border: 'none',
              padding: '4px 10px',
              borderRadius: '14px',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: activeMode === 'create' ? 'var(--primary)' : 'transparent',
              color: '#ffffff',
            }}
          >
            Nueva
          </button>
          <button
            onClick={() => setActiveMode('history')}
            style={{
              border: 'none',
              padding: '4px 10px',
              borderRadius: '14px',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: activeMode === 'history' ? 'var(--primary)' : 'transparent',
              color: '#ffffff',
            }}
          >
            Historial ({sales.length})
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="mobile-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '90px' }}>
        {/* Notificación de feedback */}
        {feedback && (
          <div
            className="glass-card"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              borderLeft: feedback.type === 'success' ? '4px solid #10b981' : '4px solid #ef4444',
              background: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem' }}>
              {feedback.type === 'success' ? (
                <CheckCircle size={18} color="#10b981" />
              ) : (
                <AlertCircle size={18} color="#ef4444" />
              )}
              <span>{feedback.text}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* VISTA 1: CREAR NUEVA VENTA */}
        {activeMode === 'create' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Paso 1: Selección de Cliente */}
            <div className="glass-card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <User size={18} color="#60a5fa" />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  1. Cliente para la Venta *
                </span>
              </div>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="input-field"
                style={{ width: '100%', fontSize: '0.92rem' }}
              >
                <option value="">-- Seleccionar cliente --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} &bull; Doc: {c.id_number} {c.city ? `(${c.city})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Paso 2: Agregar Productos */}
            <div className="glass-card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Package size={18} color="#60a5fa" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    2. Productos Disponibles
                  </span>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>
                  Descuento automático de stock
                </span>
              </div>

              {/* Buscador de productos */}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Buscar producto por nombre o código..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', paddingLeft: '36px', fontSize: '0.85rem', borderRadius: 'var(--radius-md)' }}
                />
                {productSearch && (
                  <button
                    onClick={() => setProductSearch('')}
                    style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Lista compacta de productos para agregar */}
              <div style={{ maxHeight: '210px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredProducts.map((p) => {
                  const inCartItem = cart.find((item) => item.product.id === p.id);
                  const isLow = p.current_stock <= p.min_stock;

                  return (
                    <div
                      key={p.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid var(--border-subtle)',
                        gap: '10px',
                      }}
                    >
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={p.name}
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '6px',
                            objectFit: 'cover',
                            border: '1px solid var(--border-subtle)',
                            background: 'rgba(255, 255, 255, 0.05)',
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '6px',
                            background: 'rgba(59, 130, 246, 0.1)',
                            border: '1px dashed rgba(59, 130, 246, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#60a5fa',
                            flexShrink: 0,
                          }}
                        >
                          <Package size={18} opacity={0.6} />
                        </div>
                      )}

                      <div style={{ flex: 1, minWidth: 0 }}>
                        {(() => {
                          const discInfo = calculateItemDiscount(p.id, p.price_cop, activeDiscounts);
                          return (
                            <>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {p.name}
                                </span>
                                {discInfo.badge_text && (
                                  <span
                                    style={{
                                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                      color: '#ffffff',
                                      fontSize: '0.68rem',
                                      fontWeight: 800,
                                      padding: '1px 6px',
                                      borderRadius: '4px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '2px',
                                      flexShrink: 0,
                                    }}
                                  >
                                    <Tag size={10} />
                                    {discInfo.badge_text}
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                                {p.unit_measure} &bull;{' '}
                                {discInfo.discount ? (
                                  <>
                                    <span style={{ textDecoration: 'line-through', opacity: 0.65, marginRight: '4px' }}>
                                      {formatCOP(p.price_cop)}
                                    </span>
                                    <strong style={{ color: '#10b981' }}>{formatCOP(discInfo.final_price_cop)}</strong>
                                  </>
                                ) : (
                                  <strong style={{ color: '#10b981' }}>{formatCOP(p.price_cop)}</strong>
                                )}{' '}
                                &bull; <span style={{ color: isLow ? '#fbbf24' : '#60a5fa' }}>Disp: {p.current_stock}</span>
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      <button
                        onClick={() => addToCart(p)}
                        className="btn btn-primary btn-sm"
                        style={{
                          padding: '6px 12px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          borderRadius: 'var(--radius-sm)',
                          flexShrink: 0,
                        }}
                      >
                        {inCartItem ? `+ (${inCartItem.quantity})` : '+ Agregar'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Paso 3: Carrito y Resumen de la Venta */}
            <div className="glass-card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShoppingCart size={18} color="#60a5fa" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    3. Resumen del Pedido ({cart.length} productos)
                  </span>
                </div>
                {cart.length > 0 && (
                  <button
                    onClick={() => setCart([])}
                    style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer' }}
                  >
                    Vaciar lista
                  </button>
                )}
              </div>

              {cart.length === 0 ? (
                <div style={{
                  padding: '24px',
                  textAlign: 'center',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px dashed var(--border-subtle)',
                  color: 'var(--text-muted)',
                  fontSize: '0.85rem',
                }}>
                  Selecciona productos de la lista superior para armar el pedido.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {cart.map((item) => (
                    <div
                      key={item.product.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid var(--border-subtle)',
                        gap: '10px',
                      }}
                    >
                      {item.product.image_url ? (
                        <img
                          src={item.product.image_url}
                          alt={item.product.name}
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '6px',
                            objectFit: 'cover',
                            border: '1px solid var(--border-subtle)',
                            background: 'rgba(255, 255, 255, 0.05)',
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '6px',
                            background: 'rgba(59, 130, 246, 0.1)',
                            border: '1px dashed rgba(59, 130, 246, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#60a5fa',
                            flexShrink: 0,
                          }}
                        >
                          <Package size={16} opacity={0.6} />
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.product.name}</div>
                        {(() => {
                          const disc = calculateItemDiscount(item.product.id, item.product.price_cop, activeDiscounts);
                          const itemTotalCop = disc.final_price_cop * item.quantity;
                          return (
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                              {disc.discount ? (
                                <>
                                  <span style={{ textDecoration: 'line-through', opacity: 0.65, marginRight: '4px' }}>
                                    {formatCOP(item.product.price_cop)}
                                  </span>
                                  <strong style={{ color: '#10b981' }}>{formatCOP(disc.final_price_cop)}</strong>
                                  <span style={{ color: '#10b981', marginLeft: '4px', fontWeight: 600 }}>({disc.badge_text})</span>
                                </>
                              ) : (
                                <span>{formatCOP(item.product.price_cop)} c/u</span>
                              )}
                              {' '}&bull; Subtotal:{' '}
                              <strong style={{ color: '#10b981' }}>{formatCOP(itemTotalCop)}</strong>
                            </div>
                          );
                        })()}
                      </div>

                        {/* Controles de Cantidad */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '6px',
                              border: '1px solid var(--border-subtle)',
                              background: 'rgba(255, 255, 255, 0.08)',
                              color: '#ffffff',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            max={item.product.current_stock}
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.product.id, Number(e.target.value))}
                            style={{
                              width: '44px',
                              height: '28px',
                              textAlign: 'center',
                              borderRadius: '6px',
                              border: '1px solid var(--border-subtle)',
                              background: 'rgba(0, 0, 0, 0.3)',
                              color: '#60a5fa',
                              fontWeight: 800,
                              fontSize: '0.92rem',
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '6px',
                              border: '1px solid var(--border-subtle)',
                              background: 'rgba(59, 130, 246, 0.2)',
                              color: '#60a5fa',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.product.id)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', padding: '4px', cursor: 'pointer' }}
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Notas opcionales */}
                    <div style={{ marginTop: '6px' }}>
                      <input
                        type="text"
                        placeholder="Observaciones de venta (opcional)..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="input-field"
                        style={{ width: '100%', fontSize: '0.84rem' }}
                      />
                    </div>

                    {/* Subtotal y Total de Venta */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      padding: '14px 16px',
                      borderRadius: 'var(--radius-md)',
                      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(15, 23, 42, 0.9) 100%)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      marginTop: '6px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Subtotal:</span>
                        <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
                          {formatCOP(cartTotals.subtotal_cop)}
                        </strong>
                      </div>
                      {cartTotals.has_discounts && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem', color: '#10b981' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Tag size={13} /> Descuentos promocionales:
                          </span>
                          <strong style={{ fontSize: '1rem' }}>
                            -{formatCOP(cartTotals.total_discount_cop)}
                          </strong>
                        </div>
                      )}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderTop: '1px solid rgba(16, 185, 129, 0.25)',
                        paddingTop: '6px',
                      }}>
                        <span style={{ fontSize: '0.95rem', fontWeight: 800 }}>TOTAL VENTA:</span>
                        <strong style={{ fontSize: '1.5rem', color: '#10b981', fontWeight: 800 }}>
                          {formatCOP(cartTotals.total_cop)}
                        </strong>
                      </div>
                    </div>

                  {/* Botón de Confirmación */}
                  <button
                    onClick={handleCreateSale}
                    disabled={isSubmitting || cart.length === 0}
                    className="btn btn-primary"
                    style={{
                      width: '100%',
                      padding: '14px',
                      fontSize: '1rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      borderRadius: 'var(--radius-md)',
                      cursor: isSubmitting || cart.length === 0 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="spinner" size={20} />
                        <span>Guardando Venta...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle size={20} />
                        <span>Confirmar Venta ({formatCOP(cartTotal)})</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* VISTA 2: HISTORIAL DE MIS VENTAS */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Banner de Ventas del Vendedor */}
            <div className="glass-card" style={{
              background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.4) 0%, rgba(15, 23, 42, 0.9) 100%)',
              borderColor: 'rgba(59, 130, 246, 0.3)',
              padding: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#93c5fd', fontWeight: 600 }}>TUS VENTAS DE HOY</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>
                  {formatCOP(stats?.today_sales_cop || 0)}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {stats?.today_sales_count || 0} ventas realizadas hoy
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TOTAL HISTÓRICO</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#34d399' }}>
                  {formatCOP(stats?.total_revenue_cop || 0)}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {stats?.total_sales || 0} ventas totales
                </div>
              </div>
            </div>

            {/* Lista de Ventas */}
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                <RefreshCw className="spinner" size={24} style={{ margin: '0 auto 8px' }} />
                <div>Cargando historial de ventas...</div>
              </div>
            ) : sales.length === 0 ? (
              <div className="glass-card" style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-muted)' }}>
                <Receipt size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <div style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                  Aún no has registrado ninguna venta
                </div>
                <button
                  onClick={() => setActiveMode('create')}
                  className="btn btn-primary btn-sm"
                  style={{ marginTop: '12px' }}
                >
                  Registrar Primera Venta
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {sales.map((sale) => (
                  <div
                    key={sale.id}
                    className="mobile-touch-card"
                    onClick={() => handleViewDetail(sale.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      padding: '14px 16px',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          fontFamily: 'monospace',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: 'rgba(59, 130, 246, 0.15)',
                          color: '#60a5fa',
                        }}>
                          {sale.invoice_number}
                        </span>
                        {sale.invoice_code && (
                          <span style={{
                            fontFamily: 'monospace',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#34d399',
                          }}>
                            {sale.invoice_code}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        {formatDate(sale.created_at)}
                      </span>
                    </div>

                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.98rem', color: '#ffffff' }}>
                        {sale.customer_name}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                        Doc: {sale.customer_id_number} {sale.customer_city ? `&bull; ${sale.customer_city}` : ''}
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                      paddingTop: '8px',
                    }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {sale.items_count} productos
                      </span>
                      <strong style={{ fontSize: '1.2rem', color: '#10b981', fontWeight: 800 }}>
                        {formatCOP(sale.total_cop)}
                      </strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL: Comprobante de Venta Exitosa */}
      {completedSale && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px', width: '92%', textAlign: 'center' }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.2)',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px',
            }}>
              <CheckCircle size={36} />
            </div>

            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff', marginBottom: '4px' }}>
              ¡Venta Registrada!
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              El inventario se ha descontado automáticamente en el almacén.
            </p>

            <div style={{
              background: 'rgba(255, 255, 255, 0.04)',
              borderRadius: 'var(--radius-md)',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              fontSize: '0.88rem',
              textAlign: 'left',
              marginBottom: '16px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>N° Venta:</span>
                <strong style={{ color: '#60a5fa', fontFamily: 'monospace' }}>{completedSale.invoice_number}</strong>
              </div>
              {completedSale.invoice_code && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Factura Emitida:</span>
                  <strong style={{ color: '#34d399', fontFamily: 'monospace' }}>{completedSale.invoice_code}</strong>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Cliente:</span>
                <strong>{completedSale.customer_name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Total Cobrado:</span>
                <strong style={{ color: '#10b981', fontSize: '1.05rem' }}>{formatCOP(completedSale.total_cop)}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={() => {
                  const sId = completedSale.sale_id;
                  setCompletedSale(null);
                  handleOpenInvoice(sId);
                }}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                }}
              >
                <Printer size={18} />
                <span>Ver Factura Comercial</span>
              </button>
              <button
                onClick={() => {
                  setCompletedSale(null);
                  setActiveMode('create');
                }}
                className="btn btn-secondary"
                style={{ width: '100%', fontWeight: 600 }}
              >
                Hacer Otra Venta
              </button>
              <button
                onClick={() => {
                  setCompletedSale(null);
                  setActiveMode('history');
                }}
                className="btn btn-secondary"
                style={{ width: '100%' }}
              >
                Ver Mis Ventas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Detalle de Venta para Vendedor */}
      {selectedSaleDetail && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px', width: '92%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Receipt size={20} color="var(--primary)" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                  Detalle: {selectedSaleDetail.invoice_number}
                </h3>
              </div>
              <button
                onClick={() => setSelectedSaleDetail(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.84rem',
              }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>CLIENTE</div>
                <strong style={{ fontSize: '0.95rem' }}>{selectedSaleDetail.customer_name}</strong>
                <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Doc: {selectedSaleDetail.customer_id_number} {selectedSaleDetail.customer_phone ? `&bull; Tel: ${selectedSaleDetail.customer_phone}` : ''}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Fecha: {formatDate(selectedSaleDetail.created_at)}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>
                  Productos Vendidos
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {selectedSaleDetail.items?.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 10px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.84rem',
                      }}
                    >
                      <div>
                        <strong>{item.product_name}</strong>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {item.product_unit_measure || 'Unidad'} &bull; {formatCOP(item.unit_price_cop)}
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

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.84rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>SUBTOTAL:</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    {formatCOP(selectedSaleDetail.subtotal_cop || selectedSaleDetail.total_cop)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(16, 185, 129, 0.25)', paddingTop: '6px' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.92rem' }}>TOTAL COBRADO:</span>
                  <strong style={{ fontSize: '1.35rem', color: '#10b981' }}>
                    {formatCOP(selectedSaleDetail.total_cop)}
                  </strong>
                </div>
              </div>

              {selectedSaleDetail.notes && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <strong>Notas:</strong> {selectedSaleDetail.notes}
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
                style={{
                  flex: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  background: '#059669',
                }}
              >
                <Printer size={16} />
                <span>Factura</span>
              </button>
              <button
                onClick={() => setSelectedSaleDetail(null)}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Factura Comercial Imprimible */}
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
