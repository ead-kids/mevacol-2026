import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Search,
  Package,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  X,
  RefreshCw,
} from 'lucide-react';
import type { Product } from '../../types';
import { api } from '../../services/api';

interface SellerProductsProps {
  onBack: () => void;
}

export const SellerProducts: React.FC<SellerProductsProps> = ({ onBack }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [selectedStockLevel, setSelectedStockLevel] = useState<'all' | 'available' | 'low' | 'out'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const categories = [
    'Todas',
    'Analgésicos',
    'Antibióticos',
    'Antiinflamatorios',
    'Antihistamínicos',
    'Gastrointestinales',
    'Material Médico',
    'Hidratación',
    'Vitaminas & Suplementos',
  ];

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      let stockLevelParam: string | undefined = undefined;
      if (selectedStockLevel === 'low') stockLevelParam = 'low_stock';
      if (selectedStockLevel === 'out') stockLevelParam = 'out_of_stock';
      if (selectedStockLevel === 'available') stockLevelParam = 'normal';

      const res = await api.getProducts({
        search: searchTerm || undefined,
        category: selectedCategory !== 'Todas' ? selectedCategory : undefined,
        stock_level: stockLevelParam,
      });
      setProducts(res.products);
    } catch (err) {
      console.error('Error al cargar catálogo de productos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm, selectedCategory, selectedStockLevel]);

  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(val);
  };

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
              Catálogo & Precios
            </div>
            <div style={{ fontSize: '0.72rem', color: '#60a5fa', fontWeight: 600 }}>
              {products.length} productos disponibles
            </div>
          </div>
        </div>

        <div style={{
          background: 'rgba(59, 130, 246, 0.15)',
          padding: '4px 10px',
          borderRadius: '12px',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          fontSize: '0.75rem',
          color: '#93c5fd',
          fontWeight: 600,
        }}>
          Solo Consulta
        </div>
      </header>

      {/* Main Body */}
      <main className="mobile-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '90px' }}>
        {/* Banner Informativo para el Vendedor */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.3) 0%, rgba(15, 23, 42, 0.7) 100%)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <Info size={20} color="#60a5fa" style={{ flexShrink: 0 }} />
          <p style={{ fontSize: '0.78rem', color: '#bfdbfe', margin: 0, lineHeight: '1.35' }}>
            Precios vigentes para cotización en campo. El inventario se actualiza automáticamente con cada ingreso y venta.
          </p>
        </div>

        {/* Buscador Rápido */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Buscar por nombre, código o presentación..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field"
            style={{
              width: '100%',
              paddingLeft: '42px',
              paddingRight: searchTerm ? '38px' : '14px',
              borderRadius: 'var(--radius-lg)',
              fontSize: '0.92rem',
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

        {/* Chips de Filtro por Disponibilidad */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
          <button
            onClick={() => setSelectedStockLevel('all')}
            style={{
              padding: '6px 12px',
              borderRadius: '20px',
              border: selectedStockLevel === 'all' ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
              background: selectedStockLevel === 'all' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
              color: '#ffffff',
              fontSize: '0.78rem',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
            }}
          >
            Todos
          </button>
          <button
            onClick={() => setSelectedStockLevel('available')}
            style={{
              padding: '6px 12px',
              borderRadius: '20px',
              border: selectedStockLevel === 'available' ? '1px solid #10b981' : '1px solid var(--border-subtle)',
              background: selectedStockLevel === 'available' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.05)',
              color: '#34d399',
              fontSize: '0.78rem',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
            }}
          >
            En Existencia
          </button>
          <button
            onClick={() => setSelectedStockLevel('low')}
            style={{
              padding: '6px 12px',
              borderRadius: '20px',
              border: selectedStockLevel === 'low' ? '1px solid #f59e0b' : '1px solid var(--border-subtle)',
              background: selectedStockLevel === 'low' ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255, 255, 255, 0.05)',
              color: '#fbbf24',
              fontSize: '0.78rem',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
            }}
          >
            Stock Bajo
          </button>
          <button
            onClick={() => setSelectedStockLevel('out')}
            style={{
              padding: '6px 12px',
              borderRadius: '20px',
              border: selectedStockLevel === 'out' ? '1px solid #ef4444' : '1px solid var(--border-subtle)',
              background: selectedStockLevel === 'out' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.05)',
              color: '#f87171',
              fontSize: '0.78rem',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
            }}
          >
            Agotados
          </button>
        </div>

        {/* Chips de Filtro por Categoría */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '5px 12px',
                borderRadius: '16px',
                border: selectedCategory === cat ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.08)',
                background: selectedCategory === cat ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                color: selectedCategory === cat ? '#93c5fd' : 'var(--text-secondary)',
                fontSize: '0.75rem',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Lista de Tarjetas de Producto */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <RefreshCw className="spinner" size={24} style={{ margin: '0 auto 8px' }} />
            <div style={{ fontSize: '0.88rem' }}>Actualizando precios y existencias...</div>
          </div>
        ) : products.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-muted)' }}>
            <Package size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <div style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              No hay productos con los filtros seleccionados
            </div>
            <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>
              Prueba con otro término de búsqueda o selecciona 'Todas' las categorías.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {products.map((product) => {
              const isOutOfStock = product.current_stock === 0;
              const isLowStock = product.current_stock <= product.min_stock && !isOutOfStock;

              return (
                <div
                  key={product.id}
                  className="mobile-touch-card"
                  onClick={() => setSelectedProduct(product)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '14px 16px',
                    gap: '10px',
                    cursor: 'pointer',
                  }}
                >
                  {/* Fila Superior: Código, Categoría y Estado de Disponibilidad */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: 'rgba(59, 130, 246, 0.15)',
                        color: '#60a5fa',
                      }}>
                        {product.code}
                      </span>
                      <span style={{
                        fontSize: '0.72rem',
                        color: 'var(--text-muted)',
                      }}>
                        &bull; {product.category}
                      </span>
                    </div>

                    {/* Insignia de Disponibilidad */}
                    {isOutOfStock ? (
                      <span style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: '#ef4444',
                        background: 'rgba(239, 68, 68, 0.15)',
                        padding: '3px 8px',
                        borderRadius: '12px',
                      }}>
                        <XCircle size={12} /> Agotado
                      </span>
                    ) : isLowStock ? (
                      <span style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: '#fbbf24',
                        background: 'rgba(245, 158, 11, 0.15)',
                        padding: '3px 8px',
                        borderRadius: '12px',
                      }}>
                        <AlertTriangle size={12} /> Stock Bajo ({product.current_stock})
                      </span>
                    ) : (
                      <span style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: '#10b981',
                        background: 'rgba(16, 185, 129, 0.15)',
                        padding: '3px 8px',
                        borderRadius: '12px',
                      }}>
                        <CheckCircle size={12} /> {product.current_stock} disp.
                      </span>
                    )}
                  </div>

                  {/* Fila Central: Nombre y Descripción */}
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {product.name}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {product.unit_measure} {product.description ? `— ${product.description}` : ''}
                    </div>
                  </div>

                  {/* Fila Inferior: Precio en COP Destacado */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                    paddingTop: '8px',
                  }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PRECIO DE VENTA</span>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981' }}>
                      {formatCOP(product.price_cop)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal de Detalle de Producto para el Vendedor (Solo Consulta) */}
      {selectedProduct && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '420px', width: '92%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={22} color="var(--primary)" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Ficha del Producto</h3>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <span style={{
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: 'rgba(59, 130, 246, 0.15)',
                  color: '#60a5fa',
                }}>
                  {selectedProduct.code}
                </span>
                <h4 style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '8px', color: '#ffffff' }}>
                  {selectedProduct.name}
                </h4>
              </div>

              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontSize: '0.88rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Categoría:</span>
                  <span style={{ fontWeight: 600 }}>{selectedProduct.category}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Presentación:</span>
                  <span style={{ fontWeight: 600 }}>{selectedProduct.unit_measure}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Disponibilidad:</span>
                  <span style={{
                    fontWeight: 700,
                    color: selectedProduct.current_stock === 0
                      ? '#ef4444'
                      : selectedProduct.current_stock <= selectedProduct.min_stock
                      ? '#fbbf24'
                      : '#10b981',
                  }}>
                    {selectedProduct.current_stock === 0
                      ? 'Agotado'
                      : `${selectedProduct.current_stock} unidades disponibles`}
                  </span>
                </div>
                {selectedProduct.description && (
                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '8px', marginTop: '2px' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginBottom: '2px' }}>Indicaciones:</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>{selectedProduct.description}</div>
                  </div>
                )}
              </div>

              <div style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '0.75rem', color: '#6ee7b7', fontWeight: 700, textTransform: 'uppercase' }}>
                  Precio al Cliente (COP)
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>
                  {formatCOP(selectedProduct.price_cop)}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                onClick={() => setSelectedProduct(null)}
                className="btn btn-primary"
                style={{ width: '100%' }}
              >
                Cerrar Ficha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
