import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db, recordAuditLog } from '../../database/db';
import { authMiddleware } from '../../middlewares/auth.middleware';

export const deliveriesRouter = Router();

// Todas las rutas del módulo de entregas requieren autenticación
deliveriesRouter.use(authMiddleware);

// Función auxiliar para formatear código amigable ENT-0001
function generateNextDeliveryCode(): string {
  const existingDeliveries = db.prepare(`
    SELECT delivery_code FROM deliveries WHERE delivery_code LIKE 'ENT-%'
  `).all() as { delivery_code: string }[];

  let maxNum = 0;
  for (const item of existingDeliveries) {
    const match = item.delivery_code ? item.delivery_code.match(/ENT-(\d+)/) : null;
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  return `ENT-${String(maxNum + 1).padStart(4, '0')}`;
}

// 1. Estadísticas de Entregas (KPIs según Rol)
deliveriesRouter.get('/stats', (req: Request, res: Response): void => {
  try {
    const userRole = req.user!.role_code;
    const userId = req.user!.id;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (userRole === 'ENTREGADOR') {
      whereClause += ' AND d.delivery_user_id = ?';
      params.push(userId);
    } else if (userRole === 'VENDEDOR') {
      whereClause += ' AND s.seller_user_id = ?';
      params.push(userId);
    }

    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_deliveries,
        COUNT(CASE WHEN d.status = 'PENDIENTE' THEN 1 END) as pending_count,
        COUNT(CASE WHEN d.status = 'ASIGNADA' THEN 1 END) as assigned_count,
        COUNT(CASE WHEN d.status = 'EN_CAMINO' THEN 1 END) as on_the_way_count,
        COUNT(CASE WHEN d.status = 'ENTREGADA' THEN 1 END) as delivered_count,
        COUNT(CASE WHEN d.status = 'NO_ENTREGADA' THEN 1 END) as failed_count,
        COUNT(CASE WHEN d.status = 'CANCELADA' THEN 1 END) as cancelled_count,
        COUNT(CASE WHEN d.status = 'ENTREGADA' AND date(d.delivered_at) = date('now', 'localtime') THEN 1 END) as delivered_today_count
      FROM deliveries d
      JOIN sales s ON d.sale_id = s.id
      ${whereClause}
    `).get(...params) as any;

    res.json({
      success: true,
      stats: {
        total_deliveries: stats?.total_deliveries || 0,
        pending_count: stats?.pending_count || 0,
        assigned_count: stats?.assigned_count || 0,
        on_the_way_count: stats?.on_the_way_count || 0,
        delivered_count: stats?.delivered_count || 0,
        failed_count: stats?.failed_count || 0,
        cancelled_count: stats?.cancelled_count || 0,
        delivered_today_count: stats?.delivered_today_count || 0,
      },
    });
  } catch (error: any) {
    console.error('Error al obtener estadísticas de entregas:', error);
    res.status(500).json({ success: false, error: 'Error interno al cargar métricas de entregas.' });
  }
});

// 2. Lista de Usuarios con Rol ENTREGADOR (Para asignación)
deliveriesRouter.get('/deliverers', (req: Request, res: Response): void => {
  try {
    const deliverers = db.prepare(`
      SELECT id, full_name, username, phone, email, is_active
      FROM users
      WHERE role_code = 'ENTREGADOR' AND is_active = 1
      ORDER BY full_name ASC
    `).all();

    res.json({
      success: true,
      deliverers,
    });
  } catch (error: any) {
    console.error('Error al obtener lista de entregadores:', error);
    res.status(500).json({ success: false, error: 'Error al listar usuarios entregadores.' });
  }
});

// 3. Ventas Disponibles para Crear Entrega
deliveriesRouter.get('/available-sales', (req: Request, res: Response): void => {
  try {
    const userRole = req.user!.role_code;
    const userId = req.user!.id;

    let whereClause = `
      WHERE s.status != 'CANCELADA'
        AND s.id NOT IN (
          SELECT sale_id FROM deliveries WHERE status NOT IN ('CANCELADA')
        )
    `;
    const params: any[] = [];

    if (userRole === 'VENDEDOR') {
      whereClause += ' AND s.seller_user_id = ?';
      params.push(userId);
    }

    const availableSales = db.prepare(`
      SELECT 
        s.id,
        s.invoice_number as sale_code,
        s.customer_id,
        c.name as customer_name,
        c.id_number as customer_id_number,
        c.phone as customer_phone,
        c.address as customer_address,
        c.city as customer_city,
        s.seller_user_id,
        u.full_name as seller_name,
        s.total_cop,
        s.created_at,
        inv.id as invoice_id,
        inv.invoice_code
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN users u ON s.seller_user_id = u.id
      LEFT JOIN invoices inv ON s.id = inv.sale_id
      ${whereClause}
      ORDER BY s.created_at DESC
      LIMIT 100
    `).all(...params);

    res.json({
      success: true,
      sales: availableSales,
    });
  } catch (error: any) {
    console.error('Error al obtener ventas disponibles:', error);
    res.status(500).json({ success: false, error: 'Error al listar ventas disponibles para entrega.' });
  }
});

// 4. Listado Principal de Entregas con Filtros y Control de Rol
deliveriesRouter.get('/', (req: Request, res: Response): void => {
  try {
    const userRole = req.user!.role_code;
    const userId = req.user!.id;

    const { status, deliverer_id, search, start_date, end_date } = req.query;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    // Control de Seguridad por Rol:
    // - Entregador: SOLO ve sus entregas asignadas
    // - Vendedor: SOLO ve entregas de sus ventas
    // - Administrador: Ve todo y puede filtrar
    if (userRole === 'ENTREGADOR') {
      whereClause += ' AND d.delivery_user_id = ?';
      params.push(userId);
    } else if (userRole === 'VENDEDOR') {
      whereClause += ' AND s.seller_user_id = ?';
      params.push(userId);
    } else if (deliverer_id) {
      whereClause += ' AND d.delivery_user_id = ?';
      params.push(String(deliverer_id).trim());
    }

    if (status && String(status).trim() !== 'TODOS') {
      whereClause += ' AND d.status = ?';
      params.push(String(status).trim().toUpperCase());
    }

    if (start_date) {
      whereClause += ' AND date(d.scheduled_date) >= date(?)';
      params.push(String(start_date).trim());
    }

    if (end_date) {
      whereClause += ' AND date(d.scheduled_date) <= date(?)';
      params.push(String(end_date).trim());
    }

    if (search) {
      const q = `%${String(search).trim()}%`;
      whereClause += ` AND (
        d.delivery_code LIKE ? OR 
        d.customer_name LIKE ? OR 
        d.delivery_address LIKE ? OR 
        d.delivery_city LIKE ? OR
        inv.invoice_code LIKE ? OR
        s.invoice_number LIKE ?
      )`;
      params.push(q, q, q, q, q, q);
    }

    const deliveries = db.prepare(`
      SELECT 
        d.id,
        d.delivery_code,
        d.sale_id,
        d.invoice_id,
        d.customer_id,
        d.delivery_user_id,
        d.status,
        d.scheduled_date,
        d.delivered_at,
        d.customer_name,
        d.customer_phone,
        d.delivery_address,
        d.delivery_city,
        d.latitude,
        d.longitude,
        d.geocoded_at,
        d.notes,
        d.created_by_user_id,
        d.created_at,
        d.updated_at,
        s.invoice_number as sale_code,
        s.total_cop as sale_total_cop,
        s.seller_user_id,
        seller.full_name as seller_name,
        inv.invoice_code,
        deliv_u.full_name as deliverer_name,
        deliv_u.phone as deliverer_phone,
        creator.full_name as creator_name,
        (SELECT COUNT(*) FROM sale_items si WHERE si.sale_id = d.sale_id) as items_count,
        (SELECT SUM(si.quantity) FROM sale_items si WHERE si.sale_id = d.sale_id) as total_units
      FROM deliveries d
      JOIN sales s ON d.sale_id = s.id
      LEFT JOIN invoices inv ON d.invoice_id = inv.id
      LEFT JOIN users seller ON s.seller_user_id = seller.id
      LEFT JOIN users deliv_u ON d.delivery_user_id = deliv_u.id
      LEFT JOIN users creator ON d.created_by_user_id = creator.id
      ${whereClause}
      ORDER BY 
        CASE d.status 
          WHEN 'EN_CAMINO' THEN 1
          WHEN 'ASIGNADA' THEN 2
          WHEN 'PENDIENTE' THEN 3
          WHEN 'NO_ENTREGADA' THEN 4
          WHEN 'ENTREGADA' THEN 5
          WHEN 'CANCELADA' THEN 6
          ELSE 7
        END ASC,
        d.scheduled_date ASC,
        d.created_at DESC
    `).all(...params);

    res.json({
      success: true,
      deliveries,
    });
  } catch (error: any) {
    console.error('Error al obtener entregas:', error);
    res.status(500).json({ success: false, error: 'Error al consultar entregas.' });
  }
});

// 5. Detalle Completo de una Entrega (con Ítems e Historial de Auditoría)
deliveriesRouter.get('/:id', (req: Request, res: Response): void => {
  try {
    const userRole = req.user!.role_code;
    const userId = req.user!.id;
    const { id } = req.params;

    const delivery = db.prepare(`
      SELECT 
        d.id,
        d.delivery_code,
        d.sale_id,
        d.invoice_id,
        d.customer_id,
        d.delivery_user_id,
        d.status,
        d.scheduled_date,
        d.delivered_at,
        d.customer_name,
        d.customer_phone,
        d.delivery_address,
        d.delivery_city,
        d.latitude,
        d.longitude,
        d.geocoded_at,
        d.notes,
        d.created_by_user_id,
        d.created_at,
        d.updated_at,
        s.invoice_number as sale_code,
        s.total_cop as sale_total_cop,
        s.subtotal_cop as sale_subtotal_cop,
        s.discount_cop as sale_discount_cop,
        s.seller_user_id,
        seller.full_name as seller_name,
        seller.phone as seller_phone,
        inv.invoice_code,
        deliv_u.full_name as deliverer_name,
        deliv_u.phone as deliverer_phone,
        creator.full_name as creator_name,
        cust.id_number as customer_id_number,
        cust.email as customer_email
      FROM deliveries d
      JOIN sales s ON d.sale_id = s.id
      LEFT JOIN invoices inv ON d.invoice_id = inv.id
      LEFT JOIN users seller ON s.seller_user_id = seller.id
      LEFT JOIN users deliv_u ON d.delivery_user_id = deliv_u.id
      LEFT JOIN users creator ON d.created_by_user_id = creator.id
      LEFT JOIN customers cust ON d.customer_id = cust.id
      WHERE d.id = ?
    `).get(id) as any;

    if (!delivery) {
      res.status(404).json({ success: false, error: 'Entrega no encontrada.' });
      return;
    }

    // Validación de permisos por rol
    if (userRole === 'ENTREGADOR' && delivery.delivery_user_id !== userId) {
      res.status(403).json({ success: false, error: 'Acceso denegado: esta entrega no está asignada a tu usuario.' });
      return;
    }
    if (userRole === 'VENDEDOR' && delivery.seller_user_id !== userId) {
      res.status(403).json({ success: false, error: 'Acceso denegado: esta entrega no corresponde a tus ventas.' });
      return;
    }

    // Obtener los productos a entregar desde sale_items (sin alterar stock)
    const items = db.prepare(`
      SELECT 
        si.id,
        si.product_id,
        si.quantity,
        si.unit_price_cop,
        si.total_cop,
        si.notes,
        p.code as product_code,
        p.name as product_name,
        p.unit_measure,
        p.category
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = ?
      ORDER BY si.created_at ASC
    `).all(delivery.sale_id);

    // Obtener historial completo de cambios de estado y observaciones
    const history = db.prepare(`
      SELECT 
        id,
        delivery_id,
        from_status,
        to_status,
        changed_by_user_id,
        changed_by_user_name,
        notes,
        created_at
      FROM delivery_status_history
      WHERE delivery_id = ?
      ORDER BY created_at ASC
    `).all(delivery.id);

    res.json({
      success: true,
      delivery,
      items,
      history,
    });
  } catch (error: any) {
    console.error('Error al obtener detalle de entrega:', error);
    res.status(500).json({ success: false, error: 'Error al consultar detalle de entrega.' });
  }
});

// 6. Crear una Nueva Entrega a partir de una Venta
deliveriesRouter.post('/', (req: Request, res: Response): void => {
  try {
    const userRole = req.user!.role_code;
    const userId = req.user!.id;
    const userName = req.user!.full_name;

    if (userRole === 'ENTREGADOR') {
      res.status(403).json({ success: false, error: 'Los entregadores no tienen permisos para crear entregas.' });
      return;
    }

    const {
      sale_id,
      scheduled_date,
      delivery_user_id,
      notes,
      customer_name,
      customer_phone,
      delivery_address,
      delivery_city,
    } = req.body;

    if (!sale_id) {
      res.status(400).json({ success: false, error: 'El ID de la venta es requerido.' });
      return;
    }

    // Verificar que la venta exista y esté activa
    const sale = db.prepare(`
      SELECT 
        s.id, s.customer_id, s.seller_user_id, s.status, s.notes,
        c.name as cust_name, c.phone as cust_phone, c.address as cust_address, c.city as cust_city
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE s.id = ?
    `).get(sale_id) as any;

    if (!sale) {
      res.status(404).json({ success: false, error: 'La venta especificada no existe.' });
      return;
    }

    if (userRole === 'VENDEDOR' && sale.seller_user_id !== userId) {
      res.status(403).json({ success: false, error: 'Solo puedes crear entregas de tus propias ventas.' });
      return;
    }

    // Verificar si ya existe una entrega activa para esta venta
    const existingActiveDelivery = db.prepare(`
      SELECT id, delivery_code, status FROM deliveries 
      WHERE sale_id = ? AND status NOT IN ('CANCELADA')
    `).get(sale_id) as any;

    if (existingActiveDelivery) {
      res.status(400).json({
        success: false,
        error: `Esta venta ya cuenta con una entrega activa (${existingActiveDelivery.delivery_code}, Estado: ${existingActiveDelivery.status}).`,
      });
      return;
    }

    // Buscar factura asociada si existe
    const invoice = db.prepare(`SELECT id, invoice_code FROM invoices WHERE sale_id = ?`).get(sale_id) as any;

    // Validar entregador si fue seleccionado
    let assignedDeliverer: any = null;
    let initialStatus = 'PENDIENTE';

    if (delivery_user_id) {
      assignedDeliverer = db.prepare(`
        SELECT id, full_name, role_code, is_active FROM users WHERE id = ?
      `).get(delivery_user_id) as any;

      if (!assignedDeliverer || assignedDeliverer.role_code !== 'ENTREGADOR' || !assignedDeliverer.is_active) {
        res.status(400).json({ success: false, error: 'El usuario seleccionado no es un entregador válido o activo.' });
        return;
      }
      initialStatus = 'ASIGNADA';
    }

    const deliveryId = uuidv4();
    const deliveryCode = generateNextDeliveryCode();
    const schedDate = scheduled_date ? String(scheduled_date).trim() : new Date().toISOString().split('T')[0];

    const finalCustName = customer_name || sale.cust_name || 'Consumidor Final';
    const finalCustPhone = customer_phone || sale.cust_phone || 'No registrado';
    const finalAddress = delivery_address || sale.cust_address || 'Dirección no registrada';
    const finalCity = delivery_city || sale.cust_city || 'Medellín';

    const insertDeliveryTx = db.transaction(() => {
      // 1. Insertar entrega
      db.prepare(`
        INSERT INTO deliveries (
          id, delivery_code, sale_id, invoice_id, customer_id,
          delivery_user_id, status, scheduled_date,
          customer_name, customer_phone, delivery_address, delivery_city,
          notes, created_by_user_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(
        deliveryId,
        deliveryCode,
        sale.id,
        invoice?.id || null,
        sale.customer_id,
        assignedDeliverer ? assignedDeliverer.id : null,
        initialStatus,
        schedDate,
        finalCustName,
        finalCustPhone,
        finalAddress,
        finalCity,
        notes || null,
        userId
      );

      // 2. Registrar evento en historial
      const historyNotes = assignedDeliverer
        ? `Entrega creada y asignada a ${assignedDeliverer.full_name}`
        : 'Entrega creada en espera de asignación';

      db.prepare(`
        INSERT INTO delivery_status_history (
          id, delivery_id, from_status, to_status,
          changed_by_user_id, changed_by_user_name, notes, created_at
        ) VALUES (?, ?, NULL, ?, ?, ?, ?, datetime('now'))
      `).run(
        uuidv4(),
        deliveryId,
        initialStatus,
        userId,
        userName,
        historyNotes
      );
    });

    insertDeliveryTx();

    recordAuditLog({
      user_id: userId,
      action: 'CREAR_ENTREGA',
      entity_name: 'deliveries',
      entity_id: deliveryId,
      details_json: JSON.stringify({
        delivery_code: deliveryCode,
        sale_id: sale.id,
        invoice_code: invoice?.invoice_code,
        status: initialStatus,
        delivery_user_id: assignedDeliverer?.id,
      }),
    });

    res.status(201).json({
      success: true,
      message: `Entrega ${deliveryCode} creada exitosamente.`,
      delivery: {
        id: deliveryId,
        delivery_code: deliveryCode,
        status: initialStatus,
      },
    });
  } catch (error: any) {
    console.error('Error al crear entrega:', error);
    res.status(500).json({ success: false, error: 'Error al registrar la entrega.' });
  }
});

