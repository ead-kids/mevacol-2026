"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServer = createServer;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const config_1 = require("./config");
const system_routes_1 = require("./modules/system/system.routes");
const auth_routes_1 = require("./modules/auth/auth.routes");
const users_routes_1 = require("./modules/users/users.routes");
const customers_routes_1 = require("./modules/customers/customers.routes");
const products_routes_1 = require("./modules/products/products.routes");
const sales_routes_1 = require("./modules/sales/sales.routes");
const invoices_routes_1 = require("./modules/invoices/invoices.routes");
const deliveries_routes_1 = require("./modules/deliveries/deliveries.routes");
const geo_routes_1 = require("./modules/geo/geo.routes");
const dashboard_routes_1 = require("./modules/dashboard/dashboard.routes");
const reports_routes_1 = require("./modules/reports/reports.routes");
const sellers_routes_1 = require("./modules/sellers/sellers.routes");
const campaigns_routes_1 = require("./modules/campaigns/campaigns.routes");
const error_middleware_1 = require("./middlewares/error.middleware");
function createServer() {
    const app = (0, express_1.default)();
    // Parsear orígenes CORS desde la variable de entorno
    const customOrigins = config_1.config.CORS_ORIGIN === '*'
        ? ['*']
        : config_1.config.CORS_ORIGIN.split(',').map((o) => o.trim());
    // Middlewares estándar de seguridad y parseo con soporte automático para Vercel y GitHub Pages
    app.use((0, cors_1.default)({
        origin: (origin, callback) => {
            // Permitir peticiones sin header Origin (apps móviles, curl, server-to-server)
            if (!origin)
                return callback(null, true);
            // Permitir si CORS_ORIGIN es comodín '*'
            if (customOrigins.includes('*'))
                return callback(null, true);
            // Permitir si coincide exactamente con la lista configurada
            if (customOrigins.includes(origin))
                return callback(null, true);
            // Permitir automáticamente dominios de Vercel, GitHub Pages y desarrollo local
            if (origin.endsWith('.vercel.app') ||
                origin.endsWith('.github.io') ||
                origin.includes('localhost') ||
                origin.includes('127.0.0.1')) {
                return callback(null, true);
            }
            return callback(null, false);
        },
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'x-device-id'],
        credentials: true,
    }));
    app.use(express_1.default.json({ limit: '10mb' }));
    app.use(express_1.default.urlencoded({ extended: true }));
    // Enrutamiento modular de la API (con soporte dual /api y prefijo raíz para máxima compatibilidad)
    const mountRoutes = (prefix) => {
        app.get(`${prefix}/health`, (req, res) => {
            res.json({
                status: 'online',
                system: 'MEVACOL API',
                timestamp: new Date().toISOString(),
            });
        });
        app.use(`${prefix}/system`, system_routes_1.systemRouter);
        app.use(`${prefix}/auth`, auth_routes_1.authRouter);
        app.use(`${prefix}/users`, users_routes_1.usersRouter);
        app.use(`${prefix}/customers`, customers_routes_1.customersRouter);
        app.use(`${prefix}/products`, products_routes_1.productsRouter);
        app.use(`${prefix}/sales`, sales_routes_1.salesRouter);
        app.use(`${prefix}/invoices`, invoices_routes_1.invoicesRouter);
        app.use(`${prefix}/deliveries`, deliveries_routes_1.deliveriesRouter);
        app.use(`${prefix}/geo`, geo_routes_1.geoRouter);
        app.use(`${prefix}/dashboard`, dashboard_routes_1.dashboardRouter);
        app.use(`${prefix}/reports`, reports_routes_1.reportsRouter);
        app.use(`${prefix}/sellers`, sellers_routes_1.sellersRouter);
        app.use(`${prefix}/campaigns`, campaigns_routes_1.campaignsRouter);
    };
    mountRoutes('/api');
    mountRoutes('');
    // Servir frontend PWA en producción si existe la compilación local (dist)
    const frontendDistPath = path_1.default.resolve(__dirname, '../../frontend/dist');
    if (fs_1.default.existsSync(frontendDistPath)) {
        app.use(express_1.default.static(frontendDistPath));
        app.get('*', (req, res, next) => {
            if (req.path.startsWith('/api') || req.path.startsWith('/sellers') || req.path.startsWith('/system') || req.path.startsWith('/auth')) {
                return next();
            }
            res.sendFile(path_1.default.join(frontendDistPath, 'index.html'));
        });
    }
    // Manejador centralizado 404 (siempre en formato JSON, nunca HTML crudo)
    app.use((req, res) => {
        res.status(404).json({
            success: false,
            error: `Ruta no encontrada en el servidor: ${req.method} ${req.originalUrl}`,
        });
    });
    // Manejador centralizado de errores
    app.use(error_middleware_1.errorHandler);
    return app;
}
