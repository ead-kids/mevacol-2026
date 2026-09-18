"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("./config");
const db_1 = require("./database/db");
const server_1 = require("./server");
async function bootstrap() {
    try {
        // 1. Inicializar esquema de Base de Datos relacional
        (0, db_1.initDatabase)();
        // 2. Iniciar servidor Express
        const app = (0, server_1.createServer)();
        app.listen(config_1.config.PORT, () => {
            console.log(`====================================================`);
            console.log(`🚀 SERVIDOR MEVACOL ACTIVO EN PUERTO: ${config_1.config.PORT}`);
            console.log(`🔗 API Base: http://localhost:${config_1.config.PORT}/api`);
            console.log(`📡 Diagnóstico: http://localhost:${config_1.config.PORT}/api/system/status`);
            console.log(`====================================================`);
        });
    }
    catch (error) {
        console.error('❌ Error fatal al iniciar MEVACOL Backend:', error);
        process.exit(1);
    }
}
bootstrap();
