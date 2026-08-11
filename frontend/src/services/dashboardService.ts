import { api } from "./api";
import { ApiResponse, DashboardStats } from "../types";

export async function getDashboardStats() {
  const res = await api.get<ApiResponse<DashboardStats>>("/dashboard");
  return res.data.data;
}
