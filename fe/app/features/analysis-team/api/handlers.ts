import { desc, eq, lt, and } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import type * as schema from "@/schema";
import { analysisRecords } from "../database/schema";
import { traders } from "~/features/traders/database/schema";

/**
 * Get analysis records for specified trader
 * Sorted by time from newest to oldest
 */
export async function getAnalysisRecordsByTrader(
  db: DrizzleD1Database<typeof schema>,
  traderId: string,
  options?: {
    limit?: number;
    offset?: number;
  }
) {
  const { limit = 50, offset = 0 } = options || {};

  const records = await db
    .select({
      id: analysisRecords.id,
      role: analysisRecords.role,
      chat: analysisRecords.chat,
      jsonValue: analysisRecords.jsonValue,
      createdAt: analysisRecords.createdAt,
    })
    .from(analysisRecords)
    .where(eq(analysisRecords.traderId, traderId))
    .orderBy(desc(analysisRecords.createdAt))
    .limit(limit)
    .offset(offset);

  return records;
}

/**
 * Get latest analysis records
 * Sorted by time from newest to oldest, can filter by specific trader
 */
export async function getLatestAnalysisRecords(
  db: DrizzleD1Database<typeof schema>,
  params: {
    traderId?: string;
    limit?: number;
  } = {}
) {
  const { traderId, limit = 20 } = params;

  let query = db
    .select({
      // Analysis record fields
      id: analysisRecords.id,
      traderId: analysisRecords.traderId,
      role: analysisRecords.role,
      chat: analysisRecords.chat,
      jsonValue: analysisRecords.jsonValue,
      recordId: analysisRecords.recordId,
      orderId: analysisRecords.orderId,
      createdAt: analysisRecords.createdAt,
      updatedAt: analysisRecords.updatedAt,
      // Trader fields
      traderName: traders.name,
      traderDescription: traders.description,
    })
    .from(analysisRecords)
    .leftJoin(traders, eq(analysisRecords.traderId, traders.id));

  if (traderId) {
    query = query.where(eq(analysisRecords.traderId, traderId)) as any;
  }

  const records = await query.orderBy(desc(analysisRecords.createdAt)).limit(limit);

  return records;
}

/**
 * Get analysis records grouped by recordId, with pagination support
 * Returns groups sorted by latest message time from newest to oldest
 * 
 * @param db - Database instance
 * @param params - Query parameters
 * @returns Object with groups array and nextCursor for pagination
 */
export async function getLatestAnalysisGroups(
  db: DrizzleD1Database<typeof schema>,
  params: {
    traderId?: string;
    limit?: number; // Number of groups to return
    cursor?: string; // ISO timestamp string for pagination
  } = {}
) {
  const { traderId, limit = 10, cursor } = params;

  // First, get all records ordered by time
  let baseQuery = db
    .select({
      id: analysisRecords.id,
      traderId: analysisRecords.traderId,
      role: analysisRecords.role,
      chat: analysisRecords.chat,
      jsonValue: analysisRecords.jsonValue,
      recordId: analysisRecords.recordId,
      orderId: analysisRecords.orderId,
      createdAt: analysisRecords.createdAt,
      updatedAt: analysisRecords.updatedAt,
      traderName: traders.name,
      traderDescription: traders.description,
    })
    .from(analysisRecords)
    .leftJoin(traders, eq(analysisRecords.traderId, traders.id));

  // Apply filters
  const conditions = [];
  if (traderId) {
    conditions.push(eq(analysisRecords.traderId, traderId));
  }
  if (cursor) {
    // Filter records with createdAt < cursor (older records)
    conditions.push(lt(analysisRecords.createdAt, cursor));
  }

  if (conditions.length > 0) {
    baseQuery = baseQuery.where(
      conditions.length === 1 ? conditions[0] : and(...conditions)
    ) as any;
  }

  // Get records, fetch more than needed to ensure we have enough groups
  const allRecords = await baseQuery
    .orderBy(desc(analysisRecords.createdAt))
    .limit(limit * 20); // Fetch more records to ensure we have enough groups

  // Group by recordId
  const groupsMap = new Map<
    string,
    {
      recordId: string | null;
      records: typeof allRecords;
      latest: string;
      traderId: string;
      traderName: string | null;
    }
  >();

  for (const record of allRecords) {
    const key = record.recordId ?? `__no-record-${record.traderId}`;
    const existing = groupsMap.get(key);

    if (existing) {
      existing.records.push(record);
      if (
        new Date(record.createdAt).getTime() >
        new Date(existing.latest).getTime()
      ) {
        existing.latest = record.createdAt;
      }
    } else {
      groupsMap.set(key, {
        recordId: record.recordId,
        records: [record],
        latest: record.createdAt,
        traderId: record.traderId,
        traderName: record.traderName,
      });
    }
  }

  // Sort groups by latest time and take limit
  const groups = Array.from(groupsMap.values())
    .sort((a, b) => new Date(b.latest).getTime() - new Date(a.latest).getTime())
    .slice(0, limit);

  // Sort records within each group by time (newest first)
  for (const group of groups) {
    group.records.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  // Get next cursor (oldest latest time in the last group)
  const nextCursor =
    groups.length === limit && groups.length > 0
      ? groups[groups.length - 1].latest
      : null;

  return {
    groups: groups.map((g) => ({
      key: g.recordId ?? `__no-record-${g.traderId}`,
      recordId: g.recordId,
      records: g.records,
      latest: g.latest,
      traderId: g.traderId,
      traderName: g.traderName,
    })),
    nextCursor,
  };
}

/**
 * Create new analysis record
 */
export async function createAnalysisRecord(
  db: DrizzleD1Database<typeof schema>,
  data: {
    traderId: string;
    role: string;
    chat: string;
    jsonValue?: string;
    recordId?: string;
    createdAt?: string;
  }
) {
  const [record] = await db
    .insert(analysisRecords)
    .values({
      traderId: data.traderId,
      role: data.role,
      chat: data.chat,
      jsonValue: data.jsonValue,
      recordId: data.recordId,
      createdAt: data.createdAt,
    })
    .returning();

  return record;
}
