-- ==========================================================
-- MEVACOL - ESQUEMA DE BASE DE DATOS MAESTRO (PostgreSQL)
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
  document_id TEXT,
  address TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS'),
  updated_at TEXT NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS'),
  FOREIGN KEY (role_code) REFERENCES roles(code)
);

-- 3. Clientes
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  id_number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  latitude REAL,
  longitude REAL,
  geocoded_at TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS'),
  updated_at TEXT NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS'),
  FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

-- 4. Productos e Inventario
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'General',
  unit_measure TEXT NOT NULL DEFAULT 'Unidad',
  price_cop INTEGER NOT NULL DEFAULT 0,
  cost_cop INTEGER NOT NULL DEFAULT 0,
  current_stock INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 5,
  is_active INTEGER NOT NULL DEFAULT 1,
  image_url TEXT,
  created_at TEXT NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS'),
  updated_at TEXT NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS')
);

-- 5. Ventas
CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  invoice_number TEXT UNIQUE,
  customer_id TEXT,
  seller_user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ABIERTA',
  subtotal_cop INTEGER NOT NULL DEFAULT 0,
  discount_cop INTEGER NOT NULL DEFAULT 0,
  total_cop INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  is_synced INTEGER NOT NULL DEFAULT 1,
  device_id TEXT,
  offline_created_at TEXT,
  created_at TEXT NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS'),
  updated_at TEXT NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS'),
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
  created_at TEXT NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS'),
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- 7. Facturas Internas
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
  created_at TEXT NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS'),
  updated_at TEXT NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS'),
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE RESTRICT,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (seller_user_id) REFERENCES users(id)
);

-- 8. Entregas
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
  latitude REAL,
  longitude REAL,
  geocoded_at TEXT,
  notes TEXT,
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS'),
  updated_at TEXT NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS'),
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE RESTRICT,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (delivery_user_id) REFERENCES users(id),
  FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

-- 9. Historial de Estado de Entregas
CREATE TABLE IF NOT EXISTS delivery_status_history (
  id TEXT PRIMARY KEY,
  delivery_id TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by_user_id TEXT NOT NULL,
  changed_by_user_name TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS'),
  FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by_user_id) REFERENCES users(id)
);

-- 10. Ubicaciones GPS
CREATE TABLE IF NOT EXISTS seller_locations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  accuracy REAL,
  is_online INTEGER NOT NULL DEFAULT 1,
  device_info TEXT,
  recorded_at TEXT NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS'),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 11. Conflictos de Inventario Offline
CREATE TABLE IF NOT EXISTS inventory_conflicts (
  id TEXT PRIMARY KEY,
  sale_id TEXT,
  product_id TEXT NOT NULL,
  seller_user_id TEXT NOT NULL,
  requested_quantity INTEGER NOT NULL,
  available_quantity INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDIENTE',
  resolved_by_user_id TEXT,
  resolved_at TEXT,
  created_at TEXT NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS'),
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (seller_user_id) REFERENCES users(id),
  FOREIGN KEY (resolved_by_user_id) REFERENCES users(id)
);

-- 12. Auditoría y Trazabilidad
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  entity_name TEXT NOT NULL,
  entity_id TEXT,
  details_json TEXT,
  ip_address TEXT,
  device_info TEXT,
  created_at TEXT NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS'),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 13. Órdenes (tabla legacy mantenida por compatibilidad)
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  sale_id TEXT NOT NULL UNIQUE,
  delivery_user_id TEXT,
  status TEXT NOT NULL DEFAULT 'PENDIENTE',
  distance_meters INTEGER,
  estimated_time_minutes INTEGER,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS'),
  updated_at TEXT NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS'),
  FOREIGN KEY (sale_id) REFERENCES sales(id),
  FOREIGN KEY (delivery_user_id) REFERENCES users(id)
);

-- 14. Campañas
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  target_amount_cop INTEGER NOT NULL,
  reward_description TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  is_general INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS')
);

-- 15. Asignación de Vendedores a Campañas
CREATE TABLE IF NOT EXISTS campaign_sellers (
  campaign_id TEXT NOT NULL,
  seller_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS'),
  PRIMARY KEY (campaign_id, seller_user_id),
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (seller_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Índices de rendimiento
CREATE INDEX IF NOT EXISTS idx_campaign_sellers_camp ON campaign_sellers(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_sellers_user ON campaign_sellers(seller_user_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_code);
CREATE INDEX IF NOT EXISTS idx_sales_seller ON sales(seller_user_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_code ON invoices(invoice_code);
CREATE INDEX IF NOT EXISTS idx_invoices_sale ON invoices(sale_id);
CREATE INDEX IF NOT EXISTS idx_invoices_seller ON invoices(seller_user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_code ON deliveries(delivery_code);
CREATE INDEX IF NOT EXISTS idx_deliveries_sale ON deliveries(sale_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_user ON deliveries(delivery_user_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);
CREATE INDEX IF NOT EXISTS idx_deliv_hist_deliv ON delivery_status_history(delivery_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
