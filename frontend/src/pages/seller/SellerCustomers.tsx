import React, { useState, useEffect } from 'react';
import {
  Search,
  UserPlus,
  ArrowLeft,
  Phone,
  MapPin,
  Edit2,
  X,
  CheckCircle,
  AlertCircle,
  Users,
} from 'lucide-react';
import type { Customer } from '../../types';
import { api } from '../../services/api';

interface SellerCustomersProps {
  onBack: () => void;
}

export const SellerCustomers: React.FC<SellerCustomersProps> = ({ onBack }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    id_number: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    notes: '',
  });

  const [editFormData, setEditFormData] = useState({
    name: '',
    id_number: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    notes: '',
  });

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      // El vendedor consulta por defecto clientes activos
      const res = await api.getCustomers({
        search: searchTerm || undefined,
        status: 'active',
      });
      setCustomers(res.customers);
    } catch (err: any) {
      console.error('Error al cargar clientes:', err);
      setFeedback({ type: 'error', text: err.message || 'Error al obtener clientes.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 200);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!formData.name.trim() || !formData.id_number.trim()) {
      setFeedback({ type: 'error', text: 'Nombre y documento son obligatorios.' });
      return;
    }

    try {
      const res = await api.createCustomer(formData);
      setFeedback({ type: 'success', text: res.message });
      setIsCreateModalOpen(false);
      setFormData({
        name: '',
        id_number: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        notes: '',
      });
      await fetchCustomers();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Error al crear cliente.' });
    }
  };

  const openEditModal = (c: Customer) => {
    setSelectedCustomer(c);
    setEditFormData({
      name: c.name,
      id_number: c.id_number,
      phone: c.phone || '',
      email: c.email || '',
      address: c.address || '',
      city: c.city || '',
      notes: c.notes || '',
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setFeedback(null);

    try {
      const res = await api.updateCustomer(selectedCustomer.id, editFormData);
      setFeedback({ type: 'success', text: res.message });
      setIsEditModalOpen(false);
      await fetchCustomers();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Error al actualizar cliente.' });
    }
  };

  return (
    <div className="mobile-app-shell">
      {/* Top Mobile Bar con Botón Regresar y Acción */}
      <header className="mobile-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={onBack}
            className="btn btn-secondary btn-sm"
            style={{ padding: '8px' }}
            title="Regresar al Inicio"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff' }}>
              Mis Clientes
            </div>
            <div style={{ fontSize: '0.7rem', color: '#60a5fa', fontWeight: 600 }}>
              {customers.length} Registrados
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="btn btn-primary btn-sm"
          style={{ padding: '8px 12px' }}
        >
          <UserPlus size={16} />
          <span>Nuevo</span>
        </button>
      </header>

      {/* Cuerpo Móvil */}
      <main className="mobile-body">
        {/* Banner de Feedback */}
        {feedback && (
          <div style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            background: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${feedback.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            color: feedback.type === 'success' ? '#34d399' : '#f87171',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.85rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {feedback.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              <span>{feedback.text}</span>
            </div>
            <button onClick={() => setFeedback(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* Buscador Rápido Táctil */}
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Buscar por nombre, cédula o ciudad..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '38px', borderRadius: 'var(--radius-lg)' }}
          />
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
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
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Lista de Tarjetas de Clientes para Móvil */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {customers.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-muted)' }}>
              <Users size={36} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                {isLoading ? 'Buscando clientes...' : 'No se encontraron clientes'}
              </div>
              <p style={{ fontSize: '0.82rem', marginTop: '6px' }}>
                Puedes registrar un nuevo cliente haciendo clic en el botón <strong>Nuevo</strong>.
              </p>
            </div>
          ) : (
            customers.map((c) => (
              <div
                key={c.id}
                className="glass-card"
                style={{
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  background: 'rgba(30, 41, 59, 0.65)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {c.name}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#93c5fd', fontFamily: 'var(--font-mono)' }}>
                      Doc: {c.id_number}
                    </div>
                  </div>

                  <button
                    onClick={() => openEditModal(c)}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '6px 10px' }}
                    title="Editar Cliente"
                  >
                    <Edit2 size={14} />
                    <span>Editar</span>
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6px', fontSize: '0.84rem' }}>
                  {c.phone && (
                    <a
                      href={`tel:${c.phone}`}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#60a5fa', textDecoration: 'none' }}
                    >
                      <Phone size={14} />
                      <span>{c.phone} (Llamar)</span>
                    </a>
                  )}

                  {c.address && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                      <MapPin size={14} color="#f59e0b" style={{ flexShrink: 0 }} />
                      <span>{c.address} {c.city ? `(${c.city})` : ''}</span>
                    </div>
                  )}

                  {c.notes && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '4px' }}>
                      Nota: {c.notes}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Modal: Crear Cliente en Campo (Móvil) */}
      {isCreateModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem' }}>Registrar Cliente</h3>
              <button onClick={() => setIsCreateModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Nombre o Negocio *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej. Farmacia La Esperanza"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Cédula o NIT *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej. 1020304050"
                    value={formData.id_number}
                    onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Teléfono</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="Ej. 3001234567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Dirección</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej. Calle 10 # 20-30"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Ciudad</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej. Medellín"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Notas u Observaciones</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    placeholder="Instrucciones comerciales o de entrega"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Cliente (Móvil) */}
      {isEditModalOpen && selectedCustomer && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem' }}>Editar: {selectedCustomer.name}</h3>
              <button onClick={() => setIsEditModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateCustomer}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Nombre o Negocio *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Cédula o NIT *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editFormData.id_number}
                    onChange={(e) => setEditFormData({ ...editFormData, id_number: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Teléfono</label>
                  <input
                    type="tel"
                    className="form-input"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Dirección</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editFormData.address}
                    onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Ciudad</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editFormData.city}
                    onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Notas</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    value={editFormData.notes}
                    onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Actualizar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
