import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';

// Inicializar conexión con la base de datos SQLite
export const db = new Database(config.DB_FILE);

// Configuraciones óptimas de rendimiento e integridad
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase(): void {
  try {
    let schemaPath = path.resolve(__dirname, 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      schemaPath = path.resolve(__dirname, '../../src/database/schema.sql');
    }
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
    db.exec(schemaSql);

    // Migraciones automáticas seguras para tabla customers (Fase 2)
    try {
      const customerColumns = db.prepare(`PRAGMA table_info(customers)`).all() as { name: string }[];
      const colNames = customerColumns.map((c) => c.name);
      if (!colNames.includes('email')) {
        db.exec(`ALTER TABLE customers ADD COLUMN email TEXT;`);
      }
      if (!colNames.includes('city')) {
        db.exec(`ALTER TABLE customers ADD COLUMN city TEXT;`);
      }
      if (!colNames.includes('is_active')) {
        db.exec(`ALTER TABLE customers ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;`);
      }
    } catch (migErr) {
      console.warn('Aviso en migración de clientes:', migErr);
    }

    // Migraciones automáticas seguras para tabla products (Fase 3)
    try {
      const productColumns = db.prepare(`PRAGMA table_info(products)`).all() as { name: string }[];
      const prodColNames = productColumns.map((c) => c.name);
      if (!prodColNames.includes('category')) {
        db.exec(`ALTER TABLE products ADD COLUMN category TEXT NOT NULL DEFAULT 'General';`);
      }
      if (!prodColNames.includes('unit_measure')) {
        db.exec(`ALTER TABLE products ADD COLUMN unit_measure TEXT NOT NULL DEFAULT 'Unidad';`);
      }
      if (!prodColNames.includes('cost_cop')) {
        db.exec(`ALTER TABLE products ADD COLUMN cost_cop INTEGER NOT NULL DEFAULT 0;`);
      }
    } catch (migProdErr) {
      console.warn('Aviso en migración de productos:', migProdErr);
    }

    // Migración e inicialización segura para tabla invoices (Fase 5: Facturación)
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS invoices (
          id TEXT PRIMARY KEY,
          invoice_code TEXT UNIQUE NOT NULL,
          sale_id TEXT NOT NULL UNIQUE,
          customer_id TEXT NOT NULL,
          seller_user_id TEXT NOT NULL,
          subtotal_cop INTEGER NOT NULL,
          discount_cop INTEGER NOT NULL DEFAULT 0,
          tax_cop INTEGER NOT NULL DEFAULT 0,
          total_cop INTEGER NOT NULL,
          notes TEXT,
          dian_status TEXT NOT NULL DEFAULT 'INTERNA',
          dian_cufe TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE RESTRICT,
          FOREIGN KEY (customer_id) REFERENCES customers(id),
          FOREIGN KEY (seller_user_id) REFERENCES users(id)
        );
        CREATE INDEX IF NOT EXISTS idx_invoices_code ON invoices(invoice_code);
        CREATE INDEX IF NOT EXISTS idx_invoices_sale ON invoices(sale_id);
        CREATE INDEX IF NOT EXISTS idx_invoices_seller ON invoices(seller_user_id);
        CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
      `);

      // Generar facturas iniciales para ventas existentes que aún no tengan factura asociada
      const salesWithoutInvoice = db.prepare(`
        SELECT s.id, s.customer_id, s.seller_user_id, s.subtotal_cop, s.discount_cop, s.total_cop, s.notes, s.created_at
        FROM sales s
        LEFT JOIN invoices i ON s.id = i.sale_id
        WHERE i.id IS NULL
        ORDER BY s.created_at ASC
      `).all() as any[];

      if (salesWithoutInvoice.length > 0) {
        const existingInvoices = db.prepare(`SELECT invoice_code FROM invoices WHERE invoice_code LIKE 'FAC-%'`).all() as { invoice_code: string }[];
        let maxFacNum = 0;
        for (const inv of existingInvoices) {
          const match = inv.invoice_code ? inv.invoice_code.match(/FAC-(\d+)/) : null;
          if (match) {
            const n = parseInt(match[1], 10);
            if (!isNaN(n) && n > maxFacNum) maxFacNum = n;
          }
        }

        const insertInvStmt = db.prepare(`
          INSERT INTO invoices (
            id, invoice_code, sale_id, customer_id, seller_user_id,
            subtotal_cop, discount_cop, tax_cop, total_cop, notes,
            dian_status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'INTERNA', ?, ?)
        `);

        const syncTx = db.transaction(() => {
          for (const s of salesWithoutInvoice) {
            maxFacNum++;
            const facCode = `FAC-${String(maxFacNum).padStart(4, '0')}`;
            insertInvStmt.run(
              uuidv4(),
              facCode,
              s.id,
              s.customer_id,
              s.seller_user_id,
              s.subtotal_cop,
              s.discount_cop || 0,
              s.total_cop,
              s.notes || null,
              s.created_at,
              s.created_at
            );
          }
        });
        syncTx();
        console.log(`✅ ${salesWithoutInvoice.length} facturas iniciales sincronizadas para ventas existentes.`);
      }
    } catch (migInvErr) {
      console.warn('Aviso en migración de facturas:', migInvErr);
    }

    // Migración e inicialización segura para tablas de Entregas (Fase 6: Módulo de Entregas)
    try {
      const delivColumns = db.prepare(`PRAGMA table_info(deliveries)`).all() as { name: string }[];
      const colNames = delivColumns.map((c) => c.name);

      // Si la tabla antigua usaba order_id sin sale_id, renovar estructura para Fase 6
      if (colNames.length > 0 && colNames.includes('order_id') && !colNames.includes('sale_id')) {
        db.exec(`DROP TABLE IF EXISTS deliveries;`);
      }

      db.exec(`
        CREATE TABLE IF NOT EXISTS deliveries (
          id TEXT PRIMARY KEY,
          delivery_code TEXT UNIQUE NOT NULL,
          sale_id TEXT NOT NULL,
          invoice_id TEXT,
          customer_id TEXT NOT NULL,
          delivery_user_id TEXT,
          status TEXT NOT NULL DEFAULT 'PENDIENTE',
          scheduled_date TEXT NOT NULL,
          delivered_at TEXT,
          customer_name TEXT NOT NULL,
          customer_phone TEXT,
          delivery_address TEXT NOT NULL,
          delivery_city TEXT NOT NULL,
          notes TEXT,
          created_by_user_id TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE RESTRICT,
          FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT,
          FOREIGN KEY (customer_id) REFERENCES customers(id),
          FOREIGN KEY (delivery_user_id) REFERENCES users(id),
          FOREIGN KEY (created_by_user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS delivery_status_history (
          id TEXT PRIMARY KEY,
          delivery_id TEXT NOT NULL,
          from_status TEXT,
          to_status TEXT NOT NULL,
          changed_by_user_id TEXT NOT NULL,
          changed_by_user_name TEXT NOT NULL,
          notes TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE CASCADE,
          FOREIGN KEY (changed_by_user_id) REFERENCES users(id)
        );

        CREATE INDEX IF NOT EXISTS idx_deliveries_code ON deliveries(delivery_code);
        CREATE INDEX IF NOT EXISTS idx_deliveries_sale ON deliveries(sale_id);
        CREATE INDEX IF NOT EXISTS idx_deliveries_user ON deliveries(delivery_user_id);
        CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);
        CREATE INDEX IF NOT EXISTS idx_deliv_hist_deliv ON delivery_status_history(delivery_id);
      `);
      console.log('✅ Tablas de Entregas (deliveries, delivery_status_history) verificadas.');
    } catch (migDelivErr) {
      console.warn('Aviso en migración de entregas:', migDelivErr);
    }

    // Migraciones automáticas seguras para Fase 7 (GPS, Mapas y Georreferenciación)
    try {
      const delivCols = db.prepare(`PRAGMA table_info(deliveries)`).all() as { name: string }[];
      const delivColNames = delivCols.map((c) => c.name);
      if (!delivColNames.includes('latitude')) {
        db.exec(`ALTER TABLE deliveries ADD COLUMN latitude REAL;`);
      }
      if (!delivColNames.includes('longitude')) {
        db.exec(`ALTER TABLE deliveries ADD COLUMN longitude REAL;`);
      }
      if (!delivColNames.includes('geocoded_at')) {
        db.exec(`ALTER TABLE deliveries ADD COLUMN geocoded_at TEXT;`);
      }

      const custCols = db.prepare(`PRAGMA table_info(customers)`).all() as { name: string }[];
      const custColNames = custCols.map((c) => c.name);
      if (!custColNames.includes('latitude')) {
        db.exec(`ALTER TABLE customers ADD COLUMN latitude REAL;`);
      }
      if (!custColNames.includes('longitude')) {
        db.exec(`ALTER TABLE customers ADD COLUMN longitude REAL;`);
      }
      if (!custColNames.includes('geocoded_at')) {
        db.exec(`ALTER TABLE customers ADD COLUMN geocoded_at TEXT;`);
      }

      console.log('✅ Columnas de geolocalización (latitude, longitude, geocoded_at) verificadas.');
    } catch (migGeoErr) {
      console.warn('Aviso en migración de geolocalización:', migGeoErr);
    }

    // Sembrar productos de muestra iniciales si no hay productos
    try {
      const prodCount = db.prepare(`SELECT COUNT(*) as count FROM products`).get() as { count: number };
      if (prodCount.count === 0) {
        const insertProd = db.prepare(`
          INSERT INTO products (id, code, name, description, category, unit_measure, price_cop, cost_cop, current_stock, min_stock, is_active)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const seedProducts = [
          {
            id: uuidv4(),
            code: 'ACET-500MG',
            name: 'Acetaminofén 500mg MK',
            description: 'Analgésico y antipirético. Caja con 100 tabletas.',
            category: 'Analgésicos',
            unit_measure: 'Caja x 100',
            price_cop: 14000,
            cost_cop: 8500,
            current_stock: 45,
            min_stock: 10,
            is_active: 1,
          },
          {
            id: uuidv4(),
            code: 'AMOX-500MG',
            name: 'Amoxicilina 500mg Lafrancol',
            description: 'Antibiótico bactericida de amplio espectro. Caja con 50 cápsulas.',
            category: 'Antibióticos',
            unit_measure: 'Caja x 50',
            price_cop: 28500,
            cost_cop: 18000,
            current_stock: 24,
            min_stock: 8,
            is_active: 1,
          },
          {
            id: uuidv4(),
            code: 'IBUP-400MG',
            name: 'Ibuprofeno 400mg Genfar',
            description: 'Antiinflamatorio no esteroideo (AINE). Caja x 30 tabletas.',
            category: 'Antiinflamatorios',
            unit_measure: 'Caja x 30',
            price_cop: 16000,
            cost_cop: 9500,
            current_stock: 4, // Stock bajo (menor que min_stock 10)
            min_stock: 10,
            is_active: 1,
          },
          {
            id: uuidv4(),
            code: 'LORA-10MG',
            name: 'Loratadina 10mg MK',
            description: 'Antihistamínico no sedante. Caja x 20 tabletas.',
            category: 'Antihistamínicos',
            unit_measure: 'Caja x 20',
            price_cop: 11000,
            cost_cop: 6200,
            current_stock: 0, // Agotado
            min_stock: 8,
            is_active: 1,
          },
          {
            id: uuidv4(),
            code: 'OMEP-20MG',
            name: 'Omeprazol 20mg Tecnoquímicas',
            description: 'Inhibidor de la bomba de protones para acidez. Caja x 30 cápsulas.',
            category: 'Gastrointestinales',
            unit_measure: 'Caja x 30',
            price_cop: 19500,
            cost_cop: 11500,
            current_stock: 35,
            min_stock: 12,
            is_active: 1,
          },
          {
            id: uuidv4(),
            code: 'ALCOH-700ML',
            name: 'Alcohol Antiséptico 70%',
            description: 'Solución desinfectante de uso tópico. Frasco x 700ml.',
            category: 'Material Médico',
            unit_measure: 'Frasco 700ml',
            price_cop: 8500,
            cost_cop: 4500,
            current_stock: 60,
            min_stock: 15,
            is_active: 1,
          },
          {
            id: uuidv4(),
            code: 'SUERO-500ML',
            name: 'Electrolit Suero Oral Fresa',
            description: 'Solución rehidratante oral con electrolitos. Frasco x 500ml.',
            category: 'Hidratación',
            unit_measure: 'Frasco 500ml',
            price_cop: 7500,
            cost_cop: 4200,
            current_stock: 3, // Stock bajo
            min_stock: 10,
            is_active: 1,
          },
        ];

        const seedTx = db.transaction(() => {
          for (const prod of seedProducts) {
            insertProd.run(
              prod.id,
              prod.code,
              prod.name,
              prod.description,
              prod.category,
              prod.unit_measure,
              prod.price_cop,
              prod.cost_cop,
              prod.current_stock,
              prod.min_stock,
              prod.is_active
            );
          }
        });
        seedTx();
        console.log('✅ Catálogo farmacéutico de prueba sembrado exitosamente.');
      }
    } catch (seedErr) {
      console.warn('Aviso al sembrar productos de muestra:', seedErr);
    }

    // Sembrar roles del sistema si no existen
    const seedRoles = db.transaction(() => {
      const insertRole = db.prepare(`
        INSERT OR IGNORE INTO roles (code, name, description)
        VALUES (@code, @name, @description)
      `);

      insertRole.run({
        code: 'ADMINISTRADOR',
        name: 'Administrador',
        description: 'Control total del sistema, configuración, usuarios, inventario y reportes',
      });

      insertRole.run({
        code: 'VENDEDOR',
        name: 'Vendedor',
        description: 'Operación en campo, ventas, clientes y consulta de incentivos',
      });

      insertRole.run({
        code: 'ENTREGADOR',
        name: 'Entregador',
        description: 'Visualización de pedidos asignados, mapas, navegación y confirmación de entrega',
      });
    });

    seedRoles();
    console.log('✅ Base de datos MEVACOL inicializada correctamente.');
  } catch (error) {
    console.error('❌ Error al inicializar la base de datos:', error);
    throw error;
  }
}

// Función auxiliar para registrar auditoría de forma atómica y centralizada
export function recordAuditLog(params: {
  userId: string | null;
  action: string;
  entityName: string;
  entityId?: string | null;
  details?: Record<string, any> | null;
  ipAddress?: string | null;
  deviceInfo?: string | string[] | null;
}): void {
  try {
    const stmt = db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, entity_name, entity_id, details_json, ip_address, device_info, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    const deviceStr = typeof params.deviceInfo === 'string'
      ? params.deviceInfo
      : Array.isArray(params.deviceInfo)
      ? params.deviceInfo.join(', ')
      : null;

    stmt.run(
      uuidv4(),
      params.userId,
      params.action,
      params.entityName,
      params.entityId || null,
      params.details ? JSON.stringify(params.details) : null,
      params.ipAddress || null,
      deviceStr
    );
  } catch (err) {
    console.error('Error al registrar auditoría:', err);
  }
}
