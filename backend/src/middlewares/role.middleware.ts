import { Request, Response, NextFunction } from 'express';

export function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'No se encontró información de usuario autenticado.',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role_code)) {
      res.status(403).json({
        success: false,
        error: `Acceso restringido. Su rol (${req.user.role_code}) no tiene permisos para realizar esta operación.`,
        requiredRoles: allowedRoles,
      });
      return;
    }

    next();
  };
}
