import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { queryOne } from '../database/db';

export interface AuthUser {
  id: string;
  username: string;
  full_name: string;
  email: string | null;
  role_code: string;
  phone: string | null;
}

// Extender la interfaz de Request de Express
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'Acceso no autorizado. Debe proporcionar un token de sesión válido.',
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as {
      userId: string;
      role_code: string;
    };

    // Validar en tiempo real que el usuario siga existiendo y esté activo
    queryOne<AuthUser & { is_active: number }>(`
      SELECT id, username, full_name, email, role_code, phone, is_active
      FROM users
      WHERE id = ?
    `, [decoded.userId])
      .then((user) => {
        if (!user) {
          res.status(401).json({
            success: false,
            error: 'El usuario asociado a esta sesión ya no existe.',
          });
          return;
        }

        const isActive = Number(user.is_active) === 1 || String(user.is_active) === 'true';
        if (!isActive) {
          res.status(403).json({
            success: false,
            error: 'Esta cuenta ha sido desactivada por la administración.',
          });
          return;
        }

        req.user = {
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          email: user.email,
          role_code: user.role_code,
          phone: user.phone,
        };

        next();
      })
      .catch(() => {
        res.status(401).json({
          success: false,
          error: 'Sesión expirada o token inválido. Por favor inicie sesión nuevamente.',
        });
      });
  } catch (err) {
    res.status(401).json({
      success: false,
      error: 'Sesión expirada o token inválido. Por favor inicie sesión nuevamente.',
    });
  }
}
