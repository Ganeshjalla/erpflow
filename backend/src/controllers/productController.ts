import { Request, Response } from "express";
import { asyncHandler, parsePagination } from "../utils/asyncHandler";
import { buildPagination, created, ok, paginated } from "../utils/apiResponse";
import * as productService from "../services/productService";
import { createProductSchema, updateProductSchema } from "../validators/schemas";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, offset } = parsePagination(req.query as any);
  const { search, category, lowStock } = req.query as Record<string, string>;

  const { rows, total } = await productService.listProducts({
    limit,
    offset,
    search,
    category,
    lowStock: lowStock === "true",
  });

  paginated(res, rows, buildPagination(page, limit, total));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const data = createProductSchema.parse(req.body);
  const product = await productService.createProduct(data);
  created(res, product, "Product created successfully");
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.getProductById((req.params.id as string));
  ok(res, product);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const data = updateProductSchema.parse(req.body);
  const product = await productService.updateProduct((req.params.id as string), data);
  ok(res, product, "Product updated successfully");
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await productService.softDeleteProduct((req.params.id as string));
  ok(res, null, "Product deleted successfully");
});
