import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { queryOne, queryAll, queryRun, recordAuditLog } from '../../database/db';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';

export const sellersRouter = Router();

// Middleware general de autenticación para todas las rutas de sellers
sellersRouter.use(authMiddleware);

// ── Rutas de Transmisión de Ubicación GPS (VENDEDOR y ADMINISTRADOR) ────────
sellersRouter.post(
  '/location',
  requireRole(['VENDEDOR', 'ADMINISTRADOR']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const sellerId = req.user!.id;
      const { latitude, longitude, accuracy } = req.body;

      if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        res.status(400).json({ success: false, error: 'Coordenadas inválidas. Latitud y longitud numéricas requeridas.' });
        return;
      }

      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        res.status(400).json({ success: false, error: 'Coordenadas fuera de rango válido.' });
        return;
      }

      const acc = typeof accuracy === 'number' ? accuracy : null;

      const upsertSql = `
        INSERT INTO seller_locations (seller_user_id, latitude, longitude, accuracy, is_active, updated_at)
        VALUES (?, ?, ?, ?, 1, TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS'))
        ON CONFLICT (seller_user_id) DO UPDATE SET
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          accuracy = EXCLUDED.accuracy,
          is_active = 1,
          updated_at = TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS')
      `;

      try {
        await queryRun(upsertSql, [sellerId, latitude, longitude, acc]);
      } catch (dbErr: any) {
        // Si la tabla aún no existe en producción, crearla al vuelo y reintentar
        if (dbErr.code === '42P01' || dbErr.message?.includes('seller_locations')) {
          await queryRun(`
            CREATE TABLE IF NOT EXISTS seller_locations (
              seller_user_id TEXT PRIMARY KEY,
              latitude REAL NOT NULL,
              longitude REAL NOT NULL,
              accuracy REAL,
              is_active INTEGER NOT NULL DEFAULT 1,
              updated_at TEXT NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS'),
              FOREIGN KEY (seller_user_id) REFERENCES users(id) ON DELETE CASCADE
            )
          `);
          await queryRun(upsertSql, [sellerId, latitude, longitude, acc]);
        } else {
          throw dbErr;
        }
      }

      res.json({
        success: true,
        message: 'Ubicación actualizada exitosamente.',
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('Error al actualizar ubicación del vendedor:', error);
      res.status(500).json({ success: false, error: 'Error al registrar ubicación: ' + error.message });
    }
  }
);

sellersRouter.post(
  '/location/stop',
  requireRole(['VENDEDOR', 'ADMINISTRADOR']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const sellerId = req.user!.id;

      try {
        await queryRun(
          `UPDATE seller_locations
           SET is_active = 0, updated_at = TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS')
           WHERE seller_user_id = ?`,
          [sellerId]
        );
      } catch (dbErr: any) {
        if (!dbErr.message?.includes('seller_locations') && dbErr.code !== '42P01') {
          throw dbErr;
        }
      }

      res.json({
        success: true,
        message: 'Transmisión de ubicación pausada o finalizada.',
      });
    } catch (error: any) {
      console.error('Error al detener transmisión de ubicación:', error);
      res.status(500).json({ success: false, error: 'Error al actualizar estado de ubicación: ' + error.message });
    }
  }
);

// Todas las rutas siguientes requieren rol ADMINISTRADOR
sellersRouter.use(requireRole(['ADMINISTRADOR']));

