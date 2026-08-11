export type Role = "ADMIN" | "SALES" | "WAREHOUSE" | "ACCOUNTS";
export type CustomerType = "RETAIL" | "WHOLESALE" | "DISTRIBUTOR";
export type CustomerStatus = "LEAD" | "ACTIVE" | "INACTIVE";
export type MovementType = "IN" | "OUT";
export type ChallanStatus = "DRAFT" | "CONFIRMED" | "CANCELLED";
export type StockStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  pagination: Pagination;
}

export interface Customer {
  id: string;
  customerName: string;
  mobileNumber: string;
  email: string | null;
  businessName: string;
  gstNumber: string | null;
  customerType: CustomerType;
  address: string;
  status: CustomerStatus;
  followUpDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FollowUp {
  id: string;
  note: string;
  followUpDate: string;
  createdAt: string;
  createdByName: string;
}

export interface CustomerDetail extends Customer {
  followUps: FollowUp[];
  recentChallans: ChallanListItem[];
}

export interface Product {
  id: string;
  productName: string;
  sku: string;
  category: string;
  unitPrice: string;
  currentStock: number;
  minimumStock: number;
  warehouseLocation: string;
  stockStatus: StockStatus;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  movementType: MovementType;
  reason: string;
  createdAt: string;
  createdByName: string;
}

export interface ChallanListItem {
  id: string;
  challanNumber: string;
  customerId?: string;
  customerName: string;
  totalQuantity: number;
  totalAmount: string;
  status: ChallanStatus;
  createdByName: string;
  createdAt: string;
}

export interface ChallanItem {
  id: string;
  challanId: string;
  productId: string;
  productNameSnapshot: string;
  skuSnapshot: string;
  unitPriceSnapshot: string;
  quantity: number;
  totalPrice: string;
}

export interface ChallanDetail {
  id: string;
  challanNumber: string;
  customerId: string;
  customerName: string;
  customerBusinessName: string;
  totalQuantity: number;
  totalAmount: string;
  status: ChallanStatus;
  confirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdByName: string;
  items: ChallanItem[];
}

export interface DashboardStats {
  customers: { total: number; active: number; leads: number };
  products: { total: number; lowStock: number; outOfStock: number };
  challans: { total: number; draft: number; confirmed: number; cancelled: number };
  totalStockQuantity: number;
  recentChallans: ChallanListItem[];
  recentStockMovements: StockMovement[];
  upcomingFollowUps: { id: string; note: string; followUpDate: string; customerName: string }[];
}

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}
