import type { ChartDimensions, ScaleRange, TraderCurve, DisplayMode } from "../types";

type YAxisTickOptions = {
  desiredSpacingPx?: number;
  minTicks?: number;
  maxTicks?: number;
  displayMode?: DisplayMode;
};

/**
 * Calculate Y-axis ticks based on curve data distribution
 * This function analyzes the actual data values and creates appropriate tick marks
 * that adapt when filtering to a single trader
 */
export function calculateYAxisTicksFromCurves(
  curves: TraderCurve[],
  chartHeight: number,
  initialAccountBalance?: number,
  options: YAxisTickOptions = {}
): { ticks: number[]; minY: number; maxY: number } {
  const { desiredSpacingPx = 80, minTicks = 3, maxTicks = 10, displayMode = "balance" } = options;

  if (curves.length === 0 || chartHeight <= 0) {
    const defaultMin = initialAccountBalance ? initialAccountBalance * 0.9 : 0;
    const defaultMax = initialAccountBalance
      ? initialAccountBalance * 1.1
      : 100;
    return {
      ticks: [defaultMin, initialAccountBalance || 50, defaultMax],
      minY: defaultMin,
      maxY: defaultMax,
    };
  }

  // Collect all PnL values from displayed curves
  const allValues: number[] = [];
  curves.forEach((curve) => {
    allValues.push(...curve.pnlValues);
  });

  // For percentage mode, always include 0 as reference point
  // For balance mode, include initial account balance
  if (displayMode === "percentage") {
    allValues.push(0);
  } else if (initialAccountBalance !== undefined) {
    allValues.push(initialAccountBalance);
  }

  const dataMin = Math.min(...allValues);
  const dataMax = Math.max(...allValues);
  const dataRange = dataMax - dataMin;

  // Special case: when trader count is small (1-2) and data range is small, use simple integer ticks
  if (curves.length <= 2 && dataRange <= 5) {
    const baseline = displayMode === "percentage" ? 0 : (initialAccountBalance ?? 0);
    
    // Calculate simple integer ticks around baseline
    // Ensure at least covering data range, extending 1-2 units above and below
    const maxDeviation = Math.max(
      Math.abs(dataMax - baseline),
      Math.abs(baseline - dataMin),
      1 // Show at least 1 unit of change
    );
    
    // Round up to nearest integer, then add 1 to ensure enough visual space
    const halfRange = Math.ceil(maxDeviation) + 1;
    
    let minY = baseline - halfRange;
    let maxY = baseline + halfRange;
    
    // For balance mode, ensure minY is not negative
    if (displayMode === "balance") {
      minY = Math.max(minY, 0);
    }
    
    // For percentage mode, ensure minY is not less than -100
    if (displayMode === "percentage") {
      minY = Math.max(minY, -100);
    }
    
    // Generate simple integer ticks with step size of 1
    const ticks: number[] = [];
    const startTick = Math.ceil(minY);
    const endTick = Math.floor(maxY);
    
    for (let tick = startTick; tick <= endTick; tick++) {
      ticks.push(tick);
    }
    
    // Ensure baseline is included
    if (baseline >= minY && baseline <= maxY && !ticks.includes(baseline)) {
      ticks.push(baseline);
      ticks.sort((a, b) => a - b);
    }
    
    // If too few ticks, ensure at least 3
    if (ticks.length < 3) {
      const midY = Math.round((minY + maxY) / 2);
      ticks.length = 0;
      ticks.push(Math.floor(minY), midY, Math.ceil(maxY));
      // Deduplicate and sort
      const uniqueTicks = Array.from(new Set(ticks)).sort((a, b) => a - b);
      return {
        ticks: uniqueTicks,
        minY: Math.min(...uniqueTicks),
        maxY: Math.max(...uniqueTicks),
      };
    }
    
    return {
      ticks,
      minY,
      maxY,
    };
  }

  // Y-axis range padding depends on display mode:
  // - Balance mode: max 300 units beyond data range
  // - Percentage mode: max 30% beyond data range
  const MAX_PADDING = displayMode === "percentage" ? 30 : 300;

  // Calculate range with padding
  const padding = Math.min(Math.max(dataRange * 0.1, 1), MAX_PADDING);

  let minY = dataMin - padding;
  let maxY = dataMax + padding;

  // Center the range around the baseline (0 for percentage, initialAccountBalance for balance)
  const baseline = displayMode === "percentage" ? 0 : (initialAccountBalance ?? 0);

  if (displayMode === "percentage" || initialAccountBalance !== undefined) {
    const deviationFromBase = Math.max(
      Math.abs(dataMax - baseline),
      Math.abs(baseline - dataMin)
    );
    const paddedDeviation = Math.min(deviationFromBase * 1.15, deviationFromBase + MAX_PADDING);

    minY = baseline - paddedDeviation;
    maxY = baseline + paddedDeviation;
  }

  // Constrain Y-axis range to not exceed MAX_PADDING beyond actual data
  minY = Math.max(minY, dataMin - MAX_PADDING);
  maxY = Math.min(maxY, dataMax + MAX_PADDING);

  // For percentage mode, minimum is -100% (can't lose more than 100%)
  // Maximum is uncapped, based on actual data
  if (displayMode === "percentage") {
    minY = Math.max(minY, -100);
  }

  // For balance mode, ensure minY is not negative (account balance cannot be negative)
  if (displayMode === "balance") {
    minY = Math.max(minY, 0);
  }

  const range = maxY - minY;

  if (Math.abs(range) < Number.EPSILON) {
    const offset = Math.max(Math.abs(minY) * 0.05, 1);
    return {
      ticks: [minY - offset, minY, minY + offset],
      minY: minY - offset,
      maxY: minY + offset,
    };
  }

  // Calculate optimal number of ticks based on chart height
  const ticksByHeight = Math.floor(chartHeight / desiredSpacingPx) + 1;
  const targetTicks = Math.max(
    minTicks,
    Math.min(
      Number.isFinite(ticksByHeight) ? ticksByHeight : minTicks,
      maxTicks
    )
  );

  const roughStep = range / Math.max(targetTicks - 1, 1);

  // Find a "nice" step size
  const magnitude = Math.pow(10, Math.floor(Math.log10(Math.abs(roughStep))));
  const normalized = Math.abs(roughStep) / magnitude;

  let niceStep: number;
  if (normalized <= 1) {
    niceStep = magnitude;
  } else if (normalized <= 2) {
    niceStep = 2 * magnitude;
  } else if (normalized <= 5) {
    niceStep = 5 * magnitude;
  } else {
    niceStep = 10 * magnitude;
  }

  // Generate ticks starting from a nice round number
  const firstTick = Math.ceil(minY / niceStep) * niceStep;
  const lastTick = Math.floor(maxY / niceStep) * niceStep;

  const ticks: number[] = [];

  // Always include baseline if it falls within range
  const shouldIncludeBaseline = baseline >= minY && baseline <= maxY;

  for (
    let value = firstTick;
    value <= lastTick + niceStep * 0.5;
    value += niceStep
  ) {
    const rounded = parseFloat(value.toFixed(10));
    ticks.push(rounded);
  }

  // Add baseline as a tick if it's not too close to existing ticks
  if (shouldIncludeBaseline) {
    const hasCloseTickToBaseline = ticks.some(
      (tick) => Math.abs(tick - baseline) < niceStep * 0.3
    );

    if (!hasCloseTickToBaseline) {
      ticks.push(baseline);
      ticks.sort((a, b) => a - b);
    }
  }

  if (ticks.length < 2) {
    const midY = (minY + maxY) / 2;

    return {
      ticks: [minY, midY, maxY],
      minY,
      maxY,
    };
  }

  return { ticks, minY, maxY };
}

