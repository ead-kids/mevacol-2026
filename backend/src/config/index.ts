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
  // En desarrollo se usa un valor local por comodidad. En producción SIEMPRE debe venir del .env
  JWT_SECRET: jwtSecret || 'mevacol_dev_only_secret_change_in_production',
  JWT_EXPIRES_IN: '7d',
  DB_FILE: process.env.DB_FILE || path.resolve(__dirname, '../../mevacol.db'),
  NODE_ENV: process.env.NODE_ENV || 'development',
  // Orígenes CORS permitidos (separados por coma en producción, p.ej. "https://app.midominio.com,https://www.midominio.com")
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
};
