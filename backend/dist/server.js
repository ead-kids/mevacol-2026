"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServer = createServer;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const system_routes_1 = require("./modules/system/system.routes");
const auth_routes_1 = require("./modules/auth/auth.routes");
const users_routes_1 = require("./modules/users/users.routes");
const customers_routes_1 = require("./modules/customers/customers.routes");
const products_routes_1 = require("./modules/products/products.routes");
const sales_routes_1 = require("./modules/sales/sales.routes");
const invoices_routes_1 = require("./modules/invoices/invoices.routes");
const error_middleware_1 = require("./middlewares/error.middleware");
function createServer() {
    const app = (0, express_1.default)();
    // Middlewares estándar de seguridad y parseo
    app.use((0, cors_1.default)({
        origin: '*', // Permitir conexión desde PWA móvil y escritorio local
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'x-device-id'],
    }));
    app.use(express_1.default.json({ limit: '10mb' }));
    app.use(express_1.default.urlencoded({ extended: true }));
    // Ruta base de diagnóstico
    app.get('/api/health', (req, res) => {
        res.json({
            status: 'online',
            system: 'MEVACOL API',
            timestamp: new Date().toISOString(),
        });
    });
    // Enrutamiento modular de la API
    app.use('/api/system', system_routes_1.systemRouter);
    app.use('/api/auth', auth_routes_1.authRouter);
    app.use('/api/users', users_routes_1.usersRouter);
    app.use('/api/customers', customers_routes_1.customersRouter);
    app.use('/api/products', products_routes_1.productsRouter);
    app.use('/api/sales', sales_routes_1.salesRouter);
    app.use('/api/invoices', invoices_routes_1.invoicesRouter);
    // Manejador centralizado de errores
    app.use(error_middleware_1.errorHandler);
    return app;
}
