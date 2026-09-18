"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.systemRouter = void 0;
const express_1 = require("express");
const db_1 = require("../../database/db");
exports.systemRouter = (0, express_1.Router)();
// Endpoint de diagnóstico y estado de inicialización
exports.systemRouter.get('/status', (req, res) => {
    try {
        const adminRow = db_1.db.prepare(`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE role_code = 'ADMINISTRADOR'
    `).get();
        const usersRow = db_1.db.prepare(`
      SELECT COUNT(*) as count 
      FROM users
    `).get();
        const isBootstrapped = adminRow.count > 0;
        res.json({
            success: true,
            systemName: 'MEVACOL',
            version: '1.0.0',
            phase: 1,
            bootstrapped: isBootstrapped,
            totalUsers: usersRow.count,
            serverTime: new Date().toISOString(),
            offlineReady: true,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error al consultar el estado del sistema: ' + error.message,
        });
    }
});
