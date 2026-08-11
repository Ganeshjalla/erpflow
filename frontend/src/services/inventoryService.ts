import { api } from "./api";
import { ApiResponse, PaginatedResponse, Product, StockMovement } from "../types";

export async function getInventoryOverview() {
  const res = await api.get<ApiResponse<Product[]>>("/inventory");
  return res.data.data;
}

export async function recordMovement(payload: {
  productId: string;
  quantity: number;
  movementType: "IN" | "OUT";
  reason: string;
}) {
  const res = await api.post<ApiResponse<{ movement: StockMovement; product: Product }>>(
    "/inventory/movement",
    payload
  );
  return res.data.data;
}

export interface MovementListParams {
  page?: number;
  limit?: number;
  productId?: string;
  movementType?: string;
}

export async function listMovements(params: MovementListParams) {
  const res = await api.get<PaginatedResponse<StockMovement>>("/inventory/movements", { params });
  return res.data;
}
