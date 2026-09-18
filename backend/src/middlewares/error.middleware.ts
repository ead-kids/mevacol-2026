import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('💥 Error inesperado en el servidor:', err);

  const status = err.status || 500;
  const message = err.message || 'Ocurrió un error interno en el servidor.';

  res.status(status).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}
