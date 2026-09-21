"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportsRouter = void 0;
const express_1 = require("express");
const db_1 = require("../../database/db");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
exports.reportsRouter = (0, express_1.Router)();
const adminOnly = (req, res, next) => {
    const user = req.user;
    if (user.role_code !== 'ADMINISTRADOR') {
        return res.status(403).json({ success: false, error: 'Acceso denegado. Se requiere rol Administrador.' });
    }
    next();
};
exports.reportsRouter.use(auth_middleware_1.authMiddleware);
exports.reportsRouter.use(adminOnly);
function buildDateFilter(field, start, end) {
    const parts = [];
    if (start)
        parts.push(`date(${field}) >= '${start}'`);
    if (end)
        parts.push(`date(${field}) <= '${end}'`);
    return parts.length ? `AND (${parts.join(' AND ')})` : '';
}
// Reporte de Ventas
exports.reportsRouter.get('/sales', async (req, res) => {
    try {
        const { start_date, end_date, customer_id, seller_id, status } = req.query;
        const dateFilter = buildDateFilter('s.created_at', start_date, end_date);
        const customerFilter = customer_id ? `AND s.customer_id = '${customer_id}'` : '';
        const sellerFilter = seller_id ? `AND s.seller_user_id = '${seller_id}'` : '';
        const statusFilter = status ? `AND s.status = '${status}'` : '';
        const rows = await (0, db_1.queryAll)(`
      SELECT s.id, s.invoice_number as sale_code, s.created_at, s.status, s.total_cop, s.subtotal_cop, s.discount_cop,
        c.name as customer_name, c.id_number as customer_id_number, u.full_name as seller_name, i.invoice_code,
        (SELECT COUNT(*) FROM sale_items WHERE sale_id = s.id) as items_count
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN users u ON s.seller_user_id = u.id
      LEFT JOIN invoices i ON s.id = i.sale_id
      WHERE 1=1 ${dateFilter} ${customerFilter} ${sellerFilter} ${statusFilter}
      ORDER BY s.created_at DESC
    `);
        const summary = { total_rows: rows.length, total_revenue_cop: rows.reduce((a, r) => a + (r.total_cop || 0), 0), total_discount_cop: rows.reduce((a, r) => a + (r.discount_cop || 0), 0) };
        return res.json({ success: true, report: 'sales', summary, data: rows });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: 'Error al generar reporte de ventas.' });
    }
});
// Reporte de Productos Vendidos
exports.reportsRouter.get('/products-sold', async (req, res) => {
    try {
        const { start_date, end_date, product_id, seller_id } = req.query;
        const dateFilter = buildDateFilter('s.created_at', start_date, end_date);
        const productFilter = product_id ? `AND si.product_id = '${product_id}'` : '';
        const sellerFilter = seller_id ? `AND s.seller_user_id = '${seller_id}'` : '';
        const rows = await (0, db_1.queryAll)(`
      SELECT p.code as product_code, p.name as product_name, p.category, p.unit_measure,
        SUM(si.quantity) as total_quantity, COUNT(DISTINCT si.sale_id) as total_orders,
        COALESCE(SUM(si.total_cop), 0) as total_revenue_cop, COALESCE(AVG(si.unit_price_cop), 0) as avg_price_cop
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      JOIN products p ON si.product_id = p.id
      WHERE 1=1 ${dateFilter} ${productFilter} ${sellerFilter}
      GROUP BY si.product_id, p.code, p.name, p.category, p.unit_measure
      ORDER BY total_quantity DESC
    `);
        const summary = { total_rows: rows.length, total_units: rows.reduce((a, r) => a + (Number(r.total_quantity) || 0), 0), total_revenue_cop: rows.reduce((a, r) => a + (r.total_revenue_cop || 0), 0) };
        return res.json({ success: true, report: 'products-sold', summary, data: rows });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: 'Error al generar reporte de productos vendidos.' });
    }
});
// Reporte de Inventario Actual
exports.reportsRouter.get('/inventory', async (req, res) => {
    try {
        const { category, stock_level } = req.query;
        const categoryFilter = category ? `AND category = '${category}'` : '';
        let stockFilter = '';
        if (stock_level === 'low')
            stockFilter = 'AND current_stock <= min_stock AND current_stock > 0';
        else if (stock_level === 'out')
            stockFilter = 'AND current_stock = 0';
        else if (stock_level === 'ok')
            stockFilter = 'AND current_stock > min_stock';
        const rows = await (0, db_1.queryAll)(`
      SELECT code as product_code, name as product_name, category, unit_measure, current_stock, min_stock,
        price_cop, cost_cop, (current_stock * cost_cop) as stock_cost_value, (current_stock * price_cop) as stock_retail_value,
        CASE WHEN current_stock = 0 THEN 'AGOTADO' WHEN current_stock <= min_stock THEN 'STOCK_BAJO' ELSE 'DISPONIBLE' END as stock_status,
        is_active, updated_at
      FROM products WHERE 1=1 ${categoryFilter} ${stockFilter}
      ORDER BY category, name
    `);
        const summary = { total_rows: rows.length, total_units: rows.reduce((a, r) => a + (r.current_stock || 0), 0), total_cost_value: rows.reduce((a, r) => a + (r.stock_cost_value || 0), 0), total_retail_value: rows.reduce((a, r) => a + (r.stock_retail_value || 0), 0), low_stock_count: rows.filter((r) => r.stock_status === 'STOCK_BAJO').length, out_of_stock_count: rows.filter((r) => r.stock_status === 'AGOTADO').length };
        return res.json({ success: true, report: 'inventory', summary, data: rows });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: 'Error al generar reporte de inventario.' });
    }
});
// Reporte de Clientes
exports.reportsRouter.get('/customers', async (req, res) => {
    try {
        const { start_date, end_date, status } = req.query;
        const dateFilter = buildDateFilter('c.created_at', start_date, end_date);
        const statusFilter = status !== undefined ? `AND c.is_active = ${status === 'active' ? 1 : 0}` : '';
        const rows = await (0, db_1.queryAll)(`
      SELECT c.id, c.id_number, c.name, c.phone, c.email, c.address, c.city, c.is_active, c.created_at,
        COALESCE((SELECT COUNT(*) FROM sales s WHERE s.customer_id = c.id), 0) as total_purchases,
        COALESCE((SELECT SUM(total_cop) FROM sales s WHERE s.customer_id = c.id), 0) as total_spent_cop,
        u.full_name as created_by
      FROM customers c
      LEFT JOIN users u ON c.created_by_user_id = u.id
      WHERE 1=1 ${dateFilter} ${statusFilter}
      ORDER BY total_spent_cop DESC
    `);
        const summary = { total_rows: rows.length, active_count: rows.filter((r) => r.is_active === 1).length, total_revenue_cop: rows.reduce((a, r) => a + (r.total_spent_cop || 0), 0) };
        return res.json({ success: true, report: 'customers', summary, data: rows });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: 'Error al generar reporte de clientes.' });
    }
});
// Reporte de Facturas
exports.reportsRouter.get('/invoices', async (req, res) => {
    try {
        const { start_date, end_date, customer_id, seller_id } = req.query;
        const dateFilter = buildDateFilter('i.created_at', start_date, end_date);
        const customerFilter = customer_id ? `AND i.customer_id = '${customer_id}'` : '';
        const sellerFilter = seller_id ? `AND i.seller_user_id = '${seller_id}'` : '';
        const rows = await (0, db_1.queryAll)(`
      SELECT i.invoice_code, i.created_at, i.total_cop, i.subtotal_cop, i.discount_cop, i.tax_cop, i.dian_status,
        c.name as customer_name, c.id_number as customer_id_number, u.full_name as seller_name,
        (SELECT COUNT(*) FROM sale_items WHERE sale_id = i.sale_id) as items_count
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN users u ON i.seller_user_id = u.id
      WHERE 1=1 ${dateFilter} ${customerFilter} ${sellerFilter}
      ORDER BY i.created_at DESC
    `);
        const summary = { total_rows: rows.length, total_revenue_cop: rows.reduce((a, r) => a + (r.total_cop || 0), 0), total_discount_cop: rows.reduce((a, r) => a + (r.discount_cop || 0), 0), avg_ticket_cop: rows.length ? Math.round(rows.reduce((a, r) => a + (r.total_cop || 0), 0) / rows.length) : 0 };
        return res.json({ success: true, report: 'invoices', summary, data: rows });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: 'Error al generar reporte de facturas.' });
    }
});
// Reporte de Entregas
exports.reportsRouter.get('/deliveries', async (req, res) => {
    try {
        const { start_date, end_date, deliverer_id, status } = req.query;
        const dateFilter = buildDateFilter('d.created_at', start_date, end_date);
        const delivererFilter = deliverer_id ? `AND d.delivery_user_id = '${deliverer_id}'` : '';
        const statusFilter = status ? `AND d.status = '${status}'` : '';
        const rows = await (0, db_1.queryAll)(`
      SELECT d.delivery_code, d.status, d.scheduled_date, d.delivered_at, d.created_at, d.customer_name, d.customer_phone,
        d.delivery_address, d.delivery_city, d.notes, u.full_name as deliverer_name,
        s.invoice_number as sale_code, s.total_cop as sale_total_cop, i.invoice_code
      FROM deliveries d
      LEFT JOIN users u ON d.delivery_user_id = u.id
      LEFT JOIN sales s ON d.sale_id = s.id
      LEFT JOIN invoices i ON d.invoice_id = i.id
      WHERE 1=1 ${dateFilter} ${delivererFilter} ${statusFilter}
      ORDER BY d.created_at DESC
    `);
        const statusLabels = { PENDIENTE: 'Pendiente', ASIGNADA: 'Asignada', EN_CAMINO: 'En Camino', ENTREGADA: 'Entregada', NO_ENTREGADA: 'No Entregada', CANCELADA: 'Cancelada' };
        const summary = { total_rows: rows.length, delivered_count: rows.filter((r) => r.status === 'ENTREGADA').length, failed_count: rows.filter((r) => r.status === 'NO_ENTREGADA').length, pending_count: rows.filter((r) => r.status === 'PENDIENTE').length };
        return res.json({ success: true, report: 'deliveries', summary, data: rows, statusLabels });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: 'Error al generar reporte de entregas.' });
    }
});
// Opciones de filtro
exports.reportsRouter.get('/filter-options', async (req, res) => {
    try {
        const [sellers, deliverers, customers, products, categories] = await Promise.all([
            (0, db_1.queryAll)(`SELECT id, full_name FROM users WHERE role_code = 'VENDEDOR' AND is_active = 1 ORDER BY full_name`),
            (0, db_1.queryAll)(`SELECT id, full_name FROM users WHERE role_code = 'ENTREGADOR' AND is_active = 1 ORDER BY full_name`),
            (0, db_1.queryAll)(`SELECT id, name, id_number FROM customers WHERE is_active = 1 ORDER BY name`),
            (0, db_1.queryAll)(`SELECT id, code, name, category FROM products WHERE is_active = 1 ORDER BY name`),
            (0, db_1.queryAll)(`SELECT DISTINCT category FROM products WHERE is_active = 1 ORDER BY category`),
        ]);
        return res.json({ success: true, sellers, deliverers, customers, products, categories });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: 'Error al obtener opciones de filtro.' });
    }
});
