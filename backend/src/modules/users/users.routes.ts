import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db, recordAuditLog } from '../../database/db';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';

export const usersRouter = Router();

// Todas las rutas de usuarios requieren autenticación y rol ADMINISTRADOR
usersRouter.use(authMiddleware);
usersRouter.use(requireRole(['ADMINISTRADOR']));

// 1. Obtener catálogo de roles disponibles
usersRouter.get('/roles', (req: Request, res: Response) => {
  try {
    const roles = db.prepare('SELECT code, name, description FROM roles').all();
    res.json({ success: true, roles });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Listar todos los usuarios
usersRouter.get('/', (req: Request, res: Response) => {
  try {
    const users = db.prepare(`
      SELECT 
        u.id, 
        u.username, 
        u.full_name, 
        u.email, 
        u.phone, 
        u.role_code, 
        r.name as role_name,
        u.is_active, 
        u.created_at, 
        u.updated_at
      FROM users u
      LEFT JOIN roles r ON u.role_code = r.code
      ORDER BY u.created_at DESC
    `).all();

    res.json({
      success: true,
      users,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Crear nuevo usuario (Vendedor, Entregador o Administrador)
usersRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, full_name, password, email, phone, role_code } = req.body;

    if (!username || !full_name || !password || !role_code) {
      res.status(400).json({
        success: false,
        error: 'Nombre de usuario, nombre completo, contraseña y rol son requeridos.',
      });
      return;
    }

    const cleanUsername = String(username).trim().toLowerCase();
    if (cleanUsername.length < 3) {
      res.status(400).json({
        success: false,
        error: 'El nombre de usuario debe tener mínimo 3 caracteres.',
      });
      return;
    }

    if (String(password).length < 6) {
      res.status(400).json({
        success: false,
        error: 'La contraseña debe tener mínimo 6 caracteres.',
      });
      return;
    }

    // Validar existencia del rol
    const roleExists = db.prepare('SELECT code FROM roles WHERE code = ?').get(role_code);
    if (!roleExists) {
      res.status(400).json({
        success: false,
        error: `El rol '${role_code}' no es válido. Roles disponibles: ADMINISTRADOR, VENDEDOR, ENTREGADOR.`,
      });
      return;
    }

    // Verificar si el usuario ya existe
    const existing = db.prepare(`
      SELECT id FROM users 
      WHERE LOWER(username) = ? OR (email IS NOT NULL AND LOWER(email) = ?)
    `).get(cleanUsername, email ? String(email).trim().toLowerCase() : '');

    if (existing) {
      res.status(400).json({
        success: false,
        error: 'Ya existe un usuario registrado con ese nombre de usuario o correo electrónico.',
      });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUserId = uuidv4();

    db.prepare(`
      INSERT INTO users (id, username, full_name, email, password_hash, role_code, phone, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
    `).run(
      newUserId,
      cleanUsername,
      String(full_name).trim(),
      email ? String(email).trim().toLowerCase() : null,
      passwordHash,
      role_code,
      phone ? String(phone).trim() : null
    );

    // Auditoría
    recordAuditLog({
      userId: req.user!.id,
      action: 'USER_CREATED',
      entityName: 'users',
      entityId: newUserId,
      details: { username: cleanUsername, role: role_code, createdBy: req.user!.username },
      ipAddress: req.ip,
      deviceInfo: req.headers['user-agent'],
    });

    res.status(201).json({
      success: true,
      message: `Usuario ${cleanUsername} creado exitosamente con rol ${role_code}.`,
      user: {
        id: newUserId,
        username: cleanUsername,
        full_name: String(full_name).trim(),
        email: email ? String(email).trim().toLowerCase() : null,
        role_code,
        phone: phone ? String(phone).trim() : null,
        is_active: 1,
      },
    });
  } catch (error: any) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Cambiar estado activo / inactivo de un usuario
usersRouter.patch('/:id/status', (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const user = db.prepare('SELECT id, username, role_code, is_active FROM users WHERE id = ?').get(id) as any;
    if (!user) {
      res.status(404).json({ success: false, error: 'Usuario no encontrado.' });
      return;
    }

    const newStatus = (is_active === true || is_active === 1 || is_active === '1') ? 1 : 0;

    // No permitir que el administrador se desactive a sí mismo
    if (user.id === req.user!.id && newStatus === 0) {
      res.status(400).json({
        success: false,
        error: 'No puedes desactivar tu propia cuenta mientras estás en sesión.',
      });
      return;
    }

    // No permitir desactivar al último administrador activo
    if (user.role_code === 'ADMINISTRADOR' && newStatus === 0) {
      const activeAdmins = db.prepare(`
        SELECT COUNT(*) as count FROM users 
        WHERE role_code = 'ADMINISTRADOR' AND is_active = 1
      `).get() as { count: number };

      if (activeAdmins.count <= 1) {
        res.status(400).json({
          success: false,
          error: 'No es posible desactivar al único Administrador activo del sistema.',
        });
        return;
      }
    }

    db.prepare(`
      UPDATE users 
      SET is_active = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(newStatus, id);

    recordAuditLog({
      userId: req.user!.id,
      action: 'USER_STATUS_UPDATED',
      entityName: 'users',
      entityId: String(id),
      details: { newStatus, targetUser: user.username },
      ipAddress: req.ip,
      deviceInfo: req.headers['user-agent'],
    });

    res.json({
      success: true,
      message: `El usuario ${user.username} ha sido ${newStatus === 1 ? 'activado' : 'desactivado'}.`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. Actualizar información de un usuario
usersRouter.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { full_name, email, phone, role_code, password } = req.body;

    const existingUser = db.prepare('SELECT id, username, role_code FROM users WHERE id = ?').get(id) as any;
    if (!existingUser) {
      res.status(404).json({ success: false, error: 'Usuario no encontrado.' });
      return;
    }

    let passwordClause = '';
    const params: any[] = [
      String(full_name).trim(),
      email ? String(email).trim().toLowerCase() : null,
      phone ? String(phone).trim() : null,
      role_code || existingUser.role_code,
    ];

    if (password && String(password).trim().length >= 6) {
      const newHash = await bcrypt.hash(password, 10);
      passwordClause = ', password_hash = ?';
      params.push(newHash);
    }

    params.push(id);

    db.prepare(`
      UPDATE users
      SET full_name = ?, email = ?, phone = ?, role_code = ? ${passwordClause}, updated_at = datetime('now')
      WHERE id = ?
    `).run(...params);

    recordAuditLog({
      userId: req.user!.id,
      action: 'USER_UPDATED',
      entityName: 'users',
      entityId: String(id),
      details: { updatedFields: { full_name, email, phone, role_code, passwordUpdated: !!password } },
      ipAddress: req.ip,
      deviceInfo: req.headers['user-agent'],
    });

    res.json({
      success: true,
      message: 'Datos del usuario actualizados correctamente.',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. Eliminar usuario del sistema permanentemente con autorización por contraseña
usersRouter.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { admin_password } = req.body;

    if (!admin_password) {
      res.status(400).json({
        success: false,
        error: 'Debe ingresar su contraseña de administrador para autorizar la eliminación.',
      });
      return;
    }

    // Validar contraseña del administrador actual
    const currentAdmin = db.prepare('SELECT id, password_hash FROM users WHERE id = ?').get(req.user!.id) as any;
    if (!currentAdmin) {
      res.status(401).json({ success: false, error: 'Sesión no válida.' });
      return;
    }

    const passwordValid = await bcrypt.compare(String(admin_password), currentAdmin.password_hash);
    if (!passwordValid) {
      res.status(401).json({
        success: false,
        error: 'Contraseña de administrador incorrecta. Autorización denegada.',
      });
      return;
    }

    const user = db.prepare('SELECT id, username, role_code FROM users WHERE id = ?').get(id) as any;
    if (!user) {
      res.status(404).json({ success: false, error: 'Usuario no encontrado.' });
      return;
    }

    // No permitir eliminarse a sí mismo
    if (user.id === req.user!.id) {
      res.status(400).json({
        success: false,
        error: 'No puedes eliminar tu propia cuenta mientras estás en sesión.',
      });
      return;
    }

    // No permitir eliminar al último administrador
    if (user.role_code === 'ADMINISTRADOR') {
      const adminCount = db.prepare(`
        SELECT COUNT(*) as count FROM users WHERE role_code = 'ADMINISTRADOR'
      `).get() as { count: number };

      if (adminCount.count <= 1) {
        res.status(400).json({
          success: false,
          error: 'No es posible eliminar al único Administrador del sistema.',
        });
        return;
      }
    }

    // Reasignar de forma atómica ventas y registros contables al administrador activo
    // para mantener intacto el balance financiero y no bloquear la eliminación
    const deleteTx = db.transaction(() => {
      db.prepare('UPDATE sales SET seller_user_id = ? WHERE seller_user_id = ?').run(req.user!.id, id);
      db.prepare('UPDATE invoices SET seller_user_id = ? WHERE seller_user_id = ?').run(req.user!.id, id);
      db.prepare('UPDATE deliveries SET created_by_user_id = ? WHERE created_by_user_id = ?').run(req.user!.id, id);
      db.prepare('UPDATE delivery_status_history SET changed_by_user_id = ? WHERE changed_by_user_id = ?').run(req.user!.id, id);
      db.prepare('UPDATE inventory_conflicts SET seller_user_id = ? WHERE seller_user_id = ?').run(req.user!.id, id);
      db.prepare('UPDATE inventory_conflicts SET resolved_by_user_id = ? WHERE resolved_by_user_id = ?').run(req.user!.id, id);

      // Desvincular referencias opcionales
      db.prepare('UPDATE customers SET created_by_user_id = NULL WHERE created_by_user_id = ?').run(id);
      db.prepare('UPDATE deliveries SET delivery_user_id = NULL WHERE delivery_user_id = ?').run(id);
      db.prepare('UPDATE orders SET delivery_user_id = NULL WHERE delivery_user_id = ?').run(id);
      db.prepare('UPDATE audit_logs SET user_id = NULL WHERE user_id = ?').run(id);
      db.prepare('DELETE FROM seller_locations WHERE user_id = ?').run(id);

      // Eliminar el usuario
      db.prepare('DELETE FROM users WHERE id = ?').run(id);
    });

    deleteTx();

    recordAuditLog({
      userId: req.user!.id,
      action: 'USER_DELETED',
      entityName: 'users',
      entityId: String(id),
      details: { deletedUsername: user.username, role: user.role_code, authorizedBy: req.user!.username },
      ipAddress: req.ip,
      deviceInfo: req.headers['user-agent'],
    });

    res.json({
      success: true,
      message: `Usuario '@${user.username}' eliminado exitosamente del sistema.`,
    });
  } catch (error: any) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar usuario: ' + error.message });
  }
});


