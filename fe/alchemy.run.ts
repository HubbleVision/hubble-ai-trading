import alchemy from "alchemy";
import { D1Database, KVNamespace, ReactRouter } from "alchemy/cloudflare";
import { config } from "dotenv";

const isProd = process.env.ALCHEMY_ENV === "production";
const isPreview = process.env.ALCHEMY_ENV === "preview";

// Select different config file based on environment variable
const envFile = isProd || isPreview ? ".env" : ".env.local";
try {
  config({ path: envFile });
  console.log(`Loaded environment config file: ${envFile}`);
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.warn(
    `Unable to load environment config file ${envFile}:`,
    errorMessage
  );
  // If the specified file doesn't exist, try loading the default .env file
  if (envFile !== ".env") {
    try {
      config({ path: ".env" });
      console.log("Loaded default environment config file: .env");
    } catch (defaultError) {
      const defaultErrorMessage =
        defaultError instanceof Error
          ? defaultError.message
          : String(defaultError);
      console.warn(
        "Unable to load default environment config file .env:",
        defaultErrorMessage
      );
    }
  }
}

let stage = "";
if (isPreview) {
  stage = "preview";
}

const app = await alchemy(
  "trading",
  stage
    ? {
        stage,
      }
    : {}
);
const db = await D1Database("web-db", {
  migrationsDir: "./drizzle/migrations",
});
const sessionKV = await KVNamespace(`web-session-kv`);

export const worker = await ReactRouter("website", {
  bindings: {
    DB: db,
    SESSION_KV: sessionKV,
    SESSION_EXPIRY: process.env.SESSION_EXPIRY || "604800", // Default 7 days (604800 seconds)
    VALUE_FROM_CLOUDFLARE: alchemy.secret(process.env.ALCHEMY_PASSWORD),

    ADMIN_AUTH_HEADER: alchemy.secret(
      process.env.ADMIN_AUTH_HEADER || "auth_admin"
    ),
    ADMIN_AUTH_SECRET: alchemy.secret(
      process.env.ADMIN_AUTH_SECRET || "e82yu123nasd"
    ),

    INITIAL_ACCOUNT_BALANCE: process.env.INITIAL_ACCOUNT_BALANCE || "100",
  },
});

console.log({
  url: worker.url,
});

await app.finalize();
