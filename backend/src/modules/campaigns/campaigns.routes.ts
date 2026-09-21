import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { queryOne, queryAll, queryRun, withTransaction, recordAuditLog } from '../../database/db';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';

export const campaignsRouter = Router();

// Todas las rutas requieren autenticación
campaignsRouter.use(authMiddleware);

/**
 * 1. GET /api/campaigns/active
 * Obtiene campañas actualmente activas.
 * - Si es VENDEDOR: Devuelve solo las campañas asignadas o generales, incluyendo su progreso personal en tiempo real.
 * - Si es ADMINISTRADOR: Devuelve todas las campañas activas con resumen global de avance.
 */
campaignsRouter.get('/active', async (req: Request, res: Response): Promise<void> => {
  try {
    const userRole = req.user!.role_code;
    const userId = req.user!.id;

    if (userRole === 'VENDEDOR') {
      // Obtener campañas activas aplicables a este vendedor
      const campaigns = await queryAll<any>(`
        SELECT
          c.id,
          c.name,
          c.description,
          c.target_amount_cop,
          c.reward_description,
          c.start_date,
          c.end_date,
          c.is_general,
          c.is_active,
          c.created_at
        FROM campaigns c
        WHERE c.is_active = 1
          AND (
            c.is_general = 1
            OR EXISTS (
              SELECT 1 FROM campaign_sellers cs
              WHERE cs.campaign_id = c.id AND cs.seller_user_id = ?
            )
          )
        ORDER BY c.end_date ASC
      `, [userId]);

      const now = new Date();

      // Calcular el progreso individual de cada campaña para este vendedor
      const enrichedCampaigns = await Promise.all(
        campaigns.map(async (c) => {
          // Sumar ventas válidas del vendedor en el rango de fechas de la campaña
          // Excluir ventas CANCELADA o ANULADA
          const salesAgg = await queryOne<{ total_cop: string; sales_count: string }>(`
            SELECT
              COALESCE(SUM(total_cop), 0) as total_cop,
              COUNT(id) as sales_count
            FROM sales
            WHERE seller_user_id = ?
              AND status NOT IN ('CANCELADA', 'ANULADA')
              AND date(created_at) >= date(?)
              AND date(created_at) <= date(?)
          `, [userId, c.start_date, c.end_date]);

          const accumulatedCop = Number(salesAgg?.total_cop || 0);
          const salesCount = Number(salesAgg?.sales_count || 0);
          const targetCop = Number(c.target_amount_cop);
          const remainingCop = Math.max(0, targetCop - accumulatedCop);
          const progressPercent = targetCop > 0
            ? Math.min(100, Math.round((accumulatedCop * 100) / targetCop))
            : 0;
          const isCompleted = accumulatedCop >= targetCop;

          const endDateObj = new Date(c.end_date);
          const diffTime = endDateObj.getTime() - now.getTime();
          const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

          return {
            ...c,
            accumulated_cop: accumulatedCop,
            sales_count: salesCount,
            remaining_cop: remainingCop,
            progress_percent: progressPercent,
            is_completed: isCompleted,
            days_remaining: daysRemaining,
          };
        })
      );

      res.json({ success: true, campaigns: enrichedCampaigns });
      return;
    }

    // Para ADMINISTRADOR: Listar todas las campañas activas
    const campaigns = await queryAll<any>(`
      SELECT
        c.*,
        (
          SELECT COUNT(*) FROM sales s
          WHERE s.status NOT IN ('CANCELADA', 'ANULADA')
            AND date(s.created_at) >= date(c.start_date)
            AND date(s.created_at) <= date(c.end_date)
            AND (
              c.is_general = 1
              OR s.seller_user_id IN (SELECT seller_user_id FROM campaign_sellers WHERE campaign_id = c.id)
            )
        ) as total_sales_count,
        (
          SELECT COALESCE(SUM(s.total_cop), 0) FROM sales s
          WHERE s.status NOT IN ('CANCELADA', 'ANULADA')
            AND date(s.created_at) >= date(c.start_date)
            AND date(s.created_at) <= date(c.end_date)
            AND (
              c.is_general = 1
              OR s.seller_user_id IN (SELECT seller_user_id FROM campaign_sellers WHERE campaign_id = c.id)
            )
        ) as total_volume_cop
      FROM campaigns c
      WHERE c.is_active = 1
      ORDER BY c.end_date ASC
    `);

    res.json({ success: true, campaigns });
  } catch (error: any) {
    console.error('Error al consultar campañas activas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 2. GET /api/campaigns
 * Lista todas las campañas del sistema (Solo ADMINISTRADOR).
 */
campaignsRouter.get('/', requireRole(['ADMINISTRADOR']), async (req: Request, res: Response): Promise<void> => {
  try {
    const search = req.query.search ? String(req.query.search).trim().toLowerCase() : '';
    const status = req.query.status ? String(req.query.status).trim() : 'ALL';

    let query = `
      SELECT
        c.id,
        c.name,
        c.description,
        c.target_amount_cop,
        c.reward_description,
        c.start_date,
        c.end_date,
        c.is_general,
        c.is_active,
        c.created_at,
        CASE
          WHEN c.is_general = 1 THEN (SELECT COUNT(*) FROM users WHERE role_code = 'VENDEDOR' AND is_active = 1)
          ELSE (SELECT COUNT(*) FROM campaign_sellers WHERE campaign_id = c.id)
        END as participating_sellers_count,
        (
          SELECT COALESCE(SUM(s.total_cop), 0)
          FROM sales s
          WHERE s.status NOT IN ('CANCELADA', 'ANULADA')
            AND date(s.created_at) >= date(c.start_date)
            AND date(s.created_at) <= date(c.end_date)
            AND (
              c.is_general = 1
              OR s.seller_user_id IN (SELECT seller_user_id FROM campaign_sellers WHERE campaign_id = c.id)
            )
        ) as total_volume_cop,
        (
          SELECT COUNT(s.id)
          FROM sales s
          WHERE s.status NOT IN ('CANCELADA', 'ANULADA')
            AND date(s.created_at) >= date(c.start_date)
            AND date(s.created_at) <= date(c.end_date)
            AND (
              c.is_general = 1
              OR s.seller_user_id IN (SELECT seller_user_id FROM campaign_sellers WHERE campaign_id = c.id)
            )
        ) as total_sales_count
      FROM campaigns c
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
      query += ` AND (LOWER(c.name) LIKE ? OR LOWER(COALESCE(c.reward_description, '')) LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    if (status === 'ACTIVE') {
      query += ` AND c.is_active = 1`;
    } else if (status === 'INACTIVE') {
      query += ` AND c.is_active = 0`;
    }

    query += ` ORDER BY c.created_at DESC`;

    const campaigns = await queryAll<any>(query, params);

    // Calcular cuántos vendedores han alcanzado la meta por cada campaña
    const enriched = await Promise.all(
      campaigns.map(async (camp) => {
        // Obtener vendedores asignados
        const sellersQuery = camp.is_general === 1
          ? `SELECT id FROM users WHERE role_code = 'VENDEDOR' AND is_active = 1`
          : `SELECT seller_user_id as id FROM campaign_sellers WHERE campaign_id = ?`;
        const sellerParams = camp.is_general === 1 ? [] : [camp.id];
        const sellersList = await queryAll<{ id: string }>(sellersQuery, sellerParams);

        let winnersCount = 0;
        for (const s of sellersList) {
          const sellerSum = await queryOne<{ total: string }>(`
            SELECT COALESCE(SUM(total_cop), 0) as total
            FROM sales
            WHERE seller_user_id = ?
              AND status NOT IN ('CANCELADA', 'ANULADA')
              AND date(created_at) >= date(?)
              AND date(created_at) <= date(?)
          `, [s.id, camp.start_date, camp.end_date]);

          if (Number(sellerSum?.total || 0) >= Number(camp.target_amount_cop)) {
            winnersCount++;
          }
        }

        return {
          ...camp,
          target_amount_cop: Number(camp.target_amount_cop),
          total_volume_cop: Number(camp.total_volume_cop),
          total_sales_count: Number(camp.total_sales_count),
          participating_sellers_count: Number(camp.participating_sellers_count),
          winners_count: winnersCount,
        };
      })
    );

    res.json({ success: true, count: enriched.length, campaigns: enriched });
  } catch (error: any) {
    console.error('Error al listar campañas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 3. GET /api/campaigns/:id
 * Consulta detalle de una campaña con progreso individual de cada vendedor participante.
 */
campaignsRouter.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userRole = req.user!.role_code;
    const userId = req.user!.id;

    const campaign = await queryOne<any>(`
      SELECT * FROM campaigns WHERE id = ?
    `, [id]);

    if (!campaign) {
      res.status(404).json({ success: false, error: 'Campaña no encontrada.' });
      return;
    }

    // Obtener los vendedores asignados
    let assignedSellersQuery = '';
    let assignedParams: any[] = [];

    if (campaign.is_general === 1) {
      assignedSellersQuery = `
        SELECT u.id, u.full_name, u.username, u.document_id, u.phone, u.email, u.is_active
        FROM users u
        WHERE u.role_code = 'VENDEDOR'
        ORDER BY u.full_name ASC
      `;
    } else {
      assignedSellersQuery = `
        SELECT u.id, u.full_name, u.username, u.document_id, u.phone, u.email, u.is_active
        FROM users u
        INNER JOIN campaign_sellers cs ON cs.seller_user_id = u.id
        WHERE cs.campaign_id = ?
        ORDER BY u.full_name ASC
      `;
      assignedParams.push(id);
    }

    const assignedSellers = await queryAll<any>(assignedSellersQuery, assignedParams);

    // Si es vendedor, verificar si tiene acceso a esta campaña
    if (userRole === 'VENDEDOR') {
      const isParticipating = assignedSellers.some((s) => s.id === userId);
      if (!isParticipating) {
        res.status(403).json({ success: false, error: 'No tienes acceso a esta campaña.' });
        return;
      }
    }

    // Calcular progreso de cada vendedor
    const targetCop = Number(campaign.target_amount_cop);
    const sellersProgress = await Promise.all(
      assignedSellers.map(async (seller) => {
        const salesAgg = await queryOne<{ total_cop: string; count: string }>(`
          SELECT
            COALESCE(SUM(total_cop), 0) as total_cop,
            COUNT(id) as count
          FROM sales
          WHERE seller_user_id = ?
            AND status NOT IN ('CANCELADA', 'ANULADA')
            AND date(created_at) >= date(?)
            AND date(created_at) <= date(?)
        `, [seller.id, campaign.start_date, campaign.end_date]);

        const accumulatedCop = Number(salesAgg?.total_cop || 0);
        const salesCount = Number(salesAgg?.count || 0);
        const remainingCop = Math.max(0, targetCop - accumulatedCop);
        const progressPercent = targetCop > 0
          ? Math.min(100, Math.round((accumulatedCop * 100) / targetCop))
          : 0;
        const isCompleted = accumulatedCop >= targetCop;

        return {
          seller_id: seller.id,
          full_name: seller.full_name,
          username: seller.username,
          document_id: seller.document_id,
          phone: seller.phone,
          email: seller.email,
          is_active: seller.is_active,
          accumulated_cop: accumulatedCop,
          sales_count: salesCount,
          remaining_cop: remainingCop,
          progress_percent: progressPercent,
          is_completed: isCompleted,
        };
      })
    );

    // Ordenar vendedores por mayor volumen vendido
    sellersProgress.sort((a, b) => b.accumulated_cop - a.accumulated_cop);

    const totalCampaignVolume = sellersProgress.reduce((acc, s) => acc + s.accumulated_cop, 0);
    const winnersCount = sellersProgress.filter((s) => s.is_completed).length;

    res.json({
      success: true,
      campaign: {
        ...campaign,
        target_amount_cop: targetCop,
        total_volume_cop: totalCampaignVolume,
        participating_count: sellersProgress.length,
        winners_count: winnersCount,
      },
      sellers_progress: sellersProgress,
    });
  } catch (error: any) {
    console.error('Error al obtener detalle de campaña:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 4. POST /api/campaigns
 * Crear nueva campaña e incentivo (Solo ADMINISTRADOR).
 */
campaignsRouter.post('/', requireRole(['ADMINISTRADOR']), async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      description,
      target_amount_cop,
      reward_description,
      start_date,
      end_date,
      is_general,
      seller_ids,
    } = req.body;

    if (!name || !target_amount_cop || !reward_description || !start_date || !end_date) {
      res.status(400).json({
        success: false,
        error: 'Nombre, meta de ventas (COP), premio, fecha de inicio y fecha de finalización son obligatorios.',
      });
      return;
    }

    const targetCop = Number(target_amount_cop);
    if (isNaN(targetCop) || targetCop <= 0) {
      res.status(400).json({ success: false, error: 'La meta de ventas debe ser un valor numérico mayor a 0.' });
      return;
    }

    if (new Date(end_date) < new Date(start_date)) {
      res.status(400).json({ success: false, error: 'La fecha de finalización no puede ser anterior a la fecha de inicio.' });
      return;
    }

    const campaignId = uuidv4();
    const generalFlag = is_general === false || is_general === 0 || is_general === '0' ? 0 : 1;

    await withTransaction(async () => {
      // Insertar campaña
      await queryRun(`
        INSERT INTO campaigns (
          id, name, description, target_amount_cop, reward_description,
          start_date, end_date, is_general, is_active, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())
      `, [
        campaignId,
        String(name).trim(),
        description ? String(description).trim() : null,
        targetCop,
        String(reward_description).trim(),
        String(start_date).trim(),
        String(end_date).trim(),
        generalFlag,
      ]);

      // Si no es general, asociar vendedores seleccionados
      if (generalFlag === 0 && Array.isArray(seller_ids) && seller_ids.length > 0) {
        for (const sellerId of seller_ids) {
          await queryRun(`
            INSERT INTO campaign_sellers (campaign_id, seller_user_id, created_at)
            VALUES (?, ?, NOW())
            ON CONFLICT DO NOTHING
          `, [campaignId, sellerId]);
        }
      }
    });

    recordAuditLog({
      userId: req.user!.id,
      action: 'CAMPAIGN_CREATED',
      entityName: 'campaigns',
      entityId: campaignId,
      details: { name, targetCop, reward_description, generalFlag, sellersCount: seller_ids?.length || 'ALL' },
      ipAddress: req.ip,
      deviceInfo: req.headers['user-agent'] as string,
    });

    res.status(201).json({
      success: true,
      message: `Campaña "${name}" creada exitosamente.`,
      campaign_id: campaignId,
    });
  } catch (error: any) {
    console.error('Error al crear campaña:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 5. PUT /api/campaigns/:id
 * Editar campaña existente (Solo ADMINISTRADOR).
 */
campaignsRouter.put('/:id', requireRole(['ADMINISTRADOR']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      target_amount_cop,
      reward_description,
      start_date,
      end_date,
      is_general,
      seller_ids,
    } = req.body;

    const existing = await queryOne<any>('SELECT id FROM campaigns WHERE id = ?', [id]);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Campaña no encontrada.' });
      return;
    }

    if (!name || !target_amount_cop || !reward_description || !start_date || !end_date) {
      res.status(400).json({
        success: false,
        error: 'Nombre, meta de ventas (COP), premio, fecha de inicio y finalización son requeridos.',
      });
      return;
    }

    const targetCop = Number(target_amount_cop);
    const generalFlag = is_general === false || is_general === 0 || is_general === '0' ? 0 : 1;

    await withTransaction(async () => {
      await queryRun(`
        UPDATE campaigns
        SET name = ?,
            description = ?,
            target_amount_cop = ?,
            reward_description = ?,
            start_date = ?,
            end_date = ?,
            is_general = ?
        WHERE id = ?
      `, [
        String(name).trim(),
        description ? String(description).trim() : null,
        targetCop,
        String(reward_description).trim(),
        String(start_date).trim(),
        String(end_date).trim(),
        generalFlag,
        id,
      ]);

      // Reemplazar vendedores asignados si no es general
      await queryRun('DELETE FROM campaign_sellers WHERE campaign_id = ?', [id]);

      if (generalFlag === 0 && Array.isArray(seller_ids) && seller_ids.length > 0) {
        for (const sellerId of seller_ids) {
          await queryRun(`
            INSERT INTO campaign_sellers (campaign_id, seller_user_id, created_at)
            VALUES (?, ?, NOW())
            ON CONFLICT DO NOTHING
          `, [id, sellerId]);
        }
      }
    });

    recordAuditLog({
      userId: req.user!.id,
      action: 'CAMPAIGN_UPDATED',
      entityName: 'campaigns',
      entityId: String(id),
      details: { name, targetCop, reward_description, generalFlag },
      ipAddress: req.ip,
      deviceInfo: req.headers['user-agent'] as string,
    });

    res.json({ success: true, message: 'Campaña actualizada exitosamente.' });
  } catch (error: any) {
    console.error('Error al actualizar campaña:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 6. PATCH /api/campaigns/:id/status
 * Activar o desactivar campaña (Solo ADMINISTRADOR).
 */
campaignsRouter.patch('/:id/status', requireRole(['ADMINISTRADOR']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const campaign = await queryOne<any>('SELECT id, name, is_active FROM campaigns WHERE id = ?', [id]);
    if (!campaign) {
      res.status(404).json({ success: false, error: 'Campaña no encontrada.' });
      return;
    }

    const newStatus = (is_active === true || is_active === 1 || is_active === '1') ? 1 : 0;
    await queryRun('UPDATE campaigns SET is_active = ? WHERE id = ?', [newStatus, id]);

    recordAuditLog({
      userId: req.user!.id,
      action: 'CAMPAIGN_STATUS_TOGGLED',
      entityName: 'campaigns',
      entityId: String(id),
      details: { campaignName: campaign.name, newStatus },
      ipAddress: req.ip,
      deviceInfo: req.headers['user-agent'] as string,
    });

    res.json({
      success: true,
      message: `Campaña "${campaign.name}" ${newStatus === 1 ? 'activada' : 'desactivada'} exitosamente.`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 7. DELETE /api/campaigns/:id
 * Eliminar campaña (Solo ADMINISTRADOR).
 */
campaignsRouter.delete('/:id', requireRole(['ADMINISTRADOR']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const campaign = await queryOne<any>('SELECT id, name FROM campaigns WHERE id = ?', [id]);
    if (!campaign) {
      res.status(404).json({ success: false, error: 'Campaña no encontrada.' });
      return;
    }

    await withTransaction(async () => {
      await queryRun('DELETE FROM campaign_sellers WHERE campaign_id = ?', [id]);
      await queryRun('DELETE FROM campaigns WHERE id = ?', [id]);
    });

    recordAuditLog({
      userId: req.user!.id,
      action: 'CAMPAIGN_DELETED',
      entityName: 'campaigns',
      entityId: String(id),
      details: { name: campaign.name },
      ipAddress: req.ip,
      deviceInfo: req.headers['user-agent'] as string,
    });

    res.json({ success: true, message: `Campaña "${campaign.name}" eliminada correctamente.` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
