import type { FC } from "react";
import type { ChartDimensions } from "../types";

/**
 * Grid lines component
 */
export const GridLines: FC<{
  dimensions: ChartDimensions;
  xTicks: string[];
  yTicks: number[];
  scaleX: (timestamp: string) => number;
  scaleY: (value: number) => number;
  initialAccountBalance?: number;
}> = ({ dimensions, xTicks, yTicks, scaleX, scaleY, initialAccountBalance }) => {
  const { chartWidth, chartHeight } = dimensions;

  if (chartWidth <= 0 || chartHeight <= 0) {
    return null;
  }

  const dedupe = (values: number[]): number[] => {
    const unique: number[] = [];
    values.forEach((value) => {
      if (!Number.isFinite(value)) return;
      if (unique.some((existing) => Math.abs(existing - value) < 0.5)) return;
      unique.push(value);
    });
    return unique.sort((a, b) => a - b);
  };

  const verticalMajor = dedupe([
    0,
    ...xTicks.map((timestamp) => scaleX(timestamp)),
    chartWidth,
  ]);
  const horizontalMajor = dedupe([
    0,
    ...yTicks.map((value) => scaleY(value)),
    chartHeight,
  ]);

  const verticalMinor: number[] = [];
  for (let i = 0; i < verticalMajor.length - 1; i++) {
    const start = verticalMajor[i];
    const end = verticalMajor[i + 1];
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
    if (Math.abs(end - start) < 8) continue;
    verticalMinor.push((start + end) / 2);
  }

  const horizontalMinor: number[] = [];
  for (let i = 0; i < horizontalMajor.length - 1; i++) {
    const start = horizontalMajor[i];
    const end = horizontalMajor[i + 1];
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
    if (Math.abs(end - start) < 8) continue;
    horizontalMinor.push((start + end) / 2);
  }

  // Calculate baseline position (initial account balance)
  const baselineY = initialAccountBalance !== undefined
    ? scaleY(initialAccountBalance)
    : null;

  return (
    <g className="grid-lines">
      {horizontalMinor.map((y, index) => (
        <line
          key={`h-grid-minor-${index}`}
          x1={0}
          y1={y}
          x2={chartWidth}
          y2={y}
          stroke="#9ca3af"
          strokeWidth="1"
          opacity="0.1"
        />
      ))}
      {horizontalMajor.map((y, index) => (
        <line
          key={`h-grid-major-${index}`}
          x1={0}
          y1={y}
          x2={chartWidth}
          y2={y}
          stroke="#9ca3af"
          strokeWidth="1"
          opacity="0.2"
        />
      ))}

      {/* Baseline at initial account balance */}
      {baselineY !== null && Number.isFinite(baselineY) && (
        <line
          x1={0}
          y1={baselineY}
          x2={chartWidth}
          y2={baselineY}
          stroke="#6b7280"
          strokeWidth="2"
          strokeDasharray="8,4"
          opacity="0.5"
        />
      )}
      {verticalMinor.map((x, index) => (
        <line
          key={`v-grid-minor-${index}`}
          x1={x}
          y1={0}
          x2={x}
          y2={chartHeight}
          stroke="#9ca3af"
          strokeWidth="1"
          opacity="0.1"
        />
      ))}
      {verticalMajor.map((x, index) => (
        <line
          key={`v-grid-major-${index}`}
          x1={x}
          y1={0}
          x2={x}
          y2={chartHeight}
          stroke="#9ca3af"
          strokeWidth="1"
          opacity="0.2"
        />
      ))}
    </g>
  );
};
