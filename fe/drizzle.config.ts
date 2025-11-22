import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";
import { env } from "process";
import { readFileSync, existsSync } from "fs";

// Detect environment type
const isDevelopment =
  process.env.NODE_ENV !== "production" &&
  (process.env.NODE_ENV === "development" ||
    !process.env.NODE_ENV ||
    process.env.CF_PAGES !== "1");

// Only load local environment variables in development
if (isDevelopment) {
  config({ path: ".env.local" });
}

// Read D1 database information from Alchemy config file
function getD1ConfigFromAlchemy() {
  // Priority: read from .alchemy/trading/liunian/web-db.json
  const alchemyDbPath = ".alchemy/trading/liunian/web-db.json";
  // Fallback: read from wrangler.jsonc
  const wranglerConfigPath = ".alchemy/local/wrangler.jsonc";

  let databaseId: string | undefined;

  // Try reading from Alchemy DB config file
  if (existsSync(alchemyDbPath)) {
    try {
      const dbConfig = JSON.parse(readFileSync(alchemyDbPath, "utf-8"));
      databaseId = dbConfig.output?.id;
    } catch (error) {
      console.warn(`Unable to read ${alchemyDbPath}:`, error);
    }
  }

  // If not found, try reading from wrangler.jsonc
  if (!databaseId && existsSync(wranglerConfigPath)) {
    try {
      let wranglerContent = readFileSync(wranglerConfigPath, "utf-8");
      // Remove JSONC comments
      wranglerContent = wranglerContent
        .replace(/\/\/.*$/gm, "")
        .replace(/\/\*[\s\S]*?\*\//g, "");
      const wranglerConfig = JSON.parse(wranglerContent);
      databaseId = wranglerConfig.d1_databases?.[0]?.database_id;
    } catch (error) {
      console.warn(`Unable to read ${wranglerConfigPath}:`, error);
    }
  }

  // Load environment variables from .env.local to get accountId and token
  // Priority: read .env.local, if it doesn't exist then use already loaded environment variables
  if (existsSync(".env.local") && !env.CLOUDFLARE_ACCOUNT_ID) {
    try {
      const localEnv = config({ path: ".env.local" });
      // dotenv merges variables into process.env but doesn't return an object (unless override: true is used)
      // Re-read to ensure getting the latest values
    } catch (error) {
      // Ignore error, may have already been loaded
    }
  }

  return {
    databaseId,
    // accountId retrieved from CLOUDFLARE_ACCOUNT_ID in .env.local
    accountId: env.CLOUDFLARE_ACCOUNT_ID,
    token: env.CLOUDFLARE_ACCOUNT_TOKEN_FOR_D1,
  };
}

// Base configuration
const baseConfig = {
  schema: "./database/schema.ts",
  out: "./drizzle/migrations",
  dialect: "sqlite" as const,
};

// Development environment configuration
const developmentConfig = {
  ...baseConfig,
  dbCredentials: {
    // Development: use local database file or in-memory database
    url: env.DATABASE_URL || ":memory:",
  },
};

// Production environment configuration
// Read D1 information from Alchemy config file
const d1Config = getD1ConfigFromAlchemy();
const productionConfig = {
  ...baseConfig,
  driver: "d1-http",
  // If accountId, databaseId and token are provided, use them
  // Otherwise drizzle-kit will automatically read from wrangler config
  ...(d1Config.accountId && d1Config.databaseId && d1Config.token
    ? {
        dbCredentials: {
          accountId: d1Config.accountId,
          databaseId: d1Config.databaseId,
          token: d1Config.token,
        },
      }
    : // If all necessary information is not provided, don't set dbCredentials, let drizzle-kit auto-detect
      {}),
};

// Return different configuration based on environment
export default defineConfig(
  isDevelopment ? developmentConfig : productionConfig
);
