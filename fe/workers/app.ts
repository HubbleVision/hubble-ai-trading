import { drizzle } from "drizzle-orm/d1";
import { createRequestHandler, RouterContextProvider } from "react-router";
import * as schema from "@/schema";
import { EnvContext, type EnvContextType } from "~/context";

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE
);

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const db = drizzle(env.DB, { schema });

    const rootContext = new RouterContextProvider();
    rootContext.set(EnvContext, {
      cloudflare: { env, ctx },
      db,
      sessionKV: env.SESSION_KV,
      sessionExpiry: env.SESSION_EXPIRY || "604800",
    });
    return requestHandler(request, rootContext);
  },
};
