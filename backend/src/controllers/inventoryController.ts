import { Request, Response } from "express";
import { asyncHandler, parsePagination } from "../utils/asyncHandler";
import { buildPagination, created, ok, paginated } from "../utils/apiResponse";
import * as inventoryService from "../services/inventoryService";
import { stockMovementSchema } from "../validators/schemas";

export const overview = asyncHandler(async (_req: Request, res: Response) => {
  const rows = await inventoryService.getInventoryOverview();
  ok(res, rows);
});

export const recordMovement = asyncHandler(async (req: Request, res: Response) => {
  const data = stockMovementSchema.parse(req.body);
  const result = await inventoryService.recordMovement(data, req.user!.userId);
  created(res, result, "Stock movement recorded successfully");
});

export const listMovements = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, offset } = parsePagination(req.query as any);
  const { productId, movementType } = req.query as Record<string, string>;

  const { rows, total } = await inventoryService.listMovements({
    limit,
    offset,
    productId,
    movementType,
  });

  paginated(res, rows, buildPagination(page, limit, total));
});
