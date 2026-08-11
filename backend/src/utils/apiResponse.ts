import { Response } from "express";

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function ok(res: Response, data: unknown, message = "Success", status = 200) {
  return res.status(status).json({ success: true, message, data });
}

export function created(res: Response, data: unknown, message = "Created successfully") {
  return ok(res, data, message, 201);
}

export function paginated(
  res: Response,
  data: unknown[],
  pagination: Pagination,
  message = "Success"
) {
  return res.status(200).json({ success: true, message, data, pagination });
}

export function buildPagination(page: number, limit: number, total: number): Pagination {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