/**
 * Calculate nice Y-axis tick values with round numbers that respond to
 * available pixel height. The returned ticks extend to "nice" boundaries so
 * the grid stays stable while the container resizes.
 *
 * @deprecated Use calculateYAxisTicksFromCurves for better distribution based on actual data
 */
export function calculateYAxisTicks(
  minY: number,
  maxY: number,
  chartHeight: number,
  options: YAxisTickOptions = {}
): number[] {
  const { desiredSpacingPx = 80, minTicks = 3, maxTicks = 10 } = options;

  const range = maxY - minY;

  if (!Number.isFinite(range) || chartHeight <= 0) {
    return [minY, maxY];
  }

  if (Math.abs(range) < Number.EPSILON) {
    const offset = Math.max(Math.abs(minY) * 0.05, 1);
    return [minY - offset, minY, minY + offset];
  }

  const ticksByHeight = Math.floor(chartHeight / desiredSpacingPx) + 1;
  const targetTicks = Math.max(
    minTicks,
    Math.min(
      Number.isFinite(ticksByHeight) ? ticksByHeight : minTicks,
      maxTicks
    )
  );

  const roughStep = range / Math.max(targetTicks - 1, 1);

  const magnitude = Math.pow(10, Math.floor(Math.log10(Math.abs(roughStep))));
  const normalized = Math.abs(roughStep) / magnitude;

  let niceStep: number;
  if (normalized <= 1) {
    niceStep = magnitude;
  } else if (normalized <= 2) {
    niceStep = 2 * magnitude;
  } else if (normalized <= 5) {
    niceStep = 5 * magnitude;
  } else {
    niceStep = 10 * magnitude;
  }

  const firstTick = Math.ceil(minY / niceStep) * niceStep;
  const lastTick = Math.floor(maxY / niceStep) * niceStep;

  if (firstTick > lastTick) {
    const midY = (minY + maxY) / 2;
    return [minY, midY, maxY];
  }

  const ticks: number[] = [];
  for (
    let value = firstTick;
    value <= lastTick + niceStep * 0.5;
    value += niceStep
  ) {
    const rounded = parseFloat(value.toFixed(10));
    ticks.push(rounded);
  }

  if (ticks.length < 2) {
    const midY = (minY + maxY) / 2;
    return [minY, midY, maxY];
  }

  return ticks;
}

