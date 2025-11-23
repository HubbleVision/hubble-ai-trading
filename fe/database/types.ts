import type {
  users,
  traders,
  analysisRecords,
  positionRecords,
  orders,
} from "./schema";

export type User = typeof users.$inferSelect;
export type Trader = typeof traders.$inferSelect;
export type AnalysisRecord = typeof analysisRecords.$inferSelect;
export type PositionRecord = typeof positionRecords.$inferSelect;
export type Order = typeof orders.$inferSelect;

// Re-export feature types
export type {
  AnalysisRecord as AnalysisRecordType,
  InsertAnalysisRecord,
} from "~/features/analysis-team/database/types";

export type {
  PositionRecord as PositionRecordType,
  InsertPositionRecord,
  InstrumentPosition,
} from "~/features/positions/database/types";

export type {
  Order as OrderType,
  OrderSide,
  OrderType as OrderTypeEnum,
  PositionSide,
  OrderStatus,
  TimeInForce,
  WorkingType,
  GetOrdersParams,
  GetOrdersResponse,
  CreateOrderInput,
  UpdateOrderInput,
  ImportOrdersInput,
  ImportOrdersResponse,
} from "~/features/order/database/types";
