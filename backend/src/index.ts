import { config } from './config';
import { initDatabase } from './database/db';
import { createServer } from './server';

async function bootstrap() {
  try {
    // 1. Inicializar esquema de Base de Datos relacional
    initDatabase();

    // 2. Iniciar servidor Express
    const app = createServer();

    app.listen(config.PORT, () => {
      console.log(`====================================================`);
      console.log(`🚀 SERVIDOR MEVACOL ACTIVO EN PUERTO: ${config.PORT}`);
      console.log(`🔗 API Base: http://localhost:${config.PORT}/api`);
      console.log(`📡 Diagnóstico: http://localhost:${config.PORT}/api/system/status`);
      console.log(`====================================================`);
    });
  } catch (error) {
    console.error('❌ Error fatal al iniciar MEVACOL Backend:', error);
    process.exit(1);
  }
}

bootstrap();
