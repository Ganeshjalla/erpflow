import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "../db/client";
import { customers, followUps, salesChallans, users } from "../db/schema";
import { ApiError } from "../utils/ApiError";

interface ListParams {
  page: number;
  limit: number;
  offset: number;
  search?: string;
  status?: string;
  customerType?: string;
}

export async function listCustomers(params: ListParams) {
  const { limit, offset, search, status, customerType } = params;

  const conditions = [eq(customers.isDeleted, false)];
  if (search) {
    conditions.push(
      or(
        ilike(customers.customerName, `%${search}%`),
        ilike(customers.businessName, `%${search}%`),
        ilike(customers.mobileNumber, `%${search}%`)
      )!
    );
  }
  if (status) conditions.push(eq(customers.status, status as any));
  if (customerType) conditions.push(eq(customers.customerType, customerType as any));

  const where = and(...conditions);

  const [rows, [{ count }]] = await Promise.all([
    db
      .select()
      .from(customers)
      .where(where)
      .orderBy(desc(customers.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(customers).where(where),
  ]);

  return { rows, total: count };
}

export async function createCustomer(data: any, createdById: string) {
  const [customer] = await db
    .insert(customers)
    .values({
      ...data,
      followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
      createdById,
    })
    .returning();
  return customer;
}

export async function getCustomerById(id: string) {
  const [customer] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, id), eq(customers.isDeleted, false)))
    .limit(1);

  if (!customer) throw ApiError.notFound("Customer not found");

  const [followUpHistory, recentChallans] = await Promise.all([
    db
      .select({
        id: followUps.id,
        note: followUps.note,
        followUpDate: followUps.followUpDate,
        createdAt: followUps.createdAt,
        createdByName: users.name,
      })
      .from(followUps)
      .leftJoin(users, eq(followUps.createdById, users.id))
      .where(eq(followUps.customerId, id))
      .orderBy(desc(followUps.createdAt)),
    db
      .select()
      .from(salesChallans)
      .where(eq(salesChallans.customerId, id))
      .orderBy(desc(salesChallans.createdAt))
      .limit(10),
  ]);

  return { ...customer, followUps: followUpHistory, recentChallans };
}

export async function updateCustomer(id: string, data: any) {
  await getCustomerById(id);

  const updateData: Record<string, unknown> = { ...data, updatedAt: new Date() };
  if (data.followUpDate) updateData.followUpDate = new Date(data.followUpDate);

  const [updated] = await db
    .update(customers)
    .set(updateData)
    .where(eq(customers.id, id))
    .returning();
  return updated;
}

export async function softDeleteCustomer(id: string) {
  await getCustomerById(id);
  const [updated] = await db
    .update(customers)
    .set({ isDeleted: true, status: "INACTIVE", updatedAt: new Date() })
    .where(eq(customers.id, id))
    .returning();
  return updated;
}

export async function addFollowUp(customerId: string, data: any, createdById: string) {
  await getCustomerById(customerId);

  const [followUp] = await db
    .insert(followUps)
    .values({
      customerId,
      note: data.note,
      followUpDate: new Date(data.followUpDate),
      createdById,
    })
    .returning();

  // Keep the customer's headline follow-up date in sync
  await db
    .update(customers)
    .set({ followUpDate: new Date(data.followUpDate), updatedAt: new Date() })
    .where(eq(customers.id, customerId));

  return followUp;
}

export async function listFollowUps(customerId: string) {
  await getCustomerById(customerId);
  return db
    .select({
      id: followUps.id,
      note: followUps.note,
      followUpDate: followUps.followUpDate,
      createdAt: followUps.createdAt,
      createdByName: users.name,
    })
    .from(followUps)
    .leftJoin(users, eq(followUps.createdById, users.id))
    .where(eq(followUps.customerId, customerId))
    .orderBy(desc(followUps.createdAt));
}
