import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import type { AnalysisRecordWithTrader } from "../database/types";

/**
 * Query keys for analysis records
 */
export const analysisKeys = {
  all: ["analysis-records"] as const,
  latest: () => [...analysisKeys.all, "latest"] as const,
  latestByTrader: (traderId: string) => [...analysisKeys.all, "latest", traderId] as const,
  latestGroups: () => [...analysisKeys.all, "latest-groups"] as const,
  latestGroupsByTrader: (traderId: string) => [...analysisKeys.all, "latest-groups", traderId] as const,
};

/**
 * API response structure for latest analysis records
 */
export interface LatestAnalysisResponse {
  success: boolean;
  data?: AnalysisRecordWithTrader[];
  error?: string;
  message?: string;
}

/**
 * Group structure for grouped analysis records
 */
export interface AnalysisGroup {
  key: string;
  recordId: string | null;
  records: AnalysisRecordWithTrader[];
  latest: string;
  traderId: string;
  traderName: string | null;
}

/**
 * API response structure for grouped analysis records
 */
export interface LatestAnalysisGroupsResponse {
  success: boolean;
  data?: {
    groups: AnalysisGroup[];
    nextCursor: string | null;
  };
  error?: string;
  message?: string;
}

/**
 * Fetch latest analysis records from API
 */
async function fetchLatestAnalysisRecords(params: {
  traderId?: string;
  limit?: number;
}): Promise<AnalysisRecordWithTrader[]> {
  const { traderId, limit = 20 } = params;

  const searchParams = new URLSearchParams();
  if (traderId) searchParams.set("traderId", traderId);
  if (limit) searchParams.set("limit", limit.toString());

  const url = `/api/v1/analysis-records?${searchParams.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch latest analysis records: ${response.statusText}`);
  }

  const result: LatestAnalysisResponse = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error || "Failed to fetch latest analysis records");
  }

  return result.data;
}

/**
 * Fetch latest analysis groups from API with pagination
 */
async function fetchLatestAnalysisGroups(params: {
  traderId?: string;
  limit?: number;
  cursor?: string | null;
}): Promise<{ groups: AnalysisGroup[]; nextCursor: string | null }> {
  const { traderId, limit = 10, cursor } = params;

  const searchParams = new URLSearchParams();
  searchParams.set("grouped", "true");
  if (traderId) searchParams.set("traderId", traderId);
  if (limit) searchParams.set("limit", limit.toString());
  if (cursor) searchParams.set("cursor", cursor);

  const url = `/api/v1/analysis-records?${searchParams.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch latest analysis groups: ${response.statusText}`);
  }

  const result: LatestAnalysisGroupsResponse = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error || "Failed to fetch latest analysis groups");
  }

  return result.data;
}

/**
 * Hook to fetch latest analysis records
 *
 * @param options - Query options
 * @returns Query result with latest analysis records
 */
export function useLatestAnalysis(options?: {
  traderId?: string;
  limit?: number;
  enabled?: boolean;
  refetchInterval?: number;
}) {
  const {
    traderId,
    limit = 20,
    enabled = true,
    refetchInterval = 1000 * 60, // Default: 1 minute
  } = options || {};

  return useQuery({
    queryKey: traderId ? analysisKeys.latestByTrader(traderId) : analysisKeys.latest(),
    queryFn: () => fetchLatestAnalysisRecords({ traderId, limit }),
    enabled,
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval,
  });
}

/**
 * Hook to fetch latest analysis groups with infinite scroll support
 *
 * @param options - Query options
 * @returns Infinite query result with grouped analysis records
 */
export function useLatestAnalysisGroups(options?: {
  traderId?: string;
  limit?: number;
  enabled?: boolean;
}) {
  const {
    traderId,
    limit = 10,
    enabled = true,
  } = options || {};

  return useInfiniteQuery({
    queryKey: traderId 
      ? analysisKeys.latestGroupsByTrader(traderId) 
      : analysisKeys.latestGroups(),
    queryFn: ({ pageParam }) => 
      fetchLatestAnalysisGroups({ 
        traderId, 
        limit, 
        cursor: pageParam ?? undefined 
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled,
    staleTime: 1000 * 30, // 30 seconds
  });
}
