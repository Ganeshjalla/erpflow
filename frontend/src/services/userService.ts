import { api } from "./api";
import { ApiResponse, ManagedUser } from "../types";

export async function listUsers() {
  const res = await api.get<ApiResponse<ManagedUser[]>>("/users");
  return res.data.data;
}

export async function createUser(payload: {
  name: string;
  email: string;
  password: string;
  role: string;
}) {
  const res = await api.post<ApiResponse<ManagedUser>>("/users", payload);
  return res.data.data;
}

export async function toggleUserActive(id: string, isActive: boolean) {
  const res = await api.patch<ApiResponse<ManagedUser>>(`/users/${id}/active`, { isActive });
  return res.data.data;
}
