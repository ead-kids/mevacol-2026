"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MEVACOL_COMPANY_INFO = exports.invoicesRouter = void 0;
const express_1 = require("express");
const uuid_1 = require("uuid");
const db_1 = require("../../database/db");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
exports.invoicesRouter = (0, express_1.Router)();
// Todas las rutas de facturación requieren autenticación
exports.invoicesRouter.use(auth_middleware_1.authMiddleware);
// Datos corporativos estándar de MEVACOL
exports.MEVACOL_COMPANY_INFO = {
    name: 'MEVACOL S.A.S.',
    legal_name: 'Distribuidora Farmacéutica MEVACOL S.A.S.',
    nit: '901.458.789-3',
    address: 'Cra. 52 # 45-30',
    city: 'Medellín',
    department: 'Antioquia',
    country: 'Colombia',
    phone: '(604) 444-2310',
    mobile: '+57 312 890 4567',
    email: 'facturacion@mevacol.com.co',
    website: 'www.mevacol.com.co',
    logo_url: '/logo.png',
    regime: 'Régimen Común - Facturación Comercial MEVACOL',
    activity_code: '4645 - Distribución y comercialización mayorista de productos farmacéuticos',
    dian_resolution: 'Resolución DIAN No. 18764000123456 de 2026-01-15',
    dian_range: 'Prefijo FAC del 0001 al 10000 Vigencia: 24 meses',
};
// 1. Estadísticas de Facturación (KPIs)
exports.invoicesRouter.get('/stats', (req, res) => {
    try {
        const userRole = req.user.role_code;
        const userId = req.user.id;
        const sellerFilter = req.query.seller_id ? String(req.query.seller_id).trim() : null;
        if (userRole === 'ENTREGADOR') {
            res.status(403).json({ success: false, error: 'Acceso no autorizado al módulo de facturación.' });
            return;
        }
        let whereClause = 'WHERE 1=1';
        const params = [];
        if (userRole === 'VENDEDOR') {
            whereClause += ' AND inv.seller_user_id = ?';
            params.push(userId);
        }
        else if (sellerFilter) {
            whereClause += ' AND inv.seller_user_id = ?';
            params.push(sellerFilter);
        }
        const totalStats = db_1.db.prepare(`
      SELECT 
        COUNT(*) as total_invoices,
        COALESCE(SUM(inv.total_cop), 0) as total_revenue_cop,
        COALESCE(AVG(inv.total_cop), 0) as average_ticket_cop
      FROM invoices inv
      ${whereClause}
    `).get(...params);
        const todayStats = db_1.db.prepare(`
      SELECT 
        COUNT(*) as today_invoices,
        COALESCE(SUM(inv.total_cop), 0) as today_revenue_cop
      FROM invoices inv
      ${whereClause} AND date(inv.created_at) = date('now', 'localtime')
    `).get(...params);
        res.json({
            success: true,
            stats: {
                total_invoices: totalStats.total_invoices || 0,
                total_revenue_cop: totalStats.total_revenue_cop || 0,
                average_ticket_cop: Math.round(totalStats.average_ticket_cop || 0),
                today_invoices: todayStats.today_invoices || 0,
                today_revenue_cop: todayStats.today_revenue_cop || 0,
                company: exports.MEVACOL_COMPANY_INFO,
            },
        });
    }
    catch (error) {
        console.error('Error al calcular estadísticas de facturación:', error);
        res.status(500).json({ success: false, error: 'Error interno: ' + error.message });
    }
});
// 2. Listar y Buscar Facturas
exports.invoicesRouter.get('/', (req, res) => {
    try {
        const userRole = req.user.role_code;
        const userId = req.user.id;
        if (userRole === 'ENTREGADOR') {
            res.status(403).json({ success: false, error: 'Acceso denegado.' });
            return;
        }
        const search = req.query.search ? String(req.query.search).trim().toLowerCase() : '';
        const sellerIdFilter = req.query.seller_id ? String(req.query.seller_id).trim() : null;
        const customerIdFilter = req.query.customer_id ? String(req.query.customer_id).trim() : null;
        const startDate = req.query.start_date ? String(req.query.start_date).trim() : null;
        const endDate = req.query.end_date ? String(req.query.end_date).trim() : null;
        let query = `
      SELECT 
        inv.id,
        inv.invoice_code,
        inv.sale_id,
        s.invoice_number as sale_code,
        inv.customer_id,
        c.name as customer_name,
        c.id_number as customer_id_number,
        c.phone as customer_phone,
        c.address as customer_address,
        c.city as customer_city,
        c.email as customer_email,
        inv.seller_user_id,
        u.full_name as seller_name,
        inv.subtotal_cop,
        inv.discount_cop,
        inv.tax_cop,
        inv.total_cop,
        inv.notes,
        inv.dian_status,
        inv.created_at,
        (SELECT COUNT(*) FROM sale_items si WHERE si.sale_id = inv.sale_id) as items_count
      FROM invoices inv
      LEFT JOIN sales s ON inv.sale_id = s.id
      LEFT JOIN customers c ON inv.customer_id = c.id
      LEFT JOIN users u ON inv.seller_user_id = u.id
      WHERE 1=1
    `;
        const params = [];
        // RBAC: Vendedor solo ve las suyas
        if (userRole === 'VENDEDOR') {
            query += ` AND inv.seller_user_id = ?`;
            params.push(userId);
        }
        else if (sellerIdFilter) {
            query += ` AND inv.seller_user_id = ?`;
            params.push(sellerIdFilter);
        }
        if (customerIdFilter) {
            query += ` AND inv.customer_id = ?`;
            params.push(customerIdFilter);
        }
        if (startDate) {
            query += ` AND date(inv.created_at) >= date(?)`;
            params.push(startDate);
        }
        if (endDate) {
            query += ` AND date(inv.created_at) <= date(?)`;
            params.push(endDate);
        }
        if (search) {
            query += ` AND (
        LOWER(inv.invoice_code) LIKE ? OR
        LOWER(s.invoice_number) LIKE ? OR
        LOWER(c.name) LIKE ? OR
        LOWER(c.id_number) LIKE ? OR
        LOWER(u.full_name) LIKE ?
      )`;
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
        }
        query += ` ORDER BY inv.created_at DESC`;
        const invoices = db_1.db.prepare(query).all(...params);
        res.json({
            success: true,
            count: invoices.length,
            invoices,
        });
    }
    catch (error) {
        console.error('Error al listar facturas:', error);
        res.status(500).json({ success: false, error: 'Error al listar facturas: ' + error.message });
    }
});
// 3. Consultar Factura por Venta (saleId)
exports.invoicesRouter.get('/by-sale/:saleId', (req, res) => {
    try {
        const userRole = req.user.role_code;
        const userId = req.user.id;
        const { saleId } = req.params;
        if (userRole === 'ENTREGADOR') {
            res.status(403).json({ success: false, error: 'Acceso denegado.' });
            return;
        }
        const invoice = db_1.db.prepare(`
      SELECT 
        inv.id,
        inv.invoice_code,
        inv.sale_id,
        s.invoice_number as sale_code,
        inv.customer_id,
        c.name as customer_name,
        c.id_number as customer_id_number,
        c.phone as customer_phone,
        c.address as customer_address,
        c.city as customer_city,
        c.email as customer_email,
        inv.seller_user_id,
        u.full_name as seller_name,
        u.username as seller_username,
        inv.subtotal_cop,
        inv.discount_cop,
        inv.tax_cop,
        inv.total_cop,
        inv.notes,
        inv.dian_status,
        inv.dian_cufe,
        inv.created_at,
        inv.updated_at
      FROM invoices inv
      LEFT JOIN sales s ON inv.sale_id = s.id
      LEFT JOIN customers c ON inv.customer_id = c.id
      LEFT JOIN users u ON inv.seller_user_id = u.id
      WHERE inv.sale_id = ?
    `).get(saleId);
        if (!invoice) {
            res.status(404).json({ success: false, error: 'No se encontró factura para la venta indicada.' });
            return;
        }
        // RBAC: Si es vendedor, verificar que sea el dueño de la factura
        if (userRole === 'VENDEDOR' && invoice.seller_user_id !== userId) {
            res.status(403).json({ success: false, error: 'No tienes autorización para ver esta factura.' });
            return;
        }
        // Obtener los productos de la venta asociada
        const items = db_1.db.prepare(`
      SELECT 
        si.id,
        si.product_id,
        p.code as product_code,
        p.name as product_name,
        p.unit_measure,
        si.quantity,
        si.unit_price_cop,
        si.discount_cop,
        si.total_cop
      FROM sale_items si
      LEFT JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = ?
      ORDER BY si.created_at ASC
    `).all(invoice.sale_id);
        res.json({
            success: true,
            invoice: {
                ...invoice,
                company: exports.MEVACOL_COMPANY_INFO,
                items,
            },
        });
    }
    catch (error) {
        console.error('Error al consultar factura por venta:', error);
        res.status(500).json({ success: false, error: 'Error al consultar factura: ' + error.message });
    }
});
// 4. Consultar Detalle Completo de Factura (por id o por invoice_code)
exports.invoicesRouter.get('/:id', (req, res) => {
    try {
        const userRole = req.user.role_code;
        const userId = req.user.id;
        const { id } = req.params;
        if (userRole === 'ENTREGADOR') {
            res.status(403).json({ success: false, error: 'Acceso denegado.' });
            return;
        }
        const invoice = db_1.db.prepare(`
      SELECT 
        inv.id,
        inv.invoice_code,
        inv.sale_id,
        s.invoice_number as sale_code,
        inv.customer_id,
        c.name as customer_name,
        c.id_number as customer_id_number,
        c.phone as customer_phone,
        c.address as customer_address,
        c.city as customer_city,
        c.email as customer_email,
        inv.seller_user_id,
        u.full_name as seller_name,
        u.username as seller_username,
        inv.subtotal_cop,
        inv.discount_cop,
        inv.tax_cop,
        inv.total_cop,
        inv.notes,
        inv.dian_status,
        inv.dian_cufe,
        inv.created_at,
        inv.updated_at
      FROM invoices inv
      LEFT JOIN sales s ON inv.sale_id = s.id
      LEFT JOIN customers c ON inv.customer_id = c.id
      LEFT JOIN users u ON inv.seller_user_id = u.id
      WHERE inv.id = ? OR inv.invoice_code = ?
    `).get(id, id);
        if (!invoice) {
            res.status(404).json({ success: false, error: 'Factura no encontrada.' });
            return;
        }
        // RBAC: Si es vendedor, verificar que le corresponda
        if (userRole === 'VENDEDOR' && invoice.seller_user_id !== userId) {
            res.status(403).json({ success: false, error: 'No tienes autorización para consultar esta factura.' });
            return;
        }
        const items = db_1.db.prepare(`
      SELECT 
        si.id,
        si.product_id,
        p.code as product_code,
        p.name as product_name,
        p.unit_measure,
        si.quantity,
        si.unit_price_cop,
        si.discount_cop,
        si.total_cop
      FROM sale_items si
      LEFT JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = ?
      ORDER BY si.created_at ASC
    `).all(invoice.sale_id);
        res.json({
            success: true,
            invoice: {
                ...invoice,
                company: exports.MEVACOL_COMPANY_INFO,
                items,
            },
        });
    }
    catch (error) {
        console.error('Error al consultar factura:', error);
        res.status(500).json({ success: false, error: 'Error al consultar factura: ' + error.message });
    }
});
// 5. Generar Factura para una Venta existente (si no la tiene)
exports.invoicesRouter.post('/from-sale/:saleId', (req, res) => {
    try {
        const userRole = req.user.role_code;
        const userId = req.user.id;
        const { saleId } = req.params;
        if (userRole === 'ENTREGADOR') {
            res.status(403).json({ success: false, error: 'Acceso denegado.' });
            return;
        }
        // Comprobar si ya existe
        const existing = db_1.db.prepare(`SELECT * FROM invoices WHERE sale_id = ?`).get(saleId);
        if (existing) {
            res.json({
                success: true,
                message: 'La factura ya existía para esta venta.',
                invoice: existing,
            });
            return;
        }
        // Obtener la venta
        const sale = db_1.db.prepare(`SELECT * FROM sales WHERE id = ?`).get(saleId);
        if (!sale) {
            res.status(404).json({ success: false, error: 'Venta no encontrada.' });
            return;
        }
        // RBAC: Si es vendedor, sólo puede facturar sus propias ventas
        if (userRole === 'VENDEDOR' && sale.seller_user_id !== userId) {
            res.status(403).json({ success: false, error: 'No puedes facturar una venta de otro vendedor.' });
            return;
        }
        // Generar consecutivo FAC-XXXX
        const allInvoices = db_1.db.prepare(`SELECT invoice_code FROM invoices`).all();
        let maxFac = 0;
        for (const row of allInvoices) {
            if (row.invoice_code) {
                const m = row.invoice_code.match(/FAC-(\d+)/);
                if (m) {
                    const n = parseInt(m[1], 10);
                    if (!isNaN(n) && n > maxFac)
                        maxFac = n;
                }
            }
        }
        const nextFac = maxFac + 1;
        const invoiceCode = `FAC-${String(nextFac).padStart(4, '0')}`;
        const invoiceId = (0, uuid_1.v4)();
        db_1.db.prepare(`
      INSERT INTO invoices (
        id, invoice_code, sale_id, customer_id, seller_user_id,
        subtotal_cop, discount_cop, tax_cop, total_cop, notes, dian_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'INTERNA', datetime('now'), datetime('now'))
    `).run(invoiceId, invoiceCode, sale.id, sale.customer_id, sale.seller_user_id, sale.subtotal_cop, sale.discount_cop || 0, sale.total_cop, sale.notes || null);
        (0, db_1.recordAuditLog)({
            userId,
            action: 'INVOICE_GENERATE',
            entityName: 'invoices',
            entityId: invoiceId,
            details: {
                invoice_code: invoiceCode,
                sale_id: sale.id,
                sale_code: sale.invoice_number,
                total_cop: sale.total_cop,
            },
            ipAddress: req.ip,
            deviceInfo: req.headers['user-agent'],
        });
        const newInvoice = db_1.db.prepare(`SELECT * FROM invoices WHERE id = ?`).get(invoiceId);
        res.status(201).json({
            success: true,
            message: `Factura ${invoiceCode} generada exitosamente.`,
            invoice: newInvoice,
        });
    }
    catch (error) {
        console.error('Error al generar factura desde venta:', error);
        res.status(500).json({ success: false, error: 'Error al generar factura: ' + error.message });
    }
});
