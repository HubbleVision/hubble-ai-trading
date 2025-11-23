import type { FC } from "react";
import type { ChartDimensions, TraderCurve, ScaleRange, DisplayMode } from "../types";
import { formatTimestamp } from "../utils/calculations";
import { formatTooltipValue } from "../utils/transformations";

interface CrosshairData {
  traderId: string;
  traderName: string;
  color: string;
  pnl: number;
}

/**
 * Crosshair component that shows a vertical line and tooltip on hover
 */
export const Crosshair: FC<{
  mouseX: number;
  dimensions: ChartDimensions;
  curves: TraderCurve[];
  scaleRange: ScaleRange;
  scaleY: (pnl: number) => number;
  displayMode: DisplayMode;
}> = ({ mouseX, dimensions, curves, scaleRange, scaleY, displayMode }) => {
  const { padding, height, chartWidth, chartHeight, width } = dimensions;

  // Calculate the data point index at mouseX position (index-based distribution)
  const calculateIndexAtX = (x: number, numDataPoints: number): number => {
    if (numDataPoints === 0) return 0;
    if (numDataPoints === 1) return 0;

    const ratio = chartWidth === 0 ? 0 : x / chartWidth;
    const index = Math.round(ratio * (numDataPoints - 1));
    return Math.max(0, Math.min(index, numDataPoints - 1));
  };

  // Find nearest actual data point within threshold for a curve (index-based)
  const findNearestDataPoint = (
    curve: TraderCurve,
    targetIndex: number,
    pixelThreshold: number
  ): { pnl: number; timestamp: string; index: number } | null => {
    if (curve.timestamps.length === 0) return null;

    // Calculate the x position of the target index
    const targetX =
      curve.timestamps.length > 1
        ? (targetIndex / (curve.timestamps.length - 1)) * chartWidth
        : chartWidth / 2;

    // Calculate distance in pixels
    const distance = Math.abs(mouseX - targetX);

    // Check if within threshold
    if (distance <= pixelThreshold) {
      return {
        pnl: curve.pnlValues[targetIndex],
        timestamp: curve.timestamps[targetIndex],
        index: targetIndex,
      };
    }

    return null;
  };

  const numDataPoints = curves.length > 0 ? curves[0].timestamps.length : 0;
  const targetIndex = calculateIndexAtX(mouseX, numDataPoints);

  // Use 15 pixels as the maximum distance to show tooltip
  const pixelThreshold = 15;

  // Calculate data for all curves at this index, only if near actual data points
  const crosshairData: CrosshairData[] = [];
  let nearestTimestamp: string | null = null;
  let snapIndex = -1;

  for (const curve of curves) {
    const dataPoint = findNearestDataPoint(curve, targetIndex, pixelThreshold);
    if (dataPoint) {
      crosshairData.push({
        traderId: curve.traderId,
        traderName: curve.traderName,
        color: curve.color,
        pnl: dataPoint.pnl,
      });
      // Use the first found timestamp as the display timestamp
      if (!nearestTimestamp) {
        nearestTimestamp = dataPoint.timestamp;
        snapIndex = dataPoint.index;
      }
    }
  }

  // If no data points are near the cursor, don't render crosshair
  if (crosshairData.length === 0) {
    return null;
  }

  const timestamp = nearestTimestamp || "";

  // Sort by PnL descending for better readability
  crosshairData.sort((a, b) => b.pnl - a.pnl);

  // Calculate the X position for the crosshair line based on the data point index
  const snapToX =
    numDataPoints > 1
      ? (snapIndex / (numDataPoints - 1)) * chartWidth
      : chartWidth / 2;
  const absoluteSnapToX = snapToX + padding.left;

  // Calculate tooltip dimensions
  const tooltipWidth = 200;
  const tooltipPadding = 12;
  const lineHeight = 24;
  const headerHeight = 32;
  const tooltipHeight =
    headerHeight + crosshairData.length * lineHeight + tooltipPadding * 2;

  // Position tooltip to the right or left of the line depending on space
  const tooltipXCandidate =
    absoluteSnapToX + tooltipWidth + 20 > width - padding.right
      ? absoluteSnapToX - tooltipWidth - 20
      : absoluteSnapToX + 20;
  const tooltipMinX = padding.left;
  const tooltipMaxX = width - padding.right - tooltipWidth;
  const tooltipX = Math.min(
    Math.max(tooltipXCandidate, tooltipMinX),
    tooltipMaxX
  );

  // Center tooltip vertically, but keep it within bounds
  let tooltipY = (height - tooltipHeight) / 2;
  if (tooltipY < padding.top) tooltipY = padding.top;
  if (tooltipY + tooltipHeight > height - padding.bottom) {
    tooltipY = height - padding.bottom - tooltipHeight;
  }

  return (
    <g className="crosshair">
      {/* Vertical line */}
      <line
        x1={absoluteSnapToX}
        y1={padding.top}
        x2={absoluteSnapToX}
        y2={padding.top + chartHeight}
        stroke="#94a3b8"
        strokeWidth="1.5"
        strokeDasharray="4 4"
        opacity="0.8"
      />

      {/* Intersection dots on each curve */}
      {/* {crosshairData.map((data) => {
        const y = padding.top + scaleY(data.pnl);
        return (
          <circle
            className="pointer-events-none"
            key={data.traderId}
            cx={absoluteSnapToX}
            cy={y}
            r="4"
            fill={data.color}
            stroke="white"
            strokeWidth="2"
          />
        );
      })} */}

      {/* Tooltip background */}
      <rect
        x={tooltipX}
        y={tooltipY}
        width={tooltipWidth}
        height={tooltipHeight}
        fill="white"
        stroke="#e5e7eb"
        strokeWidth="1"
        rx="6"
        filter="drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))"
      />

      {/* Tooltip content */}
      <g>
        {/* Timestamp header */}
        <text
          x={tooltipX + tooltipPadding}
          y={tooltipY + tooltipPadding + 14}
          className="text-xs fill-gray-500"
          style={{ fontSize: 11, fontWeight: 600 }}
        >
          {formatTimestamp(timestamp).replace("\n", " ")}
        </text>

        {/* Trader PnL values */}
        {crosshairData.map((data, i) => {
          const yPos =
            tooltipY + headerHeight + i * lineHeight + tooltipPadding;
          const pnlText = formatTooltipValue(data.pnl, displayMode);

          return (
            <g key={data.traderId}>
              {/* Color indicator */}
              <circle
                cx={tooltipX + tooltipPadding + 4}
                cy={yPos + 4}
                r="4"
                fill={data.color}
              />

              {/* Trader name */}
              <text
                x={tooltipX + tooltipPadding + 14}
                y={yPos + 8}
                className="text-xs fill-gray-700"
                style={{ fontSize: 11, fontWeight: 500 }}
              >
                {data.traderName}
              </text>

              {/* PnL value */}
              <text
                x={tooltipX + tooltipWidth - tooltipPadding}
                y={yPos + 8}
                textAnchor="end"
                className="text-xs"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  fill: data.pnl >= 0 ? "#16a34a" : "#dc2626",
                }}
              >
                {pnlText}
              </text>
            </g>
          );
        })}
      </g>
    </g>
  );
};
