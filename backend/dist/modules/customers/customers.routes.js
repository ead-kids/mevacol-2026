"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customersRouter = void 0;
const express_1 = require("express");
const uuid_1 = require("uuid");
const db_1 = require("../../database/db");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const role_middleware_1 = require("../../middlewares/role.middleware");
exports.customersRouter = (0, express_1.Router)();
// Todas las rutas de clientes requieren autenticación
exports.customersRouter.use(auth_middleware_1.authMiddleware);
// 1. Listar y Buscar Clientes
exports.customersRouter.get('/', async (req, res) => {
    try {
        const search = req.query.search ? String(req.query.search).trim().toLowerCase() : '';
        const status = req.query.status ? String(req.query.status).trim().toLowerCase() : '';
        const userRole = req.user.role_code;
        let query = `
      SELECT
        c.id, c.id_number, c.name, c.phone, c.email, c.address, c.city,
        c.latitude, c.longitude, c.is_active, c.notes, c.created_by_user_id,
        u.full_name as created_by_name, c.created_at, c.updated_at
      FROM customers c
      LEFT JOIN users u ON c.created_by_user_id = u.id
      WHERE 1=1
    `;
        const params = [];
        if (search) {
            query += ` AND (LOWER(c.name) LIKE ? OR LOWER(c.id_number) LIKE ? OR LOWER(c.phone) LIKE ? OR LOWER(c.email) LIKE ? OR LOWER(c.city) LIKE ? OR LOWER(c.address) LIKE ?)`;
            const p = `%${search}%`;
            params.push(p, p, p, p, p, p);
        }
        if (status === 'active') {
            query += ` AND c.is_active = 1`;
        }
        else if (status === 'inactive') {
            query += ` AND c.is_active = ${userRole === 'ADMINISTRADOR' ? '0' : '1'}`;
        }
        else if (status !== 'all' && userRole !== 'ADMINISTRADOR') {
            query += ` AND c.is_active = 1`;
        }
        query += ` ORDER BY c.name ASC`;
        const customers = await (0, db_1.queryAll)(query, params);
        res.json({ success: true, count: customers.length, customers });
    }
    catch (error) {
        console.error('Error al listar clientes:', error);
        res.status(500).json({ success: false, error: 'Error al consultar clientes: ' + error.message });
    }
});
// 2. Consultar Detalle de un Cliente
exports.customersRouter.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const customer = await (0, db_1.queryOne)(`
      SELECT c.id, c.id_number, c.name, c.phone, c.email, c.address, c.city,
        c.latitude, c.longitude, c.is_active, c.notes, c.created_by_user_id,
        u.full_name as created_by_name, c.created_at, c.updated_at
      FROM customers c
      LEFT JOIN users u ON c.created_by_user_id = u.id
      WHERE c.id = ?
    `, [id]);
        if (!customer) {
            res.status(404).json({ success: false, error: 'Cliente no encontrado.' });
            return;
        }
        res.json({ success: true, customer });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// 3. Crear Cliente
