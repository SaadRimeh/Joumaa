import { apiRequest } from "@/src/services/api";
import {
  AnyReportResponse,
  ApiResponse,
  DashboardStats,
  EmployeeDistributionsResponse,
  DistributionHistoryResponse,
  DistributionItem,
  EmployeeDashboardData,
  EmployeeDetailsResponse,
  EmployeeListItem,
  InventoryStatusData,
  LoginResponse,
  MerchantAggregateItem,
  MerchantItem,
  PriceHistoryItem,
  ReceivingItem,
} from "@/src/types/models";

export interface LoginAdminPayload {
  phone?: string;
  name?: string;
  password: string;
}

export interface LoginEmployeePayload {
  code: string;
}

export interface CreateEmployeePayload {
  name: string;
  phone: string;
  car: string;
}

export interface CreateMerchantPayload {
  name: string;
  phone?: string;
  shopName?: string;
  location?: string;
}

export interface CreateReceivingPayload {
  quantity: number;
  notes?: string;
}

export interface CreateDistributionPayload {
  merchantId?: string;
  merchantName?: string;
  merchantPhone?: string;
  shopName?: string;
  merchantLocation?: string;
  quantity: number;
  paymentStatus?: "paid" | "credit" | "partial";
  notes?: string;
  location?: {
    address?: string;
    lat?: number;
    lng?: number;
  };
}

export interface DistributionQuery {
  period?: "day" | "week" | "month";
  from?: string;
  to?: string;
  merchantId?: string;
  merchantName?: string;
  page?: number;
  limit?: number;
}

function paramsToQuery(params: Record<string, string | number | undefined>): string {
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&");
  return query ? `?${query}` : "";
}

export const authApi = {
  async loginAdmin(payload: LoginAdminPayload): Promise<LoginResponse> {
    const response = await apiRequest<ApiResponse<LoginResponse>>({
      url: "/auth/login",
      method: "POST",
      data: {
        loginType: "admin",
        phone: payload.phone,
        name: payload.name,
        password: payload.password,
      },
    });
    return response.data;
  },

  async loginEmployee(payload: LoginEmployeePayload): Promise<LoginResponse> {
    const response = await apiRequest<ApiResponse<LoginResponse>>({
      url: "/auth/login",
      method: "POST",
      data: {
        loginType: "employee",
        code: payload.code,
      },
    });
    return response.data;
  },

  async me(): Promise<
    ApiResponse<{
      role: "admin" | "employee";
      user: unknown;
    }>
  > {
    return apiRequest({
      url: "/auth/me",
      method: "GET",
    });
  },
};