// ── Rutas de Supervisión de Ubicaciones (Fase 7) ─────────────────────────────
sellersRouter.get('/locations', async (req: Request, res: Response): Promise<void> => {
  try {
    const rows = await queryAll<any>(`
      SELECT
        u.id,
        u.username,
        u.full_name,
        u.phone,
        u.email,
        u.is_active as user_active,
        sl.latitude,
        sl.longitude,
        sl.accuracy,
        sl.is_active as location_active,
        sl.updated_at as location_updated_at,
        COALESCE(st.today_sales_count, 0) as today_sales_count,
        COALESCE(st.today_sales_cop, 0) as today_sales_cop
      FROM users u
      LEFT JOIN seller_locations sl ON sl.seller_user_id = u.id
      LEFT JOIN (
        SELECT seller_user_id, COUNT(*) as today_sales_count, COALESCE(SUM(total_cop), 0) as today_sales_cop
        FROM sales
        WHERE SUBSTRING(created_at, 1, 10) = TO_CHAR(NOW(), 'YYYY-MM-DD')
        GROUP BY seller_user_id
      ) st ON st.seller_user_id = u.id
      WHERE UPPER(TRIM(u.role_code)) = 'VENDEDOR'
      ORDER BY sl.updated_at DESC NULLS LAST, u.full_name ASC
    `);

    const now = Date.now();
    const sellers = rows.map((r) => {
      let freshness: 'LIVE' | 'STALE' | 'OFFLINE' = 'OFFLINE';
      let minutesAgo: number | null = null;

      if (r.location_updated_at && r.latitude != null && r.longitude != null) {
        const locTime = new Date(r.location_updated_at.replace(' ', 'T')).getTime();
        if (!isNaN(locTime)) {
          minutesAgo = Math.max(0, Math.floor((now - locTime) / 60000));
          if (r.location_active === 1 && minutesAgo <= 10) {
            freshness = 'LIVE';
          } else if (r.location_active === 1 && minutesAgo <= 60) {
            freshness = 'STALE';
          } else {
            freshness = 'OFFLINE';
          }
        }
      }

      return {
        id: r.id,
        username: r.username,
        full_name: r.full_name,
        phone: r.phone,
        email: r.email,
        latitude: r.latitude != null ? Number(r.latitude) : null,
        longitude: r.longitude != null ? Number(r.longitude) : null,
        accuracy: r.accuracy != null ? Number(r.accuracy) : null,
        is_active: r.location_active === 1,
        updated_at: r.location_updated_at || null,
        minutes_ago: minutesAgo,
        freshness,
        today_sales_count: Number(r.today_sales_count || 0),
        today_sales_cop: Number(r.today_sales_cop || 0),
      };
    });

    const totalSellers = sellers.length;
    const liveCount = sellers.filter((s) => s.freshness === 'LIVE').length;
    const staleCount = sellers.filter((s) => s.freshness === 'STALE').length;
    const offlineCount = sellers.filter((s) => s.freshness === 'OFFLINE').length;

    res.json({
      success: true,
      summary: {
        total: totalSellers,
        live: liveCount,
        stale: staleCount,
        offline: offlineCount,
      },
      sellers,
    });
  } catch (error: any) {
    console.error('Error al obtener ubicaciones de vendedores:', error);
    res.status(500).json({ success: false, error: 'Error al consultar ubicaciones: ' + error.message });
  }
});

