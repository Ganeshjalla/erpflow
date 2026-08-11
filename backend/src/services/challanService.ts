import { and, desc, eq, ilike, sql } from "drizzle-orm";
import { db } from "../db/client";
import {
  challanSequences,
  customers,
  products,
  salesChallanItems,
  salesChallans,
  stockMovements,
  users,
} from "../db/schema";
import { ApiError } from "../utils/ApiError";

// ------------------------------
// Challan number generator: CH-<year>-000001
// ------------------------------
async function generateChallanNumber(tx: typeof db): Promise<string> {
  const year = new Date().getFullYear();

  // Upsert-style atomic increment guarded by the transaction's row lock
  const existing = await tx
    .select()
    .from(challanSequences)
    .where(eq(challanSequences.year, year))
    .for("update");

  let counter: number;
  if (existing.length === 0) {
    counter = 1;
    await tx.insert(challanSequences).values({ year, counter });
  } else {
    counter = existing[0].counter + 1;
    await tx
      .update(challanSequences)
      .set({ counter })
      .where(eq(challanSequences.year, year));
  }

  return `CH-${year}-${String(counter).padStart(6, "0")}`;
}

async function buildItemSnapshots(tx: typeof db, items: { productId: string; quantity: number }[]) {
  const snapshots = [];
  for (const item of items) {
    const [product] = await tx.select().from(products).where(eq(products.id, item.productId));
    if (!product || product.isDeleted) {
      throw ApiError.badRequest(`Product ${item.productId} not found`);
    }
    const unitPrice = Number(product.unitPrice);
    snapshots.push({
      productId: product.id,
      productNameSnapshot: product.productName,
      skuSnapshot: product.sku,
      unitPriceSnapshot: String(unitPrice),
      quantity: item.quantity,
      totalPrice: String(unitPrice * item.quantity),
    });
  }
  return snapshots;
}

export async function createChallan(
  data: { customerId: string; items: { productId: string; quantity: number }[]; status?: "DRAFT" | "CONFIRMED" },
  createdById: string
) {
  return db.transaction(async (tx) => {
    const [customer] = await tx
      .select()
      .from(customers)
      .where(and(eq(customers.id, data.customerId), eq(customers.isDeleted, false)));
    if (!customer) throw ApiError.badRequest("Customer not found");

    const snapshots = await buildItemSnapshots(tx as any, data.items);
    const totalQuantity = snapshots.reduce((sum, i) => sum + i.quantity, 0);
    const totalAmount = snapshots.reduce((sum, i) => sum + Number(i.totalPrice), 0);
    const challanNumber = await generateChallanNumber(tx as any);

    const [challan] = await tx
      .insert(salesChallans)
      .values({
        challanNumber,
        customerId: data.customerId,
        totalQuantity,
        totalAmount: String(totalAmount),
        status: "DRAFT",
        createdById,
      })
      .returning();

    await tx.insert(salesChallanItems).values(
      snapshots.map((s) => ({ ...s, challanId: challan.id }))
    );

    let result = challan;

    // Allow create-and-confirm in one call when explicitly requested
    if (data.status === "CONFIRMED") {
      result = await confirmChallanInternal(tx as any, challan.id, createdById);
    }

    return getChallanByIdInternal(tx as any, result.id);
  });
}

export async function updateChallan(
  id: string,
  data: { customerId?: string; items?: { productId: string; quantity: number }[] }
) {
  return db.transaction(async (tx) => {
    const [challan] = await tx.select().from(salesChallans).where(eq(salesChallans.id, id)).for("update");
    if (!challan) throw ApiError.notFound("Challan not found");
    if (challan.status !== "DRAFT") {
      throw ApiError.badRequest("Only DRAFT challans can be edited");
    }

    if (data.customerId) {
      const [customer] = await tx
        .select()
        .from(customers)
        .where(and(eq(customers.id, data.customerId), eq(customers.isDeleted, false)));
      if (!customer) throw ApiError.badRequest("Customer not found");
    }

    if (data.items) {
      const snapshots = await buildItemSnapshots(tx as any, data.items);
      const totalQuantity = snapshots.reduce((sum, i) => sum + i.quantity, 0);
      const totalAmount = snapshots.reduce((sum, i) => sum + Number(i.totalPrice), 0);

      await tx.delete(salesChallanItems).where(eq(salesChallanItems.challanId, id));
      await tx.insert(salesChallanItems).values(snapshots.map((s) => ({ ...s, challanId: id })));

      await tx
        .update(salesChallans)
        .set({
          customerId: data.customerId ?? challan.customerId,
          totalQuantity,
          totalAmount: String(totalAmount),
          updatedAt: new Date(),
        })
        .where(eq(salesChallans.id, id));
    } else if (data.customerId) {
      await tx
        .update(salesChallans)
        .set({ customerId: data.customerId, updatedAt: new Date() })
        .where(eq(salesChallans.id, id));
    }

    return getChallanByIdInternal(tx as any, id);
  });
}

