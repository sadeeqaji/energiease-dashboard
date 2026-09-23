import { AdminUser, DashboardStats, DiscoHealth, OrderItem, AccountingSummary, Customer, OrderTrend, StaffUser, SupportTicket, SupportTicketDetails, PaymentGatewayConfig } from './types';

const BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('ee_admin_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('ee_admin_token', token);
    } else {
      localStorage.removeItem('ee_admin_token');
    }
  }

  getToken(): string | null {
    return this.token || localStorage.getItem('ee_admin_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    };

    if (options.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      this.setToken(null);
      localStorage.removeItem('ee_admin_user');
      window.dispatchEvent(new Event('auth:unauthorized'));
      throw new Error('Session expired. Please log in again.');
    }

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || data.error || `Request failed with status ${response.status}`);
    }

    return data;
  }

  async login(email: string, password: string): Promise<{ accessToken: string; admin: AdminUser }> {
    const data = await this.request<{ accessToken: string; refreshToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    this.setToken(data.accessToken);

    // Fetch user details
    const meData = await this.request<{ success: boolean; admin: AdminUser }>('/admin/me');
    localStorage.setItem('ee_admin_user', JSON.stringify(meData.admin));

    return {
      accessToken: data.accessToken,
      admin: meData.admin,
    };
  }

  logout() {
    this.setToken(null);
    localStorage.removeItem('ee_admin_user');
  }

  getSavedUser(): AdminUser | null {
    const raw = localStorage.getItem('ee_admin_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async getMe(): Promise<AdminUser> {
    const res = await this.request<{ success: boolean; admin: AdminUser }>('/admin/me');
    return res.admin;
  }

  async getStats(): Promise<DashboardStats> {
    return this.request<DashboardStats>('/admin/stats');
  }

  async getTrends(days: number = 14): Promise<OrderTrend[]> {
    const res = await this.request<{ success: boolean; trends: OrderTrend[] }>(`/admin/trends?days=${days}`);
    return res.trends;
  }

  async getDiscoHealth(): Promise<DiscoHealth[]> {
    const res = await this.request<{ success: boolean; discos: DiscoHealth[] }>('/admin/disco-health');
    return res.discos;
  }

  async getOrders(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    disco?: string;
    interventionOnly?: boolean;
    startDate?: string;
    endDate?: string;
  }): Promise<{ orders: OrderItem[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.search) searchParams.set('search', params.search);
    if (params.status && params.status !== 'all') searchParams.set('status', params.status);
    if (params.disco && params.disco !== 'all') searchParams.set('disco', params.disco);
    if (params.interventionOnly) searchParams.set('interventionOnly', 'true');
    if (params.startDate) searchParams.set('startDate', params.startDate);
    if (params.endDate) searchParams.set('endDate', params.endDate);

    return this.request(`/admin/orders?${searchParams.toString()}`);
  }

  async getOrderDetail(reference: string): Promise<any> {
    const res = await this.request<{ success: boolean; order: any }>(`/admin/orders/${reference}`);
    return res.order;
  }

  async retryVend(reference: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/admin/orders/${reference}/retry`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async requeryBuyPower(reference: string): Promise<{
    success: boolean;
    updated: boolean;
    orderStatus: string;
    token?: string;
    buypowerData?: any;
    message: string;
  }> {
    return this.request(`/admin/orders/${reference}/buypower-requery`);
  }

  async verifyMonnify(reference: string): Promise<{
    success: boolean;
    updated: boolean;
    orderStatus: string;
    monnify: any;
    message: string;
  }> {
    return this.request(`/admin/orders/${reference}/monnify-verify`);
  }

  async refundOrder(reference: string, reason?: string): Promise<{
    success: boolean;
    message: string;
    refundData?: any;
  }> {
    return this.request(`/admin/orders/${reference}/refund`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async resendToken(reference: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/admin/orders/${reference}/resend-whatsapp`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async getAccountingSummary(startDate?: string, endDate?: string): Promise<AccountingSummary> {
    const searchParams = new URLSearchParams();
    if (startDate) searchParams.set('startDate', startDate);
    if (endDate) searchParams.set('endDate', endDate);
    return this.request(`/admin/accounting/summary?${searchParams.toString()}`);
  }

  async exportAccounting(startDate?: string, endDate?: string): Promise<any[]> {
    const searchParams = new URLSearchParams();
    if (startDate) searchParams.set('startDate', startDate);
    if (endDate) searchParams.set('endDate', endDate);
    const res = await this.request<{ success: boolean; data: any[] }>(`/admin/accounting/export?${searchParams.toString()}`);
    return res.data;
  }

  async getCustomers(params: { page?: number; limit?: number; search?: string }): Promise<{
    customers: Customer[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.search) searchParams.set('search', params.search);
    return this.request(`/admin/customers?${searchParams.toString()}`);
  }

  getReceiptUrl(reference: string): string {
    return `${BASE_URL}/orders/receipt/${reference}.pdf`;
  }

  async listStaffUsers(): Promise<StaffUser[]> {
    const res = await this.request<{ success: boolean; users: StaffUser[] }>('/admin/users');
    return res.users;
  }

  async createStaffUser(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role: 'superadmin' | 'admin' | 'support' | 'accounting';
  }): Promise<StaffUser> {
    const res = await this.request<{ success: boolean; user: StaffUser }>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.user;
  }

  async deleteStaffUser(id: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/admin/users/${id}`, { method: 'DELETE' });
  }

  // Native Support Desk API Methods
  async getSupportTickets(query: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{
    tickets: SupportTicket[];
    pagination: { total: number; page: number; limit: number; pages: number };
    counts: { open: number; pending_agent: number; pending_customer: number; resolved: number; totalActive: number };
  }> {
    const params = new URLSearchParams();
    if (query.status) params.append('status', query.status);
    if (query.search) params.append('search', query.search);
    if (query.page) params.append('page', String(query.page));
    if (query.limit) params.append('limit', String(query.limit));

    const qs = params.toString();
    return this.request(`/admin/support/tickets${qs ? `?${qs}` : ''}`);
  }

  async getSupportTicketDetails(ticketId: string): Promise<SupportTicketDetails> {
    return this.request(`/admin/support/tickets/${ticketId}`);
  }

  async replySupportTicket(ticketId: string, text: string): Promise<{ success: boolean; ticket: SupportTicket }> {
    return this.request(`/admin/support/tickets/${ticketId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  async resolveSupportTicket(ticketId: string): Promise<{ success: boolean; ticket: SupportTicket }> {
    return this.request(`/admin/support/tickets/${ticketId}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify({}),
    });
  }

  async fetchOrdersByPhone(params: { phone?: string; meterNo?: string; limit?: number }): Promise<OrderItem[]> {
    const searchParams = new URLSearchParams();
    if (params.phone) searchParams.set('phone', params.phone);
    if (params.meterNo) searchParams.set('meterNo', params.meterNo);
    if (params.limit) searchParams.set('limit', String(params.limit));
    const res = await this.request<{ success: boolean; count: number; orders: OrderItem[] }>(
      `/admin/support/orders-by-phone?${searchParams.toString()}`
    );
    return res.orders || [];
  }

  async getPaymentGatewayConfig(): Promise<PaymentGatewayConfig> {
    return this.request<PaymentGatewayConfig>('/admin/system/payment-gateway');
  }

  async updatePaymentGatewayConfig(primaryGateway: 'BuyPowerMFB' | 'Monnify' | 'Paystack'): Promise<{
    success: boolean;
    activeGateway: 'BuyPowerMFB' | 'Monnify' | 'Paystack';
    availableGateways: ('BuyPowerMFB' | 'Monnify' | 'Paystack')[];
    fallbackOrder: ('BuyPowerMFB' | 'Monnify' | 'Paystack')[];
    message: string;
  }> {
    return this.request('/admin/system/payment-gateway', {
      method: 'PATCH',
      body: JSON.stringify({ primaryGateway }),
    });
  }
}

export const api = new ApiClient();
