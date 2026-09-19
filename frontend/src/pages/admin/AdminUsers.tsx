import React, { useState } from 'react';
import {
  UserPlus,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Edit2,
  Trash2,
  Shield,
  ShoppingBag,
  Truck,
  AlertCircle,
  X,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';
import type { User, RoleCode } from '../../types';
import { api } from '../../services/api';

interface AdminUsersProps {
  users: User[];
  onRefreshUsers: () => Promise<void>;
}

export const AdminUsers: React.FC<AdminUsersProps> = ({ users, onRefreshUsers }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Estados para modal de eliminación segura con contraseña
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    password: '',
    role_code: 'VENDEDOR' as RoleCode,
    email: '',
    phone: '',
  });

  const [editFormData, setEditFormData] = useState({
    full_name: '',
    role_code: 'VENDEDOR' as RoleCode,
    email: '',
    phone: '',
    password: '',
  });

  const [loading, setLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesRole = roleFilter === 'ALL' || user.role_code === roleFilter;

    return matchesSearch && matchesRole;
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMessage(null);
    setLoading(true);

    try {
      const res = await api.createUser(formData);
      setFeedbackMessage({ type: 'success', text: res.message });
      setIsModalOpen(false);
      setFormData({
        username: '',
        full_name: '',
        password: '',
        role_code: 'VENDEDOR',
        email: '',
        phone: '',
      });
      await onRefreshUsers();
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Error al crear usuario.' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    if (user.username === 'admin') {
      setFeedbackMessage({ type: 'error', text: 'La cuenta del Administrador principal no se puede desactivar.' });
      return;
    }
    try {
      const newStatus = user.is_active === 1 ? false : true;
      const res = await api.toggleUserStatus(user.id, newStatus);
      setFeedbackMessage({ type: 'success', text: res.message });
      await onRefreshUsers();
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Error al cambiar estado.' });
    }
  };

  const openDeleteModal = (user: User) => {
    setUserToDelete(user);
    setDeletePassword('');
    setShowDeletePassword(false);
    setDeleteError(null);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToDelete) return;
    if (!deletePassword.trim()) {
      setDeleteError('Ingresa tu contraseña de administrador para continuar.');
      return;
    }

    setDeleteError(null);
    setDeleteLoading(true);

    try {
      const res = await api.deleteUser(userToDelete.id, deletePassword);
      setFeedbackMessage({ type: 'success', text: res.message });
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
      setDeletePassword('');
      await onRefreshUsers();
    } catch (err: any) {
      setDeleteError(err.message || 'Error al autorizar la eliminación.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setEditFormData({
      full_name: user.full_name,
      role_code: user.role_code,
      email: user.email || '',
      phone: user.phone || '',
      password: '',
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setFeedbackMessage(null);
    setLoading(true);

    try {
      const res = await api.updateUser(selectedUser.id, {
        full_name: editFormData.full_name,
        role_code: editFormData.role_code,
        email: editFormData.email || undefined,
        phone: editFormData.phone || undefined,
        password: editFormData.password.trim() ? editFormData.password : undefined,
      });

      setFeedbackMessage({ type: 'success', text: res.message });
      setIsEditModalOpen(false);
      await onRefreshUsers();
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Error al actualizar usuario.' });
    } finally {
      setLoading(false);
    }
  };

  const renderRoleBadge = (roleCode: RoleCode) => {
    switch (roleCode) {
      case 'ADMINISTRADOR':
        return (
          <span className="badge badge-admin">
            <Shield size={12} />
            <span>Administrador</span>
          </span>
        );
      case 'VENDEDOR':
        return (
          <span className="badge badge-seller">
            <ShoppingBag size={12} />
            <span>Vendedor</span>
          </span>
        );
      case 'ENTREGADOR':
        return (
          <span className="badge badge-delivery">
            <Truck size={12} />
            <span>Entregador</span>
          </span>
        );
      default:
        return <span className="badge">{roleCode}</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Encabezado y Acción Principal */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>Gestión de Usuarios del Sistema</h2>
          <p style={{ fontSize: '0.9rem' }}>
            Control y asignación de accesos para Administradores, Vendedores y Entregadores.
          </p>
        </div>

        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
          <UserPlus size={18} />
          <span>Crear Nuevo Usuario</span>
        </button>
      </div>

      {/* Banner de Feedback / Alerta */}
      {feedbackMessage && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          background: feedbackMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          border: `1px solid ${feedbackMessage.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          color: feedbackMessage.type === 'success' ? '#34d399' : '#f87171',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {feedbackMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Barra de Búsqueda y Filtros */}
      <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Buscar por usuario, nombre o correo..."
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
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="ALL">Todos los Roles</option>
            <option value="ADMINISTRADOR">Administradores</option>
            <option value="VENDEDOR">Vendedores</option>
            <option value="ENTREGADOR">Entregadores</option>
          </select>
        </div>
      </div>

      {/* Tabla de Usuarios */}
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Nombre Completo</th>
              <th>Rol Asignado</th>
              <th>Contacto</th>
              <th>Estado</th>
              <th>Fecha Registro</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  No se encontraron usuarios que coincidan con la búsqueda o filtro.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => (
                <tr key={u.id}>
                  <td>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>@{u.username}</span>
                  </td>
                  <td>{u.full_name}</td>
                  <td>{renderRoleBadge(u.role_code)}</td>
                  <td>
                    <div style={{ fontSize: '0.85rem' }}>{u.phone || 'Sin teléfono'}</div>
                    {u.email && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</div>}
                  </td>
                  <td>
                    {u.is_active === 1 ? (
                      <span className="badge badge-success">Activo</span>
                    ) : (
                      <span className="badge badge-danger">Inactivo</span>
                    )}
                  </td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('es-CO') : '—'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '8px' }}>
                      <button
                        onClick={() => openEditModal(u)}
                        className="btn btn-secondary btn-sm"
                        title="Editar Datos"
                        style={{ padding: '6px 10px' }}
                      >
                        <Edit2 size={14} />
                      </button>

                      <button
                        onClick={() => handleToggleStatus(u)}
                        disabled={u.username === 'admin'}
                        className={`btn btn-sm ${u.is_active === 1 ? 'btn-danger' : 'btn-accent'}`}
                        title={u.username === 'admin' ? 'El administrador principal no se puede desactivar' : (u.is_active === 1 ? 'Desactivar acceso' : 'Activar acceso')}
                        style={{
                          padding: '6px 10px',
                          opacity: u.username === 'admin' ? 0.4 : 1,
                          cursor: u.username === 'admin' ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {u.is_active === 1 ? <XCircle size={14} /> : <CheckCircle size={14} />}
                        <span>{u.is_active === 1 ? 'Desactivar' : 'Activar'}</span>
                      </button>

                      {u.username !== 'admin' && (
                        <button
                          onClick={() => openDeleteModal(u)}
                          className="btn btn-sm"
                          title="Eliminar usuario permanentemente"
                          style={{
                            padding: '6px 10px',
                            background: 'rgba(239, 68, 68, 0.15)',
                            color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          <Trash2 size={14} />
                          <span>Eliminar</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Crear Usuario */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem' }}>Crear Nuevo Usuario</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateUser}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Rol del Usuario *</label>
                  <select
                    className="form-select"
                    value={formData.role_code}
                    onChange={(e) => setFormData({ ...formData, role_code: e.target.value as RoleCode })}
                    required
                  >
                    <option value="VENDEDOR">Vendedor (Optimizado para Celular / Ventas)</option>
                    <option value="ENTREGADOR">Entregador (Optimizado para Celular / Envíos)</option>
                    <option value="ADMINISTRADOR">Administrador (Acceso Total)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Nombre Completo *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej. Carlos Mario Gómez"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Nombre de Usuario *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ej. cgomez"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Teléfono</label>
                    <input
                      type="tel"
                      className="form-input"
                      placeholder="Ej. 3109876543"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Correo Electrónico</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="cgomez@mevacol.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Contraseña de Acceso *</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Mínimo 6 caracteres"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Creando...' : 'Guardar Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Usuario */}
      {isEditModalOpen && selectedUser && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem' }}>Editar Usuario: @{selectedUser.username}</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateUser}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Rol del Usuario *</label>
                  <select
                    className="form-select"
                    value={editFormData.role_code}
                    onChange={(e) => setEditFormData({ ...editFormData, role_code: e.target.value as RoleCode })}
                    required
                  >
                    <option value="VENDEDOR">Vendedor</option>
                    <option value="ENTREGADOR">Entregador</option>
                    <option value="ADMINISTRADOR">Administrador</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Nombre Completo *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editFormData.full_name}
                    onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                    required
                  />
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

                <div className="form-group">
                  <label className="form-label">Nueva Contraseña (Opcional)</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Dejar en blanco para conservar la actual"
                    value={editFormData.password}
                    onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Actualizando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmación de Seguridad con Contraseña para Eliminar Usuario */}
      {isDeleteModalOpen && userToDelete && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid rgba(239, 68, 68, 0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}>
                <Shield size={20} />
                <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Autorizar Eliminación</h3>
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
                  <div style={{ fontWeight: 600, color: '#f87171', marginBottom: '6px' }}>
                    ¿Eliminar permanentemente a @{userToDelete.username}?
                  </div>
                  <div style={{ color: 'var(--text-primary)' }}>
                    Nombre: <strong>{userToDelete.full_name}</strong> • Rol: <strong>{userToDelete.role_code}</strong>
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    ⚠️ Esta acción no se puede deshacer. Sus ventas y registros históricos se reasignarán a tu cuenta de Administrador para proteger el balance del sistema.
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
                      className="form-input"
                      placeholder="Tu contraseña de administrador..."
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      autoFocus
                      required
                      style={{ paddingRight: '40px' }}
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

              <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', marginTop: '8px' }}>
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
