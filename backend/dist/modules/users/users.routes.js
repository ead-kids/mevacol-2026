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
exports.usersRouter.get('/roles', async (req, res) => {
    try {
        const roles = await (0, db_1.queryAll)('SELECT code, name, description FROM roles');
        res.json({ success: true, roles });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// 2. Listar todos los usuarios
exports.usersRouter.get('/', async (req, res) => {
    try {
        const users = await (0, db_1.queryAll)(`
      SELECT
        u.id,
        u.username,
        u.full_name,
        u.email,
        u.phone,
        u.document_id,
        u.address,
        u.role_code,
        r.name as role_name,
        u.is_active,
        u.created_at,
        u.updated_at
      FROM users u
      LEFT JOIN roles r ON u.role_code = r.code
      ORDER BY u.created_at DESC
    `);
        res.json({ success: true, users });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// 3. Crear nuevo usuario (Vendedor, Entregador o Administrador)
exports.usersRouter.post('/', async (req, res) => {
    try {
        const { username, full_name, password, email, phone, role_code, document_id, address } = req.body;
        if (!username || !full_name || !password || !role_code) {
            res.status(400).json({
                success: false,
                error: 'Nombre de usuario, nombre completo, contraseña y rol son requeridos.',
            });
            return;
        }
        const cleanUsername = String(username).trim().toLowerCase();
        if (cleanUsername.length < 3) {
            res.status(400).json({ success: false, error: 'El nombre de usuario debe tener mínimo 3 caracteres.' });
            return;
        }
        if (String(password).length < 6) {
            res.status(400).json({ success: false, error: 'La contraseña debe tener mínimo 6 caracteres.' });
            return;
        }
        // Validar existencia del rol
        const roleExists = await (0, db_1.queryOne)('SELECT code FROM roles WHERE code = ?', [role_code]);
        if (!roleExists) {
            res.status(400).json({
                success: false,
                error: `El rol '${role_code}' no es válido. Roles disponibles: ADMINISTRADOR, VENDEDOR, ENTREGADOR.`,
            });
            return;
        }
        // Verificar si el usuario ya existe
        const existing = await (0, db_1.queryOne)(`
      SELECT id FROM users
      WHERE LOWER(username) = ? OR (email IS NOT NULL AND LOWER(email) = ?)
    `, [cleanUsername, email ? String(email).trim().toLowerCase() : '']);
        if (existing) {
            res.status(400).json({
                success: false,
                error: 'Ya existe un usuario registrado con ese nombre de usuario o correo electrónico.',
            });
            return;
        }
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        const newUserId = (0, uuid_1.v4)();
        await (0, db_1.queryRun)(`INSERT INTO users (id, username, full_name, email, password_hash, role_code, phone, document_id, address, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`, [
            newUserId,
            cleanUsername,
            String(full_name).trim(),
            email ? String(email).trim().toLowerCase() : null,
            passwordHash,
            role_code,
            phone ? String(phone).trim() : null,
            document_id ? String(document_id).trim() : null,
            address ? String(address).trim() : null,
        ]);
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
exports.usersRouter.patch('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;
        const user = await (0, db_1.queryOne)('SELECT id, username, role_code, is_active FROM users WHERE id = ?', [id]);
        if (!user) {
            res.status(404).json({ success: false, error: 'Usuario no encontrado.' });
            return;
        }
        const newStatus = (is_active === true || is_active === 1 || is_active === '1') ? 1 : 0;
        // No permitir que el administrador se desactive a sí mismo
        if (user.id === req.user.id && newStatus === 0) {
            res.status(400).json({ success: false, error: 'No puedes desactivar tu propia cuenta mientras estás en sesión.' });
            return;
        }
        // No permitir desactivar al último administrador activo
        if (user.role_code === 'ADMINISTRADOR' && newStatus === 0) {
            const activeAdmins = await (0, db_1.queryOne)(`SELECT COUNT(*) as count FROM users WHERE role_code = 'ADMINISTRADOR' AND is_active = 1`);
            if (parseInt(activeAdmins?.count ?? '0', 10) <= 1) {
                res.status(400).json({ success: false, error: 'No es posible desactivar al único Administrador activo del sistema.' });
                return;
            }
        }
        await (0, db_1.queryRun)(`UPDATE users SET is_active = ?, updated_at = NOW() WHERE id = ?`, [newStatus, id]);
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
        const { full_name, email, phone, role_code, password, document_id, address } = req.body;
        const existingUser = await (0, db_1.queryOne)('SELECT id, username, role_code FROM users WHERE id = ?', [id]);
        if (!existingUser) {
            res.status(404).json({ success: false, error: 'Usuario no encontrado.' });
            return;
        }
        let passwordClause = '';
        const params = [
            String(full_name).trim(),
            email ? String(email).trim().toLowerCase() : null,
            phone ? String(phone).trim() : null,
            document_id !== undefined ? (document_id ? String(document_id).trim() : null) : undefined,
            address !== undefined ? (address ? String(address).trim() : null) : undefined,
            role_code || existingUser.role_code,
        ];
        if (password && String(password).trim().length >= 6) {
            const newHash = await bcryptjs_1.default.hash(password, 10);
            passwordClause = ', password_hash = ?';
            params.push(newHash);
        }
        params.push(id);
        await (0, db_1.queryRun)(`UPDATE users SET full_name = ?, email = ?, phone = ?, document_id = COALESCE(?, document_id), address = COALESCE(?, address), role_code = ? ${passwordClause}, updated_at = NOW() WHERE id = ?`, params);
        (0, db_1.recordAuditLog)({
            userId: req.user.id,
            action: 'USER_UPDATED',
            entityName: 'users',
            entityId: String(id),
            details: { updatedFields: { full_name, email, phone, role_code, passwordUpdated: !!password } },
            ipAddress: req.ip,
            deviceInfo: req.headers['user-agent'],
        });
        res.json({ success: true, message: 'Datos del usuario actualizados correctamente.' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// 6. Eliminar usuario del sistema permanentemente con autorización por contraseña
exports.usersRouter.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { admin_password } = req.body;
        if (!admin_password) {
            res.status(400).json({ success: false, error: 'Debe ingresar su contraseña de administrador para autorizar la eliminación.' });
            return;
        }
        // Validar contraseña del administrador actual
        const currentAdmin = await (0, db_1.queryOne)('SELECT id, password_hash FROM users WHERE id = ?', [req.user.id]);
        if (!currentAdmin) {
            res.status(401).json({ success: false, error: 'Sesión no válida.' });
            return;
        }
        const passwordValid = await bcryptjs_1.default.compare(String(admin_password), currentAdmin.password_hash);
        if (!passwordValid) {
            res.status(401).json({ success: false, error: 'Contraseña de administrador incorrecta. Autorización denegada.' });
            return;
        }
        const user = await (0, db_1.queryOne)('SELECT id, username, role_code FROM users WHERE id = ?', [id]);
        if (!user) {
            res.status(404).json({ success: false, error: 'Usuario no encontrado.' });
            return;
        }
        // No permitir eliminarse a sí mismo
        if (user.id === req.user.id) {
            res.status(400).json({ success: false, error: 'No puedes eliminar tu propia cuenta mientras estás en sesión.' });
            return;
        }
        // No permitir eliminar al último administrador
        if (user.role_code === 'ADMINISTRADOR') {
            const adminCount = await (0, db_1.queryOne)(`SELECT COUNT(*) as count FROM users WHERE role_code = 'ADMINISTRADOR'`);
            if (parseInt(adminCount?.count ?? '0', 10) <= 1) {
                res.status(400).json({ success: false, error: 'No es posible eliminar al único Administrador del sistema.' });
                return;
            }
        }
        // Reasignar de forma atómica en transacción
        await (0, db_1.withTransaction)(async ({ queryRun: txRun }) => {
            await txRun('UPDATE sales SET seller_user_id = ? WHERE seller_user_id = ?', [req.user.id, id]);
            await txRun('UPDATE invoices SET seller_user_id = ? WHERE seller_user_id = ?', [req.user.id, id]);
            await txRun('UPDATE deliveries SET created_by_user_id = ? WHERE created_by_user_id = ?', [req.user.id, id]);
            await txRun('UPDATE delivery_status_history SET changed_by_user_id = ? WHERE changed_by_user_id = ?', [req.user.id, id]);
            await txRun('UPDATE inventory_conflicts SET seller_user_id = ? WHERE seller_user_id = ?', [req.user.id, id]);
            await txRun('UPDATE inventory_conflicts SET resolved_by_user_id = ? WHERE resolved_by_user_id = ?', [req.user.id, id]);
            await txRun('UPDATE customers SET created_by_user_id = NULL WHERE created_by_user_id = ?', [id]);
            await txRun('UPDATE deliveries SET delivery_user_id = NULL WHERE delivery_user_id = ?', [id]);
            await txRun('UPDATE orders SET delivery_user_id = NULL WHERE delivery_user_id = ?', [id]);
            await txRun('UPDATE audit_logs SET user_id = NULL WHERE user_id = ?', [id]);
            await txRun('DELETE FROM seller_locations WHERE user_id = ?', [id]);
            await txRun('DELETE FROM users WHERE id = ?', [id]);
        });
        (0, db_1.recordAuditLog)({
            userId: req.user.id,
            action: 'USER_DELETED',
            entityName: 'users',
            entityId: String(id),
            details: { deletedUsername: user.username, role: user.role_code, authorizedBy: req.user.username },
            ipAddress: req.ip,
            deviceInfo: req.headers['user-agent'],
        });
        res.json({ success: true, message: `Usuario '@${user.username}' eliminado exitosamente del sistema.` });
    }
    catch (error) {
        console.error('Error al eliminar usuario:', error);
        res.status(500).json({ success: false, error: 'Error al eliminar usuario: ' + error.message });
    }
});