// 1. Estadísticas Globales de Vendedores
sellersRouter.get('/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = await queryOne<any>(`
      SELECT
        COUNT(*) as total_sellers,
        COALESCE(SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END), 0) as active_sellers,
        COALESCE(SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END), 0) as inactive_sellers
      FROM users
      WHERE role_code = 'VENDEDOR'
    `);

    const salesStats = await queryOne<any>(`
      SELECT
        COUNT(*) as total_sales_count,
        COALESCE(SUM(s.total_cop), 0) as total_revenue_cop,
        COALESCE(SUM(CASE WHEN date(s.created_at) = CURRENT_DATE THEN s.total_cop ELSE 0 END), 0) as today_revenue_cop,
        COALESCE(SUM(CASE WHEN date(s.created_at) = CURRENT_DATE THEN 1 ELSE 0 END), 0) as today_sales_count
      FROM sales s
      INNER JOIN users u ON s.seller_user_id = u.id
      WHERE u.role_code = 'VENDEDOR'
    `);

    res.json({
      success: true,
      stats: {
        total_sellers: Number(stats?.total_sellers || 0),
        active_sellers: Number(stats?.active_sellers || 0),
        inactive_sellers: Number(stats?.inactive_sellers || 0),
        total_sales_count: Number(salesStats?.total_sales_count || 0),
        total_revenue_cop: Number(salesStats?.total_revenue_cop || 0),
        today_revenue_cop: Number(salesStats?.today_revenue_cop || 0),
        today_sales_count: Number(salesStats?.today_sales_count || 0),
      },
    });
  } catch (error: any) {
    console.error('Error al obtener estadísticas de vendedores:', error);
    res.status(500).json({ success: false, error: 'Error al consultar estadísticas: ' + error.message });
  }
});

// 2. Listar Vendedores con Métricas de Desempeño Comercial
sellersRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const search = req.query.search ? String(req.query.search).trim().toLowerCase() : '';
    const status = req.query.status ? String(req.query.status).trim().toLowerCase() : '';

    let query = `
      SELECT
        u.id,
        u.username,
        u.full_name,
        u.document_id,
        u.email,
        u.phone,
        u.address,
        u.role_code,
        r.name as role_name,
        u.is_active,
        u.created_at,
        u.updated_at,
        COALESCE(sales_summary.total_count, 0) as total_sales_count,
        COALESCE(sales_summary.total_cop, 0) as total_sales_cop,
        COALESCE(sales_today.today_count, 0) as today_sales_count,
        COALESCE(sales_today.today_cop, 0) as today_sales_cop,
        COALESCE(sales_month.month_count, 0) as month_sales_count,
        COALESCE(sales_month.month_cop, 0) as month_sales_cop
      FROM users u
      LEFT JOIN roles r ON u.role_code = r.code
      LEFT JOIN (
        SELECT seller_user_id, COUNT(*) as total_count, SUM(total_cop) as total_cop
        FROM sales GROUP BY seller_user_id
      ) sales_summary ON sales_summary.seller_user_id = u.id
      LEFT JOIN (
        SELECT seller_user_id, COUNT(*) as today_count, SUM(total_cop) as today_cop
        FROM sales WHERE date(created_at) = CURRENT_DATE GROUP BY seller_user_id
      ) sales_today ON sales_today.seller_user_id = u.id
      LEFT JOIN (
        SELECT seller_user_id, COUNT(*) as month_count, SUM(total_cop) as month_cop
        FROM sales WHERE date(created_at) >= date_trunc('month', CURRENT_DATE) GROUP BY seller_user_id
      ) sales_month ON sales_month.seller_user_id = u.id
      WHERE u.role_code = 'VENDEDOR'
    `;

    const params: any[] = [];

    if (search) {
      query += ` AND (
        LOWER(u.full_name) LIKE ? OR
        LOWER(u.username) LIKE ? OR
        LOWER(COALESCE(u.document_id, '')) LIKE ? OR
        LOWER(COALESCE(u.phone, '')) LIKE ? OR
        LOWER(COALESCE(u.email, '')) LIKE ?
      )`;
      const p = `%${search}%`;
      params.push(p, p, p, p, p);
    }

    if (status === 'active') {
      query += ` AND u.is_active = 1`;
    } else if (status === 'inactive') {
      query += ` AND u.is_active = 0`;
    }

    query += ` ORDER BY u.created_at DESC`;

    const rawSellers = await queryAll<any>(query, params);

    const sellers = rawSellers.map((s) => ({
      ...s,
      total_sales_count: Number(s.total_sales_count || 0),
      total_sales_cop: Number(s.total_sales_cop || 0),
      today_sales_count: Number(s.today_sales_count || 0),
      today_sales_cop: Number(s.today_sales_cop || 0),
      month_sales_count: Number(s.month_sales_count || 0),
      month_sales_cop: Number(s.month_sales_cop || 0),
    }));

    res.json({ success: true, count: sellers.length, sellers });
  } catch (error: any) {
    console.error('Error al listar vendedores:', error);
    res.status(500).json({ success: false, error: 'Error al consultar vendedores: ' + error.message });
  }
});

// 3. Consultar Detalle de un Vendedor
sellersRouter.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const seller = await queryOne<any>(`
      SELECT
        u.id, u.username, u.full_name, u.document_id, u.email, u.phone, u.address,
        u.role_code, r.name as role_name, u.is_active, u.created_at, u.updated_at
      FROM users u
      LEFT JOIN roles r ON u.role_code = r.code
      WHERE u.id = ? AND u.role_code = 'VENDEDOR'
    `, [id]);

    if (!seller) {
      res.status(404).json({ success: false, error: 'Vendedor no encontrado.' });
      return;
    }

    // Métricas del vendedor
    const metrics = await queryOne<any>(`
      SELECT
        COUNT(*) as total_sales_count,
        COALESCE(SUM(total_cop), 0) as total_sales_cop,
        COALESCE(SUM(CASE WHEN date(created_at) = CURRENT_DATE THEN 1 ELSE 0 END), 0) as today_sales_count,
        COALESCE(SUM(CASE WHEN date(created_at) = CURRENT_DATE THEN total_cop ELSE 0 END), 0) as today_sales_cop,
        COALESCE(SUM(CASE WHEN date(created_at) >= date_trunc('month', CURRENT_DATE) THEN 1 ELSE 0 END), 0) as month_sales_count,
        COALESCE(SUM(CASE WHEN date(created_at) >= date_trunc('month', CURRENT_DATE) THEN total_cop ELSE 0 END), 0) as month_sales_cop,
        MIN(created_at) as first_sale_at,
        MAX(created_at) as last_sale_at
      FROM sales
      WHERE seller_user_id = ?
    `, [id]);

    res.json({
      success: true,
      seller: {
        ...seller,
        total_sales_count: Number(metrics?.total_sales_count || 0),
        total_sales_cop: Number(metrics?.total_sales_cop || 0),
        today_sales_count: Number(metrics?.today_sales_count || 0),
        today_sales_cop: Number(metrics?.today_sales_cop || 0),
        month_sales_count: Number(metrics?.month_sales_count || 0),
        month_sales_cop: Number(metrics?.month_sales_cop || 0),
        first_sale_at: metrics?.first_sale_at || null,
        last_sale_at: metrics?.last_sale_at || null,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Error al consultar vendedor: ' + error.message });
  }
});

// 4. Consultar Historial de Ventas de un Vendedor Específico
sellersRouter.get('/:id/sales', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const search = req.query.search ? String(req.query.search).trim().toLowerCase() : '';
    const status = req.query.status ? String(req.query.status).trim() : '';

    const sellerExists = await queryOne(`SELECT id, full_name FROM users WHERE id = ? AND role_code = 'VENDEDOR'`, [id]);
    if (!sellerExists) {
      res.status(404).json({ success: false, error: 'Vendedor no encontrado.' });
      return;
    }

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
      WHERE s.seller_user_id = ?
    `;
    const params: any[] = [id];

    if (status) {
      query += ` AND s.status = ?`;
      params.push(status);
    }

    if (search) {
      query += ` AND (LOWER(s.invoice_number) LIKE ? OR LOWER(COALESCE(inv.invoice_code, '')) LIKE ? OR LOWER(c.name) LIKE ? OR LOWER(c.id_number) LIKE ?)`;
      const p = `%${search}%`;
      params.push(p, p, p, p);
    }

    query += ` ORDER BY s.created_at DESC`;

    const sales = await queryAll<any>(query, params);
    res.json({ success: true, count: sales.length, sales, seller: sellerExists });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Error al consultar historial de ventas del vendedor: ' + error.message });
  }
});

