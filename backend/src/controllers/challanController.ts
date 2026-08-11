import { Request, Response } from "express";
import { asyncHandler, parsePagination } from "../utils/asyncHandler";
import { buildPagination, created, ok, paginated } from "../utils/apiResponse";
import * as challanService from "../services/challanService";
import { createChallanSchema, updateChallanSchema } from "../validators/schemas";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, offset } = parsePagination(req.query as any);
  const { status, search } = req.query as Record<string, string>;

  const { rows, total } = await challanService.listChallans({ limit, offset, status, search });
  paginated(res, rows, buildPagination(page, limit, total));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const data = createChallanSchema.parse(req.body);
  const challan = await challanService.createChallan(data, req.user!.userId);
  created(res, challan, "Challan created successfully");
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const challan = await challanService.getChallanById((req.params.id as string));
  ok(res, challan);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const data = updateChallanSchema.parse(req.body);
  const challan = await challanService.updateChallan((req.params.id as string), data);
  ok(res, challan, "Challan updated successfully");
});

export const confirm = asyncHandler(async (req: Request, res: Response) => {
  const challan = await challanService.confirmChallan((req.params.id as string), req.user!.userId);
  ok(res, challan, "Challan confirmed and stock updated");
});

export const cancel = asyncHandler(async (req: Request, res: Response) => {
  const challan = await challanService.cancelChallan((req.params.id as string));
  ok(res, challan, "Challan cancelled");
});
