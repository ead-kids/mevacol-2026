"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
function errorHandler(err, req, res, next) {
    console.error('💥 Error inesperado en el servidor:', err);
    const status = err.status || 500;
    const message = err.message || 'Ocurrió un error interno en el servidor.';
    res.status(status).json({
        success: false,
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
}
