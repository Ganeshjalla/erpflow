import { api } from "./api";
import { ApiResponse, Customer, CustomerDetail, FollowUp, PaginatedResponse } from "../types";

export interface CustomerListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  customerType?: string;
}

export async function listCustomers(params: CustomerListParams) {
  const res = await api.get<PaginatedResponse<Customer>>("/customers", { params });
  return res.data;
}

export async function getCustomer(id: string) {
  const res = await api.get<ApiResponse<CustomerDetail>>(`/customers/${id}`);
  return res.data.data;
}

export async function createCustomer(payload: Partial<Customer>) {
  const res = await api.post<ApiResponse<Customer>>("/customers", payload);
  return res.data.data;
}

export async function updateCustomer(id: string, payload: Partial<Customer>) {
  const res = await api.put<ApiResponse<Customer>>(`/customers/${id}`, payload);
  return res.data.data;
}

export async function deleteCustomer(id: string) {
  const res = await api.delete<ApiResponse<null>>(`/customers/${id}`);
  return res.data;
}

export async function addFollowUp(id: string, note: string, followUpDate: string) {
  const res = await api.post<ApiResponse<FollowUp>>(`/customers/${id}/follow-ups`, {
    note,
    followUpDate,
  });
  return res.data.data;
}
