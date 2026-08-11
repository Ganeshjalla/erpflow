import { api } from "./api";
import { ApiResponse, ChallanDetail, ChallanListItem, PaginatedResponse } from "../types";

export interface ChallanListParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export async function listChallans(params: ChallanListParams) {
  const res = await api.get<PaginatedResponse<ChallanListItem>>("/challans", { params });
  return res.data;
}

export async function getChallan(id: string) {
  const res = await api.get<ApiResponse<ChallanDetail>>(`/challans/${id}`);
  return res.data.data;
}

export async function createChallan(payload: {
  customerId: string;
  items: { productId: string; quantity: number }[];
  status?: "DRAFT" | "CONFIRMED";
}) {
  const res = await api.post<ApiResponse<ChallanDetail>>("/challans", payload);
  return res.data.data;
}

export async function updateChallan(
  id: string,
  payload: { customerId?: string; items?: { productId: string; quantity: number }[] }
) {
  const res = await api.put<ApiResponse<ChallanDetail>>(`/challans/${id}`, payload);
  return res.data.data;
}

export async function confirmChallan(id: string) {
  const res = await api.patch<ApiResponse<ChallanDetail>>(`/challans/${id}/confirm`);
  return res.data.data;
}

export async function cancelChallan(id: string) {
  const res = await api.patch<ApiResponse<ChallanDetail>>(`/challans/${id}/cancel`);
  return res.data.data;
}