// 7. Asignar o Reasignar Entregador (Administrador)
deliveriesRouter.patch('/:id/assign', (req: Request, res: Response): void => {
  try {
    const userRole = req.user!.role_code;
    const userId = req.user!.id;
    const userName = req.user!.full_name;
    const { id } = req.params;
    const { delivery_user_id, notes } = req.body;

    if (userRole !== 'ADMINISTRADOR') {
      res.status(403).json({ success: false, error: 'Solo los administradores pueden asignar o reasignar entregas.' });
      return;
    }

    const delivery = db.prepare(`SELECT * FROM deliveries WHERE id = ?`).get(id) as any;
    if (!delivery) {
      res.status(404).json({ success: false, error: 'Entrega no encontrada.' });
      return;
    }

    if (delivery.status === 'ENTREGADA' || delivery.status === 'CANCELADA') {
      res.status(400).json({
        success: false,
        error: `No se puede reasignar una entrega con estado ${delivery.status}.`,
      });
      return;
    }

    let delivererName = 'Sin asignar';
    let newStatus = delivery.status;

    if (delivery_user_id) {
      const deliverer = db.prepare(`
        SELECT id, full_name, role_code, is_active FROM users WHERE id = ?
      `).get(delivery_user_id) as any;

      if (!deliverer || deliverer.role_code !== 'ENTREGADOR' || !deliverer.is_active) {
        res.status(400).json({ success: false, error: 'El entregador seleccionado no es válido o está inactivo.' });
        return;
      }
      delivererName = deliverer.full_name;
      if (delivery.status === 'PENDIENTE') {
        newStatus = 'ASIGNADA';
      }
    } else {
      newStatus = 'PENDIENTE';
    }

    const historyNote = notes
      ? `Reasignada a: ${delivererName}. Motivo: ${notes}`
      : `Entrega asignada a: ${delivererName}`;

    const assignTx = db.transaction(() => {
      db.prepare(`
        UPDATE deliveries
        SET delivery_user_id = ?, status = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(delivery_user_id || null, newStatus, id);

      db.prepare(`
        INSERT INTO delivery_status_history (
          id, delivery_id, from_status, to_status,
          changed_by_user_id, changed_by_user_name, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(
        uuidv4(),
        id,
        delivery.status,
        newStatus,
        userId,
        userName,
        historyNote
      );
    });

    assignTx();

    recordAuditLog({
      user_id: userId,
      action: 'ASIGNAR_ENTREGADOR',
      entity_name: 'deliveries',
      entity_id: id,
      details_json: JSON.stringify({
        previous_deliverer: delivery.delivery_user_id,
        new_deliverer: delivery_user_id,
        new_status: newStatus,
      }),
    });

    res.json({
      success: true,
      message: `Entrega ${delivery.delivery_code} asignada correctamente a ${delivererName}.`,
    });
  } catch (error: any) {
    console.error('Error al asignar entregador:', error);
    res.status(500).json({ success: false, error: 'Error al asignar entregador.' });
  }
});

// 8. Actualizar Estado de la Entrega (Entregador o Administrador)
deliveriesRouter.patch('/:id/status', (req: Request, res: Response): void => {
  try {
    const userRole = req.user!.role_code;
    const userId = req.user!.id;
    const userName = req.user!.full_name;
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['PENDIENTE', 'ASIGNADA', 'EN_CAMINO', 'ENTREGADA', 'NO_ENTREGADA', 'CANCELADA'];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({ success: false, error: `Estado no válido. Opciones: ${validStatuses.join(', ')}` });
      return;
    }

    const delivery = db.prepare(`SELECT * FROM deliveries WHERE id = ?`).get(id) as any;
    if (!delivery) {
      res.status(404).json({ success: false, error: 'Entrega no encontrada.' });
      return;
    }

    // Permisos:
    // - Entregador solo puede actualizar entregas asignadas a él
    // - Entregador no puede cancelar entregas (solo Admin)
    if (userRole === 'ENTREGADOR') {
      if (delivery.delivery_user_id !== userId) {
        res.status(403).json({ success: false, error: 'No tienes autorización para cambiar el estado de esta entrega.' });
        return;
      }
      if (status === 'CANCELADA') {
        res.status(403).json({ success: false, error: 'Solo el administrador puede cancelar entregas. Si no pudiste entregarla, usa NO_ENTREGADA.' });
        return;
      }
    }

    if (userRole === 'VENDEDOR') {
      res.status(403).json({ success: false, error: 'Los vendedores solo pueden consultar el estado de las entregas.' });
      return;
    }

    // En caso de NO_ENTREGADA o CANCELADA, se sugiere observación
    if ((status === 'NO_ENTREGADA' || status === 'CANCELADA') && (!notes || !notes.trim())) {
      res.status(400).json({
        success: false,
        error: `Para marcar como ${status} es obligatorio indicar la observación o motivo.`,
      });
      return;
    }

    let deliveredAt = delivery.delivered_at;
    if (status === 'ENTREGADA' && !deliveredAt) {
      deliveredAt = new Date().toISOString();
    }

    const historyNote = notes ? String(notes).trim() : `Estado cambiado a ${status}`;

    const updateStatusTx = db.transaction(() => {
      db.prepare(`
        UPDATE deliveries
        SET status = ?, delivered_at = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(status, status === 'ENTREGADA' ? deliveredAt : null, id);

      db.prepare(`
        INSERT INTO delivery_status_history (
          id, delivery_id, from_status, to_status,
          changed_by_user_id, changed_by_user_name, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(
        uuidv4(),
        id,
        delivery.status,
        status,
        userId,
        userName,
        historyNote
      );
    });

    updateStatusTx();

    recordAuditLog({
      user_id: userId,
      action: 'CAMBIO_ESTADO_ENTREGA',
      entity_name: 'deliveries',
      entity_id: id,
      details_json: JSON.stringify({
        from_status: delivery.status,
        to_status: status,
        notes: historyNote,
      }),
    });

    res.json({
      success: true,
      message: `Estado de la entrega ${delivery.delivery_code} actualizado a ${status}.`,
      status,
      delivered_at: deliveredAt,
    });
  } catch (error: any) {
    console.error('Error al actualizar estado de entrega:', error);
    res.status(500).json({ success: false, error: 'Error al cambiar estado de entrega.' });
  }
});
