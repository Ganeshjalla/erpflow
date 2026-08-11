import { desc, eq } from "drizzle-orm";
import { db } from "../db/client";
import { users } from "../db/schema";
import { hashPassword } from "../utils/auth";
import { ApiError } from "../utils/ApiError";

export async function listUsers() {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt));
  return rows;
}

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  role: "ADMIN" | "SALES" | "WAREHOUSE" | "ACCOUNTS";
}) {
  const existing = await db.select().from(users).where(eq(users.email, data.email)).limit(1);
  if (existing.length > 0) {
    throw ApiError.conflict(`A user with email "${data.email}" already exists`);
  }

  const passwordHash = await hashPassword(data.password);
  const [user] = await db
    .insert(users)
    .values({ name: data.name, email: data.email, passwordHash, role: data.role })
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
    });
  return user;
}

export async function toggleUserActive(id: string, isActive: boolean) {
  const [user] = await db
    .update(users)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
    });
  if (!user) throw ApiError.notFound("User not found");
  return user;
}
