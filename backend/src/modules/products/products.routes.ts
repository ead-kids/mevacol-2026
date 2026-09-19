import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { queryOne, queryAll, queryRun, withTransaction, recordAuditLog } from '../../database/db';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';

export const productsRouter = Router();

// Todas las rutas de productos requieren autenticación
productsRouter.use(authMiddleware);

// 1. Estadísticas y Métricas de Inventario (Solo ADMINISTRADOR)
productsRouter.get('/stats', requireRole(['ADMINISTRADOR']), async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = await queryOne<any>(`
      SELECT
        COUNT(*) as total_products,
        COALESCE(SUM(current_stock * cost_cop), 0) as total_cost_value,
        COALESCE(SUM(current_stock * price_cop), 0) as total_retail_value,
        COALESCE(SUM(CASE WHEN current_stock <= min_stock AND current_stock > 0 THEN 1 ELSE 0 END), 0) as low_stock_count,
        COALESCE(SUM(CASE WHEN current_stock = 0 THEN 1 ELSE 0 END), 0) as out_of_stock_count,
        COALESCE(SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END), 0) as active_count,
        COALESCE(SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END), 0) as inactive_count
      FROM products
    `);
    res.json({
      success: true,
      stats: {
        total_products: Number(stats?.total_products || 0),
        total_cost_value: Number(stats?.total_cost_value || 0),
        total_retail_value: Number(stats?.total_retail_value || 0),
        low_stock_count: Number(stats?.low_stock_count || 0),
        out_of_stock_count: Number(stats?.out_of_stock_count || 0),
        active_count: Number(stats?.active_count || 0),
        inactive_count: Number(stats?.inactive_count || 0),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Error al calcular estadísticas: ' + error.message });
  }
});

// 2. Listar y Buscar Productos
productsRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userRole = req.user!.role_code;
    if (userRole === 'ENTREGADOR') {
      res.status(403).json({ success: false, error: 'El rol de Entregador no tiene acceso al módulo de productos e inventario.' });
      return;
    }

    const search = req.query.search ? String(req.query.search).trim().toLowerCase() : '';
    const category = req.query.category ? String(req.query.category).trim() : '';
    const status = req.query.status ? String(req.query.status).trim().toLowerCase() : '';
    const stockLevel = req.query.stock_level ? String(req.query.stock_level).trim().toLowerCase() : '';

    let query = `SELECT id, code, name, description, category, unit_measure, price_cop, cost_cop, current_stock, min_stock, is_active, image_url, created_at, updated_at FROM products WHERE 1=1`;
    const params: any[] = [];

    if (search) {
      query += ` AND (LOWER(code) LIKE ? OR LOWER(name) LIKE ? OR LOWER(description) LIKE ? OR LOWER(category) LIKE ?)`;
      const p = `%${search}%`;
      params.push(p, p, p, p);
    }
    if (category && category !== 'Todas') { query += ` AND category = ?`; params.push(category); }
    if (userRole === 'VENDEDOR') {
      query += ` AND is_active = 1`;
    } else {
      if (status === 'active') query += ` AND is_active = 1`;
      else if (status === 'inactive') query += ` AND is_active = 0`;
    }
    if (stockLevel === 'low_stock') query += ` AND current_stock <= min_stock AND current_stock > 0`;
    else if (stockLevel === 'out_of_stock') query += ` AND current_stock = 0`;
    else if (stockLevel === 'normal') query += ` AND current_stock > min_stock`;
    query += ` ORDER BY name ASC`;

    const products = await queryAll<any>(query, params);

    const formattedProducts = products.map((p) => {
      const isLowStock = p.current_stock <= p.min_stock && p.current_stock > 0;
      const isOutOfStock = p.current_stock === 0;
      let stockStatus = 'DISPONIBLE';
      if (isOutOfStock) stockStatus = 'AGOTADO';
      else if (isLowStock) stockStatus = 'STOCK_BAJO';

      if (userRole === 'VENDEDOR') {
        return { id: p.id, code: p.code, name: p.name, description: p.description, category: p.category, unit_measure: p.unit_measure, price_cop: p.price_cop, current_stock: p.current_stock, min_stock: p.min_stock, stock_status: stockStatus, is_active: p.is_active };
      }
      return { ...p, stock_status: stockStatus, margin_cop: p.price_cop - p.cost_cop, margin_percent: p.cost_cop > 0 ? Math.round(((p.price_cop - p.cost_cop) / p.cost_cop) * 100) : 100 };
    });

    res.json({ success: true, count: formattedProducts.length, products: formattedProducts });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Error al consultar productos: ' + error.message });
  }
});

