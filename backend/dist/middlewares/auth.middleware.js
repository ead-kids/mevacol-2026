"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const db_1 = require("../database/db");
function authMiddleware(req, res, next) {
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
        const decoded = jsonwebtoken_1.default.verify(token, config_1.config.JWT_SECRET);
        // Validar en tiempo real que el usuario siga existiendo y esté activo
        const userStmt = db_1.db.prepare(`
      SELECT id, username, full_name, email, role_code, phone, is_active
      FROM users
      WHERE id = ?
    `);
        const user = userStmt.get(decoded.userId);
        if (!user) {
            res.status(401).json({
                success: false,
                error: 'El usuario asociado a esta sesión ya no existe.',
            });
            return;
        }
        if (user.is_active !== 1) {
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
    }
    catch (err) {
        res.status(401).json({
            success: false,
            error: 'Sesión expirada o token inválido. Por favor inicie sesión nuevamente.',
        });
    }
}
