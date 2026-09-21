export type RoleCode = 'ADMINISTRADOR' | 'VENDEDOR' | 'ENTREGADOR';

export interface User {
  id: string;
  username: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  document_id?: string | null;
  address?: string | null;
  role_code: RoleCode;
  role_name?: string;
  is_active: number;
  created_at: string;
  updated_at?: string;
}

export interface SellerUser extends User {
  total_sales: number;
  total_cop: number;
  today_sales: number;
  today_cop: number;
  month_sales: number;
  month_cop: number;
}

export interface SellerStats {
  total_sellers: number;
  active_sellers: number;
  inactive_sellers: number;
  total_sales_count: number;
  total_sales_cop: number;
  today_sales_count: number;
  today_sales_cop: number;
  month_sales_count: number;
  month_sales_cop: number;
}

export interface SystemStatus {
  success: boolean;
  systemName: string;
  version: string;
  phase: number;
  bootstrapped: boolean;
  totalUsers: number;
  serverTime: string;
  offlineReady: boolean;
}

export interface Role {
  code: RoleCode;
  name: string;
  description: string;
}

export interface OfflineQueueItem {
  id: string;
  entity: 'customer' | 'sale' | 'location' | 'delivery';
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: string;
  synced: boolean;
  errorMessage?: string;
}

export interface Customer {
  id: string;
  id_number: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_active: number;
  notes: string | null;
  created_by_user_id?: string | null;
  created_by_name?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string;
  unit_measure: string;
  price_cop: number;
  cost_cop?: number;
  current_stock: number;
  min_stock: number;
  is_active: number;
  image_url?: string | null;
  stock_status?: 'DISPONIBLE' | 'STOCK_BAJO' | 'AGOTADO';
  margin_cop?: number;
  margin_percent?: number;
  created_at: string;
  updated_at?: string;
}

export interface InventoryStats {
  total_products: number;
  total_cost_value: number;
  total_retail_value: number;
  low_stock_count: number;
  out_of_stock_count: number;
  active_count: number;
  inactive_count: number;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product_code: string;
  product_name: string;
  product_category?: string;
  product_unit_measure?: string;
  quantity: number;
  unit_price_cop: number;
  discount_cop: number;
  total_cop: number;
  notes?: string | null;
}

export interface Sale {
  id: string;
  invoice_number: string;
  invoice_id?: string;
  invoice_code?: string;
  customer_id: string;
  customer_name?: string;
  customer_id_number?: string;
  customer_phone?: string;
  customer_address?: string;
  customer_city?: string;
  seller_user_id: string;
  seller_name?: string;
  status: string;
  subtotal_cop: number;
  discount_cop: number;
  total_cop: number;
  notes?: string | null;
  items_count?: number;
  items?: SaleItem[];
  created_at: string;
}

export interface SaleStats {
  total_sales: number;
  total_revenue_cop: number;
  today_sales_cop: number;
  today_sales_count: number;
  average_ticket_cop: number;
}

export interface InvoiceItem {
  id: string;
  product_id: string;
  product_code: string;
  product_name: string;
  unit_measure?: string;
  quantity: number;
  unit_price_cop: number;
  discount_cop: number;
  total_cop: number;
}

export interface CompanyInfo {
  name: string;
  legal_name: string;
  nit: string;
  address: string;
  city: string;
  department: string;
  country: string;
  phone: string;
  mobile: string;
  email: string;
  website: string;
  logo_url: string;
  regime: string;
  activity_code?: string;
  dian_resolution?: string;
  dian_range?: string;
}

export interface Invoice {
  id: string;
  invoice_code: string;
  sale_id: string;
  sale_code?: string;
  customer_id: string;
  customer_name?: string;
  customer_id_number?: string;
  customer_phone?: string;
  customer_address?: string;
  customer_city?: string;
  customer_email?: string;
  seller_user_id: string;
  seller_name?: string;
  seller_username?: string;
  subtotal_cop: number;
  discount_cop: number;
  tax_cop: number;
  total_cop: number;
  notes?: string | null;
  dian_status: string;
  dian_cufe?: string | null;
  items_count?: number;
  created_at: string;
  updated_at?: string;
  company?: CompanyInfo;
  items?: InvoiceItem[];
}

export interface InvoiceStats {
  total_invoices: number;
  total_revenue_cop: number;
  average_ticket_cop: number;
  today_invoices: number;
  today_revenue_cop: number;
  company?: CompanyInfo;
}

export type DeliveryStatus =
  | 'PENDIENTE'
  | 'ASIGNADA'
  | 'EN_CAMINO'
  | 'ENTREGADA'
  | 'NO_ENTREGADA'
  | 'CANCELADA';

export interface DeliveryHistoryItem {
  id: string;
  delivery_id: string;
  from_status: string | null;
  to_status: string;
  changed_by_user_id: string;
  changed_by_user_name: string;
  notes: string | null;
  created_at: string;
}

