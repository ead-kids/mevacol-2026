import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { queryOne, queryAll, queryRun, recordAuditLog } from '../../database/db';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';

export const discountsRouter = Router();

// Middleware general de autenticación para todas las rutas de descuentos
discountsRouter.use(authMiddleware);

// ── Rutas para Consulta de Descuentos Activos (VENDEDOR y ADMINISTRADOR) ─────
/**
 * GET /active
 * Devuelve todos los descuentos vigentes (activos hoy entre start_date y end_date).
 * Utilizado por el catálogo de productos y el flujo de ventas para aplicar descuentos en tiempo real.
 */
discountsRouter.get('/active', async (req: Request, res: Response): Promise<void> => {
  try {
    const rows = await queryAll<any>(`
      SELECT
        d.id,
        d.code,
        d.name,
        d.description,
        d.discount_type,
        d.value,
        d.product_id,
        d.min_quantity,
        d.start_date,
        d.end_date,
        d.is_active,
        d.created_at,
        p.name as product_name,
        p.code as product_code,
        p.price_cop as product_price_cop
      FROM discounts d
      LEFT JOIN products p ON p.id = d.product_id
      WHERE d.is_active = 1
        AND SUBSTRING(d.start_date, 1, 10) <= TO_CHAR(NOW(), 'YYYY-MM-DD')
        AND SUBSTRING(d.end_date, 1, 10) >= TO_CHAR(NOW(), 'YYYY-MM-DD')
      ORDER BY d.value DESC, d.created_at DESC
    `);

    const discounts = rows.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description || null,
      discount_type: r.discount_type,
      value: Number(r.value),
      product_id: r.product_id || null,
      min_quantity: Number(r.min_quantity || 1),
      start_date: r.start_date,
      end_date: r.end_date,
      is_active: r.is_active === 1,
      product_name: r.product_name || null,
      product_code: r.product_code || null,
      product_price_cop: r.product_price_cop != null ? Number(r.product_price_cop) : null,
      created_at: r.created_at,
    }));

    res.json({
      success: true,
      count: discounts.length,
      discounts,
    });
  } catch (error: any) {
    console.error('Error al obtener descuentos activos:', error);
    res.status(500).json({ success: false, error: 'Error al consultar descuentos activos: ' + error.message });
  }
});

// ── Rutas de Administración de Descuentos (Solo ADMINISTRADOR) ───────────────
discountsRouter.use(requireRole(['ADMINISTRADOR']));

/**
 * GET /stats
 * Métricas globales del sistema de promociones y descuentos.
 */
discountsRouter.get('/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const today = new Date().toISOString().substring(0, 10);

    const counts = await queryOne<any>(`
      SELECT
        COUNT(*) as total_discounts,
        COALESCE(SUM(CASE WHEN is_active = 1 AND SUBSTRING(start_date, 1, 10) <= '${today}' AND SUBSTRING(end_date, 1, 10) >= '${today}' THEN 1 ELSE 0 END), 0) as active_count,
        COALESCE(SUM(CASE WHEN SUBSTRING(end_date, 1, 10) < '${today}' THEN 1 ELSE 0 END), 0) as expired_count,
        COALESCE(SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END), 0) as inactive_count
      FROM discounts
    `);

    // Ahorro total acumulado en ventas otorgado a clientes
    const savingsRow = await queryOne<any>(`
      SELECT
        COALESCE(SUM(discount_cop), 0) as total_discount_granted_cop,
        COUNT(*) as total_discounted_sales
      FROM sales
      WHERE discount_cop > 0
    `);

    res.json({
      success: true,
      stats: {
        total: parseInt(counts?.total_discounts ?? '0', 10),
        active: parseInt(counts?.active_count ?? '0', 10),
        expired: parseInt(counts?.expired_count ?? '0', 10),
        inactive: parseInt(counts?.inactive_count ?? '0', 10),
        total_discount_granted_cop: parseInt(savingsRow?.total_discount_granted_cop ?? '0', 10),
        total_discounted_sales: parseInt(savingsRow?.total_discounted_sales ?? '0', 10),
      },
    });
  } catch (error: any) {
    console.error('Error al obtener estadísticas de descuentos:', error);
    res.status(500).json({ success: false, error: 'Error al consultar estadísticas: ' + error.message });
  }
});

/**
 * GET /
 * Lista todos los descuentos con filtros de búsqueda y estado.
 */
discountsRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const search = req.query.search ? String(req.query.search).trim().toLowerCase() : '';
    const status = req.query.status ? String(req.query.status).trim().toLowerCase() : 'all';
    const productId = req.query.product_id ? String(req.query.product_id).trim() : '';

    const today = new Date().toISOString().substring(0, 10);
    const conditions: string[] = ['1=1'];
    const params: any[] = [];

    if (search) {
      conditions.push('(LOWER(d.name) LIKE ? OR LOWER(d.code) LIKE ? OR LOWER(COALESCE(p.name, "")) LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (productId) {
      conditions.push('d.product_id = ?');
      params.push(productId);
    }

    if (status === 'active') {
      conditions.push(`d.is_active = 1 AND SUBSTRING(d.start_date, 1, 10) <= '${today}' AND SUBSTRING(d.end_date, 1, 10) >= '${today}'`);
    } else if (status === 'expired') {
      conditions.push(`SUBSTRING(d.end_date, 1, 10) < '${today}'`);
    } else if (status === 'inactive') {
      conditions.push('d.is_active = 0');
    }

    const whereClause = conditions.join(' AND ');

    const rows = await queryAll<any>(`
      SELECT
        d.id,
        d.code,
        d.name,
        d.description,
        d.discount_type,
        d.value,
        d.product_id,
        d.min_quantity,
        d.start_date,
        d.end_date,
        d.is_active,
        d.created_at,
        d.updated_at,
        p.name as product_name,
        p.code as product_code,
        p.price_cop as product_price_cop
      FROM discounts d
      LEFT JOIN products p ON p.id = d.product_id
      WHERE ${whereClause}
      ORDER BY d.created_at DESC
    `, params);

    const discounts = rows.map((r) => {
      const isExpired = r.end_date ? r.end_date.substring(0, 10) < today : false;
      const isUpcoming = r.start_date ? r.start_date.substring(0, 10) > today : false;
      let computedStatus: 'ACTIVE' | 'EXPIRED' | 'UPCOMING' | 'INACTIVE' = 'ACTIVE';

      if (r.is_active !== 1) {
        computedStatus = 'INACTIVE';
      } else if (isExpired) {
        computedStatus = 'EXPIRED';
      } else if (isUpcoming) {
        computedStatus = 'UPCOMING';
      }

      return {
        id: r.id,
        code: r.code,
        name: r.name,
        description: r.description || null,
        discount_type: r.discount_type,
        value: Number(r.value),
        product_id: r.product_id || null,
        min_quantity: Number(r.min_quantity || 1),
        start_date: r.start_date,
        end_date: r.end_date,
        is_active: r.is_active === 1,
        computed_status: computedStatus,
        product_name: r.product_name || null,
        product_code: r.product_code || null,
        product_price_cop: r.product_price_cop != null ? Number(r.product_price_cop) : null,
        created_at: r.created_at,
        updated_at: r.updated_at,
      };
    });

    res.json({
      success: true,
      count: discounts.length,
      discounts,
    });
  } catch (error: any) {
    console.error('Error al listar descuentos:', error);
    res.status(500).json({ success: false, error: 'Error al consultar descuentos: ' + error.message });
  }
});

/**
 * GET /:id
 * Detalle de un descuento específico.
 */
discountsRouter.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const row = await queryOne<any>(`
      SELECT
        d.*,
        p.name as product_name,
        p.code as product_code,
        p.price_cop as product_price_cop
      FROM discounts d
      LEFT JOIN products p ON p.id = d.product_id
      WHERE d.id = ?
    `, [id]);

    if (!row) {
      res.status(404).json({ success: false, error: 'Descuento no encontrado.' });
      return;
    }

    res.json({
      success: true,
      discount: {
        id: row.id,
        code: row.code,
        name: row.name,
        description: row.description || null,
        discount_type: row.discount_type,
        value: Number(row.value),
        product_id: row.product_id || null,
        min_quantity: Number(row.min_quantity || 1),
        start_date: row.start_date,
        end_date: row.end_date,
        is_active: row.is_active === 1,
        product_name: row.product_name || null,
        product_code: row.product_code || null,
        product_price_cop: row.product_price_cop != null ? Number(row.product_price_cop) : null,
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Error al consultar descuento: ' + error.message });
  }
});

/**
 * POST /
 * Crear un nuevo descuento (Solo ADMINISTRADOR).
 */
discountsRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      code,
      name,
      description,
      discount_type,
      value,
      product_id,
      min_quantity,
      start_date,
      end_date,
      is_active,
    } = req.body;

    // 1. Validaciones de campos obligatorios
    if (!name || !String(name).trim()) {
      res.status(400).json({ success: false, error: 'El nombre del descuento es requerido.' });
      return;
    }

    const cleanType = String(discount_type || '').toUpperCase().trim();
    if (cleanType !== 'PERCENTAGE' && cleanType !== 'FIXED') {
      res.status(400).json({ success: false, error: 'El tipo de descuento debe ser PERCENTAGE (porcentaje) o FIXED (monto fijo).' });
      return;
    }

    const numValue = Number(value);
    if (isNaN(numValue) || numValue <= 0) {
      res.status(400).json({ success: false, error: 'El valor del descuento debe ser un número positivo mayor a 0.' });
      return;
    }

    if (cleanType === 'PERCENTAGE' && numValue > 100) {
      res.status(400).json({ success: false, error: 'El porcentaje de descuento no puede ser mayor al 100%.' });
      return;
    }

    if (!start_date || !end_date) {
      res.status(400).json({ success: false, error: 'Las fechas de inicio y finalización son requeridas.' });
      return;
    }

    const cleanStart = String(start_date).trim();
    const cleanEnd = String(end_date).trim();

    if (cleanEnd < cleanStart) {
      res.status(400).json({ success: false, error: 'La fecha de finalización no puede ser anterior a la fecha de inicio.' });
      return;
    }

    // 2. Validar producto si se especificó
    let cleanProductId: string | null = null;
    let productPrice = 0;
    if (product_id && String(product_id).trim()) {
      cleanProductId = String(product_id).trim();
      const product = await queryOne<any>(`SELECT id, name, price_cop FROM products WHERE id = ?`, [cleanProductId]);
      if (!product) {
        res.status(400).json({ success: false, error: 'El producto especificado no existe en el catálogo.' });
        return;
      }
      productPrice = Number(product.price_cop);
      if (cleanType === 'FIXED' && numValue >= productPrice) {
        res.status(400).json({
          success: false,
          error: `El descuento fijo ($${numValue.toLocaleString('es-CO')}) no puede ser igual o mayor al precio base del producto ($${productPrice.toLocaleString('es-CO')}).`,
        });
        return;
      }
    }

    // 3. Generar o limpiar código único
    let cleanCode = code ? String(code).trim().toUpperCase() : '';
    if (!cleanCode) {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      cleanCode = `DESC-${randomSuffix}`;
    }

    // Comprobar unicidad del código
    const existing = await queryOne<any>(`SELECT id FROM discounts WHERE UPPER(code) = ?`, [cleanCode]);
    if (existing) {
      res.status(400).json({ success: false, error: `Ya existe un descuento con el código '${cleanCode}'. Ingrese uno diferente.` });
      return;
    }

    const newId = uuidv4();
    const activeStatus = is_active === false || is_active === 0 ? 0 : 1;
    const minQty = Math.max(1, Math.round(Number(min_quantity || 1)));

    await queryRun(`
      INSERT INTO discounts (
        id, code, name, description, discount_type, value,
        product_id, min_quantity, start_date, end_date, is_active,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      newId,
      cleanCode,
      String(name).trim(),
      description ? String(description).trim() : null,
      cleanType,
      numValue,
      cleanProductId,
      minQty,
      cleanStart,
      cleanEnd,
      activeStatus,
    ]);

    recordAuditLog({
      userId: req.user!.id,
      action: 'DISCOUNT_CREATED',
      entityName: 'discounts',
      entityId: newId,
      details: {
        code: cleanCode,
        name: String(name).trim(),
        type: cleanType,
        value: numValue,
        product_id: cleanProductId,
        start_date: cleanStart,
        end_date: cleanEnd,
      },
      ipAddress: req.ip,
      deviceInfo: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null,
    });

    res.status(201).json({
      success: true,
      message: `Descuento '${cleanCode}' creado exitosamente.`,
      discount_id: newId,
      code: cleanCode,
    });
  } catch (error: any) {
    console.error('Error al crear descuento:', error);
    res.status(500).json({ success: false, error: 'Error al registrar descuento: ' + error.message });
  }
});

/**
 * PUT /:id
 * Actualizar un descuento existente (Solo ADMINISTRADOR).
 */
discountsRouter.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      discount_type,
      value,
      product_id,
      min_quantity,
      start_date,
      end_date,
      is_active,
    } = req.body;

    const existing = await queryOne<any>(`SELECT id, code FROM discounts WHERE id = ?`, [id]);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Descuento no encontrado.' });
      return;
    }

    if (!name || !String(name).trim()) {
      res.status(400).json({ success: false, error: 'El nombre del descuento es requerido.' });
      return;
    }

    const cleanType = String(discount_type || '').toUpperCase().trim();
    if (cleanType !== 'PERCENTAGE' && cleanType !== 'FIXED') {
      res.status(400).json({ success: false, error: 'El tipo debe ser PERCENTAGE o FIXED.' });
      return;
    }

    const numValue = Number(value);
    if (isNaN(numValue) || numValue <= 0) {
      res.status(400).json({ success: false, error: 'El valor debe ser mayor a cero.' });
      return;
    }

    if (cleanType === 'PERCENTAGE' && numValue > 100) {
      res.status(400).json({ success: false, error: 'El porcentaje no puede ser mayor al 100%.' });
      return;
    }

    const cleanStart = String(start_date).trim();
    const cleanEnd = String(end_date).trim();

    if (cleanEnd < cleanStart) {
      res.status(400).json({ success: false, error: 'La fecha final no puede ser anterior a la inicial.' });
      return;
    }

    let cleanProductId: string | null = null;
    if (product_id && String(product_id).trim()) {
      cleanProductId = String(product_id).trim();
      const product = await queryOne<any>(`SELECT id, price_cop FROM products WHERE id = ?`, [cleanProductId]);
      if (!product) {
        res.status(400).json({ success: false, error: 'El producto especificado no existe.' });
        return;
      }
      if (cleanType === 'FIXED' && numValue >= Number(product.price_cop)) {
        res.status(400).json({ success: false, error: 'El descuento fijo no puede ser mayor o igual al precio del producto.' });
        return;
      }
    }

    const activeStatus = is_active === false || is_active === 0 ? 0 : 1;
    const minQty = Math.max(1, Math.round(Number(min_quantity || 1)));

    await queryRun(`
      UPDATE discounts
      SET
        name = ?,
        description = ?,
        discount_type = ?,
        value = ?,
        product_id = ?,
        min_quantity = ?,
        start_date = ?,
        end_date = ?,
        is_active = ?,
        updated_at = NOW()
      WHERE id = ?
    `, [
      String(name).trim(),
      description ? String(description).trim() : null,
      cleanType,
      numValue,
      cleanProductId,
      minQty,
      cleanStart,
      cleanEnd,
      activeStatus,
      id,
    ]);

    recordAuditLog({
      userId: req.user!.id,
      action: 'DISCOUNT_UPDATED',
      entityName: 'discounts',
      entityId: String(id),
      details: { name, type: cleanType, value: numValue, product_id: cleanProductId },
      ipAddress: req.ip,
      deviceInfo: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null,
    });

    res.json({
      success: true,
      message: 'Descuento actualizado exitosamente.',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Error al actualizar descuento: ' + error.message });
  }
});

/**
 * PATCH /:id/status
 * Activar o desactivar descuento (Solo ADMINISTRADOR).
 */
discountsRouter.patch('/:id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const existing = await queryOne<any>(`SELECT id, name, code, is_active FROM discounts WHERE id = ?`, [id]);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Descuento no encontrado.' });
      return;
    }

    const newStatus = is_active === true || is_active === 1 || is_active === '1' ? 1 : 0;

    await queryRun(`UPDATE discounts SET is_active = ?, updated_at = NOW() WHERE id = ?`, [newStatus, id]);

    recordAuditLog({
      userId: req.user!.id,
      action: 'DISCOUNT_STATUS_TOGGLED',
      entityName: 'discounts',
      entityId: String(id),
      details: { code: existing.code, newStatus },
      ipAddress: req.ip,
      deviceInfo: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null,
    });

    res.json({
      success: true,
      message: `El descuento '${existing.code}' ha sido ${newStatus === 1 ? 'activado' : 'desactivado'}.`,
      is_active: newStatus === 1,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Error al cambiar estado: ' + error.message });
  }
});

/**
 * DELETE /:id
 * Eliminar descuento (Solo ADMINISTRADOR).
 */
discountsRouter.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await queryOne<any>(`SELECT id, name, code FROM discounts WHERE id = ?`, [id]);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Descuento no encontrado.' });
      return;
    }

    await queryRun(`DELETE FROM discounts WHERE id = ?`, [id]);

    recordAuditLog({
      userId: req.user!.id,
      action: 'DISCOUNT_DELETED',
      entityName: 'discounts',
      entityId: String(id),
      details: { code: existing.code },
      ipAddress: req.ip,
      deviceInfo: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null,
    });

    res.json({
      success: true,
      message: `Descuento '${existing.code}' eliminado correctamente.`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Error al eliminar descuento: ' + error.message });
  }
});
