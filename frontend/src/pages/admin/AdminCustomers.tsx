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
  MapPin,
  Building,
} from 'lucide-react';
import type { Customer } from '../../types';
import { api } from '../../services/api';

export const AdminCustomers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Formularios
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
      const res = await api.getCustomers({
        search: searchTerm || undefined,
        status: statusFilter,
      });
      setCustomers(res.customers);
    } catch (err: any) {
      console.error('Error al cargar clientes:', err);
      setFeedback({ type: 'error', text: err.message || 'Error al cargar clientes.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm, statusFilter]);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!formData.name.trim() || !formData.id_number.trim()) {
      setFeedback({ type: 'error', text: 'El nombre y el número de documento son obligatorios.' });
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

  const handleToggleStatus = async (c: Customer) => {
    try {
      const newStatus = c.is_active === 1 ? false : true;
      const res = await api.toggleCustomerStatus(c.id, newStatus);
      setFeedback({ type: 'success', text: res.message });
      await fetchCustomers();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Error al modificar estado.' });
    }
  };

  const activeCount = customers.filter((c) => c.is_active === 1).length;
  const inactiveCount = customers.filter((c) => c.is_active === 0).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Encabezado y Acción Principal */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-success">Fase 2 Activa</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Módulo Comercial</span>
          </div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>Directorio de Clientes MEVACOL</h2>
          <p style={{ fontSize: '0.9rem' }}>
            Administración centralizada de clientes, información de contacto, direcciones y estado de cuenta.
          </p>
        </div>

        <button onClick={() => setIsCreateModalOpen(true)} className="btn btn-primary">
          <UserPlus size={18} />
          <span>Crear Nuevo Cliente</span>
        </button>
      </div>

      {/* Alerta / Mensaje de feedback */}
      {feedback && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          background: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          border: `1px solid ${feedback.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          color: feedback.type === 'success' ? '#34d399' : '#f87171',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {feedback.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Tarjetas KPI de Resumen de Clientes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="glass-card" style={{ padding: '18px' }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL CLIENTES</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
            {customers.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Registrados en el sistema</div>
        </div>

        <div className="glass-card" style={{ padding: '18px' }}>
          <div style={{ fontSize: '0.82rem', color: '#34d399', fontWeight: 600 }}>CLIENTES ACTIVOS</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#34d399', marginTop: '4px' }}>
            {activeCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Habilitados para compras</div>
        </div>

        <div className="glass-card" style={{ padding: '18px' }}>
          <div style={{ fontSize: '0.82rem', color: '#f87171', fontWeight: 600 }}>CLIENTES INACTIVOS</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f87171', marginTop: '4px' }}>
            {inactiveCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Suspendidos o en pausa</div>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Buscar por nombre, documento (Cédula/NIT), teléfono, correo o ciudad..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '38px' }}
          />
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '180px' }}>
          <Filter size={18} color="var(--text-muted)" />
          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="all">Todos los Estados</option>
            <option value="active">Solo Activos</option>
            <option value="inactive">Solo Inactivos</option>
          </select>
        </div>
      </div>

      {/* Tabla de Clientes */}
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Documento</th>
              <th>Nombre del Cliente</th>
              <th>Contacto</th>
              <th>Ubicación</th>
              <th>Estado</th>
              <th>Registrado Por</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  {isLoading ? 'Cargando clientes...' : 'No se encontraron clientes con los criterios especificados.'}
                </td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr key={c.id}>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {c.id_number}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</div>
                    {c.notes && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        Nota: {c.notes}
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                      <Phone size={13} color="#60a5fa" />
                      <span>{c.phone || 'Sin teléfono'}</span>
                    </div>
                    {c.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <Mail size={12} />
                        <span>{c.email}</span>
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                      <MapPin size={13} color="#f59e0b" />
                      <span>{c.address || 'Sin dirección'}</span>
                    </div>
                    {c.city && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <Building size={12} />
                        <span>{c.city}</span>
                      </div>
                    )}
                  </td>
                  <td>
                    {c.is_active === 1 ? (
                      <span className="badge badge-success">Activo</span>
                    ) : (
                      <span className="badge badge-danger">Inactivo</span>
                    )}
                  </td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {c.created_by_name || 'Sistema'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '8px' }}>
                      <button
                        onClick={() => openEditModal(c)}
                        className="btn btn-secondary btn-sm"
                        title="Editar Información"
                        style={{ padding: '6px 10px' }}
                      >
                        <Edit2 size={14} />
                      </button>

                      <button
                        onClick={() => handleToggleStatus(c)}
                        className={`btn btn-sm ${c.is_active === 1 ? 'btn-danger' : 'btn-accent'}`}
                        title={c.is_active === 1 ? 'Desactivar cliente' : 'Activar cliente'}
                        style={{ padding: '6px 10px' }}
                      >
                        {c.is_active === 1 ? <XCircle size={14} /> : <CheckCircle size={14} />}
                        <span>{c.is_active === 1 ? 'Desactivar' : 'Activar'}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Crear Cliente */}
      {isCreateModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '580px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem' }}>Registrar Nuevo Cliente</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Nombre Completo / Razón Social *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ej. Droguería La Central"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Documento (Cédula o NIT) *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ej. 900123456-7"
                      value={formData.id_number}
                      onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Teléfono de Contacto</label>
                    <input
                      type="tel"
                      className="form-input"
                      placeholder="Ej. 3124567890"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Correo Electrónico</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="contacto@drogueria.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Dirección</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ej. Carrera 15 # 45-20"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Ciudad / Municipio</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ej. Medellín"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Notas u Observaciones</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    placeholder="Instrucciones de entrega, días de atención, etc."
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
                  Guardar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Cliente */}
      {isEditModalOpen && selectedCustomer && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '580px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem' }}>Editar Cliente: {selectedCustomer.name}</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateCustomer}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Nombre Completo / Razón Social *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Documento (Cédula o NIT) *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editFormData.id_number}
                      onChange={(e) => setEditFormData({ ...editFormData, id_number: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Teléfono</label>
                    <input
                      type="tel"
                      className="form-input"
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Correo Electrónico</label>
                    <input
                      type="email"
                      className="form-input"
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Dirección</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editFormData.address}
                      onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Ciudad / Municipio</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editFormData.city}
                      onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Notas u Observaciones</label>
                  <textarea
                    className="form-input"
                    rows={3}
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
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
