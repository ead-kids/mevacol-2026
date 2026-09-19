import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// En producción, JWT_SECRET DEBE estar definido en variables de entorno.
// Si no está definido en producción, el servidor NO debe arrancar.
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret && process.env.NODE_ENV === 'production') {
  throw new Error(
    '❌ FATAL: JWT_SECRET no está definido. Configure la variable de entorno JWT_SECRET antes de iniciar en producción.'
  );
}

export const config = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 4000,
  JWT_SECRET: jwtSecret || 'mevacol_dev_only_secret_change_in_production',
  JWT_EXPIRES_IN: '7d',
  NODE_ENV: process.env.NODE_ENV || 'development',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  // PostgreSQL connection string (Neon.tech en producción, PostgreSQL local en desarrollo)
  // Formato: postgresql://usuario:contraseña@host:5432/nombre_db
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/mevacol',
};
