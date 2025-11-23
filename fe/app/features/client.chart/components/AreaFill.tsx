import type { FC } from "react";
import type { TraderCurve, DisplayMode } from "../types";

/**
 * Area fill component that fills the area between curve and baseline
 * Green for profit (above baseline), red for loss (below baseline)
 * Baseline: 0 for percentage mode, initialAccountBalance for balance mode
 */
export const AreaFill: FC<{
  curve: TraderCurve;
  scaleY: (value: number) => number;
  initialAccountBalance: number;
  displayMode: DisplayMode;
}> = ({ curve, scaleY, initialAccountBalance, displayMode }) => {
  // Calculate baseline value based on display mode
  const baselineValue = displayMode === "percentage" ? 0 : initialAccountBalance;

  // Calculate y coordinate for baseline
  const baselineY = scaleY(baselineValue);

  // Create arrays to hold segments
  const positiveSegments: Array<{ x: number; y: number }[]> = [];
  const negativeSegments: Array<{ x: number; y: number }[]> = [];

  let currentPositiveSegment: Array<{ x: number; y: number }> = [];
  let currentNegativeSegment: Array<{ x: number; y: number }> = [];

  // Process each point to separate positive and negative segments
  for (let i = 0; i < curve.points.length; i++) {
    const point = curve.points[i];
    const value = curve.pnlValues[i];

    if (value >= baselineValue) {
      // Profit: value above baseline
      if (currentNegativeSegment.length > 0) {
        // Switching from loss to profit - close negative segment
        // Add interpolated intersection point
        if (i > 0) {
          const prevPoint = curve.points[i - 1];
          const prevValue = curve.pnlValues[i - 1];
          const intersectionX =
            prevPoint.x +
            ((point.x - prevPoint.x) * Math.abs(baselineValue - prevValue)) /
              (Math.abs(baselineValue - prevValue) + Math.abs(value - baselineValue));
          currentNegativeSegment.push({ x: intersectionX, y: baselineY });
        }
        negativeSegments.push(currentNegativeSegment);
        currentNegativeSegment = [];
        // Start new positive segment from intersection
        if (i > 0) {
          const prevPoint = curve.points[i - 1];
          const prevValue = curve.pnlValues[i - 1];
          const intersectionX =
            prevPoint.x +
            ((point.x - prevPoint.x) * Math.abs(baselineValue - prevValue)) /
              (Math.abs(baselineValue - prevValue) + Math.abs(value - baselineValue));
          currentPositiveSegment.push({ x: intersectionX, y: baselineY });
        }
      }
      currentPositiveSegment.push(point);
    } else {
      // Loss: value below baseline
      if (currentPositiveSegment.length > 0) {
        // Switching from profit to loss - close positive segment
        // Add interpolated intersection point
        if (i > 0) {
          const prevPoint = curve.points[i - 1];
          const prevValue = curve.pnlValues[i - 1];
          const intersectionX =
            prevPoint.x +
            ((point.x - prevPoint.x) * Math.abs(prevValue - baselineValue)) /
              (Math.abs(prevValue - baselineValue) + Math.abs(baselineValue - value));
          currentPositiveSegment.push({ x: intersectionX, y: baselineY });
        }
        positiveSegments.push(currentPositiveSegment);
        currentPositiveSegment = [];
        // Start new negative segment from intersection
        if (i > 0) {
          const prevPoint = curve.points[i - 1];
          const prevValue = curve.pnlValues[i - 1];
          const intersectionX =
            prevPoint.x +
            ((point.x - prevPoint.x) * Math.abs(prevValue - baselineValue)) /
              (Math.abs(prevValue - baselineValue) + Math.abs(baselineValue - value));
          currentNegativeSegment.push({ x: intersectionX, y: baselineY });
        }
      }
      currentNegativeSegment.push(point);
    }
  }

  // Close any remaining segments
  if (currentPositiveSegment.length > 0) {
    positiveSegments.push(currentPositiveSegment);
  }
  if (currentNegativeSegment.length > 0) {
    negativeSegments.push(currentNegativeSegment);
  }

  // Create path for positive segments
  const createAreaPath = (segment: Array<{ x: number; y: number }>) => {
    if (segment.length === 0) return "";

    // Start from first point
    let path = `M ${segment[0].x} ${segment[0].y}`;

    // Draw line through all points
    for (let i = 1; i < segment.length; i++) {
      path += ` L ${segment[i].x} ${segment[i].y}`;
    }

    // Close path by going down to baseline and back to start
    path += ` L ${segment[segment.length - 1].x} ${baselineY}`;
    path += ` L ${segment[0].x} ${baselineY}`;
    path += " Z";

    return path;
  };

  return (
    <g>
      {/* Positive area fills (green) */}
      {positiveSegments.map((segment, index) => (
        <path
          key={`positive-${index}`}
          d={createAreaPath(segment)}
          fill="rgba(34, 197, 94, 0.2)"
          className="pointer-events-none"
        />
      ))}

      {/* Negative area fills (red) */}
      {negativeSegments.map((segment, index) => (
        <path
          key={`negative-${index}`}
          d={createAreaPath(segment)}
          fill="rgba(239, 68, 68, 0.2)"
          className="pointer-events-none"
        />
      ))}
    </g>
  );
};