// ------------------------------
// CONFIRM — the critical atomic operation
// ------------------------------
async function confirmChallanInternal(tx: typeof db, id: string, _confirmedById: string) {
  const [challan] = await tx.select().from(salesChallans).where(eq(salesChallans.id, id)).for("update");
  if (!challan) throw ApiError.notFound("Challan not found");
  if (challan.status === "CONFIRMED") {
    throw ApiError.badRequest("Challan is already confirmed");
  }
  if (challan.status === "CANCELLED") {
    throw ApiError.badRequest("Cancelled challan cannot be confirmed");
  }

  const items = await tx
    .select()
    .from(salesChallanItems)
    .where(eq(salesChallanItems.challanId, id));

  // 1. Validate stock for every item BEFORE mutating anything
  const lockedProducts = [];
  for (const item of items) {
    const [product] = await tx
      .select()
      .from(products)
      .where(eq(products.id, item.productId))
      .for("update");

    if (!product) {
      throw ApiError.badRequest(`Product ${item.skuSnapshot} no longer exists`);
    }
    if (product.currentStock < item.quantity) {
      throw ApiError.badRequest(
        `Insufficient stock for product ${item.skuSnapshot}. Available: ${product.currentStock}, Requested: ${item.quantity}`
      );
    }
    lockedProducts.push({ product, item });
  }

  // 2. All validated — now mutate atomically
  for (const { product, item } of lockedProducts) {
    await tx
      .update(products)
      .set({ currentStock: product.currentStock - item.quantity, updatedAt: new Date() })
      .where(eq(products.id, product.id));

    await tx.insert(stockMovements).values({
      productId: product.id,
      quantity: item.quantity,
      movementType: "OUT",
      reason: `Sales challan ${challan.challanNumber} confirmed`,
      createdById: _confirmedById,
    });
  }

  const [updated] = await tx
    .update(salesChallans)
    .set({ status: "CONFIRMED", confirmedAt: new Date(), updatedAt: new Date() })
    .where(eq(salesChallans.id, id))
    .returning();

  return updated;
}

export async function confirmChallan(id: string, confirmedById: string) {
  return db.transaction(async (tx) => {
    await confirmChallanInternal(tx as any, id, confirmedById);
    return getChallanByIdInternal(tx as any, id);
  });
}

export async function cancelChallan(id: string) {
  return db.transaction(async (tx) => {
    const [challan] = await tx.select().from(salesChallans).where(eq(salesChallans.id, id)).for("update");
    if (!challan) throw ApiError.notFound("Challan not found");
    if (challan.status === "CANCELLED") {
      throw ApiError.badRequest("Challan is already cancelled");
    }
    if (challan.status === "CONFIRMED") {
      throw ApiError.badRequest(
        "Confirmed challans cannot be cancelled in this version. Reversal would require a manual stock-in movement."
      );
    }

    const [updated] = await tx
      .update(salesChallans)
      .set({ status: "CANCELLED", updatedAt: new Date() })
      .where(eq(salesChallans.id, id))
      .returning();

    return updated;
  });
}

interface ListParams {
  limit: number;
  offset: number;
  status?: string;
  search?: string;
}

export async function listChallans(params: ListParams) {
  const { limit, offset, status, search } = params;

  const conditions = [];
  if (status) conditions.push(eq(salesChallans.status, status as any));
  if (search) conditions.push(ilike(salesChallans.challanNumber, `%${search}%`));

  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, [{ count }]] = await Promise.all([
    db
      .select({
        id: salesChallans.id,
        challanNumber: salesChallans.challanNumber,
        customerId: salesChallans.customerId,
        customerName: customers.customerName,
        totalQuantity: salesChallans.totalQuantity,
        totalAmount: salesChallans.totalAmount,
        status: salesChallans.status,
        createdByName: users.name,
        createdAt: salesChallans.createdAt,
      })
      .from(salesChallans)
      .leftJoin(customers, eq(salesChallans.customerId, customers.id))
      .leftJoin(users, eq(salesChallans.createdById, users.id))
      .where(where as any)
      .orderBy(desc(salesChallans.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(salesChallans).where(where as any),
  ]);

  return { rows, total: count };
}

async function getChallanByIdInternal(tx: typeof db, id: string) {
  const [challan] = await tx
    .select({
      id: salesChallans.id,
      challanNumber: salesChallans.challanNumber,
      customerId: salesChallans.customerId,
      totalQuantity: salesChallans.totalQuantity,
      totalAmount: salesChallans.totalAmount,
      status: salesChallans.status,
      confirmedAt: salesChallans.confirmedAt,
      createdAt: salesChallans.createdAt,
      updatedAt: salesChallans.updatedAt,
      createdByName: users.name,
      customerName: customers.customerName,
      customerBusinessName: customers.businessName,
    })
    .from(salesChallans)
    .leftJoin(users, eq(salesChallans.createdById, users.id))
    .leftJoin(customers, eq(salesChallans.customerId, customers.id))
    .where(eq(salesChallans.id, id));

  if (!challan) throw ApiError.notFound("Challan not found");

  const items = await tx
    .select()
    .from(salesChallanItems)
    .where(eq(salesChallanItems.challanId, id));

  return { ...challan, items };
}

export async function getChallanById(id: string) {
  return getChallanByIdInternal(db, id);
}
