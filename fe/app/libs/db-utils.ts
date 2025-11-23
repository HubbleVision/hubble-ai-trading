import { eq } from "drizzle-orm";
import { users } from "@/schema";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import type { User } from "@/types";
import * as schema from "@/schema";

export type DatabaseType = DrizzleD1Database<typeof schema>;

/**
 * Get user by ID
 */
export async function getUserById(
  db: DatabaseType,
  id: string
): Promise<User | null> {
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);

  if (result.length === 0) return null;

  const user = result[0];
  const { password, ...publicUser } = user;
  return publicUser as User;
}

/**
 * Get user by email (with password, for login verification)
 */
export async function getUserByEmailWithPassword(
  db: DatabaseType,
  email: string
): Promise<User | null> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return result[0] || null;
}

/**
 * Get user by email (without password)
 */
export async function getUserByEmail(
  db: DatabaseType,
  email: string
): Promise<User | null> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (result.length === 0) return null;

  const user = result[0];
  const { password, ...publicUser } = user;
  return publicUser as User;
}

/**
 * Create user data type
 */
export interface CreateUserData {
  email: string;
  name: string;
  password: string;
  role?: "user" | "admin";
}

/**
 * Create new user
 */
export async function createUser(
  db: DatabaseType,
  userData: CreateUserData
): Promise<User> {
  const result = await db
    .insert(users)
    .values({
      email: userData.email,
      name: userData.name,
      password: userData.password,
      role: userData.role || "user",
    })
    .returning();

  if (result.length === 0) {
    throw new Error("Failed to create user");
  }

  const user = result[0];
  const { password, ...publicUser } = user;
  return publicUser as User;
}

/**
 * Check if email already exists
 */
export async function checkEmailExists(
  db: DatabaseType,
  email: string
): Promise<boolean> {
  const result = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return result.length > 0;
}
