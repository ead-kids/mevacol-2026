"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
// En producción, JWT_SECRET DEBE estar definido en variables de entorno.
// Si no está definido en producción, el servidor NO debe arrancar.
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret && process.env.NODE_ENV === 'production') {
    throw new Error('❌ FATAL: JWT_SECRET no está definido. Configure la variable de entorno JWT_SECRET antes de iniciar en producción.');
}
exports.config = {
    PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 4000,
    JWT_SECRET: jwtSecret || 'mevacol_dev_only_secret_change_in_production',
    JWT_EXPIRES_IN: '7d',
    NODE_ENV: process.env.NODE_ENV || 'development',
    CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
    // PostgreSQL connection string (Neon.tech en producción, PostgreSQL local en desarrollo)
    // Formato: postgresql://usuario:contraseña@host:5432/nombre_db
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/mevacol',
};