// 3. Consultar Detalle de un Producto
productsRouter.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userRole = req.user!.role_code;
    if (userRole === 'ENTREGADOR') { res.status(403).json({ success: false, error: 'Acceso denegado.' }); return; }

    const { id } = req.params;
    const product = await queryOne<any>(`SELECT * FROM products WHERE id = ?`, [id]);
    if (!product) { res.status(404).json({ success: false, error: 'Producto no encontrado.' }); return; }
    if (userRole === 'VENDEDOR') delete product.cost_cop;
    res.json({ success: true, product });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Error al obtener producto: ' + error.message });
  }
});

// 4. Crear Producto (Solo ADMINISTRADOR)
productsRouter.post('/', requireRole(['ADMINISTRADOR']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, name, description, category = 'General', unit_measure = 'Unidad', price_cop, cost_cop = 0, current_stock = 0, min_stock = 5, image_url } = req.body;

    if (!code || !String(code).trim()) { res.status(400).json({ success: false, error: 'El código o referencia es obligatorio.' }); return; }
    if (!name || !String(name).trim()) { res.status(400).json({ success: false, error: 'El nombre del producto es obligatorio.' }); return; }
    if (price_cop === undefined || Number(price_cop) < 0) { res.status(400).json({ success: false, error: 'El precio de venta debe ser un número mayor o igual a 0.' }); return; }

    const cleanCode = String(code).trim().toUpperCase();
    const existingCode = await queryOne(`SELECT id FROM products WHERE UPPER(code) = ?`, [cleanCode]);
    if (existingCode) { res.status(409).json({ success: false, error: `Ya existe un producto con el código '${cleanCode}'.` }); return; }

    const newId = uuidv4();
    const cleanName = String(name).trim();
    const numPrice = Math.round(Number(price_cop));
    const numCost = Math.round(Number(cost_cop));
    const numStock = Math.max(0, Math.round(Number(current_stock)));
    const numMinStock = Math.max(0, Math.round(Number(min_stock)));
    const cleanImageUrl = image_url && String(image_url).trim() ? String(image_url).trim() : null;

    await queryRun(
      `INSERT INTO products (id, code, name, description, category, unit_measure, price_cop, cost_cop, current_stock, min_stock, is_active, image_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, NOW(), NOW())`,
      [newId, cleanCode, cleanName, description ? String(description).trim() : null, String(category).trim() || 'General', String(unit_measure).trim() || 'Unidad', numPrice, numCost, numStock, numMinStock, cleanImageUrl]
    );

    recordAuditLog({ userId: req.user!.id, action: 'PRODUCT_CREATE', entityName: 'products', entityId: newId, details: { code: cleanCode, name: cleanName, price_cop: numPrice, cost_cop: numCost, current_stock: numStock }, ipAddress: req.ip, deviceInfo: req.headers['user-agent'] });

    const createdProduct = await queryOne(`SELECT * FROM products WHERE id = ?`, [newId]);
    res.status(201).json({ success: true, message: 'Producto creado exitosamente.', product: createdProduct });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Error al registrar producto: ' + error.message });
  }
});