// 5. Crear Nuevo Vendedor (Rol VENDEDOR)
sellersRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      username,
      full_name,
      document_id,
      password,
      email,
      phone,
      address,
    } = req.body;

    if (!username || !full_name || !password) {
      res.status(400).json({
        success: false,
        error: 'El nombre de usuario, nombre completo y contraseña son obligatorios.',
      });
      return;
    }

    const cleanUsername = String(username).trim().toLowerCase();
    if (cleanUsername.length < 3) {
      res.status(400).json({ success: false, error: 'El nombre de usuario debe tener mínimo 3 caracteres.' });
      return;
    }

    if (String(password).length < 6) {
      res.status(400).json({ success: false, error: 'La contraseña de acceso debe tener mínimo 6 caracteres.' });
      return;
    }

    // Comprobar unicidad de usuario y correo
    const existing = await queryOne(`
      SELECT id FROM users
      WHERE LOWER(username) = ? OR (email IS NOT NULL AND LOWER(email) = ?)
    `, [cleanUsername, email ? String(email).trim().toLowerCase() : '']);

    if (existing) {
      res.status(400).json({
        success: false,
        error: 'Ya existe un usuario con ese nombre de usuario o correo electrónico.',
      });
      return;
    }

    const newId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);
    const cleanDoc = document_id ? String(document_id).trim() : null;
    const cleanPhone = phone ? String(phone).trim() : null;
    const cleanEmail = email ? String(email).trim().toLowerCase() : null;
    const cleanAddress = address ? String(address).trim() : null;

    await queryRun(`
      INSERT INTO users (
        id, username, full_name, document_id, email, password_hash,
        role_code, phone, address, is_active, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, 'VENDEDOR', ?, ?, 1, NOW(), NOW())
    `, [
      newId,
      cleanUsername,
      String(full_name).trim(),
      cleanDoc,
      cleanEmail,
      passwordHash,
      cleanPhone,
      cleanAddress,
    ]);

    recordAuditLog({
      userId: req.user!.id,
      action: 'SELLER_CREATED',
      entityName: 'users',
      entityId: newId,
      details: {
        username: cleanUsername,
        full_name: String(full_name).trim(),
        document_id: cleanDoc,
        role: 'VENDEDOR',
      },
      ipAddress: req.ip,
      deviceInfo: req.headers['user-agent'],
    });

    res.status(201).json({
      success: true,
      message: `Vendedor '${cleanUsername}' registrado exitosamente con rol VENDEDOR.`,
      seller: {
        id: newId,
        username: cleanUsername,
        full_name: String(full_name).trim(),
        document_id: cleanDoc,
        email: cleanEmail,
        phone: cleanPhone,
        address: cleanAddress,
        role_code: 'VENDEDOR',
        role_name: 'Vendedor',
        is_active: 1,
      },
    });
  } catch (error: any) {
    console.error('Error al registrar vendedor:', error);
    res.status(500).json({ success: false, error: 'Error al registrar vendedor: ' + error.message });
  }
});

