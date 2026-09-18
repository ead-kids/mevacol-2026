import express, { Application } from 'express';
import cors from 'cors';
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
import { errorHandler } from './middlewares/error.middleware';

export function createServer(): Application {
  const app = express();

  // Middlewares estándar de seguridad y parseo
  app.use(cors({
    origin: '*', // Permitir conexión desde PWA móvil y escritorio local
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-device-id'],
  }));

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Ruta base de diagnóstico
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'online',
      system: 'MEVACOL API',
      timestamp: new Date().toISOString(),
    });
  });

  // Enrutamiento modular de la API
  app.use('/api/system', systemRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/customers', customersRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/sales', salesRouter);
  app.use('/api/invoices', invoicesRouter);
  app.use('/api/deliveries', deliveriesRouter);
  app.use('/api/geo', geoRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/reports', reportsRouter);

  // Manejador centralizado de errores
  app.use(errorHandler);

  return app;
}
