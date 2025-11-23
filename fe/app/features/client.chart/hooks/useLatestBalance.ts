import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

/**
 * Latest balance data for a trader
 */
export type LatestBalanceData = {
  traderId: string;
  accountBalance: number;
  timestamp: string;
};

/**
 * Response from the latest balance API
 */
export type LatestBalanceResponse = {
  success: boolean;
  data?: {
    traders: LatestBalanceData[];
    timestamp: string;
  };
  error?: string;
};

/**
 * Fetches the latest balance for all traders from the API
 */
async function fetchLatestBalance(): Promise<LatestBalanceResponse> {
  const response = await fetch("/api/v1/traders/latest-balance");

  if (!response.ok) {
    throw new Error(`Failed to fetch latest balance: ${response.statusText}`);
  }

  return response.json();
}

export const latestBalanceKeys = {
  all: ["traders", "latest-balance"] as const,
  list: () => [...latestBalanceKeys.all, "list"] as const,
};

export type UseLatestBalanceOptions = {
  /** Polling interval in milliseconds (default: 5000ms = 5s) */
  pollingInterval?: number;
  /** Whether to enable polling (default: true) */
  enabled?: boolean;
  /** Callback when new balance data is received */
  onBalanceUpdate?: (data: LatestBalanceData[]) => void;
};

/**
 * Hook to fetch and poll for latest trader balances
 * Starts polling after the initial data load is complete
 */
export function useLatestBalance({
  pollingInterval = 1000 * 60 * 5,
  enabled = true,
  onBalanceUpdate,
}: UseLatestBalanceOptions) {
  // Use state instead of ref so React Query can react to changes
  const [isPollingEnabled, setIsPollingEnabled] = useState(false);
  const onBalanceUpdateRef = useRef(onBalanceUpdate);

  // Keep callback ref up to date
  useEffect(() => {
    onBalanceUpdateRef.current = onBalanceUpdate;
  }, [onBalanceUpdate]);

  const query = useQuery({
    queryKey: latestBalanceKeys.list(),
    queryFn: fetchLatestBalance,
    enabled: enabled && isPollingEnabled,
    // Start polling after initial load
    refetchInterval: isPollingEnabled ? pollingInterval : false,
    refetchIntervalInBackground: false,
    // Keep previous data to avoid flickering
    placeholderData: (previousData) => previousData,
  });

  // Call callback when new data arrives
  useEffect(() => {
    if (query.data?.data?.traders && onBalanceUpdateRef.current) {
      onBalanceUpdateRef.current(query.data.data.traders);
    }
  }, [query.data]);

  return {
    ...query,
    // Method to start polling after initial chart data is loaded
    startPolling: () => {
      setIsPollingEnabled(true);
    },
    // Method to stop polling
    stopPolling: () => {
      setIsPollingEnabled(false);
    },
    isPollingEnabled,
  };
}
