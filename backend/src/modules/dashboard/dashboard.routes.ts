import { Router, Request, Response } from 'express';
import { db } from '../../database/db';
import { authMiddleware } from '../../middlewares/auth.middleware';

export const dashboardRouter = Router();

// ─── Admin Dashboard: KPIs completos del sistema ───────────────────────────
dashboardRouter.get('/admin', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  if (user.role_code !== 'ADMINISTRADOR') {
    return res.status(403).json({ success: false, error: 'Acceso denegado. Se requiere rol Administrador.' });
  }

  try {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const weekStr = startOfWeek.toISOString().slice(0, 10);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthStr = startOfMonth.toISOString().slice(0, 10);

    // 1. Clientes activos
    const { active_customers } = db.prepare(`SELECT COUNT(*) as active_customers FROM customers WHERE is_active = 1`).get() as any;

    // 2 & 3 & 4. Productos
    const invStats = db.prepare(`
      SELECT
        COUNT(*) as total_products,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_products,
        SUM(CASE WHEN current_stock <= min_stock AND current_stock > 0 AND is_active = 1 THEN 1 ELSE 0 END) as low_stock_count,
        SUM(CASE WHEN current_stock = 0 AND is_active = 1 THEN 1 ELSE 0 END) as out_of_stock_count,
        SUM(current_stock * cost_cop) as total_inventory_cost,
        SUM(current_stock * price_cop) as total_inventory_retail
      FROM products
    `).get() as any;

    // 5-7. Ventas
    const salesToday = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(total_cop), 0) as revenue
      FROM sales WHERE date(created_at) = ?
    `).get(todayStr) as any;

    const salesWeek = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(total_cop), 0) as revenue
      FROM sales WHERE date(created_at) >= ?
    `).get(weekStr) as any;

    const salesMonth = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(total_cop), 0) as revenue
      FROM sales WHERE date(created_at) >= ?
    `).get(monthStr) as any;

    const salesTotal = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(total_cop), 0) as revenue, COALESCE(AVG(total_cop), 0) as avg_ticket
      FROM sales
    `).get() as any;

    // 8. Facturas
    const { total_invoices } = db.prepare(`SELECT COUNT(*) as total_invoices FROM invoices`).get() as any;
    const invoicesToday = db.prepare(`SELECT COUNT(*) as count FROM invoices WHERE date(created_at) = ?`).get(todayStr) as any;

    // 9-12. Entregas
    const delivStats = db.prepare(`
      SELECT
        SUM(CASE WHEN status = 'PENDIENTE' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN status = 'ASIGNADA' THEN 1 ELSE 0 END) as assigned_count,
        SUM(CASE WHEN status = 'EN_CAMINO' THEN 1 ELSE 0 END) as on_the_way_count,
        SUM(CASE WHEN status = 'ENTREGADA' THEN 1 ELSE 0 END) as delivered_count,
        SUM(CASE WHEN status = 'NO_ENTREGADA' THEN 1 ELSE 0 END) as failed_count,
        SUM(CASE WHEN status = 'CANCELADA' THEN 1 ELSE 0 END) as cancelled_count,
        COUNT(*) as total_deliveries,
        SUM(CASE WHEN status = 'ENTREGADA' AND date(delivered_at) = ? THEN 1 ELSE 0 END) as delivered_today
      FROM deliveries
    `).get(todayStr) as any;

    // Total de usuarios por rol
    const usersByRole = db.prepare(`
      SELECT r.code as role_code, COUNT(u.id) as count
      FROM users u JOIN roles r ON u.role_code = r.code
      WHERE u.is_active = 1
      GROUP BY r.code
    `).all() as any[];

    const usersMap: Record<string, number> = {};
    usersByRole.forEach((r: any) => { usersMap[r.role_code] = r.count; });

    return res.json({
      success: true,
      data: {
        customers: {
          active: active_customers,
        },
        products: {
          total: invStats.total_products,
          active: invStats.active_products,
          low_stock: invStats.low_stock_count,
          out_of_stock: invStats.out_of_stock_count,
          total_cost_value: invStats.total_inventory_cost || 0,
          total_retail_value: invStats.total_inventory_retail || 0,
        },
        sales: {
          total_count: salesTotal.count,
          total_revenue_cop: salesTotal.revenue,
          avg_ticket_cop: Math.round(salesTotal.avg_ticket || 0),
          today_count: salesToday.count,
          today_revenue_cop: salesToday.revenue,
          week_count: salesWeek.count,
          week_revenue_cop: salesWeek.revenue,
          month_count: salesMonth.count,
          month_revenue_cop: salesMonth.revenue,
        },
        invoices: {
          total: total_invoices,
          today: invoicesToday.count,
        },
        deliveries: {
          total: delivStats.total_deliveries,
          pending: delivStats.pending_count || 0,
          assigned: delivStats.assigned_count || 0,
          on_the_way: delivStats.on_the_way_count || 0,
          delivered: delivStats.delivered_count || 0,
          failed: delivStats.failed_count || 0,
          cancelled: delivStats.cancelled_count || 0,
          delivered_today: delivStats.delivered_today || 0,
        },
        users: {
          admins: usersMap['ADMINISTRADOR'] || 0,
          sellers: usersMap['VENDEDOR'] || 0,
          deliverers: usersMap['ENTREGADOR'] || 0,
        },
      },
    });
  } catch (err: any) {
    console.error('Error en dashboard admin:', err);
    return res.status(500).json({ success: false, error: 'Error al obtener estadísticas del sistema.' });
  }
});

