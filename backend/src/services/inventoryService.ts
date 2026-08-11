import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../db/client";
import { products, stockMovements, users } from "../db/schema";
import { ApiError } from "../utils/ApiError";

export async function getInventoryOverview() {
  const rows = await db.select().from(products).where(eq(products.isDeleted, false));
  return rows.map((p) => {
    let stockStatus: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" = "IN_STOCK";
    if (p.currentStock <= 0) stockStatus = "OUT_OF_STOCK";
    else if (p.currentStock <= p.minimumStock) stockStatus = "LOW_STOCK";
    return { ...p, stockStatus };
  });
}

export async function recordMovement(
  data: { productId: string; quantity: number; movementType: "IN" | "OUT"; reason: string },
  createdById: string
) {
  return db.transaction(async (tx) => {
    const [product] = await tx
      .select()
      .from(products)
      .where(eq(products.id, data.productId))
      .for("update");

    if (!product || product.isDeleted) {
      throw ApiError.notFound("Product not found");
    }

    let newStock = product.currentStock;
    if (data.movementType === "IN") {
      newStock += data.quantity;
    } else {
      newStock -= data.quantity;
      if (newStock < 0) {
        throw ApiError.badRequest(
          `Insufficient stock for product ${product.sku}. Available: ${product.currentStock}, Requested: ${data.quantity}`
        );
      }
    }

    const [updatedProduct] = await tx
      .update(products)
      .set({ currentStock: newStock, updatedAt: new Date() })
      .where(eq(products.id, product.id))
      .returning();

    const [movement] = await tx
      .insert(stockMovements)
      .values({
        productId: data.productId,
        quantity: data.quantity,
        movementType: data.movementType,
        reason: data.reason,
        createdById,
      })
      .returning();

    return { movement, product: updatedProduct };
  });
}

interface MovementListParams {
  limit: number;
  offset: number;
  productId?: string;
  movementType?: string;
}

export async function listMovements(params: MovementListParams) {
  const { limit, offset, productId, movementType } = params;

  const conditions = [];
  if (productId) conditions.push(eq(stockMovements.productId, productId));
  if (movementType) conditions.push(eq(stockMovements.movementType, movementType as any));

  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, [{ count }]] = await Promise.all([
    db
      .select({
        id: stockMovements.id,
        productId: stockMovements.productId,
        productName: products.productName,
        sku: products.sku,
        quantity: stockMovements.quantity,
        movementType: stockMovements.movementType,
        reason: stockMovements.reason,
        createdAt: stockMovements.createdAt,
        createdByName: users.name,
      })
      .from(stockMovements)
      .leftJoin(products, eq(stockMovements.productId, products.id))
      .leftJoin(users, eq(stockMovements.createdById, users.id))
      .where(where as any)
      .orderBy(desc(stockMovements.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(stockMovements).where(where as any),
  ]);

  return { rows, total: count };
}
