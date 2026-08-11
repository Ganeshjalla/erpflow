import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "../db/client";
import { products } from "../db/schema";
import { ApiError } from "../utils/ApiError";

interface ListParams {
  limit: number;
  offset: number;
  search?: string;
  category?: string;
  lowStock?: boolean;
}

export async function listProducts(params: ListParams) {
  const { limit, offset, search, category, lowStock } = params;

  const conditions = [eq(products.isDeleted, false)];
  if (search) {
    conditions.push(
      or(ilike(products.productName, `%${search}%`), ilike(products.sku, `%${search}%`))!
    );
  }
  if (category) conditions.push(eq(products.category, category));
  if (lowStock) conditions.push(sql`${products.currentStock} <= ${products.minimumStock}`);

  const where = and(...conditions);

  const [rows, [{ count }]] = await Promise.all([
    db.select().from(products).where(where).orderBy(desc(products.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(products).where(where),
  ]);

  return { rows: rows.map(withStockStatus), total: count };
}

function withStockStatus<T extends { currentStock: number; minimumStock: number }>(p: T) {
  let stockStatus: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" = "IN_STOCK";
  if (p.currentStock <= 0) stockStatus = "OUT_OF_STOCK";
  else if (p.currentStock <= p.minimumStock) stockStatus = "LOW_STOCK";
  return { ...p, stockStatus };
}

export async function createProduct(data: any) {
  const existing = await db.select().from(products).where(eq(products.sku, data.sku)).limit(1);
  if (existing.length > 0) {
    throw ApiError.conflict(`A product with SKU "${data.sku}" already exists`);
  }

  const [product] = await db
    .insert(products)
    .values({
      ...data,
      unitPrice: String(data.unitPrice),
      currentStock: data.currentStock ?? 0,
      minimumStock: data.minimumStock ?? 0,
    })
    .returning();
  return withStockStatus(product);
}

export async function getProductById(id: string) {
  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, id), eq(products.isDeleted, false)))
    .limit(1);
  if (!product) throw ApiError.notFound("Product not found");
  return withStockStatus(product);
}

export async function updateProduct(id: string, data: any) {
  await getProductById(id);

  if (data.sku) {
    const existing = await db
      .select()
      .from(products)
      .where(and(eq(products.sku, data.sku)));
    if (existing.some((p) => p.id !== id)) {
      throw ApiError.conflict(`A product with SKU "${data.sku}" already exists`);
    }
  }

  const updateData: Record<string, unknown> = { ...data, updatedAt: new Date() };
  if (data.unitPrice !== undefined) updateData.unitPrice = String(data.unitPrice);

  const [updated] = await db.update(products).set(updateData).where(eq(products.id, id)).returning();
  return withStockStatus(updated);
}

export async function softDeleteProduct(id: string) {
  await getProductById(id);
  const [updated] = await db
    .update(products)
    .set({ isDeleted: true, updatedAt: new Date() })
    .where(eq(products.id, id))
    .returning();
  return updated;
}
