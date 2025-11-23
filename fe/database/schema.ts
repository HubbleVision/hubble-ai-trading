import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const users = sqliteTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["admin", "user"] })
    .notNull()
    .default("user"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// Export Zod schemas for validation
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);

export {
  traders,
  insertTraderSchema,
  selectTraderSchema,
} from "~/features/traders/database/schema";

export {
  analysisRecords,
  insertAnalysisRecordSchema,
  selectAnalysisRecordSchema,
} from "~/features/analysis-team/database/schema";

export {
  positionRecords,
  insertPositionRecordSchema,
  selectPositionRecordSchema,
} from "~/features/positions/database/schema";

export {
  orders,
  insertOrderSchema,
  selectOrderSchema,
  getOrdersQuerySchema,
} from "~/features/order/database/schema";
