export type UserRole = "admin" | "employee";

export interface AdminProfile {
  id: string;
  name: string;
  phone: string;
  currentKiloPrice: number;
  createdAt?: string;
}

export interface EmployeeProfile {
  id: string;
  name: string;
  phone: string;
  car: string;
  uniqueCode: string;
  currentStock: number;
  totalReceived: number;
  totalDistributed: number;
  isActive?: boolean;
  createdAt?: string;
}

export interface EmployeeListItem {
  _id: string;
  name: string;
  phone: string;
  car: string;
  uniqueCode: string;
  currentStock: number;
  totalReceived: number;
  totalDistributed: number;
  isActive: boolean;
  createdAt: string;
}

export interface MerchantItem {
  _id: string;
  name: string;
  phone: string;
  shopName: string;
  location?: string;
  totalReceived: number;
  createdAt: string;
}

export interface PopulatedMerchant {
  _id: string;
  name: string;
  phone?: string;
  shopName?: string;
}

export interface PopulatedEmployee {
  _id: string;
  name: string;
  phone?: string;
  car?: string;
}

export interface DistributionItem {
  _id: string;
  employeeId: string | PopulatedEmployee;
  merchantId: string | PopulatedMerchant;
  merchantName: string;
  quantity: number;
  pricePerKilo: number;
  totalAmount: number;
  employeeStockBefore: number;
  employeeStockAfter: number;
  paymentStatus: "paid" | "credit" | "partial";
  notes?: string;
  location?: {
    lat?: number;
    lng?: number;
    address?: string;
  };
  createdAt: string;
}

export interface ReceivingItem {
  _id: string;
  employeeId: string | PopulatedEmployee;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  notes?: string;
  createdAt: string;
}

export interface DashboardStats {
  activeEmployees: number;
  totalAvailableStock: number;
  todayDistributedQuantity: number;
  todaySales: number;
  currentKiloPrice: number;
}

export interface EmployeeDashboardData {
  profile: {
    id: string;
    name: string;
    phone: string;
    car: string;
    uniqueCode: string;
    isActive: boolean;
  };
  indicators: {
    totalReceived: number;
    totalDistributed: number;
    currentStock: number;
    currentKiloPrice: number;
    lowStockThreshold: number;
    isLowStock: boolean;
  };
  supportContact: {
    name: string;
    phone: string;
  };
  lastDistributions: DistributionItem[];
}

export interface InventoryStatusData {
  employeeId: string;
  currentStock: number;
  totalReceived: number;
  totalDistributed: number;
  lowStockThreshold: number;
  isLowStock: boolean;
  recommendedAction: string;
}

export interface PriceHistoryItem {
  _id: string;
  oldPrice: number;
  newPrice: number;
  changedBy?: {
    _id: string;
    name: string;
    phone: string;
  };
  createdAt: string;
}

export interface EmployeeDetailsResponse {
  employee: EmployeeListItem;
  distributions: DistributionItem[];
  receivings: ReceivingItem[];
}

export interface DistributionHistoryResponse {
  page: number;
  limit: number;
  totalRows: number;
  totalPages: number;
  totals: {
    totalQuantity: number;
    totalAmount: number;
    totalTransactions: number;
  };
  rows: DistributionItem[];
}

export interface EmployeeDistributionsResponse {
  totals: {
    totalQuantity: number;
    totalSales: number;
    totalTransactions: number;
  };
  rows: DistributionItem[];
}

export interface MerchantAggregateItem {
  merchantId: string;
  merchantName: string;
  phone: string;
  shopName: string;
  totalQuantity: number;
  totalSales: number;
  totalTransactions: number;
  lastDistributionAt?: string;
  employeeCount?: number;
}

export interface EmployeeAggregateItem {
  employeeId: string;
  name: string;
  phone: string;
  car: string;
  totalQuantity?: number;
  totalSales?: number;
  totalTransactions?: number;
  periodReceived?: number;
  periodDistributed?: number;
  periodSales?: number;
  periodTransactions?: number;
  distributionRate?: number;
}

export interface GenericReportTotals {
  [key: string]: number;
}

export interface DailyReportResponse {
  type: "daily";
  range: { start: string; end: string };
  totals: {
    totalQuantity: number;
    totalSales: number;
    totalTransactions: number;
  };
  byEmployee: EmployeeAggregateItem[];
  byMerchant: MerchantAggregateItem[];
}

export interface EmployeesReportResponse {
  type: "employees";
  range: { start: string; end: string };
  totals: {
    totalReceived: number;
    totalDistributed: number;
    totalSales: number;
    totalTransactions: number;
  };
  employees: EmployeeAggregateItem[];
}

export interface MerchantsReportResponse {
  type: "merchants";
  range: { start: string; end: string };
  totals: {
    totalQuantity: number;
    totalSales: number;
    totalTransactions: number;
  };
  totalMerchants: number;
  topMerchant: MerchantAggregateItem | null;
  merchants: MerchantAggregateItem[];
}

export type AnyReportResponse =
  | DailyReportResponse
  | EmployeesReportResponse
  | MerchantsReportResponse;

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  code?: string;
  details?: Record<string, unknown>;
  stack?: string;
}

export interface LoginResponse {
  role: UserRole;
  token: string;
  admin?: AdminProfile;
  employee?: EmployeeProfile;
}
