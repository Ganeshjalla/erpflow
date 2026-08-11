import { desc, eq, sql } from "drizzle-orm";
import { db } from "../db/client";
import {
  customers,
  products,
  salesChallans,
  stockMovements,
  followUps,
  users,
} from "../db/schema";

export async function getDashboardStats() {
  const [
    [customerCounts],
    [productCounts],
    [challanCounts],
    [stockTotal],
    recentChallans,
    recentMovements,
    upcomingFollowUps,
  ] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where ${customers.status} = 'ACTIVE')::int`,
        leads: sql<number>`count(*) filter (where ${customers.status} = 'LEAD')::int`,
      })
      .from(customers)
      .where(eq(customers.isDeleted, false)),
    db
      .select({
        total: sql<number>`count(*)::int`,
        lowStock: sql<number>`count(*) filter (where ${products.currentStock} <= ${products.minimumStock} and ${products.currentStock} > 0)::int`,
        outOfStock: sql<number>`count(*) filter (where ${products.currentStock} <= 0)::int`,
      })
      .from(products)
      .where(eq(products.isDeleted, false)),
    db
      .select({
        total: sql<number>`count(*)::int`,
        draft: sql<number>`count(*) filter (where ${salesChallans.status} = 'DRAFT')::int`,
        confirmed: sql<number>`count(*) filter (where ${salesChallans.status} = 'CONFIRMED')::int`,
        cancelled: sql<number>`count(*) filter (where ${salesChallans.status} = 'CANCELLED')::int`,
      })
      .from(salesChallans),
    db
      .select({ total: sql<number>`coalesce(sum(${products.currentStock}), 0)::int` })
      .from(products)
      .where(eq(products.isDeleted, false)),
    db
      .select({
        id: salesChallans.id,
        challanNumber: salesChallans.challanNumber,
        customerName: customers.customerName,
        status: salesChallans.status,
        totalAmount: salesChallans.totalAmount,
        createdAt: salesChallans.createdAt,
      })
      .from(salesChallans)
      .leftJoin(customers, eq(salesChallans.customerId, customers.id))
      .orderBy(desc(salesChallans.createdAt))
      .limit(5),
    db
      .select({
        id: stockMovements.id,
        productName: products.productName,
        sku: products.sku,
        quantity: stockMovements.quantity,
        movementType: stockMovements.movementType,
        createdAt: stockMovements.createdAt,
        createdByName: users.name,
      })
      .from(stockMovements)
      .leftJoin(products, eq(stockMovements.productId, products.id))
      .leftJoin(users, eq(stockMovements.createdById, users.id))
      .orderBy(desc(stockMovements.createdAt))
      .limit(5),
    db
      .select({
        id: followUps.id,
        note: followUps.note,
        followUpDate: followUps.followUpDate,
        customerName: customers.customerName,
      })
      .from(followUps)
      .leftJoin(customers, eq(followUps.customerId, customers.id))
      .where(sql`${followUps.followUpDate} >= now()`)
      .orderBy(followUps.followUpDate)
      .limit(5),
  ]);

  return {
    customers: customerCounts,
    products: productCounts,
    challans: challanCounts,
    totalStockQuantity: stockTotal.total,
    recentChallans,
    recentStockMovements: recentMovements,
    upcomingFollowUps,
  };
}
