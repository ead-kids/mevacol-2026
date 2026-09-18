-- ==========================================================
-- MEVACOL - ESQUEMA DE BASE DE DATOS MAESTRO
-- Diseñado para SQLite / PostgreSQL compatible
-- ==========================================================

-- 1. Catálogo de Roles
CREATE TABLE IF NOT EXISTS roles (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL
);

-- 2. Usuarios del Sistema
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  role_code TEXT NOT NULL,
  phone TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (role_code) REFERENCES roles(code)
);

-- 3. Clientes (Preparado para Fase Clientes)
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  id_number TEXT UNIQUE NOT NULL, -- Cédula o NIT
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  latitude REAL,
  longitude REAL,
  is_active INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

-- 4. Productos e Inventario (Fase 3: Módulo de Productos e Inventario)
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL, -- Código de barra o referencia única (ej. ACET-500MG)
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'General', -- Analgésicos, Antibióticos, etc.
  unit_measure TEXT NOT NULL DEFAULT 'Unidad', -- Caja, Frasco, Blíster, Ampolla, etc.
  price_cop INTEGER NOT NULL DEFAULT 0, -- Precio de venta al público en Pesos Colombianos
  cost_cop INTEGER NOT NULL DEFAULT 0, -- Costo unitario de adquisición en COP
  current_stock INTEGER NOT NULL DEFAULT 0, -- Cantidad física disponible
  min_stock INTEGER NOT NULL DEFAULT 5, -- Stock mínimo de seguridad para alertas
  is_active INTEGER NOT NULL DEFAULT 1, -- 1 = Activo, 0 = Inactivo
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 5. Ventas y Facturas (Preparado para Fase Ventas & Offline)
CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY, -- UUID generado por cliente o servidor
  invoice_number TEXT UNIQUE, -- Número consecutivo de factura
  customer_id TEXT,
  seller_user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ABIERTA', -- ABIERTA, FINALIZADA, CANCELADA
  subtotal_cop INTEGER NOT NULL DEFAULT 0,
  discount_cop INTEGER NOT NULL DEFAULT 0,
  total_cop INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  is_synced INTEGER NOT NULL DEFAULT 1,
  device_id TEXT,
  offline_created_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (seller_user_id) REFERENCES users(id)
);

-- 6. Detalle de Ventas
CREATE TABLE IF NOT EXISTS sale_items (
  id TEXT PRIMARY KEY,
  sale_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price_cop INTEGER NOT NULL,
  discount_cop INTEGER NOT NULL DEFAULT 0,
  total_cop INTEGER NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- 6.1. Facturación Interna (Fase 5: Módulo de Facturación, 1-a-1 con Ventas)
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  invoice_code TEXT UNIQUE NOT NULL, -- Consecutivo único (FAC-0001, FAC-0002, etc.)
  sale_id TEXT NOT NULL UNIQUE, -- Vinculación 1-a-1 directa con la venta para evitar duplicados
  customer_id TEXT NOT NULL,
  seller_user_id TEXT NOT NULL,
  subtotal_cop INTEGER NOT NULL,
  discount_cop INTEGER NOT NULL DEFAULT 0,
  tax_cop INTEGER NOT NULL DEFAULT 0,
  total_cop INTEGER NOT NULL,
  notes TEXT,
  dian_status TEXT NOT NULL DEFAULT 'INTERNA', -- Arquitectura preparada para futura DIAN
  dian_cufe TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE RESTRICT,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (seller_user_id) REFERENCES users(id)
);

-- 7. Pedidos y Entregas (Preparado para Fase Entregadores)
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  sale_id TEXT NOT NULL UNIQUE,
  delivery_user_id TEXT,
  status TEXT NOT NULL DEFAULT 'PENDIENTE', -- PENDIENTE, PREPARANDO, ASIGNADO, EN_CAMINO, ENTREGADO
  distance_meters INTEGER,
  estimated_time_minutes INTEGER,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (sale_id) REFERENCES sales(id),
  FOREIGN KEY (delivery_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS deliveries (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE,
  delivery_user_id TEXT NOT NULL,
  delivered_at TEXT,
  proof_type TEXT,
  proof_notes TEXT,
  signature_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (delivery_user_id) REFERENCES users(id)
);

-- 8. Ubicaciones de Vendedores en Jornada Laboral (Preparado para Fase GPS)
CREATE TABLE IF NOT EXISTS seller_locations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  accuracy REAL,
  is_online INTEGER NOT NULL DEFAULT 1,
  device_info TEXT,
  recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 9. Campañas e Incentivos (Preparado para Fase Campañas)
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  target_amount_cop INTEGER NOT NULL,
  reward_description TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 10. Conflictos de Inventario Offline (Detección y Trazabilidad)
CREATE TABLE IF NOT EXISTS inventory_conflicts (
  id TEXT PRIMARY KEY,
  sale_id TEXT,
  product_id TEXT NOT NULL,
  seller_user_id TEXT NOT NULL,
  requested_quantity INTEGER NOT NULL,
  available_quantity INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDIENTE', -- PENDIENTE, RESUELTO, DESCARTADO
  resolved_by_user_id TEXT,
  resolved_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (seller_user_id) REFERENCES users(id),
  FOREIGN KEY (resolved_by_user_id) REFERENCES users(id)
);

-- 11. Auditoría y Trazabilidad Completa
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  entity_name TEXT NOT NULL,
  entity_id TEXT,
  details_json TEXT,
  ip_address TEXT,
  device_info TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Índices de alto rendimiento
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_code);
CREATE INDEX IF NOT EXISTS idx_sales_seller ON sales(seller_user_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_code ON invoices(invoice_code);
CREATE INDEX IF NOT EXISTS idx_invoices_sale ON invoices(sale_id);
CREATE INDEX IF NOT EXISTS idx_invoices_seller ON invoices(seller_user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_delivery ON orders(delivery_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
