import type { FC } from "react";
import type { ChartDimensions, ScaleRange, DisplayMode } from "../types";
import { formatYAxisLabel } from "../utils/transformations";

/**
 * Y-axis component
 */
export const YAxis: FC<{
  dimensions: ChartDimensions;
  scaleRange: ScaleRange;
  scaleY: (value: number) => number;
  ticks: number[];
  displayMode: DisplayMode;
}> = ({ dimensions, scaleRange, scaleY, ticks, displayMode }) => {
  const { padding, chartHeight, chartWidth } = dimensions;
  const zeroY = scaleY(0);
  const shouldRenderZeroLine =
    scaleRange.minY <= 0 && scaleRange.maxY >= 0;

  return (
    <g
      className="y-axis"
      transform={`translate(${padding.left}, ${padding.top})`}
    >
      <line
        x1={0}
        y1={0}
        x2={0}
        y2={chartHeight}
        stroke="#374151"
        strokeWidth="2"
      />

      {shouldRenderZeroLine && (
        <line
          x1={0}
          y1={zeroY}
          x2={chartWidth}
          y2={zeroY}
          stroke="#6b7280"
          strokeWidth="2"
          opacity="0.4"
          strokeDasharray="4 4"
        />
      )}

      {ticks.map((value, i) => {
        const y = scaleY(value);
        return (
          <g key={`y-label-${i}`}>
            <text
              x={-6}
              y={y}
              textAnchor="end"
              dominantBaseline="middle"
              className="text-xs fill-white"
              style={{ fontSize: 10, fontWeight: 900 }}
            >
              {formatYAxisLabel(value, displayMode)}
            </text>
            <line
              x1={-6}
              y1={y}
              x2={0}
              y2={y}
              stroke="#374151"
              strokeWidth="1.5"
            />
          </g>
        );
      })}
    </g>
  );
};