// 6. Actualizar Información de un Vendedor
sellersRouter.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { full_name, document_id, phone, email, address, password } = req.body;

    const existing = await queryOne<any>(`SELECT id, username FROM users WHERE id = ? AND role_code = 'VENDEDOR'`, [id]);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Vendedor no encontrado.' });
      return;
    }

    if (!full_name || !String(full_name).trim()) {
      res.status(400).json({ success: false, error: 'El nombre completo es requerido.' });
      return;
    }

    let passwordClause = '';
    const params: any[] = [
      String(full_name).trim(),
      document_id ? String(document_id).trim() : null,
      phone ? String(phone).trim() : null,
      email ? String(email).trim().toLowerCase() : null,
      address ? String(address).trim() : null,
    ];

    if (password && String(password).trim().length >= 6) {
      const newHash = await bcrypt.hash(String(password).trim(), 10);
      passwordClause = ', password_hash = ?';
      params.push(newHash);
    }

    params.push(id);

    await queryRun(`
      UPDATE users
      SET
        full_name = ?,
        document_id = ?,
        phone = ?,
        email = ?,
        address = ?
        ${passwordClause},
        updated_at = NOW()
      WHERE id = ? AND role_code = 'VENDEDOR'
    `, params);

    recordAuditLog({
      userId: req.user!.id,
      action: 'SELLER_UPDATED',
      entityName: 'users',
      entityId: String(id),
      details: {
        username: existing.username,
        full_name,
        document_id,
        phone,
        email,
        address,
        passwordUpdated: !!password,
      },
      ipAddress: req.ip,
      deviceInfo: req.headers['user-agent'],
    });

    res.json({
      success: true,
      message: 'Datos del vendedor actualizados correctamente.',
    });
  } catch (error: any) {
    console.error('Error al actualizar vendedor:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar vendedor: ' + error.message });
  }
});

