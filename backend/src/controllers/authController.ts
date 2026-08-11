import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { loginSchema } from "../validators/schemas";
import * as authService from "../services/authService";
import { ok } from "../utils/apiResponse";

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = loginSchema.parse(req.body);
  const result = await authService.login(email, password);
  ok(res, result, "Login successful");
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getUserById(req.user!.userId);
  ok(res, {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
});