/**
 * Format timestamp for X-axis labels
 */
export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const month = date.toLocaleString("en-US", { month: "short" });
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${month} ${day}\n${hours}:${minutes}`;
}

/**
 * Calculate maximum PnL rect width across all traders
 */
export function calculateMaxPnlRectWidth(
  pnlValues: number[],
  minWidth: number = 70
): number {
  const finalPnl = pnlValues[pnlValues.length - 1];
  const finalPnlStr =
    finalPnl >= 0 ? `+${finalPnl.toFixed(0)}` : finalPnl.toFixed(0);
  return Math.max(finalPnlStr.length * 10 + 20, minWidth);
}

/**
 * Create scale functions for X and Y axes
 */
export function createScaleFunctions(
  dimensions: ChartDimensions,
  scaleRange: { minX: number; maxX: number; minY: number; maxY: number }
) {
  const { chartWidth, chartHeight } = dimensions;

  const scaleX = (timestamp: string): number => {
    const time = new Date(timestamp).getTime();
    const range = scaleRange.maxX - scaleRange.minX;
    if (range === 0) return 0;
    return ((time - scaleRange.minX) / range) * chartWidth;
  };

  const scaleY = (pnl: number): number => {
    const range = scaleRange.maxY - scaleRange.minY;
    if (range === 0) return chartHeight / 2;
    return chartHeight - ((pnl - scaleRange.minY) / range) * chartHeight;
  };

  return { scaleX, scaleY };
}

type XAxisTickOptions = {
  desiredSpacingPx?: number;
  minTicks?: number;
  maxTicks?: number;
};

/**
 * Calculate X-axis tick timestamps based on available width.
 * Ensures a consistent on-screen density as the container resizes.
 * IMPORTANT: Always ensures the last tick is at maxX (latest balance timestamp).
 */
export function calculateXAxisTicks(
  scaleRange: ScaleRange,
  dimensions: ChartDimensions,
  options: XAxisTickOptions = {}
): string[] {
  const { desiredSpacingPx = 120, minTicks = 3, maxTicks = 12 } = options;
  const { chartWidth } = dimensions;

  const timeRange = scaleRange.maxX - scaleRange.minX;

  if (!Number.isFinite(timeRange) || timeRange <= 0 || chartWidth <= 0) {
    return [new Date(scaleRange.minX).toISOString()];
  }

  const approximateTickCount = Math.max(
    minTicks,
    Math.min(Math.floor(chartWidth / desiredSpacingPx) + 1, maxTicks)
  );

  const intervals = [
    60_000,
    5 * 60_000,
    15 * 60_000,
    30 * 60_000,
    60 * 60_000,
    3 * 60 * 60_000,
    6 * 60 * 60_000,
    12 * 60 * 60_000,
    24 * 60 * 60_000,
    2 * 24 * 60 * 60_000,
    3 * 24 * 60 * 60_000,
    7 * 24 * 60 * 60_000,
    14 * 24 * 60 * 60_000,
    30 * 24 * 60 * 60_000,
    90 * 24 * 60 * 60_000,
    180 * 24 * 60 * 60_000,
    365 * 24 * 60 * 60_000,
  ];

  const targetInterval = intervals.reduce((best, candidate) => {
    const candidateTicks = timeRange / candidate;
    const bestTicks = timeRange / best;
    const candidateDiff = Math.abs(candidateTicks - approximateTickCount);
    const bestDiff = Math.abs(bestTicks - approximateTickCount);
    if (candidateDiff < bestDiff) {
      return candidate;
    }
    return best;
  });

  const interval = targetInterval;

  const firstTick = Math.ceil(scaleRange.minX / interval) * interval;
  const lastTick = Math.floor(scaleRange.maxX / interval) * interval;

  const ticks: string[] = [];
  for (
    let value = firstTick;
    value <= lastTick + interval * 0.5;
    value += interval
  ) {
    ticks.push(new Date(value).toISOString());
  }

  // Always ensure the last tick is at maxX (latest balance timestamp)
  const maxXTimestamp = new Date(scaleRange.maxX).toISOString();
  const lastGeneratedTick = ticks[ticks.length - 1];

  if (lastGeneratedTick !== maxXTimestamp) {
    // Check if the last generated tick is too close to maxX
    const lastGeneratedTime = new Date(lastGeneratedTick).getTime();
    const timeDiffFromMax = scaleRange.maxX - lastGeneratedTime;

    // If the last tick is within 30% of the interval from maxX, remove it
    // to avoid overcrowding
    if (timeDiffFromMax < interval * 0.3 && ticks.length > 2) {
      ticks.pop();
    }

    // Add maxX as the final tick
    ticks.push(maxXTimestamp);
  }

  if (ticks.length < 2) {
    return [
      new Date(scaleRange.minX).toISOString(),
      new Date(scaleRange.maxX).toISOString(),
    ];
  }

  return ticks;
}