// 7. Activar o Desactivar Vendedor
sellersRouter.patch('/:id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const existing = await queryOne<any>(`SELECT id, username, is_active FROM users WHERE id = ? AND role_code = 'VENDEDOR'`, [id]);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Vendedor no encontrado.' });
      return;
    }

    const newStatus = (is_active === true || is_active === 1 || is_active === '1') ? 1 : 0;

    await queryRun(`UPDATE users SET is_active = ?, updated_at = NOW() WHERE id = ?`, [newStatus, id]);

    recordAuditLog({
      userId: req.user!.id,
      action: 'SELLER_STATUS_UPDATED',
      entityName: 'users',
      entityId: String(id),
      details: { username: existing.username, newStatus },
      ipAddress: req.ip,
      deviceInfo: req.headers['user-agent'],
    });

    res.json({
      success: true,
      message: `El vendedor ${existing.username} ha sido ${newStatus === 1 ? 'activado' : 'desactivado'}.`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Error al cambiar estado del vendedor: ' + error.message });
  }
});

// 8. Eliminar Vendedor (Con Validación de Integridad y Contraseña de Admin)
sellersRouter.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { admin_password } = req.body;

    if (!admin_password) {
      res.status(400).json({ success: false, error: 'Se requiere la contraseña del administrador para confirmar la eliminación.' });
      return;
    }

    // Verificar contraseña del administrador en sesión
    const admin = await queryOne<{ password_hash: string }>(`SELECT password_hash FROM users WHERE id = ?`, [req.user!.id]);
    if (!admin || !(await bcrypt.compare(admin_password, admin.password_hash))) {
      res.status(403).json({ success: false, error: 'Contraseña de administrador incorrecta.' });
      return;
    }

    const seller = await queryOne<any>(`SELECT id, username FROM users WHERE id = ? AND role_code = 'VENDEDOR'`, [id]);
    if (!seller) {
      res.status(404).json({ success: false, error: 'Vendedor no encontrado.' });
      return;
    }

    // Verificar si tiene ventas registradas en el sistema
    const salesCount = await queryOne<{ count: string }>(`SELECT COUNT(*) as count FROM sales WHERE seller_user_id = ?`, [id]);
    if (parseInt(salesCount?.count ?? '0', 10) > 0) {
      res.status(400).json({
        success: false,
        error: `No es posible eliminar al vendedor '${seller.username}' porque tiene ${salesCount?.count} venta(s) registrada(s) en el sistema comercial. Por razones de trazabilidad, se recomienda desactivar su acceso.`,
      });
      return;
    }

    await queryRun(`DELETE FROM users WHERE id = ? AND role_code = 'VENDEDOR'`, [id]);

    recordAuditLog({
      userId: req.user!.id,
      action: 'SELLER_DELETED',
      entityName: 'users',
      entityId: String(id),
      details: { username: seller.username },
      ipAddress: req.ip,
      deviceInfo: req.headers['user-agent'],
    });

    res.json({
      success: true,
      message: `El vendedor '${seller.username}' ha sido eliminado del sistema.`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Error al eliminar vendedor: ' + error.message });
  }
});