// ─── Seller Dashboard: Solo métricas del vendedor autenticado ─────────────
dashboardRouter.get('/seller', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  if (user.role_code !== 'ADMINISTRADOR' && user.role_code !== 'VENDEDOR') {
    return res.status(403).json({ success: false, error: 'Acceso denegado.' });
  }

  // Administradores ven todos; vendedores solo los suyos
  const sellerId = user.role_code === 'VENDEDOR' ? user.id : null;

  try {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const weekStr = startOfWeek.toISOString().slice(0, 10);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthStr = startOfMonth.toISOString().slice(0, 10);

    const sellerFilter = sellerId ? `AND seller_user_id = '${sellerId}'` : '';

    const salesTotal = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(total_cop),0) as revenue, COALESCE(AVG(total_cop),0) as avg
      FROM sales WHERE 1=1 ${sellerFilter}
    `).get() as any;

    const salesToday = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(total_cop),0) as revenue
      FROM sales WHERE date(created_at) = ? ${sellerFilter}
    `).get(todayStr) as any;

    const salesWeek = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(total_cop),0) as revenue
      FROM sales WHERE date(created_at) >= ? ${sellerFilter}
    `).get(weekStr) as any;

    const salesMonth = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(total_cop),0) as revenue
      FROM sales WHERE date(created_at) >= ? ${sellerFilter}
    `).get(monthStr) as any;

    const invoiceFilter = sellerId ? `AND seller_user_id = '${sellerId}'` : '';
    const { total_invoices } = db.prepare(`
      SELECT COUNT(*) as total_invoices FROM invoices WHERE 1=1 ${invoiceFilter}
    `).get() as any;

    // Entregas relacionadas con ventas del vendedor
    const delivFilter = sellerId
      ? `AND d.sale_id IN (SELECT id FROM sales WHERE seller_user_id = '${sellerId}')`
      : '';
    const delivStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status='PENDIENTE' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status='EN_CAMINO' THEN 1 ELSE 0 END) as on_the_way,
        SUM(CASE WHEN status='ENTREGADA' THEN 1 ELSE 0 END) as delivered
      FROM deliveries d WHERE 1=1 ${delivFilter}
    `).get() as any;

    // Clientes únicos atendidos
    const { unique_customers } = db.prepare(`
      SELECT COUNT(DISTINCT customer_id) as unique_customers FROM sales WHERE 1=1 ${sellerFilter}
    `).get() as any;

    // Productos disponibles para vender
    const { available_products } = db.prepare(`
      SELECT COUNT(*) as available_products FROM products WHERE is_active = 1 AND current_stock > 0
    `).get() as any;

    return res.json({
      success: true,
      seller_id: sellerId,
      data: {
        sales: {
          total_count: salesTotal.count,
          total_revenue_cop: salesTotal.revenue,
          avg_ticket_cop: Math.round(salesTotal.avg || 0),
          today_count: salesToday.count,
          today_revenue_cop: salesToday.revenue,
          week_count: salesWeek.count,
          week_revenue_cop: salesWeek.revenue,
          month_count: salesMonth.count,
          month_revenue_cop: salesMonth.revenue,
        },
        invoices: { total: total_invoices },
        deliveries: {
          total: delivStats.total || 0,
          pending: delivStats.pending || 0,
          on_the_way: delivStats.on_the_way || 0,
          delivered: delivStats.delivered || 0,
        },
        customers: { unique_customers: unique_customers || 0 },
        products: { available: available_products || 0 },
      },
    });
  } catch (err: any) {
    console.error('Error en dashboard seller:', err);
    return res.status(500).json({ success: false, error: 'Error al obtener estadísticas del vendedor.' });
  }
});

// ─── Deliverer Dashboard: Solo entregas del entregador autenticado ─────────
dashboardRouter.get('/deliverer', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  if (user.role_code !== 'ADMINISTRADOR' && user.role_code !== 'ENTREGADOR') {
    return res.status(403).json({ success: false, error: 'Acceso denegado.' });
  }

  const delivererId = user.role_code === 'ENTREGADOR' ? user.id : null;

  try {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    const delivFilter = delivererId ? `AND delivery_user_id = '${delivererId}'` : '';

    const stats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status='PENDIENTE' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status='ASIGNADA' THEN 1 ELSE 0 END) as assigned,
        SUM(CASE WHEN status='EN_CAMINO' THEN 1 ELSE 0 END) as on_the_way,
        SUM(CASE WHEN status='ENTREGADA' THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN status='NO_ENTREGADA' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status='ENTREGADA' AND date(delivered_at) = ? THEN 1 ELSE 0 END) as delivered_today
      FROM deliveries WHERE 1=1 ${delivFilter}
    `).get(todayStr) as any;

    // Próximas entregas (pendientes o asignadas, ordenadas por fecha)
    const upcoming = db.prepare(`
      SELECT id, delivery_code, customer_name, delivery_address, delivery_city, scheduled_date, status
      FROM deliveries
      WHERE status IN ('PENDIENTE','ASIGNADA','EN_CAMINO') ${delivFilter}
      ORDER BY scheduled_date ASC
      LIMIT 5
    `).all() as any[];

    return res.json({
      success: true,
      deliverer_id: delivererId,
      data: {
        stats: {
          total: stats.total || 0,
          pending: stats.pending || 0,
          assigned: stats.assigned || 0,
          on_the_way: stats.on_the_way || 0,
          delivered: stats.delivered || 0,
          failed: stats.failed || 0,
          delivered_today: stats.delivered_today || 0,
        },
        upcoming,
      },
    });
  } catch (err: any) {
    console.error('Error en dashboard deliverer:', err);
    return res.status(500).json({ success: false, error: 'Error al obtener estadísticas del entregador.' });
  }
});

