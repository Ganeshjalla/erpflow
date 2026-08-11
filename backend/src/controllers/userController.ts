import { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { created, ok } from "../utils/apiResponse";
import * as userService from "../services/userService";

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["ADMIN", "SALES", "WAREHOUSE", "ACCOUNTS"]),
});

export const list = asyncHandler(async (_req: Request, res: Response) => {
  const users = await userService.listUsers();
  ok(res, users);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const data = createUserSchema.parse(req.body);
  const user = await userService.createUser(data);
  created(res, user, "User created successfully");
});

export const toggleActive = asyncHandler(async (req: Request, res: Response) => {
  const isActive = Boolean(req.body.isActive);
  const user = await userService.toggleUserActive(req.params.id as string, isActive);
  ok(res, user, "User updated successfully");
});
