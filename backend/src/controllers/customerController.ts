import { Request, Response } from "express";
import { asyncHandler, parsePagination } from "../utils/asyncHandler";
import { buildPagination, created, ok, paginated } from "../utils/apiResponse";
import * as customerService from "../services/customerService";
import {
  createCustomerSchema,
  createFollowUpSchema,
  updateCustomerSchema,
} from "../validators/schemas";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, offset } = parsePagination(req.query as any);
  const { search, status, customerType } = req.query as Record<string, string>;

  const { rows, total } = await customerService.listCustomers({
    page,
    limit,
    offset,
    search,
    status,
    customerType,
  });

  paginated(res, rows, buildPagination(page, limit, total));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const data = createCustomerSchema.parse(req.body);
  const customer = await customerService.createCustomer(data, req.user!.userId);
  created(res, customer, "Customer created successfully");
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const customer = await customerService.getCustomerById((req.params.id as string));
  ok(res, customer);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const data = updateCustomerSchema.parse(req.body);
  const customer = await customerService.updateCustomer((req.params.id as string), data);
  ok(res, customer, "Customer updated successfully");
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await customerService.softDeleteCustomer((req.params.id as string));
  ok(res, null, "Customer deactivated successfully");
});

export const addFollowUp = asyncHandler(async (req: Request, res: Response) => {
  const data = createFollowUpSchema.parse(req.body);
  const followUp = await customerService.addFollowUp((req.params.id as string), data, req.user!.userId);
  created(res, followUp, "Follow-up added successfully");
});

export const listFollowUps = asyncHandler(async (req: Request, res: Response) => {
  const followUpsList = await customerService.listFollowUps((req.params.id as string));
  ok(res, followUpsList);
});
