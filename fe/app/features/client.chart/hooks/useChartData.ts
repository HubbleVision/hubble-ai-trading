import { useMemo } from "react";
import type { TraderCurve, ScaleRange } from "../types";
import type { LatestBalanceData } from "./useLatestBalance";
import { getTraderColor } from "../utils/trader-color";

/**
 * Process raw trader data into chart-ready format
 * When selectedTraderId is provided, calculates scaleRange based only on that trader's data
 * When latestBalances is provided, appends the latest balance data to each trader's curve
 */
export function useChartData(
  data: any,
  selectedTraderId: string | null = null,
  initialAccountBalance: number = 10000,
  latestBalances?: LatestBalanceData[]
) {
  return useMemo(() => {
    if (!data?.data?.traders || data.data.traders.length === 0) {
      return { curves: [], scaleRange: null };
    }

    const traders = data.data.traders;

    // Debug: log when processing data with latest balances
    if (latestBalances && latestBalances.length > 0) {
      console.log("[useChartData] Processing with latest balances:", latestBalances);
    }

    // First pass: collect all trader data and find global time range
    const traderDataList: Array<{
      trader: any;
      index: number;
      timestamps: string[];
      pnlValues: number[];
    }> = [];

    let globalMinTime = Infinity;
    let globalMaxTime = -Infinity;

    traders.forEach((trader: any, index: number) => {
      const sortedRecords = [...trader.records].sort(
        (a: any, b: any) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      if (sortedRecords.length === 0) return;

      const timestamps: string[] = [];
      const balanceValues: number[] = [];

      sortedRecords.forEach((record: any) => {
        timestamps.push(record.timestamp);
        balanceValues.push(record.accountBalance ?? 0);
      });

      // Update global time range
      timestamps.forEach((ts) => {
        const time = new Date(ts).getTime();
        if (time < globalMinTime) globalMinTime = time;
        if (time > globalMaxTime) globalMaxTime = time;
      });

      traderDataList.push({
        trader,
        index,
        timestamps,
        pnlValues: balanceValues,
      });
    });

    // Check if we have accumulated balance data and update global time range
    if (latestBalances && latestBalances.length > 0) {
      const oldMaxTime = globalMaxTime;
      // Check all accumulated balances to find the absolute latest timestamp
      latestBalances.forEach((lb) => {
        const latestTime = new Date(lb.timestamp).getTime();
        if (latestTime > globalMaxTime) {
          globalMaxTime = latestTime;
        }
      });
      if (globalMaxTime > oldMaxTime) {
        console.log(
          `[useChartData] Extended time range from ${new Date(oldMaxTime).toISOString()} to ${new Date(globalMaxTime).toISOString()}`
        );
      }
    }

    // Second pass: align all traders to global time range (including latest balance data)
    const curves: TraderCurve[] = [];
    // Initialize balance range - always include initial account balance as baseline
    let minBalance = Infinity;
    let maxBalance = -Infinity;

    traderDataList.forEach(({ trader, index, timestamps, pnlValues }) => {
      const alignedTimestamps: string[] = [];
      const alignedPnlValues: number[] = [];

      const firstTime = new Date(timestamps[0]).getTime();
      const lastTime = new Date(timestamps[timestamps.length - 1]).getTime();

      // Pad beginning if needed
      if (firstTime > globalMinTime) {
        alignedTimestamps.push(new Date(globalMinTime).toISOString());
        alignedPnlValues.push(pnlValues[0]); // Use first balance value for padding
      }

      // Add original data
      alignedTimestamps.push(...timestamps);
      alignedPnlValues.push(...pnlValues);

      // Find all accumulated balance updates for this trader
      const traderLatestBalances = latestBalances?.filter(
        (lb) => lb.traderId === trader.traderId
      );

      // If we have accumulated balance data for this trader
      if (traderLatestBalances && traderLatestBalances.length > 0) {
        // Sort by timestamp to ensure chronological order
        const sortedLatestBalances = [...traderLatestBalances].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        // Get the current last timestamp in aligned data (after adding original data)
        let currentLastTime = new Date(
          alignedTimestamps[alignedTimestamps.length - 1]
        ).getTime();

        // Append each new balance that is newer than the current last data point
        for (const balance of sortedLatestBalances) {
          const balanceTime = new Date(balance.timestamp).getTime();

          if (balanceTime > currentLastTime) {
            console.log(
              `[useChartData] Appending balance for ${trader.traderId}:`,
              balance.accountBalance,
              "at",
              balance.timestamp
            );
            alignedTimestamps.push(balance.timestamp);
            alignedPnlValues.push(balance.accountBalance);
            currentLastTime = balanceTime; // Update for next iteration
          }
        }
      } else {
        // No latest balance for this trader, pad to global max time
        if (lastTime < globalMaxTime) {
          alignedTimestamps.push(new Date(globalMaxTime).toISOString());
          alignedPnlValues.push(pnlValues[pnlValues.length - 1]); // Keep last balance value
        }
      }

      // Update balance range - only consider selected trader if specified
      if (!selectedTraderId || trader.traderId === selectedTraderId) {
        alignedPnlValues.forEach((balance) => {
          if (balance < minBalance) minBalance = balance;
          if (balance > maxBalance) maxBalance = balance;
        });
      }

      curves.push({
        traderId: trader.traderId,
        traderName: trader.traderName,
        traderIndex: index + 1, // 1-based index
        color: getTraderColor(
          trader.traderId,
          traderDataList.map((td) => td.trader.traderId),
          trader.traderName,
          trader.description || trader.desc || null
        ),
        points: [], // Will be calculated after scale is determined
        timestamps: alignedTimestamps,
        pnlValues: alignedPnlValues,
        description: trader.description || trader.desc || null,
      });
    });

    // Ensure initial account balance is always included in the range
    minBalance = Math.min(minBalance, initialAccountBalance);
    maxBalance = Math.max(maxBalance, initialAccountBalance);

    // Calculate range centered around initial account balance
    const maxDeviation = Math.max(
      Math.abs(maxBalance - initialAccountBalance),
      Math.abs(initialAccountBalance - minBalance)
    );

    // Add padding to the max deviation
    const paddedDeviation = maxDeviation * 1.15;

    // Set symmetric range around initial balance
    minBalance = initialAccountBalance - paddedDeviation;
    maxBalance = initialAccountBalance + paddedDeviation;

    const scaleRange: ScaleRange = {
      minX: globalMinTime,
      maxX: globalMaxTime,
      minY: minBalance,
      maxY: maxBalance,
    };

    return { curves, scaleRange };
  }, [data, selectedTraderId, initialAccountBalance, latestBalances]);
}