// ─── Charts: Tendencia de ventas (7 días, 4 semanas, 12 meses) ─────────────
dashboardRouter.get('/charts/sales-trend', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  if (user.role_code !== 'ADMINISTRADOR') {
    return res.status(403).json({ success: false, error: 'Acceso denegado.' });
  }

  try {
    // Últimos 30 días agrupados por día
    const dailyTrend = db.prepare(`
      SELECT
        date(created_at) as day,
        COUNT(*) as sales_count,
        COALESCE(SUM(total_cop), 0) as revenue_cop
      FROM sales
      WHERE date(created_at) >= date('now', '-29 days')
      GROUP BY date(created_at)
      ORDER BY day ASC
    `).all() as any[];

    // Últimas 12 semanas agrupadas
    const weeklyTrend = db.prepare(`
      SELECT
        strftime('%Y-W%W', created_at) as week,
        COUNT(*) as sales_count,
        COALESCE(SUM(total_cop), 0) as revenue_cop
      FROM sales
      WHERE date(created_at) >= date('now', '-83 days')
      GROUP BY strftime('%Y-W%W', created_at)
      ORDER BY week ASC
    `).all() as any[];

    // Últimos 12 meses
    const monthlyTrend = db.prepare(`
      SELECT
        strftime('%Y-%m', created_at) as month,
        COUNT(*) as sales_count,
        COALESCE(SUM(total_cop), 0) as revenue_cop
      FROM sales
      WHERE date(created_at) >= date('now', '-364 days')
      GROUP BY strftime('%Y-%m', created_at)
      ORDER BY month ASC
    `).all() as any[];

    return res.json({
      success: true,
      data: {
        daily: dailyTrend,
        weekly: weeklyTrend,
        monthly: monthlyTrend,
      },
    });
  } catch (err: any) {
    console.error('Error en charts sales-trend:', err);
    return res.status(500).json({ success: false, error: 'Error al obtener tendencia de ventas.' });
  }
});

