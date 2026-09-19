import { Router, Request, Response } from 'express';
import { queryOne } from '../../database/db';

export const systemRouter = Router();

// Endpoint de diagnóstico y estado de inicialización
systemRouter.get('/status', async (req: Request, res: Response) => {
  try {
    const adminRow = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM users WHERE role_code = 'ADMINISTRADOR'`
    );

    const usersRow = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM users`
    );

    const isBootstrapped = parseInt(adminRow?.count ?? '0', 10) > 0;

    res.json({
      success: true,
      systemName: 'MEVACOL',
      version: '1.0.0',
      phase: 1,
      bootstrapped: isBootstrapped,
      totalUsers: parseInt(usersRow?.count ?? '0', 10),
      serverTime: new Date().toISOString(),
      offlineReady: true,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Error al consultar el estado del sistema: ' + error.message,
    });
  }
});
