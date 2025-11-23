import { type FC, useState, useEffect, useRef } from "react";
import { useTraderPnl } from "~/features/traders/hooks/use-trader-pnl";
import type { CompetitorChartProps, DisplayMode } from "./types";
import { DEFAULT_CHART_PADDING } from "./constants";
import { useChartData } from "./hooks/useChartData";
import { useConfig } from "./hooks/useConfig";
import {
  useLatestBalance,
  type LatestBalanceData,
} from "./hooks/useLatestBalance";
import { TraderPnLChart } from "./components/TraderPnLChart";
import { DisplayModeToggle } from "./components/DisplayModeToggle";
import { transformCurvesByMode } from "./utils/transformations";
import { useMobile } from "~/hooks/useMobile";
import { EmptyState } from "~/components/ui/empty-state";
import { EmptyChart } from "~/svg/empty-chart";

/**
 * Main competitor chart container component
 */
const CompetitorChart: FC<CompetitorChartProps> = ({ className = "" }) => {
  const { data, isLoading, error } = useTraderPnl();
  const { data: config, isLoading: isConfigLoading } = useConfig();
  const [hoveredTraderId, setHoveredTraderId] = useState<string | null>(null);
  const [selectedTraderId, setSelectedTraderId] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>("balance");
  const [padding, setPadding] = useState(DEFAULT_CHART_PADDING);
  const isLess600Device = useMobile(600);

  // Accumulated balance history - stores all polled balance updates
  const [accumulatedBalances, setAccumulatedBalances] = useState<
    LatestBalanceData[]
  >([]);
  const lastSeenTimestamps = useRef<Map<string, string>>(new Map());

  // Set up polling for latest balances (5 second interval)
  const latestBalanceQuery = useLatestBalance({
    pollingInterval: 1000 * 60 * 10, // Poll every 5 seconds
    enabled: true,
  });

  // Start polling after initial data is loaded
  useEffect(() => {
    if (
      !isLoading &&
      !isConfigLoading &&
      data?.data?.traders &&
      !latestBalanceQuery.isPollingEnabled
    ) {
      console.log("[CompetitorChart] Starting balance polling...");
      latestBalanceQuery.startPolling();
    }
  }, [isLoading, isConfigLoading, data?.data?.traders, latestBalanceQuery]);

  // Accumulate balance updates when new data arrives
  useEffect(() => {
    if (latestBalanceQuery.data?.data?.traders) {
      const newBalances = latestBalanceQuery.data.data.traders;

      console.log("[CompetitorChart] Latest balance updated:", newBalances);

      // Filter out balances that we've already seen (same timestamp)
      const trulyNewBalances = newBalances.filter((balance) => {
        const lastSeen = lastSeenTimestamps.current.get(balance.traderId);
        const isNew = !lastSeen || balance.timestamp !== lastSeen;

        if (isNew) {
          lastSeenTimestamps.current.set(balance.traderId, balance.timestamp);
          console.log(
            `[CompetitorChart] Accumulating new balance for ${balance.traderId}:`,
            balance.accountBalance,
            "at",
            balance.timestamp
          );
        }

        return isNew;
      });

      // Accumulate new balances
      if (trulyNewBalances.length > 0) {
        setAccumulatedBalances((prev) => [...prev, ...trulyNewBalances]);
      }
    }
  }, [latestBalanceQuery.data]);

  // Pass selectedTraderId, initialAccountBalance, and accumulated balances to useChartData
  const { curves, scaleRange } = useChartData(
    data,
    selectedTraderId,
    config?.initialAccountBalance,
    accumulatedBalances.length > 0 ? accumulatedBalances : undefined
  );

  // Transform curves based on display mode
  const transformedCurves = transformCurvesByMode(
    curves,
    displayMode,
    config?.initialAccountBalance ?? 10000
  );

  const selectedTrader = selectedTraderId
    ? transformedCurves.find((c) => c.traderId === selectedTraderId)
    : null;

  if (isLoading || isConfigLoading) {
    return (
      <div className={`w-full h-full relative ${className}`}>
        {/* Display mode toggle skeleton */}
        <div className="absolute top-0 left-0 z-10">
          <div className="mt-1 inline-flex bg-muted border-2 border-border animate-pulse">
            <div className="w-6 h-6 bg-muted-foreground/20"></div>
            <div className="w-6 h-6 bg-muted-foreground/20"></div>
          </div>
        </div>

        {/* Header skeleton */}
        <div className="z-10 absolute top-0 left-1/2 mt-1 -translate-x-1/2">
          <div className="h-5 w-48 bg-muted rounded animate-pulse"></div>
        </div>

        {/* Chart area skeleton */}
        <div className="w-full h-full flex items-center justify-center bg-background">
          <div className="w-[90%] h-[80%] relative">
            {/* Y-axis skeleton */}
            <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between py-4">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-4 w-20 bg-muted rounded animate-pulse"
                  style={{ animationDelay: `${i * 0.1}s` }}
                ></div>
              ))}
            </div>

            {/* X-axis skeleton */}
            <div className="absolute bottom-0 left-12 right-0 h-12 flex items-center justify-between px-4">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-4 w-16 bg-muted rounded animate-pulse"
                  style={{ animationDelay: `${i * 0.1}s` }}
                ></div>
              ))}
            </div>

            {/* Grid lines skeleton */}
            <svg
              className="absolute inset-0 w-full h-full"
              style={{ left: "3rem", top: 0, bottom: "3rem" }}
            >
              {[...Array(5)].map((_, i) => (
                <line
                  key={`h-${i}`}
                  x1="0"
                  y1={`${(i / 4) * 100}%`}
                  x2="100%"
                  y2={`${(i / 4) * 100}%`}
                  stroke="var(--border)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  className="opacity-30"
                />
              ))}
              {[...Array(6)].map((_, i) => (
                <line
                  key={`v-${i}`}
                  x1={`${(i / 5) * 100}%`}
                  y1="0"
                  x2={`${(i / 5) * 100}%`}
                  y2="100%"
                  stroke="var(--border)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  className="opacity-30"
                />
              ))}
            </svg>

            {/* Curves skeleton */}
            <svg
              className="absolute inset-0 w-full h-full"
              style={{ left: "3rem", top: 0, bottom: "3rem" }}
            >
              {[...Array(3)].map((_, i) => {
                const points = [...Array(20)]
                  .map((_, j) => {
                    const x = (j / 19) * 100;
                    const y = 50 + Math.sin(j * 0.3 + i) * 30;
                    return `${x},${y}`;
                  })
                  .join(" ");
                return (
                  <polyline
                    key={i}
                    points={points}
                    fill="none"
                    stroke="var(--muted-foreground)"
                    strokeWidth="2"
                    className="animate-pulse opacity-50"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  />
                );
              })}
            </svg>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="text-destructive">Error loading data: {error.message}</div>
      </div>
    );
  }

  if (!scaleRange || curves.length === 0) {
    return (
      <EmptyState
        icon={<EmptyChart className="text-primary/50" />}
        title="No Trading Data"
        description="No trader data available to display"
        className={className}
      />
    );
  }

  return (
    <div className={`w-full h-full relative ${className}`}>
      {/* Display mode toggle - positioned in top-left, aligned with chart padding */}
      <div className="absolute top-0 left-0 z-10">
        <DisplayModeToggle
          displayMode={displayMode}
          onModeChange={setDisplayMode}
          paddingLeft={padding.left}
        />
      </div>

      <div className="z-10 absolute top-0 left-1/2 mt-1 -translate-x-1/2 font-bold px-2 py-1">
        {!isLess600Device ? (
          <>
            {selectedTrader && (
              <button
                onClick={() => setSelectedTraderId(null)}
                className="absolute -left-4 top-1/2 -translate-x-full -translate-y-1/2 cursor-pointer rounded-[2px] bg-primary text-primary-foreground hover:bg-primary/90 px-2 py-1 text-xs font-light transition-colors"
              >
                BACK TO ALL
              </button>
            )}
            <span className="text-sm text-foreground/80 tracking-widest">TOTAL ACCOUNT VALUE</span>
          </>
        ) : (
          <>
            {selectedTrader ? (
              <button
                className="cursor-pointer rounded-[2px] bg-primary text-primary-foreground hover:bg-primary/90 px-2 py-1 text-xs font-light transition-colors"
                onClick={() => setSelectedTraderId(null)}
              >
                BACK TO ALL
              </button>
            ) : (
              <span className="text-xs text-foreground/80 tracking-widest">TOTAL ACCOUNT VALUE</span>
            )}
          </>
        )}
      </div>

      {/* Chart */}
      <TraderPnLChart
        curves={transformedCurves}
        scaleRange={scaleRange}
        initialPadding={DEFAULT_CHART_PADDING}
        hoveredTraderId={hoveredTraderId}
        onHoverChange={setHoveredTraderId}
        selectedTraderId={selectedTraderId}
        onSelectChange={setSelectedTraderId}
        initialAccountBalance={config?.initialAccountBalance}
        displayMode={displayMode}
        onPaddingChange={setPadding}
      />
    </div>
  );
};

export default CompetitorChart;