// 5. Modificar Producto (Solo ADMINISTRADOR)
productsRouter.put('/:id', requireRole(['ADMINISTRADOR']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { code, name, description, category, unit_measure, price_cop, cost_cop, min_stock, is_active, image_url } = req.body;

    const existingProduct = await queryOne<any>(`SELECT * FROM products WHERE id = ?`, [id]);
    if (!existingProduct) { res.status(404).json({ success: false, error: 'Producto no encontrado.' }); return; }
    if (!code || !String(code).trim()) { res.status(400).json({ success: false, error: 'El código es obligatorio.' }); return; }
    if (!name || !String(name).trim()) { res.status(400).json({ success: false, error: 'El nombre del producto es obligatorio.' }); return; }

    const cleanCode = String(code).trim().toUpperCase();
    const codeConflict = await queryOne(`SELECT id FROM products WHERE UPPER(code) = ? AND id != ?`, [cleanCode, id]);
    if (codeConflict) { res.status(409).json({ success: false, error: `Ya existe otro producto con el código '${cleanCode}'.` }); return; }

    const cleanName = String(name).trim();
    const cleanDesc = description !== undefined ? (description ? String(description).trim() : null) : existingProduct.description;
    const cleanCategory = category ? String(category).trim() : existingProduct.category;
    const cleanUnit = unit_measure ? String(unit_measure).trim() : existingProduct.unit_measure;
    const numPrice = price_cop !== undefined ? Math.round(Number(price_cop)) : existingProduct.price_cop;
    const numCost = cost_cop !== undefined ? Math.round(Number(cost_cop)) : existingProduct.cost_cop;
    const numMinStock = min_stock !== undefined ? Math.max(0, Math.round(Number(min_stock))) : existingProduct.min_stock;
    const activeStatus = is_active !== undefined ? (is_active ? 1 : 0) : existingProduct.is_active;
    const finalImageUrl = image_url !== undefined ? (image_url && String(image_url).trim() ? String(image_url).trim() : null) : existingProduct.image_url;

    await queryRun(
      `UPDATE products SET code = ?, name = ?, description = ?, category = ?, unit_measure = ?, price_cop = ?, cost_cop = ?, min_stock = ?, is_active = ?, image_url = ?, updated_at = NOW() WHERE id = ?`,
      [cleanCode, cleanName, cleanDesc, cleanCategory, cleanUnit, numPrice, numCost, numMinStock, activeStatus, finalImageUrl, id]
    );

    recordAuditLog({ userId: req.user!.id, action: 'PRODUCT_UPDATE', entityName: 'products', entityId: String(id), details: { code: cleanCode, name: cleanName, price_cop: numPrice, cost_cop: numCost }, ipAddress: req.ip, deviceInfo: req.headers['user-agent'] });
    res.json({ success: true, message: 'Producto actualizado exitosamente.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Error al actualizar producto: ' + error.message });
  }
});

