import { api } from "./api";
import { ApiResponse, PaginatedResponse, Product } from "../types";

export interface ProductListParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  lowStock?: boolean;
}

export async function listProducts(params: ProductListParams) {
  const res = await api.get<PaginatedResponse<Product>>("/products", { params });
  return res.data;
}

export async function getProduct(id: string) {
  const res = await api.get<ApiResponse<Product>>(`/products/${id}`);
  return res.data.data;
}

export async function createProduct(payload: Partial<Product>) {
  const res = await api.post<ApiResponse<Product>>("/products", payload);
  return res.data.data;
}

export async function updateProduct(id: string, payload: Partial<Product>) {
  const res = await api.put<ApiResponse<Product>>(`/products/${id}`, payload);
  return res.data.data;
}

export async function deleteProduct(id: string) {
  const res = await api.delete<ApiResponse<null>>(`/products/${id}`);
  return res.data;
}
