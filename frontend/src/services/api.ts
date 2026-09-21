import type {
  SystemStatus,
  User,
  Customer,
  Product,
  InventoryStats,
  Sale,
  SaleStats,
  Invoice,
  InvoiceStats,
  Delivery,
  DeliveryStats,
  DelivererUser,
  AvailableSaleForDelivery,
  DeliveryStatus,
  DeliveryLocation,
  RoutePlan,
  DashboardAdminStats,
  DashboardSellerStats,
  DashboardDelivererStats,
  ChartDataPoint,
  ReportType,
  ReportResult,
  ReportFilters,
  FilterOptions,
  SellerUser,
  SellerStats,
  Campaign,
  CampaignDetail,
  SellerLocationsResponse,
} from '../types';

// Configuración robusta de API_BASE:
// 1. Si existe VITE_API_URL configurado explícitamente, úsalo asegurando el sufijo /api.
// 2. Si se ejecuta en la nube en Vercel (*.vercel.app) o GitHub Pages, enlaza automáticamente con el backend activo en Render.
// 3. En entorno local usa el proxy '/api'.
const getApiBase = (): string => {
  let url = (import.meta as any).env?.VITE_API_URL;
  if (!url || typeof url !== 'string' || !url.startsWith('http')) {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      if (host.includes('vercel.app') || host.includes('github.io')) {
        url = 'https://mevacol-2026.onrender.com/api';
      }
    }
  }
  if (!url) {
    url = '/api';
  }
  url = url.trim().replace(/\/+$/, '');
  if (url.startsWith('http') && !url.endsWith('/api')) {
    url = `${url}/api`;
  }
  return url;
};