export interface Delivery {
  id: string;
  delivery_code: string;
  sale_id: string;
  invoice_id?: string | null;
  customer_id: string;
  delivery_user_id?: string | null;
  status: DeliveryStatus;
  scheduled_date: string;
  delivered_at?: string | null;
  customer_name: string;
  customer_phone?: string | null;
  delivery_address: string;
  delivery_city: string;
  latitude?: number | null;
  longitude?: number | null;
  geocoded_at?: string | null;
  notes?: string | null;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
  sale_code?: string;
  sale_total_cop?: number;
  sale_subtotal_cop?: number;
  sale_discount_cop?: number;
  seller_user_id?: string;
  seller_name?: string;
  seller_phone?: string;
  invoice_code?: string;
  deliverer_name?: string;
  deliverer_phone?: string;
  creator_name?: string;
  customer_id_number?: string;
  customer_email?: string;
  items_count?: number;
  total_units?: number;
  items?: {
    id: string;
    product_id: string;
    quantity: number;
    unit_price_cop: number;
    total_cop: number;
    notes?: string | null;
    product_code: string;
    product_name: string;
    unit_measure?: string;
    category?: string;
  }[];
  history?: DeliveryHistoryItem[];
}

export interface DeliveryStats {
  total_deliveries: number;
  pending_count: number;
  assigned_count: number;
  on_the_way_count: number;
  delivered_count: number;
  failed_count: number;
  cancelled_count: number;
  delivered_today_count: number;
}

export interface DelivererUser {
  id: string;
  full_name: string;
  username: string;
  phone?: string | null;
  email?: string | null;
  is_active: number;
}

export interface AvailableSaleForDelivery {
  id: string;
  sale_code: string;
  customer_id: string;
  customer_name: string;
  customer_id_number?: string;
  customer_phone?: string;
  customer_address?: string;
  customer_city?: string;
  seller_user_id: string;
  seller_name?: string;
  total_cop: number;
  created_at: string;
  invoice_id?: string;
  invoice_code?: string;
}

export interface GeoCoordinates {
  lat: number;
  lng: number;
}

export interface DeliveryLocation {
  id: string;
  delivery_code: string;
  customer_name: string;
  customer_phone?: string | null;
  delivery_address: string;
  delivery_city: string;
  status: DeliveryStatus;
  scheduled_date: string;
  latitude: number;
  longitude: number;
  delivery_user_id?: string | null;
  deliverer_name?: string;
  sale_total_cop?: number;
  invoice_code?: string | null;
}

export interface RouteStop extends DeliveryLocation {
  step_number: number;
  distance_from_prev_km: number;
  cumulative_distance_km: number;
}

export interface RoutePlan {
  origin: {
    lat: number;
    lng: number;
    label?: string;
  };
  stops_count: number;
  total_distance_km: number;
  estimated_travel_minutes: number;
  estimated_total_minutes: number;
  stops: RouteStop[];
}

// ─── Dashboard Types (Fase 8) ───────────────────────────────────────────────

export interface DashboardAdminStats {
  customers: { active: number };
  products: {
    total: number;
    active: number;
    low_stock: number;
    out_of_stock: number;
    total_cost_value: number;
    total_retail_value: number;
  };
  sales: {
    total_count: number;
    total_revenue_cop: number;
    avg_ticket_cop: number;
    today_count: number;
    today_revenue_cop: number;
    week_count: number;
    week_revenue_cop: number;
    month_count: number;
    month_revenue_cop: number;
  };
  invoices: { total: number; today: number };
  deliveries: {
    total: number;
    pending: number;
    assigned: number;
    on_the_way: number;
    delivered: number;
    failed: number;
    cancelled: number;
    delivered_today: number;
  };
  users: { admins: number; sellers: number; deliverers: number };
}

export interface DashboardSellerStats {
  sales: {
    total_count: number;
    total_revenue_cop: number;
    avg_ticket_cop: number;
    today_count: number;
    today_revenue_cop: number;
    week_count: number;
    week_revenue_cop: number;
    month_count: number;
    month_revenue_cop: number;
  };
  invoices: { total: number };
  deliveries: { total: number; pending: number; on_the_way: number; delivered: number };
  customers: { unique_customers: number };
  products: { available: number };
}

export interface DashboardDelivererStats {
  stats: {
    total: number;
    pending: number;
    assigned: number;
    on_the_way: number;
    delivered: number;
    failed: number;
    delivered_today: number;
  };
  upcoming: Array<{
    id: string;
    delivery_code: string;
    customer_name: string;
    delivery_address: string;
    delivery_city: string;
    scheduled_date: string;
    status: DeliveryStatus;
  }>;
}

export interface ChartDataPoint {
  day?: string;
  week?: string;
  month?: string;
  sales_count: number;
  revenue_cop: number;
  [key: string]: any;
}

export interface ReportFilters {
  start_date?: string;
  end_date?: string;
  customer_id?: string;
  seller_id?: string;
  deliverer_id?: string;
  product_id?: string;
  status?: string;
  category?: string;
  stock_level?: string;
}

export type ReportType = 'sales' | 'products-sold' | 'inventory' | 'customers' | 'invoices' | 'deliveries';

export interface ReportResult {
  success: boolean;
  report: ReportType;
  summary: Record<string, number>;
  data: Record<string, any>[];
}

export interface FilterOptions {
  sellers: Array<{ id: string; full_name: string }>;
  deliverers: Array<{ id: string; full_name: string }>;
  customers: Array<{ id: string; name: string; id_number: string }>;
  products: Array<{ id: string; code: string; name: string; category: string }>;
  categories: Array<{ category: string }>;
}

