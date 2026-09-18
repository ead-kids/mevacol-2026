"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersRouter = void 0;
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const uuid_1 = require("uuid");
const db_1 = require("../../database/db");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const role_middleware_1 = require("../../middlewares/role.middleware");
exports.usersRouter = (0, express_1.Router)();
// Todas las rutas de usuarios requieren autenticación y rol ADMINISTRADOR
exports.usersRouter.use(auth_middleware_1.authMiddleware);
exports.usersRouter.use((0, role_middleware_1.requireRole)(['ADMINISTRADOR']));
// 1. Obtener catálogo de roles disponibles
exports.usersRouter.get('/roles', (req, res) => {
    try {
        const roles = db_1.db.prepare('SELECT code, name, description FROM roles').all();
        res.json({ success: true, roles });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// 2. Listar todos los usuarios
exports.usersRouter.get('/', (req, res) => {
    try {
        const users = db_1.db.prepare(`
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
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// 3. Crear nuevo usuario (Vendedor, Entregador o Administrador)
exports.usersRouter.post('/', async (req, res) => {
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
        const roleExists = db_1.db.prepare('SELECT code FROM roles WHERE code = ?').get(role_code);
        if (!roleExists) {
            res.status(400).json({
                success: false,
                error: `El rol '${role_code}' no es válido. Roles disponibles: ADMINISTRADOR, VENDEDOR, ENTREGADOR.`,
            });
            return;
        }
        // Verificar si el usuario ya existe
        const existing = db_1.db.prepare(`
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
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        const newUserId = (0, uuid_1.v4)();
        db_1.db.prepare(`
      INSERT INTO users (id, username, full_name, email, password_hash, role_code, phone, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
    `).run(newUserId, cleanUsername, String(full_name).trim(), email ? String(email).trim().toLowerCase() : null, passwordHash, role_code, phone ? String(phone).trim() : null);
        // Auditoría
        (0, db_1.recordAuditLog)({
            userId: req.user.id,
            action: 'USER_CREATED',
            entityName: 'users',
            entityId: newUserId,
            details: { username: cleanUsername, role: role_code, createdBy: req.user.username },
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
    }
    catch (error) {
        console.error('Error al crear usuario:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
// 4. Cambiar estado activo / inactivo de un usuario
exports.usersRouter.patch('/:id/status', (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;
        const user = db_1.db.prepare('SELECT id, username, role_code, is_active FROM users WHERE id = ?').get(id);
        if (!user) {
            res.status(404).json({ success: false, error: 'Usuario no encontrado.' });
            return;
        }
        // No permitir que el administrador se desactive a sí mismo
        if (user.id === req.user.id && is_active === 0) {
            res.status(400).json({
                success: false,
                error: 'No puedes desactivar tu propia cuenta mientras estás en sesión.',
            });
            return;
        }
        // No permitir desactivar al último administrador activo
        if (user.role_code === 'ADMINISTRADOR' && is_active === 0) {
            const activeAdmins = db_1.db.prepare(`
        SELECT COUNT(*) as count FROM users 
        WHERE role_code = 'ADMINISTRADOR' AND is_active = 1
      `).get();
            if (activeAdmins.count <= 1) {
                res.status(400).json({
                    success: false,
                    error: 'No es posible desactivar al único Administrador activo del sistema.',
                });
                return;
            }
        }
        const newStatus = is_active ? 1 : 0;
        db_1.db.prepare(`
      UPDATE users 
      SET is_active = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(newStatus, id);
        (0, db_1.recordAuditLog)({
            userId: req.user.id,
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
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// 5. Actualizar información de un usuario
exports.usersRouter.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { full_name, email, phone, role_code, password } = req.body;
        const existingUser = db_1.db.prepare('SELECT id, username, role_code FROM users WHERE id = ?').get(id);
        if (!existingUser) {
            res.status(404).json({ success: false, error: 'Usuario no encontrado.' });
            return;
        }
        let passwordClause = '';
        const params = [
            String(full_name).trim(),
            email ? String(email).trim().toLowerCase() : null,
            phone ? String(phone).trim() : null,
            role_code || existingUser.role_code,
        ];
        if (password && String(password).trim().length >= 6) {
            const newHash = await bcryptjs_1.default.hash(password, 10);
            passwordClause = ', password_hash = ?';
            params.push(newHash);
        }
        params.push(id);
        db_1.db.prepare(`
      UPDATE users
      SET full_name = ?, email = ?, phone = ?, role_code = ? ${passwordClause}, updated_at = datetime('now')
      WHERE id = ?
    `).run(...params);
        (0, db_1.recordAuditLog)({
            userId: req.user.id,
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
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
