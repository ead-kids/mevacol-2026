"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.salesRouter = void 0;
const express_1 = require("express");
const uuid_1 = require("uuid");
const db_1 = require("../../database/db");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
exports.salesRouter = (0, express_1.Router)();
// Todas las rutas de ventas requieren autenticación
exports.salesRouter.use(auth_middleware_1.authMiddleware);
// 1. Estadísticas de Ventas
exports.salesRouter.get('/stats', async (req, res) => {
    try {
        const userRole = req.user.role_code;
        const userId = req.user.id;
        if (userRole === 'ENTREGADOR') {
            res.status(403).json({ success: false, error: 'Acceso denegado.' });
            return;
        }
        let statsQuery = `
      SELECT
        COUNT(*) as total_sales,
        COALESCE(SUM(total_cop), 0) as total_revenue_cop,
        COALESCE(SUM(CASE WHEN date(created_at) = CURRENT_DATE THEN total_cop ELSE 0 END), 0) as today_sales_cop,
        COALESCE(SUM(CASE WHEN date(created_at) = CURRENT_DATE THEN 1 ELSE 0 END), 0) as today_sales_count
      FROM sales WHERE 1=1
    `;
        const params = [];
        if (userRole === 'VENDEDOR') {
            statsQuery += ` AND seller_user_id = ?`;
            params.push(userId);
        }
        const stats = await (0, db_1.queryOne)(statsQuery, params);
        const totalSales = Number(stats?.total_sales || 0);
        const totalRevenue = Number(stats?.total_revenue_cop || 0);
        const averageTicket = totalSales > 0 ? Math.round(totalRevenue / totalSales) : 0;
        res.json({
            success: true,
            stats: {
                total_sales: totalSales,
                total_revenue_cop: totalRevenue,
                today_sales_cop: Number(stats?.today_sales_cop || 0),
                today_sales_count: Number(stats?.today_sales_count || 0),
                average_ticket_cop: averageTicket,
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Error al calcular estadísticas: ' + error.message });
    }
});
// 2. Listar Ventas
exports.salesRouter.get('/', async (req, res) => {
    try {
        const userRole = req.user.role_code;
        const userId = req.user.id;
        if (userRole === 'ENTREGADOR') {
            res.status(403).json({ success: false, error: 'Acceso denegado para el rol de entregador.' });
            return;
        }
        const search = req.query.search ? String(req.query.search).trim().toLowerCase() : '';
        const sellerIdFilter = req.query.seller_id ? String(req.query.seller_id).trim() : '';
        const customerIdFilter = req.query.customer_id ? String(req.query.customer_id).trim() : '';
        let query = `
      SELECT
        s.id, s.invoice_number, inv.id as invoice_id, inv.invoice_code,
        s.customer_id, c.name as customer_name, c.id_number as customer_id_number,
        c.phone as customer_phone, c.city as customer_city,
        s.seller_user_id, u.full_name as seller_name,
        s.status, s.subtotal_cop, s.discount_cop, s.total_cop, s.notes, s.created_at,
        (SELECT COUNT(*) FROM sale_items si WHERE si.sale_id = s.id) as items_count
      FROM sales s
      LEFT JOIN invoices inv ON inv.sale_id = s.id
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN users u ON s.seller_user_id = u.id
      WHERE 1=1
    `;
        const params = [];
        if (userRole === 'VENDEDOR') {
            query += ` AND s.seller_user_id = ?`;
            params.push(userId);
        }
        else if (sellerIdFilter) {
            query += ` AND s.seller_user_id = ?`;
            params.push(sellerIdFilter);
        }
        if (customerIdFilter) {
            query += ` AND s.customer_id = ?`;
            params.push(customerIdFilter);
        }
        if (search) {
            query += ` AND (LOWER(s.invoice_number) LIKE ? OR LOWER(COALESCE(inv.invoice_code, '')) LIKE ? OR LOWER(c.name) LIKE ? OR LOWER(c.id_number) LIKE ? OR LOWER(u.full_name) LIKE ?)`;
            const p = `%${search}%`;
            params.push(p, p, p, p, p);
        }
        query += ` ORDER BY s.created_at DESC`;
        const sales = await (0, db_1.queryAll)(query, params);
        res.json({ success: true, count: sales.length, sales });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Error al consultar ventas: ' + error.message });
    }
});
// 3. Consultar Detalle de Venta
exports.salesRouter.get('/:id', async (req, res) => {
    try {
        const userRole = req.user.role_code;
        const userId = req.user.id;
        const { id } = req.params;
        if (userRole === 'ENTREGADOR') {
            res.status(403).json({ success: false, error: 'Acceso denegado.' });
            return;
        }
        const sale = await (0, db_1.queryOne)(`
      SELECT s.id, s.invoice_number, inv.id as invoice_id, inv.invoice_code,
        s.customer_id, c.name as customer_name, c.id_number as customer_id_number,
        c.phone as customer_phone, c.address as customer_address, c.city as customer_city,
        s.seller_user_id, u.full_name as seller_name,
        s.status, s.subtotal_cop, s.discount_cop, s.total_cop, s.notes, s.created_at
      FROM sales s
      LEFT JOIN invoices inv ON inv.sale_id = s.id
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN users u ON s.seller_user_id = u.id
      WHERE s.id = ?
    `, [id]);
        if (!sale) {
            res.status(404).json({ success: false, error: 'Venta no encontrada.' });
            return;
        }
        if (userRole === 'VENDEDOR' && sale.seller_user_id !== userId) {
            res.status(403).json({ success: false, error: 'No tienes autorización para consultar esta venta.' });
            return;
        }
        const items = await (0, db_1.queryAll)(`
      SELECT si.id, si.sale_id, si.product_id, p.code as product_code, p.name as product_name,
        p.category as product_category, p.unit_measure as product_unit_measure,
        si.quantity, si.unit_price_cop, si.discount_cop, si.total_cop, si.notes
      FROM sale_items si LEFT JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = ? ORDER BY si.created_at ASC
    `, [id]);
        res.json({ success: true, sale: { ...sale, items } });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Error al obtener detalle de venta: ' + error.message });
    }
});
// 4. Crear Nueva Venta (Transacción Atómica)
exports.salesRouter.post('/', async (req, res) => {
    try {
        const userRole = req.user.role_code;
        const userId = req.user.id;
        if (userRole === 'ENTREGADOR') {
            res.status(403).json({ success: false, error: 'El rol de entregador no puede registrar ventas.' });
            return;
        }
        const { customer_id, items, notes, seller_id } = req.body;
        if (!customer_id || !String(customer_id).trim()) {
            res.status(400).json({ success: false, error: 'Debe seleccionar un cliente existente.' });
            return;
        }
        if (!items || !Array.isArray(items) || items.length === 0) {
            res.status(400).json({ success: false, error: 'Debe agregar al menos un producto a la venta.' });
            return;
        }
        let sellerIdToRecord = userId;
        if (userRole === 'ADMINISTRADOR' && seller_id) {
            const sellerCheck = await (0, db_1.queryOne)(`SELECT id FROM users WHERE id = ?`, [String(seller_id)]);
            if (sellerCheck)
                sellerIdToRecord = String(seller_id);
        }
        const result = await (0, db_1.withTransaction)(async ({ queryOne: txOne, queryAll: txAll, queryRun: txRun }) => {
            // 1. Validar cliente
            const customer = await txOne(`SELECT id, name, is_active FROM customers WHERE id = ?`, [String(customer_id)]);
            if (!customer)
                throw new Error('El cliente seleccionado no existe en el sistema.');
            if (customer.is_active === 0)
                throw new Error(`El cliente '${customer.name}' se encuentra inactivo.`);
            // 2. Generar consecutivo VTA-XXXX
            const allSalesVta = await txAll(`SELECT invoice_number FROM sales WHERE invoice_number LIKE 'VTA-%'`);
            let maxNumber = 0;
            for (const s of allSalesVta) {
                const match = s.invoice_number?.match(/VTA-(\d+)/);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (!isNaN(num) && num > maxNumber)
                        maxNumber = num;
                }
            }
            const invoiceNumber = `VTA-${String(maxNumber + 1).padStart(4, '0')}`;
            // 3. Validar productos y calcular totales
            let calculatedTotal = 0;
            const verifiedItems = [];
            for (const item of items) {
                const pId = String(item.product_id).trim();
                const qty = Math.round(Number(item.quantity));
                if (!pId)
                    throw new Error('Identificador de producto inválido.');
                if (isNaN(qty) || qty <= 0)
                    throw new Error('La cantidad vendida debe ser mayor a cero.');
                const product = await txOne(`SELECT id, code, name, price_cop, current_stock, is_active FROM products WHERE id = ?`, [pId]);
                if (!product)
                    throw new Error(`El producto con ID '${pId}' no existe.`);
                if (product.is_active === 0)
                    throw new Error(`El producto '${product.name}' está desactivado.`);
                if (product.current_stock < qty)
                    throw new Error(`Stock insuficiente para '${product.name}'. Solicitado: ${qty}, Disponible: ${product.current_stock}.`);
                const itemTotal = qty * product.price_cop;
                calculatedTotal += itemTotal;
                verifiedItems.push({ product_id: product.id, product_name: product.name, product_code: product.code, quantity: qty, unit_price_cop: product.price_cop, total_cop: itemTotal });
            }
            // 4. Insertar venta
            const saleId = (0, uuid_1.v4)();
            await txRun(`INSERT INTO sales (id, invoice_number, customer_id, seller_user_id, status, subtotal_cop, discount_cop, total_cop, notes, is_synced, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'REGISTRADA', ?, 0, ?, ?, 1, NOW(), NOW())`, [saleId, invoiceNumber, customer.id, sellerIdToRecord, calculatedTotal, calculatedTotal, notes ? String(notes).trim() : null]);
            // 5. Insertar items y descontar stock
            for (const vi of verifiedItems) {
                await txRun(`INSERT INTO sale_items (id, sale_id, product_id, quantity, unit_price_cop, discount_cop, total_cop, created_at) VALUES (?, ?, ?, ?, ?, 0, ?, NOW())`, [(0, uuid_1.v4)(), saleId, vi.product_id, vi.quantity, vi.unit_price_cop, vi.total_cop]);
                await txRun(`UPDATE products SET current_stock = current_stock - ?, updated_at = NOW() WHERE id = ?`, [vi.quantity, vi.product_id]);
            }
            // 6. Generar Factura Asociada
            const allInvoices = await txAll(`SELECT invoice_code FROM invoices`);
            let maxFacNumber = 0;
            for (const row of allInvoices) {
                const match = row.invoice_code?.match(/FAC-(\d+)/);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (!isNaN(num) && num > maxFacNumber)
                        maxFacNumber = num;
                }
            }
            const invoiceCode = `FAC-${String(maxFacNumber + 1).padStart(4, '0')}`;
            const invoiceId = (0, uuid_1.v4)();
            await txRun(`INSERT INTO invoices (id, invoice_code, sale_id, customer_id, seller_user_id, subtotal_cop, discount_cop, tax_cop, total_cop, notes, dian_status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?, 'INTERNA', NOW(), NOW())`, [invoiceId, invoiceCode, saleId, customer.id, sellerIdToRecord, calculatedTotal, calculatedTotal, notes ? String(notes).trim() : null]);
            return { saleId, invoiceNumber, invoiceId, invoiceCode, customerName: customer.name, totalCop: calculatedTotal, itemsCount: verifiedItems.length };
        });
        (0, db_1.recordAuditLog)({ userId, action: 'SALE_CREATE', entityName: 'sales', entityId: result.saleId, details: { invoice_number: result.invoiceNumber, invoice_code: result.invoiceCode, customer_name: result.customerName, total_cop: result.totalCop, items_count: result.itemsCount }, ipAddress: req.ip, deviceInfo: req.headers['user-agent'] });
        res.status(201).json({
            success: true,
            message: `Venta ${result.invoiceNumber} registrada exitosamente (Factura ${result.invoiceCode}) por ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(result.totalCop)}.`,
            sale_id: result.saleId,
            invoice_number: result.invoiceNumber,
            invoice_id: result.invoiceId,
            invoice_code: result.invoiceCode,
            customer_name: result.customerName,
            total_cop: result.totalCop,
            subtotal_cop: result.totalCop,
            items_count: result.itemsCount,
        });
    }
    catch (error) {
        console.error('Error al registrar venta:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});
