"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = requireRole;
function requireRole(allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'No se encontró información de usuario autenticado.',
            });
            return;
        }
        const userRole = (req.user.role_code || '').trim().toUpperCase();
        const normalizedAllowed = allowedRoles.map((r) => r.trim().toUpperCase());
        if (!normalizedAllowed.includes(userRole)) {
            res.status(403).json({
                success: false,
                error: `Acceso restringido. Su rol (${req.user.role_code}) no tiene permisos para realizar esta operación.`,
                requiredRoles: allowedRoles,
            });
            return;
        }
        next();
    };
}
