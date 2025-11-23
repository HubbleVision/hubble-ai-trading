import type { TraderCurve, DisplayMode } from "../types";

/**
 * Transform curves based on display mode
 * - Balance mode: pnlValues remain as account balance
 * - Percentage mode: convert balance to percentage change from initial balance
 */
export function transformCurvesByMode(
  curves: TraderCurve[],
  displayMode: DisplayMode,
  initialAccountBalance: number
): TraderCurve[] {
  if (displayMode === "balance") {
    // No transformation needed for balance mode
    return curves;
  }

  // Percentage mode: transform balance to percentage change
  return curves.map((curve) => ({
    ...curve,
    pnlValues: curve.pnlValues.map((balance) => {
      // Calculate percentage change: ((current - initial) / initial) * 100
      const percentageChange =
        ((balance - initialAccountBalance) / initialAccountBalance) * 100;
      return percentageChange;
    }),
  }));
}

/**
 * Format large numbers with k (thousand) or M (million) abbreviations
 */
function formatLargeNumber(value: number, decimals: number = 0): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (absValue >= 1_000_000) {
    const millions = absValue / 1_000_000;
    return `${sign}${millions.toFixed(decimals)}M`;
  }
  if (absValue >= 1_000) {
    const thousands = absValue / 1_000;
    return `${sign}${thousands.toFixed(decimals)}k`;
  }
  return `${sign}${absValue.toFixed(decimals)}`;
}

/**
 * Format Y-axis label based on display mode
 * - Balance mode: format as integer with k/M abbreviations (e.g., "10k", "1.5M")
 * - Percentage mode: format with percentage sign, using k/M for large values (e.g., "+5.23%", "+1.2k%")
 */
export function formatYAxisLabel(
  value: number,
  displayMode: DisplayMode
): string {
  if (displayMode === "balance") {
    return formatLargeNumber(value, 0);
  }

  // Percentage mode
  const absValue = Math.abs(value);
  if (absValue >= 1_000) {
    // For very large percentages, use k/M format
    const formatted = formatLargeNumber(value, 2);
    return `${formatted}%`;
  }
  const formatted = value.toFixed(2);
  return `${formatted}%`;
}

/**
 * Calculate scale range for Y-axis based on display mode
 * This adjusts the min/max values appropriately for the chosen mode
 */
export function calculateScaleRangeByMode(
  minValue: number,
  maxValue: number,
  displayMode: DisplayMode,
  initialAccountBalance: number
): { minY: number; maxY: number } {
  if (displayMode === "balance") {
    return { minY: minValue, maxY: maxValue };
  }

  // Percentage mode: convert balance range to percentage range
  const minPercentage =
    ((minValue - initialAccountBalance) / initialAccountBalance) * 100;
  const maxPercentage =
    ((maxValue - initialAccountBalance) / initialAccountBalance) * 100;

  return { minY: minPercentage, maxY: maxPercentage };
}

/**
 * Format tooltip value based on display mode
 * - Balance mode: "10523.50"
 * - Percentage mode: "+5.24%"
 */
export function formatTooltipValue(
  value: number,
  displayMode: DisplayMode
): string {
  if (displayMode === "balance") {
    return (value || 0).toFixed(2);
  }

  // Percentage mode
  const formatted = (value || 0).toFixed(2);
  const sign = value >= 0 ? "+" : "";
  return `${sign}${formatted}%`;
}
