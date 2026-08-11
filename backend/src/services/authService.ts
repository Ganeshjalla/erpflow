import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { users } from "../db/schema";
import { comparePassword, signToken } from "../utils/auth";
import { ApiError } from "../utils/ApiError";

export async function login(email: string, password: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (!user || !user.isActive) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  const token = signToken({ userId: user.id, role: user.role, email: user.email });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}

export async function getUserById(id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!user) throw ApiError.notFound("User not found");
  return user;
}
