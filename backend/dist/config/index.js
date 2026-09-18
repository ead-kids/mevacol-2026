"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
exports.config = {
    PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 4000,
    JWT_SECRET: process.env.JWT_SECRET || 'mevacol_super_secret_production_key_2026_xyz987',
    JWT_EXPIRES_IN: '7d',
    DB_FILE: process.env.DB_FILE || path_1.default.resolve(__dirname, '../../mevacol.db'),
    NODE_ENV: process.env.NODE_ENV || 'development',
};
