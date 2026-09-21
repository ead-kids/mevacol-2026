import express, { Application } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { config } from './config';
import { systemRouter } from './modules/system/system.routes';
import { authRouter } from './modules/auth/auth.routes';
import { usersRouter } from './modules/users/users.routes';
import { customersRouter } from './modules/customers/customers.routes';
import { productsRouter } from './modules/products/products.routes';
import { salesRouter } from './modules/sales/sales.routes';
import { invoicesRouter } from './modules/invoices/invoices.routes';
import { deliveriesRouter } from './modules/deliveries/deliveries.routes';
import { geoRouter } from './modules/geo/geo.routes';
import { dashboardRouter } from './modules/dashboard/dashboard.routes';
import { reportsRouter } from './modules/reports/reports.routes';
import { sellersRouter } from './modules/sellers/sellers.routes';
import { campaignsRouter } from './modules/campaigns/campaigns.routes';
import { errorHandler } from './middlewares/error.middleware';

export function createServer(): Application {
  const app = express();

  // Parsear orígenes CORS desde la variable de entorno
  const customOrigins = config.CORS_ORIGIN === '*'
    ? ['*']
    : config.CORS_ORIGIN.split(',').map((o) => o.trim());

  // Middlewares estándar de seguridad y parseo con soporte automático para Vercel y GitHub Pages
  app.use(cors({
    origin: (origin, callback) => {
      // Permitir peticiones sin header Origin (apps móviles, curl, server-to-server)
      if (!origin) return callback(null, true);
      // Permitir si CORS_ORIGIN es comodín '*'
      if (customOrigins.includes('*')) return callback(null, true);
      // Permitir si coincide exactamente con la lista configurada
      if (customOrigins.includes(origin)) return callback(null, true);
      // Permitir automáticamente dominios de Vercel, GitHub Pages y desarrollo local
      if (
        origin.endsWith('.vercel.app') ||
        origin.endsWith('.github.io') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1')
      ) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-device-id'],
    credentials: true,
  }));

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Enrutamiento modular de la API (con soporte dual /api y prefijo raíz para máxima compatibilidad)
  const mountRoutes = (prefix: string) => {
    app.get(`${prefix}/health`, (req, res) => {
      res.json({
        status: 'online',
        system: 'MEVACOL API',
        timestamp: new Date().toISOString(),
      });
    });
    app.use(`${prefix}/system`, systemRouter);
    app.use(`${prefix}/auth`, authRouter);
    app.use(`${prefix}/users`, usersRouter);
    app.use(`${prefix}/customers`, customersRouter);
    app.use(`${prefix}/products`, productsRouter);
    app.use(`${prefix}/sales`, salesRouter);
    app.use(`${prefix}/invoices`, invoicesRouter);
    app.use(`${prefix}/deliveries`, deliveriesRouter);
    app.use(`${prefix}/geo`, geoRouter);
    app.use(`${prefix}/dashboard`, dashboardRouter);
    app.use(`${prefix}/reports`, reportsRouter);
    app.use(`${prefix}/sellers`, sellersRouter);
    app.use(`${prefix}/campaigns`, campaignsRouter);
  };

  mountRoutes('/api');
  mountRoutes('');

  // Servir frontend PWA en producción si existe la compilación local (dist)
  const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
  if (fs.existsSync(frontendDistPath)) {
    app.use(express.static(frontendDistPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/sellers') || req.path.startsWith('/system') || req.path.startsWith('/auth')) {
        return next();
      }
      res.sendFile(path.join(frontendDistPath, 'index.html'));
    });
  }

  // Manejador centralizado 404 (siempre en formato JSON, nunca HTML crudo)
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: `Ruta no encontrada en el servidor: ${req.method} ${req.originalUrl}`,
    });
  });

  // Manejador centralizado de errores
  app.use(errorHandler);

  return app;
}