const API_BASE: string = getApiBase();

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('mevacol_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('mevacol_token', token);
    } else {
      localStorage.removeItem('mevacol_token');
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('mevacol_token');
    }
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${API_BASE}${cleanEndpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const contentType = response.headers.get('content-type') || '';
      let data: any;
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        await response.text();
        if (!response.ok) {
          throw new Error(`Error temporal de conexión (${response.status}). Pulsa reintentar.`);
        }
        throw new Error('Respuesta inválida del servidor. Pulsa reintentar.');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Ocurrió un error en la solicitud.');
      }

      return data;
    } catch (error: any) {
      // Si la sesión expiró o fue rechazada, limpiar token local
      if (error.message?.includes('expirada') || error.message?.includes('inválido')) {
        this.setToken(null);
      }
      throw error;
    }
  }

  // --- Diagnóstico y Estado del Sistema ---
  async getSystemStatus(): Promise<SystemStatus> {
    return this.request<SystemStatus>('/system/status');
  }

  // --- Autenticación ---
  async bootstrapAdmin(data: {
    username: string;
    full_name: string;
    password: string;
    email?: string;
    phone?: string;
  }): Promise<{ success: boolean; token: string; user: User; message: string }> {
    const res = await this.request<{ success: boolean; token: string; user: User; message: string }>(
      '/auth/bootstrap',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    this.setToken(res.token);
    return res;
  }

  async login(credentials: {
    identifier: string;
    password: string;
  }): Promise<{ success: boolean; token: string; user: User; message: string }> {
    const res = await this.request<{ success: boolean; token: string; user: User; message: string }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify(credentials),
      }
    );
    this.setToken(res.token);
    return res;
  }

  async getCurrentUser(): Promise<{ success: boolean; user: User }> {
    return this.request<{ success: boolean; user: User }>('/auth/me');
  }

  // --- Gestión de Usuarios (Exclusivo Administrador) ---
  async getUsers(): Promise<{ success: boolean; users: User[] }> {
    return this.request<{ success: boolean; users: User[] }>('/users');
  }

  async createUser(userData: {
    username: string;
    full_name: string;
    password: string;
    role_code: string;
    email?: string;
    phone?: string;
  }): Promise<{ success: boolean; user: User; message: string }> {
    return this.request<{ success: boolean; user: User; message: string }>('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async toggleUserStatus(userId: string, is_active: boolean): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active }),
    });
  }

  async updateUser(userId: string, userData: {
    full_name: string;
    email?: string;
    phone?: string;
    role_code?: string;
    password?: string;
  }): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(userId: string, adminPassword: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/users/${userId}`, {
      method: 'DELETE',
      body: JSON.stringify({ admin_password: adminPassword }),
    });
  }

  // --- Módulo de Clientes (Fase 2) ---
  async getCustomers(params?: { search?: string; status?: string }): Promise<{ success: boolean; customers: Customer[]; count: number }> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.status) query.append('status', params.status);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<{ success: boolean; customers: Customer[]; count: number }>(`/customers${qs}`);
  }

  async getCustomerById(id: string): Promise<{ success: boolean; customer: Customer }> {
    return this.request<{ success: boolean; customer: Customer }>(`/customers/${id}`);
  }

  async createCustomer(data: {
    name: string;
    id_number: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    notes?: string;
  }): Promise<{ success: boolean; customer: Customer; message: string }> {
    return this.request<{ success: boolean; customer: Customer; message: string }>('/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCustomer(
    id: string,
    data: {
      name: string;
      id_number: string;
      phone?: string;
      email?: string;
      address?: string;
      city?: string;
      notes?: string;
    }
  ): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async toggleCustomerStatus(id: string, is_active: boolean): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/customers/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active }),
    });
  }

  // --- Módulo de Productos e Inventario (Fase 3) ---
  async getProducts(params?: {
    search?: string;
    category?: string;
    status?: string;
    stock_level?: string;
  }): Promise<{ success: boolean; products: Product[]; count: number }> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.category) query.append('category', params.category);
    if (params?.status) query.append('status', params.status);
    if (params?.stock_level) query.append('stock_level', params.stock_level);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<{ success: boolean; products: Product[]; count: number }>(`/products${qs}`);
  }

  async getInventoryStats(): Promise<{ success: boolean; stats: InventoryStats }> {
    return this.request<{ success: boolean; stats: InventoryStats }>('/products/stats');
  }

  async getProductById(id: string): Promise<{ success: boolean; product: Product }> {
    return this.request<{ success: boolean; product: Product }>(`/products/${id}`);
  }

  async createProduct(data: {
    code: string;
    name: string;
    description?: string;
    category?: string;
    unit_measure?: string;
    price_cop: number;
    cost_cop?: number;
    current_stock?: number;
    min_stock?: number;
    image_url?: string | null;
  }): Promise<{ success: boolean; product: Product; message: string }> {
    return this.request<{ success: boolean; product: Product; message: string }>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProduct(
    id: string,
    data: {
      code: string;
      name: string;
      description?: string;
      category?: string;
      unit_measure?: string;
      price_cop: number;
      cost_cop?: number;
      min_stock?: number;
      is_active?: number;
      image_url?: string | null;
    }
  ): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProduct(id: string, adminPassword: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/products/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ admin_password: adminPassword }),
    });
  }

  async adjustProductStock(
    id: string,
    data: {
      type: 'add' | 'subtract' | 'set';
      quantity: number;
      reason?: string;
    }
  ): Promise<{ success: boolean; new_stock: number; message: string }> {
    return this.request<{ success: boolean; new_stock: number; message: string }>(`/products/${id}/stock`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async toggleProductStatus(id: string, is_active: boolean): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/products/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active }),
    });
  }

  // --- Módulo de Ventas (Fase 4) ---
  async getSales(params?: {
    search?: string;
    seller_id?: string;
    customer_id?: string;
  }): Promise<{ success: boolean; sales: Sale[]; count: number }> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.seller_id) query.append('seller_id', params.seller_id);
    if (params?.customer_id) query.append('customer_id', params.customer_id);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<{ success: boolean; sales: Sale[]; count: number }>(`/sales${qs}`);
  }

  async getSaleById(id: string): Promise<{ success: boolean; sale: Sale }> {
    return this.request<{ success: boolean; sale: Sale }>(`/sales/${id}`);
  }

  async getSalesStats(): Promise<{ success: boolean; stats: SaleStats }> {
    return this.request<{ success: boolean; stats: SaleStats }>('/sales/stats');
  }

  async createSale(data: {
    customer_id: string;
    items: { product_id: string; quantity: number }[];
    notes?: string;
    seller_id?: string;
  }): Promise<{
    success: boolean;
    message: string;
    sale_id: string;
    invoice_number: string;
    invoice_id?: string;
    invoice_code?: string;
    customer_name?: string;
    total_cop?: number;
    subtotal_cop?: number;
    items_count?: number;
  }> {
    return this.request('/sales', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // --- Módulo de Facturación (Fase 5) ---
  async getInvoices(params?: {
    search?: string;
    seller_id?: string;
    customer_id?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<{ success: boolean; invoices: Invoice[]; count: number }> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.seller_id) query.append('seller_id', params.seller_id);
    if (params?.customer_id) query.append('customer_id', params.customer_id);
    if (params?.start_date) query.append('start_date', params.start_date);
    if (params?.end_date) query.append('end_date', params.end_date);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<{ success: boolean; invoices: Invoice[]; count: number }>(`/invoices${qs}`);
  }

  async getInvoiceById(id: string): Promise<{ success: boolean; invoice: Invoice }> {
    return this.request<{ success: boolean; invoice: Invoice }>(`/invoices/${id}`);
  }

  async getInvoiceBySaleId(saleId: string): Promise<{ success: boolean; invoice: Invoice }> {
    return this.request<{ success: boolean; invoice: Invoice }>(`/invoices/by-sale/${saleId}`);
  }

  async getInvoiceStats(sellerId?: string): Promise<{ success: boolean; stats: InvoiceStats }> {
    const qs = sellerId ? `?seller_id=${sellerId}` : '';
    return this.request<{ success: boolean; stats: InvoiceStats }>(`/invoices/stats${qs}`);
  }

  async generateInvoiceFromSale(saleId: string): Promise<{ success: boolean; message: string; invoice: Invoice }> {
    return this.request<{ success: boolean; message: string; invoice: Invoice }>(`/invoices/from-sale/${saleId}`, {
      method: 'POST',
    });
  }

  // --- Módulo de Entregas (Fase 6) ---
  async getDeliveries(params?: {
    status?: string;
    deliverer_id?: string;
    search?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<{ success: boolean; deliveries: Delivery[] }> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.deliverer_id) query.append('deliverer_id', params.deliverer_id);
    if (params?.search) query.append('search', params.search);
    if (params?.start_date) query.append('start_date', params.start_date);
    if (params?.end_date) query.append('end_date', params.end_date);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<{ success: boolean; deliveries: Delivery[] }>(`/deliveries${qs}`);
  }

  async getDeliveryById(id: string): Promise<{
    success: boolean;
    delivery: Delivery;
    items: Delivery['items'];
    history: Delivery['history'];
  }> {
    return this.request<{
      success: boolean;
      delivery: Delivery;
      items: Delivery['items'];
      history: Delivery['history'];
    }>(`/deliveries/${id}`);
  }

  async getDeliveryStats(): Promise<{ success: boolean; stats: DeliveryStats }> {
    return this.request<{ success: boolean; stats: DeliveryStats }>('/deliveries/stats');
  }

  async getDeliverers(): Promise<{ success: boolean; deliverers: DelivererUser[] }> {
    return this.request<{ success: boolean; deliverers: DelivererUser[] }>('/deliveries/deliverers');
  }

  async getAvailableSalesForDelivery(): Promise<{ success: boolean; sales: AvailableSaleForDelivery[] }> {
    return this.request<{ success: boolean; sales: AvailableSaleForDelivery[] }>('/deliveries/available-sales');
  }

  async createDelivery(data: {
    sale_id: string;
    scheduled_date: string;
    delivery_user_id?: string;
    notes?: string;
    customer_name?: string;
    customer_phone?: string;
    delivery_address?: string;
    delivery_city?: string;
  }): Promise<{ success: boolean; message: string; delivery: { id: string; delivery_code: string; status: DeliveryStatus } }> {
    return this.request('/deliveries', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async assignDeliverer(
    id: string,
    data: { delivery_user_id: string | null; notes?: string }
  ): Promise<{ success: boolean; message: string }> {
    return this.request(`/deliveries/${id}/assign`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async updateDeliveryStatus(
    id: string,
    data: { status: DeliveryStatus; notes?: string }
  ): Promise<{ success: boolean; message: string; status: DeliveryStatus; delivered_at?: string }> {
    return this.request(`/deliveries/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // --- MÓDULO GEO, MAPAS Y RUTAS (Fase 7) ---
  async getDeliveryLocations(data?: {
    delivery_ids?: string[];
    status_filter?: string;
  }): Promise<{
    success: boolean;
    depot: { name: string; address: string; city: string; lat: number; lng: number };
    locations: DeliveryLocation[];
  }> {
    return this.request('/geo/deliveries-locations', {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  }

  async geocode(params: {
    address: string;
    city?: string;
  }): Promise<{
    success: boolean;
    data: { lat: number; lng: number; display_name: string; is_approximate: boolean };
  }> {
    const qs = `?address=${encodeURIComponent(params.address)}&city=${encodeURIComponent(params.city || '')}`;
    return this.request(`/geo/geocode${qs}`);
  }

  async calculateRoutePlan(data: {
    origin?: { latitude: number; longitude: number; label?: string };
    delivery_ids: string[];
  }): Promise<{
    success: boolean;
    origin: { lat: number; lng: number; label?: string };
    stops_count: number;
    total_distance_km: number;
    estimated_travel_minutes: number;
    estimated_total_minutes: number;
    stops: RoutePlan['stops'];
  }> {
    return this.request('/geo/route-plan', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // --- MÓDULO DASHBOARD (Fase 8) ---
  async getDashboardAdmin(): Promise<{ success: boolean; data: DashboardAdminStats }> {
    return this.request<{ success: boolean; data: DashboardAdminStats }>('/dashboard/admin');
  }

  async getDashboardSeller(): Promise<{ success: boolean; data: DashboardSellerStats; seller_id: string | null }> {
    return this.request<{ success: boolean; data: DashboardSellerStats; seller_id: string | null }>('/dashboard/seller');
  }

  async getDashboardDeliverer(): Promise<{ success: boolean; data: DashboardDelivererStats; deliverer_id: string | null }> {
    return this.request<{ success: boolean; data: DashboardDelivererStats; deliverer_id: string | null }>('/dashboard/deliverer');
  }

  async getDashboardChartsSalesTrend(): Promise<{
    success: boolean;
    data: { daily: ChartDataPoint[]; weekly: ChartDataPoint[]; monthly: ChartDataPoint[] };
  }> {
    return this.request('/dashboard/charts/sales-trend');
  }

  async getDashboardChartsTopProducts(): Promise<{ success: boolean; data: any[] }> {
    return this.request('/dashboard/charts/top-products');
  }

  async getDashboardChartsDeliveryStatus(): Promise<{ success: boolean; data: any[] }> {
    return this.request('/dashboard/charts/delivery-status');
  }

  async getDashboardChartsInventory(): Promise<{ success: boolean; data: any[] }> {
    return this.request('/dashboard/charts/inventory');
  }

  async getDashboardChartsSalesBySeller(): Promise<{ success: boolean; data: any[] }> {
    return this.request('/dashboard/charts/sales-by-seller');
  }

  async getDashboardChartsSellerTrend(): Promise<{
    success: boolean;
    data: { daily: ChartDataPoint[] };
  }> {
    return this.request('/dashboard/charts/seller-trend');
  }

  // --- MÓDULO REPORTES (Fase 8) ---
  async getReportData(type: ReportType, filters?: ReportFilters): Promise<ReportResult> {
    const query = new URLSearchParams();
    if (filters?.start_date) query.append('start_date', filters.start_date);
    if (filters?.end_date) query.append('end_date', filters.end_date);
    if (filters?.customer_id) query.append('customer_id', filters.customer_id);
    if (filters?.seller_id) query.append('seller_id', filters.seller_id);
    if (filters?.deliverer_id) query.append('deliverer_id', filters.deliverer_id);
    if (filters?.product_id) query.append('product_id', filters.product_id);
    if (filters?.status) query.append('status', filters.status);
    if (filters?.category) query.append('category', filters.category);
    if (filters?.stock_level) query.append('stock_level', filters.stock_level);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<ReportResult>(`/reports/${type}${qs}`);
  }

  async getReportFilterOptions(): Promise<{ success: boolean } & FilterOptions> {
    return this.request<{ success: boolean } & FilterOptions>('/reports/filter-options');
  }

  // --- MÓDULO VENDEDORES (Fase 2) ---
  async getSellers(search?: string, status?: string): Promise<{ success: boolean; sellers: SellerUser[] }> {
    const query = new URLSearchParams();
    if (search) query.append('search', search);
    if (status) query.append('status', status);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<{ success: boolean; sellers: SellerUser[] }>(`/sellers${qs}`);
  }

  async getSellersStats(): Promise<{ success: boolean; stats: SellerStats }> {
    return this.request<{ success: boolean; stats: SellerStats }>('/sellers/stats');
  }

  async getSellerById(id: string): Promise<{ success: boolean; seller: SellerUser; metrics: any }> {
    return this.request<{ success: boolean; seller: SellerUser; metrics: any }>(`/sellers/${id}`);
  }

  async getSellerSales(id: string, page: number = 1, limit: number = 20): Promise<{
    success: boolean;
    sales: Sale[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
    return this.request(`/sellers/${id}/sales?page=${page}&limit=${limit}`);
  }

  async createSeller(data: {
    username: string;
    full_name: string;
    password: string;
    email?: string;
    phone?: string;
    document_id?: string;
    address?: string;
  }): Promise<{ success: boolean; message: string; seller: User }> {
    return this.request('/sellers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSeller(
    id: string,
    data: {
      full_name: string;
      email?: string;
      phone?: string;
      document_id?: string;
      address?: string;
      password?: string;
    }
  ): Promise<{ success: boolean; message: string }> {
    return this.request(`/sellers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async toggleSellerStatus(id: string, is_active: boolean | number): Promise<{ success: boolean; message: string }> {
    return this.request(`/sellers/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active }),
    });
  }

  async deleteSeller(id: string, adminPassword?: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/sellers/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ admin_password: adminPassword }),
    });
  }

  // --- MÓDULO UBICACIÓN DE VENDEDORES (Fase 7) ---
  async getSellerLocations(): Promise<SellerLocationsResponse> {
    return this.request<SellerLocationsResponse>('/sellers/locations');
  }

  async updateSellerLocation(coords: { latitude: number; longitude: number; accuracy?: number }): Promise<{ success: boolean; message: string; timestamp?: string }> {
    return this.request('/sellers/location', {
      method: 'POST',
      body: JSON.stringify(coords),
    });
  }

  async stopSellerLocation(): Promise<{ success: boolean; message: string }> {
    return this.request('/sellers/location/stop', {
      method: 'POST',
    });
  }

  // --- MÓDULO CAMPAÑAS E INCENTIVOS (Fase 2) ---
  async getCampaigns(search?: string, status?: string): Promise<{ success: boolean; count: number; campaigns: Campaign[] }> {
    const query = new URLSearchParams();
    if (search) query.append('search', search);
    if (status) query.append('status', status);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<{ success: boolean; count: number; campaigns: Campaign[] }>(`/campaigns${qs}`);
  }

  async getActiveCampaigns(): Promise<{ success: boolean; campaigns: Campaign[] }> {
    return this.request<{ success: boolean; campaigns: Campaign[] }>('/campaigns/active');
  }

  async getCampaignById(id: string): Promise<CampaignDetail & { success: boolean }> {
    return this.request<CampaignDetail & { success: boolean }>(`/campaigns/${id}`);
  }

  async createCampaign(data: {
    name: string;
    description?: string;
    target_amount_cop: number;
    reward_description: string;
    start_date: string;
    end_date: string;
    is_general: boolean | number;
    seller_ids?: string[];
  }): Promise<{ success: boolean; message: string; campaign_id: string }> {
    return this.request('/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCampaign(
    id: string,
    data: {
      name: string;
      description?: string;
      target_amount_cop: number;
      reward_description: string;
      start_date: string;
      end_date: string;
      is_general: boolean | number;
      seller_ids?: string[];
    }
  ): Promise<{ success: boolean; message: string }> {
    return this.request(`/campaigns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async toggleCampaignStatus(id: string, is_active: boolean | number): Promise<{ success: boolean; message: string }> {
    return this.request(`/campaigns/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active }),
    });
  }

  async deleteCampaign(id: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/campaigns/${id}`, {
      method: 'DELETE',
    });
  }
}

export const api = new ApiService();

