/**
 * db.ts — Inicialización de Base de Datos PostgreSQL para MEVACOL
 *
 * Reemplaza better-sqlite3 por pg (node-postgres).
 * Ejecuta el esquema DDL y siembra datos iniciales en el primer arranque.
 */

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { pool, execRaw, queryOne, queryAll, queryRun } from './pgDb';

export { queryOne, queryAll, queryRun };
export { pool };

// ── Inicialización del esquema ────────────────────────────────────────────────
export async function initDatabase(): Promise<void> {
  try {
    // Leer el schema SQL compilado (copiado al dist/ por el Dockerfile)
    let schemaPath = path.resolve(__dirname, 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      schemaPath = path.resolve(__dirname, '../../src/database/schema.sql');
    }

    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

    // Ejecutar cada sentencia por separado (PostgreSQL no admite multi-statement en pool.query)
    const statements = schemaSql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const stmt of statements) {
      await execRaw(stmt);
    }

    // Sembrar roles del sistema si no existen
    await queryRun(`
      INSERT INTO roles (code, name, description)
      VALUES
        ('ADMINISTRADOR', 'Administrador', 'Control total del sistema, configuración, usuarios, inventario y reportes'),
        ('VENDEDOR', 'Vendedor', 'Operación en campo, ventas, clientes y consulta de incentivos'),
        ('ENTREGADOR', 'Entregador', 'Visualización de pedidos asignados, mapas, navegación y confirmación de entrega')
      ON CONFLICT (code) DO NOTHING
    `);

    // Sembrar productos de muestra si el catálogo está vacío
    const prodCount = await queryOne<{ count: string }>('SELECT COUNT(*) as count FROM products');
    if (parseInt(prodCount?.count ?? '0', 10) === 0) {
      const seedProducts = [
        { code: 'ACET-500MG', name: 'Acetaminofén 500mg MK', description: 'Analgésico y antipirético. Caja con 100 tabletas.', category: 'Analgésicos', unit_measure: 'Caja x 100', price_cop: 14000, cost_cop: 8500, current_stock: 45, min_stock: 10 },
        { code: 'AMOX-500MG', name: 'Amoxicilina 500mg Lafrancol', description: 'Antibiótico bactericida de amplio espectro. Caja con 50 cápsulas.', category: 'Antibióticos', unit_measure: 'Caja x 50', price_cop: 28500, cost_cop: 18000, current_stock: 24, min_stock: 8 },
        { code: 'IBUP-400MG', name: 'Ibuprofeno 400mg Genfar', description: 'Antiinflamatorio no esteroideo (AINE). Caja x 30 tabletas.', category: 'Antiinflamatorios', unit_measure: 'Caja x 30', price_cop: 16000, cost_cop: 9500, current_stock: 4, min_stock: 10 },
        { code: 'LORA-10MG', name: 'Loratadina 10mg MK', description: 'Antihistamínico no sedante. Caja x 20 tabletas.', category: 'Antihistamínicos', unit_measure: 'Caja x 20', price_cop: 11000, cost_cop: 6200, current_stock: 0, min_stock: 8 },
        { code: 'OMEP-20MG', name: 'Omeprazol 20mg Tecnoquímicas', description: 'Inhibidor de la bomba de protones para acidez. Caja x 30 cápsulas.', category: 'Gastrointestinales', unit_measure: 'Caja x 30', price_cop: 19500, cost_cop: 11500, current_stock: 35, min_stock: 12 },
        { code: 'ALCOH-700ML', name: 'Alcohol Antiséptico 70%', description: 'Solución desinfectante de uso tópico. Frasco x 700ml.', category: 'Material Médico', unit_measure: 'Frasco 700ml', price_cop: 8500, cost_cop: 4500, current_stock: 60, min_stock: 15 },
        { code: 'SUERO-500ML', name: 'Electrolit Suero Oral Fresa', description: 'Solución rehidratante oral con electrolitos. Frasco x 500ml.', category: 'Hidratación', unit_measure: 'Frasco 500ml', price_cop: 7500, cost_cop: 4200, current_stock: 3, min_stock: 10 },
      ];

      for (const p of seedProducts) {
        await queryRun(
          `INSERT INTO products (id, code, name, description, category, unit_measure, price_cop, cost_cop, current_stock, min_stock, is_active)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,1) ON CONFLICT (code) DO NOTHING`,
          [uuidv4(), p.code, p.name, p.description, p.category, p.unit_measure, p.price_cop, p.cost_cop, p.current_stock, p.min_stock]
        );
      }
      console.log('✅ Catálogo farmacéutico de prueba sembrado exitosamente.');
    }

    console.log('✅ Base de datos MEVACOL (PostgreSQL) inicializada correctamente.');
  } catch (error) {
    console.error('❌ Error al inicializar la base de datos:', error);
    throw error;
  }
}

// ── Registro de Auditoría ─────────────────────────────────────────────────────
export function recordAuditLog(params: {
  userId: string | null;
  action: string;
  entityName: string;
  entityId?: string | null;
  details?: Record<string, any> | null;
  ipAddress?: string | null;
  deviceInfo?: string | string[] | null;
}): void {
  // Fire-and-forget: la auditoría no debe bloquear la respuesta al cliente
  const deviceStr = typeof params.deviceInfo === 'string'
    ? params.deviceInfo
    : Array.isArray(params.deviceInfo)
    ? params.deviceInfo.join(', ')
    : null;

  queryRun(
    `INSERT INTO audit_logs (id, user_id, action, entity_name, entity_id, details_json, ip_address, device_info, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,TO_CHAR(NOW(),'YYYY-MM-DD HH24:MI:SS'))`,
    [
      uuidv4(),
      params.userId,
      params.action,
      params.entityName,
      params.entityId || null,
      params.details ? JSON.stringify(params.details) : null,
      params.ipAddress || null,
      deviceStr,
    ]
  ).catch((err) => console.error('Error al registrar auditoría:', err));
}