// ─── Charts: Top productos más vendidos ────────────────────────────────────
dashboardRouter.get('/charts/top-products', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  if (user.role_code !== 'ADMINISTRADOR') {
    return res.status(403).json({ success: false, error: 'Acceso denegado.' });
  }

  try {
    const topProducts = db.prepare(`
      SELECT
        p.name as product_name,
        p.code as product_code,
        p.category,
        SUM(si.quantity) as total_quantity,
        COUNT(DISTINCT si.sale_id) as total_orders,
        COALESCE(SUM(si.total_cop), 0) as total_revenue_cop
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      GROUP BY p.id
      ORDER BY total_quantity DESC
      LIMIT 10
    `).all() as any[];

    return res.json({ success: true, data: topProducts });
  } catch (err: any) {
    console.error('Error en charts top-products:', err);
    return res.status(500).json({ success: false, error: 'Error al obtener productos más vendidos.' });
  }
});

// ─── Charts: Estado de las entregas (para PieChart) ────────────────────────
dashboardRouter.get('/charts/delivery-status', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  if (user.role_code !== 'ADMINISTRADOR') {
    return res.status(403).json({ success: false, error: 'Acceso denegado.' });
  }

  try {
    const statusDist = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM deliveries
      GROUP BY status
      ORDER BY count DESC
    `).all() as any[];

    const statusLabels: Record<string, string> = {
      PENDIENTE: 'Pendiente',
      ASIGNADA: 'Asignada',
      EN_CAMINO: 'En Camino',
      ENTREGADA: 'Entregada',
      NO_ENTREGADA: 'No Entregada',
      CANCELADA: 'Cancelada',
    };

    const data = statusDist.map((s: any) => ({
      status: s.status,
      name: statusLabels[s.status] || s.status,
      value: s.count,
    }));

    return res.json({ success: true, data });
  } catch (err: any) {
    console.error('Error en charts delivery-status:', err);
    return res.status(500).json({ success: false, error: 'Error al obtener distribución de entregas.' });
  }
});

// ─── Charts: Inventario por categoría ──────────────────────────────────────
dashboardRouter.get('/charts/inventory', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  if (user.role_code !== 'ADMINISTRADOR') {
    return res.status(403).json({ success: false, error: 'Acceso denegado.' });
  }

  try {
    const byCategory = db.prepare(`
      SELECT
        category,
        COUNT(*) as product_count,
        SUM(current_stock) as total_units,
        SUM(current_stock * cost_cop) as cost_value,
        SUM(current_stock * price_cop) as retail_value
      FROM products
      WHERE is_active = 1
      GROUP BY category
      ORDER BY retail_value DESC
    `).all() as any[];

    return res.json({ success: true, data: byCategory });
  } catch (err: any) {
    console.error('Error en charts inventory:', err);
    return res.status(500).json({ success: false, error: 'Error al obtener inventario por categoría.' });
  }
});

// ─── Charts: Ventas por vendedor ────────────────────────────────────────────
dashboardRouter.get('/charts/sales-by-seller', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  if (user.role_code !== 'ADMINISTRADOR') {
    return res.status(403).json({ success: false, error: 'Acceso denegado.' });
  }

  try {
    const bySeller = db.prepare(`
      SELECT
        u.full_name as seller_name,
        COUNT(s.id) as sales_count,
        COALESCE(SUM(s.total_cop), 0) as total_revenue_cop,
        COALESCE(AVG(s.total_cop), 0) as avg_ticket
      FROM sales s
      JOIN users u ON s.seller_user_id = u.id
      GROUP BY s.seller_user_id
      ORDER BY total_revenue_cop DESC
      LIMIT 10
    `).all() as any[];

    return res.json({ success: true, data: bySeller });
  } catch (err: any) {
    console.error('Error en charts sales-by-seller:', err);
    return res.status(500).json({ success: false, error: 'Error al obtener ventas por vendedor.' });
  }
});

// ─── Charts: Seller trend (solo para vendedores) ───────────────────────────
dashboardRouter.get('/charts/seller-trend', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  if (user.role_code !== 'ADMINISTRADOR' && user.role_code !== 'VENDEDOR') {
    return res.status(403).json({ success: false, error: 'Acceso denegado.' });
  }

  try {
    const sellerId = user.role_code === 'VENDEDOR' ? user.id : null;
    const sellerFilter = sellerId ? `AND seller_user_id = '${sellerId}'` : '';

    const daily = db.prepare(`
      SELECT
        date(created_at) as day,
        COUNT(*) as sales_count,
        COALESCE(SUM(total_cop), 0) as revenue_cop
      FROM sales
      WHERE date(created_at) >= date('now', '-13 days') ${sellerFilter}
      GROUP BY date(created_at)
      ORDER BY day ASC
    `).all() as any[];

    return res.json({ success: true, data: { daily } });
  } catch (err: any) {
    console.error('Error en seller-trend:', err);
    return res.status(500).json({ success: false, error: 'Error al obtener tendencia del vendedor.' });
  }
});