// 6. Ajustar Stock Manualmente
productsRouter.patch('/:id/stock', requireRole(['ADMINISTRADOR']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { type, quantity, reason } = req.body;

    const existingProduct = await queryOne<any>(`SELECT * FROM products WHERE id = ?`, [id]);
    if (!existingProduct) { res.status(404).json({ success: false, error: 'Producto no encontrado.' }); return; }
    if (!type || !['add', 'subtract', 'set'].includes(type)) { res.status(400).json({ success: false, error: "El tipo de ajuste debe ser 'add', 'subtract' o 'set'." }); return; }

    const numQty = Math.round(Number(quantity));
    if (isNaN(numQty) || numQty < 0) { res.status(400).json({ success: false, error: 'La cantidad debe ser un número entero mayor o igual a 0.' }); return; }

    const currentStock = existingProduct.current_stock;
    let newStock = currentStock;
    if (type === 'add') newStock = currentStock + numQty;
    else if (type === 'subtract') {
      if (currentStock < numQty) { res.status(400).json({ success: false, error: `No es posible restar ${numQty} unidades. Stock disponible: ${currentStock}.` }); return; }
      newStock = currentStock - numQty;
    } else if (type === 'set') newStock = numQty;

    await queryRun(`UPDATE products SET current_stock = ?, updated_at = NOW() WHERE id = ?`, [newStock, id]);

    const auditReason = reason ? String(reason).trim() : 'Ajuste manual de inventario';
    recordAuditLog({ userId: req.user!.id, action: 'STOCK_ADJUST', entityName: 'products', entityId: String(id), details: { product_code: existingProduct.code, product_name: existingProduct.name, adjustment_type: type, quantity_modified: numQty, stock_previous: currentStock, stock_new: newStock, reason: auditReason }, ipAddress: req.ip, deviceInfo: req.headers['user-agent'] });

    res.json({ success: true, message: `Stock de '${existingProduct.name}' actualizado de ${currentStock} a ${newStock} unidades.`, new_stock: newStock });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Error al ajustar inventario: ' + error.message });
  }
});

// 7. Activar o Desactivar Producto
productsRouter.patch('/:id/status', requireRole(['ADMINISTRADOR']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const existingProduct = await queryOne<any>(`SELECT * FROM products WHERE id = ?`, [id]);
    if (!existingProduct) { res.status(404).json({ success: false, error: 'Producto no encontrado.' }); return; }

    const newStatus = is_active ? 1 : 0;
    await queryRun(`UPDATE products SET is_active = ?, updated_at = NOW() WHERE id = ?`, [newStatus, id]);

    recordAuditLog({ userId: req.user!.id, action: newStatus === 1 ? 'PRODUCT_ACTIVATE' : 'PRODUCT_DEACTIVATE', entityName: 'products', entityId: String(id), details: { code: existingProduct.code, name: existingProduct.name, is_active: newStatus }, ipAddress: req.ip, deviceInfo: req.headers['user-agent'] });
    res.json({ success: true, message: `Producto '${existingProduct.name}' marcado como ${newStatus === 1 ? 'ACTIVO' : 'INACTIVO'}.` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Error al cambiar estado: ' + error.message });
  }
});

// 8. Eliminar Producto permanentemente con autorización por contraseña
productsRouter.delete('/:id', requireRole(['ADMINISTRADOR']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { admin_password } = req.body;

    if (!admin_password) { res.status(400).json({ success: false, error: 'Debe ingresar su contraseña de administrador.' }); return; }

    const currentAdmin = await queryOne<any>('SELECT id, password_hash FROM users WHERE id = ?', [req.user!.id]);
    if (!currentAdmin) { res.status(401).json({ success: false, error: 'Sesión no válida.' }); return; }

    const passwordValid = await bcrypt.compare(String(admin_password), currentAdmin.password_hash);
    if (!passwordValid) { res.status(401).json({ success: false, error: 'Contraseña de administrador incorrecta.' }); return; }

    const product = await queryOne<any>('SELECT id, code, name FROM products WHERE id = ?', [id]);
    if (!product) { res.status(404).json({ success: false, error: 'Producto no encontrado.' }); return; }

    await withTransaction(async ({ queryRun: txRun }) => {
      await txRun('DELETE FROM inventory_conflicts WHERE product_id = ?', [id]);
      await txRun('DELETE FROM sale_items WHERE product_id = ?', [id]);
      await txRun('DELETE FROM products WHERE id = ?', [id]);
    });

    recordAuditLog({ userId: req.user!.id, action: 'PRODUCT_DELETE', entityName: 'products', entityId: String(id), details: { code: product.code, name: product.name, authorizedBy: req.user!.username }, ipAddress: req.ip, deviceInfo: req.headers['user-agent'] });
    res.json({ success: true, message: `Producto '${product.name}' eliminado permanentemente del inventario.` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Error al eliminar producto: ' + error.message });
  }
});