export const adminApi = {
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await apiRequest<ApiResponse<DashboardStats>>({
      url: "/admin/dashboard/stats",
      method: "GET",
    });
    return response.data;
  },

  async getLiveFeed(limit = 50): Promise<DistributionItem[]> {
    const response = await apiRequest<ApiResponse<DistributionItem[]>>({
      url: `/admin/dashboard/live-feed?limit=${limit}`,
      method: "GET",
    });
    return response.data;
  },

  async getEmployees(search = ""): Promise<EmployeeListItem[]> {
    const query = search ? `?search=${encodeURIComponent(search)}` : "";
    const response = await apiRequest<ApiResponse<EmployeeListItem[]>>({
      url: `/admin/employees${query}`,
      method: "GET",
    });
    return response.data;
  },

  async createEmployee(payload: CreateEmployeePayload): Promise<EmployeeListItem> {
    const response = await apiRequest<ApiResponse<EmployeeListItem>>({
      url: "/admin/employees",
      method: "POST",
      data: payload,
    });
    return response.data;
  },

  async updateEmployeeStatus(employeeId: string, isActive: boolean): Promise<EmployeeListItem> {
    const response = await apiRequest<ApiResponse<EmployeeListItem>>({
      url: `/admin/employees/${employeeId}/status`,
      method: "PATCH",
      data: { isActive },
    });
    return response.data;
  },

  async getEmployeeDetails(employeeId: string): Promise<EmployeeDetailsResponse> {
    const response = await apiRequest<ApiResponse<EmployeeDetailsResponse>>({
      url: `/admin/employees/${employeeId}`,
      method: "GET",
    });
    return response.data;
  },

  async getEmployeeDistributions(
    employeeId: string,
    options: {
      period?: "day" | "week" | "month";
      from?: string;
      to?: string;
      limit?: number;
    } = {}
  ): Promise<EmployeeDistributionsResponse> {
    const query = paramsToQuery({
      period: options.period,
      from: options.from,
      to: options.to,
      limit: options.limit,
    });

    const response = await apiRequest<ApiResponse<EmployeeDistributionsResponse>>({
      url: `/admin/employees/${employeeId}/distributions${query}`,
      method: "GET",
    });
    return response.data;
  },

  async deleteEmployee(employeeId: string): Promise<{ employeeId: string }> {
    const response = await apiRequest<ApiResponse<{ employeeId: string }>>({
      url: `/admin/employees/${employeeId}`,
      method: "DELETE",
    });
    return response.data;
  },

  async getPriceSettings(): Promise<{ currentKiloPrice: number; updatedAt: string }> {
    const response = await apiRequest<
      ApiResponse<{ currentKiloPrice: number; updatedAt: string }>
    >({
      url: "/admin/price",
      method: "GET",
    });
    return response.data;
  },

  async updatePrice(price: number): Promise<{ oldPrice: number; newPrice: number; updatedAt: string }> {
    const response = await apiRequest<
      ApiResponse<{ oldPrice: number; newPrice: number; updatedAt: string }>
    >({
      url: "/admin/price",
      method: "PATCH",
      data: { price },
    });
    return response.data;
  },

  async getPriceHistory(limit = 100): Promise<PriceHistoryItem[]> {
    const response = await apiRequest<ApiResponse<PriceHistoryItem[]>>({
      url: `/admin/price/history?limit=${limit}`,
      method: "GET",
    });
    return response.data;
  },

  async getMerchants(search = ""): Promise<MerchantItem[]> {
    const query = search ? `?search=${encodeURIComponent(search)}` : "";
    const response = await apiRequest<ApiResponse<MerchantItem[]>>({
      url: `/admin/merchants${query}`,
      method: "GET",
    });
    return response.data;
  },

  async createMerchant(payload: CreateMerchantPayload): Promise<MerchantItem> {
    const response = await apiRequest<ApiResponse<MerchantItem>>({
      url: "/admin/merchants",
      method: "POST",
      data: payload,
    });
    return response.data;
  },

  async getDailyReport(date?: string): Promise<AnyReportResponse> {
    const query = date ? `?date=${encodeURIComponent(date)}` : "";
    const response = await apiRequest<ApiResponse<AnyReportResponse>>({
      url: `/admin/reports/daily${query}`,
      method: "GET",
    });
    return response.data;
  },

  async getEmployeesReport(from?: string, to?: string): Promise<AnyReportResponse> {
    const query = paramsToQuery({ from, to });
    const response = await apiRequest<ApiResponse<AnyReportResponse>>({
      url: `/admin/reports/employees${query}`,
      method: "GET",
    });
    return response.data;
  },

  async getMerchantsReport(from?: string, to?: string): Promise<AnyReportResponse> {
    const query = paramsToQuery({ from, to });
    const response = await apiRequest<ApiResponse<AnyReportResponse>>({
      url: `/admin/reports/merchants${query}`,
      method: "GET",
    });
    return response.data;
  },

  async sendWhatsAppReport(reportType: "daily" | "employees" | "merchants"): Promise<{
    recipients: number;
    successful: number;
    failed: number;
  }> {
    const response = await apiRequest<
      ApiResponse<{
        reportType: string;
        recipients: number;
        successful: number;
        failed: number;
      }>
    >({
      url: "/admin/reports/send-whatsapp",
      method: "POST",
      data: { reportType },
    });
    return response.data;
  },
};

export const employeeApi = {
  async getDashboard(): Promise<EmployeeDashboardData> {
    const response = await apiRequest<ApiResponse<EmployeeDashboardData>>({
      url: "/employee/dashboard",
      method: "GET",
    });
    return response.data;
  },

  async getInventory(): Promise<InventoryStatusData> {
    const response = await apiRequest<ApiResponse<InventoryStatusData>>({
      url: "/employee/inventory",
      method: "GET",
    });
    return response.data;
  },

  async createReceiving(payload: CreateReceivingPayload): Promise<{
    receiving: ReceivingItem;
    currentStock: number;
    totalReceived: number;
  }> {
    const response = await apiRequest<
      ApiResponse<{
        receiving: ReceivingItem;
        currentStock: number;
        totalReceived: number;
      }>
    >({
      url: "/employee/receivings",
      method: "POST",
      data: payload,
    });
    return response.data;
  },

  async createDistribution(payload: CreateDistributionPayload): Promise<{
    distribution: DistributionItem;
    lowStockAlert: boolean;
    currentStock: number;
  }> {
    const response = await apiRequest<
      ApiResponse<{
        distribution: DistributionItem;
        lowStockAlert: boolean;
        currentStock: number;
      }>
    >({
      url: "/employee/distributions",
      method: "POST",
      data: payload,
    });
    return response.data;
  },

  async getDistributionHistory(query: DistributionQuery): Promise<DistributionHistoryResponse> {
    const suffix = paramsToQuery({
      period: query.period,
      from: query.from,
      to: query.to,
      merchantId: query.merchantId,
      merchantName: query.merchantName,
      page: query.page,
      limit: query.limit,
    });

    const response = await apiRequest<ApiResponse<DistributionHistoryResponse>>({
      url: `/employee/distributions${suffix}`,
      method: "GET",
    });
    return response.data;
  },

  async getMerchants(search = ""): Promise<MerchantAggregateItem[]> {
    const suffix = search ? `?search=${encodeURIComponent(search)}` : "";
    const response = await apiRequest<ApiResponse<MerchantAggregateItem[]>>({
      url: `/employee/merchants${suffix}`,
      method: "GET",
    });
    return response.data;
  },

  async createMerchant(payload: CreateMerchantPayload): Promise<MerchantItem> {
    const response = await apiRequest<ApiResponse<MerchantItem>>({
      url: "/employee/merchants",
      method: "POST",
      data: payload,
    });
    return response.data;
  },
};
