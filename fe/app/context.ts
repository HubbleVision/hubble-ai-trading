import type { DrizzleD1Database } from "drizzle-orm/d1";
import { createContext, RouterContextProvider } from "react-router";
import * as schema from "@/schema";
import type { User } from "@/types";

// Define explicit Context type
export interface EnvContextType {
  cloudflare: { env: Env; ctx: ExecutionContext };
  db: DrizzleD1Database<typeof schema>;
  sessionKV: KVNamespace; // Explicitly use Cloudflare Workers runtime type
  sessionExpiry: string;
}

export const EnvContext = createContext<EnvContextType>();

export const UserContext = createContext<User | null>(null);

// Type guard function to ensure context is not empty
export function getEnvContext(
  context: Readonly<RouterContextProvider>
): EnvContextType {
  const envContext = context.get(EnvContext);
  if (!envContext) {
    throw new Error("EnvContext not found in request context");
  }
  return envContext;
}
