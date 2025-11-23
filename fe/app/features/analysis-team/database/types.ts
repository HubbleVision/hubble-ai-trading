import type { z } from "zod";
import type {
  insertAnalysisRecordSchema,
  selectAnalysisRecordSchema,
} from "./schema";

export type AnalysisRecord = z.infer<typeof selectAnalysisRecordSchema>;
export type InsertAnalysisRecord = z.infer<typeof insertAnalysisRecordSchema>;

/**
 * 包含 trader 信息的分析记录（用于 API 返回）
 */
export interface AnalysisRecordWithTrader extends AnalysisRecord {
  traderName: string | null;
  traderDescription: string | null;
}