exports.customersRouter.post('/', (0, role_middleware_1.requireRole)(['ADMINISTRADOR', 'VENDEDOR']), async (req, res) => {
    try {
        const { name, id_number, phone, email, address, city, notes } = req.body;
        if (!name || !id_number) {
            res.status(400).json({ success: false, error: 'El nombre completo y el número de documento son obligatorios.' });
            return;
        }
        const cleanName = String(name).trim();
        const cleanIdNumber = String(id_number).trim();
        if (cleanName.length < 2) {
            res.status(400).json({ success: false, error: 'El nombre del cliente debe tener al menos 2 caracteres.' });
            return;
        }
        const existing = await (0, db_1.queryOne)(`SELECT id FROM customers WHERE LOWER(id_number) = LOWER(?)`, [cleanIdNumber]);
        if (existing) {
            res.status(400).json({ success: false, error: `Ya existe un cliente registrado con el documento/NIT: ${cleanIdNumber}.` });
            return;
        }
        const customerId = (0, uuid_1.v4)();
        await (0, db_1.queryRun)(`INSERT INTO customers (id, id_number, name, phone, email, address, city, is_active, notes, created_by_user_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, NOW(), NOW())`, [customerId, cleanIdNumber, cleanName,
            phone ? String(phone).trim() : null,
            email ? String(email).trim().toLowerCase() : null,
            address ? String(address).trim() : null,
            city ? String(city).trim() : null,
            notes ? String(notes).trim() : null,
            req.user.id]);
        (0, db_1.recordAuditLog)({ userId: req.user.id, action: 'CUSTOMER_CREATED', entityName: 'customers', entityId: customerId, details: { name: cleanName, id_number: cleanIdNumber }, ipAddress: req.ip, deviceInfo: req.headers['user-agent'] });
        res.status(201).json({
            success: true,
            message: `Cliente ${cleanName} registrado exitosamente.`,
            customer: { id: customerId, id_number: cleanIdNumber, name: cleanName, phone: phone ? String(phone).trim() : null, email: email ? String(email).trim().toLowerCase() : null, address: address ? String(address).trim() : null, city: city ? String(city).trim() : null, is_active: 1, notes: notes ? String(notes).trim() : null },
        });
    }
    catch (error) {
        console.error('Error al registrar cliente:', error);
        res.status(500).json({ success: false, error: 'Error al registrar cliente: ' + error.message });
    }
});
// 4. Editar Cliente
exports.customersRouter.put('/:id', (0, role_middleware_1.requireRole)(['ADMINISTRADOR', 'VENDEDOR']), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, id_number, phone, email, address, city, notes } = req.body;
        const existingCustomer = await (0, db_1.queryOne)(`SELECT id, id_number, name FROM customers WHERE id = ?`, [id]);
        if (!existingCustomer) {
            res.status(404).json({ success: false, error: 'Cliente no encontrado.' });
            return;
        }
        if (!name || !id_number) {
            res.status(400).json({ success: false, error: 'El nombre y el número de documento son obligatorios.' });
            return;
        }
        const cleanName = String(name).trim();
        const cleanIdNumber = String(id_number).trim();
        const duplicateDoc = await (0, db_1.queryOne)(`SELECT id FROM customers WHERE LOWER(id_number) = LOWER(?) AND id != ?`, [cleanIdNumber, id]);
        if (duplicateDoc) {
            res.status(400).json({ success: false, error: `Ya existe otro cliente con el documento/NIT: ${cleanIdNumber}.` });
            return;
        }
        await (0, db_1.queryRun)(`UPDATE customers SET name = ?, id_number = ?, phone = ?, email = ?, address = ?, city = ?, notes = ?, updated_at = NOW() WHERE id = ?`, [cleanName, cleanIdNumber, phone ? String(phone).trim() : null, email ? String(email).trim().toLowerCase() : null, address ? String(address).trim() : null, city ? String(city).trim() : null, notes ? String(notes).trim() : null, id]);
        (0, db_1.recordAuditLog)({ userId: req.user.id, action: 'CUSTOMER_UPDATED', entityName: 'customers', entityId: String(id), details: { name: cleanName, id_number: cleanIdNumber }, ipAddress: req.ip, deviceInfo: req.headers['user-agent'] });
        res.json({ success: true, message: 'Información del cliente actualizada correctamente.' });
    }
    catch (error) {
        console.error('Error al actualizar cliente:', error);
        res.status(500).json({ success: false, error: 'Error al actualizar cliente: ' + error.message });
    }
});
// 5. Activar / Desactivar Cliente
exports.customersRouter.patch('/:id/status', (0, role_middleware_1.requireRole)(['ADMINISTRADOR']), async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;
        const customer = await (0, db_1.queryOne)(`SELECT id, name, is_active FROM customers WHERE id = ?`, [id]);
        if (!customer) {
            res.status(404).json({ success: false, error: 'Cliente no encontrado.' });
            return;
        }
        const newStatus = is_active ? 1 : 0;
        await (0, db_1.queryRun)(`UPDATE customers SET is_active = ?, updated_at = NOW() WHERE id = ?`, [newStatus, id]);
        (0, db_1.recordAuditLog)({ userId: req.user.id, action: 'CUSTOMER_STATUS_UPDATED', entityName: 'customers', entityId: String(id), details: { customerName: customer.name, newStatus }, ipAddress: req.ip, deviceInfo: req.headers['user-agent'] });
        res.json({ success: true, message: `El cliente ${customer.name} ha sido ${newStatus === 1 ? 'activado' : 'desactivado'}.` });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
