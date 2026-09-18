import { Router, Request, Response } from 'express';
import { db } from '../../database/db';

export const systemRouter = Router();

// Endpoint de diagnóstico y estado de inicialización
systemRouter.get('/status', (req: Request, res: Response) => {
  try {
    const adminRow = db.prepare(`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE role_code = 'ADMINISTRADOR'
    `).get() as { count: number };

    const usersRow = db.prepare(`
      SELECT COUNT(*) as count 
      FROM users
    `).get() as { count: number };

    const isBootstrapped = adminRow.count > 0;

    res.json({
      success: true,
      systemName: 'MEVACOL',
      version: '1.0.0',
      phase: 1,
      bootstrapped: isBootstrapped,
      totalUsers: usersRow.count,
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
