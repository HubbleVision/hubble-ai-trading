import type { FC } from "react";
import type { ChartDimensions, ScaleRange } from "../types";
import { formatTimestamp } from "../utils/calculations";

/**
 * X-axis component
 */
export const XAxis: FC<{
  dimensions: ChartDimensions;
  scaleRange: ScaleRange;
  scaleX: (timestamp: string) => number;
  ticks: string[];
}> = ({ dimensions, scaleRange, scaleX, ticks }) => {
  const { padding, chartWidth, chartHeight } = dimensions;

  const timestamps =
    ticks.length > 0
      ? ticks
      : [
          new Date(scaleRange.minX).toISOString(),
          new Date(scaleRange.maxX).toISOString(),
        ];

  const axisLabelOffset = Math.max(48, padding.bottom - 16);

  return (
    <g
      className="x-axis"
      transform={`translate(${padding.left}, ${padding.top + chartHeight})`}
    >
      <line
        x1={0}
        y1={0}
        x2={chartWidth}
        y2={0}
        stroke="#374151"
        strokeWidth="2"
      />

      {timestamps.map((timestamp, i) => {
        const x = scaleX(timestamp);
        const lines = formatTimestamp(timestamp).split("\n");
        return (
          <g key={`x-label-${i}`}>
            <text
              x={x}
              y={18}
              textAnchor="middle"
              className="text-xs fill-white"
              style={{ fontSize: 11, fontWeight: 500 }}
            >
              {lines[0]}
            </text>
            <text
              x={x}
              y={32}
              textAnchor="middle"
              className="text-xs fill-white"
              style={{ fontSize: 11, fontWeight: 500 }}
            >
              {lines[1]}
            </text>
            <line
              x1={x}
              y1={0}
              x2={x}
              y2={6}
              stroke="#374151"
              strokeWidth="1.5"
            />
          </g>
        );
      })}
    </g>
  );
};
