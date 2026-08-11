import { api } from "./api";
import { ApiResponse, User } from "../types";

export async function login(email: string, password: string) {
  const res = await api.post<ApiResponse<{ token: string; user: User }>>("/auth/login", {
    email,
    password,
  });
  return res.data.data;
}

export async function me() {
  const res = await api.get<ApiResponse<User>>("/auth/me");
  return res.data.data;
}
