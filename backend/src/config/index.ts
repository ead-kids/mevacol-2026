import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 4000,
  JWT_SECRET: process.env.JWT_SECRET || 'mevacol_super_secret_production_key_2026_xyz987',
  JWT_EXPIRES_IN: '7d',
  DB_FILE: process.env.DB_FILE || path.resolve(__dirname, '../../mevacol.db'),
  NODE_ENV: process.env.NODE_ENV || 'development',
};
