import React, { type FC, useState, useRef, useCallback } from "react";
import type { ScaleRange, TraderCurve, DisplayMode } from "../types";
import {
  createScaleFunctions,
  calculateYAxisTicksFromCurves,
} from "../utils/calculations";
import { formatYAxisLabel } from "../utils/transformations";
import { GridLines } from "./GridLines";
import { YAxis } from "./YAxis";
import { XAxis } from "./XAxis";
import { CurveLine } from "./CurveLine";
import { AreaFill } from "./AreaFill";
import { Crosshair } from "./Crosshair";
import { getTraderIcon } from "../utils/trader-icon";
import { useChartDimensions } from "../hooks/useChartDimensions";

/**
 * Main chart rendering component with SVG
 */
export const TraderPnLChart: FC<{
  curves: TraderCurve[];
  scaleRange: ScaleRange;
  initialPadding: { top: number; right: number; bottom: number; left: number };
  hoveredTraderId: string | null;
  onHoverChange: (traderId: string | null) => void;
  selectedTraderId: string | null;
  onSelectChange: (traderId: string | null) => void;
  initialAccountBalance?: number;
  displayMode: DisplayMode;
  onPaddingChange?: (padding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  }) => void;
}> = ({
  curves,
  scaleRange,
  initialPadding,
  hoveredTraderId,
  onHoverChange,
  selectedTraderId,
  onSelectChange,
  initialAccountBalance,
  displayMode,
  onPaddingChange,
}) => {
  // All hooks must be called unconditionally at the top
  const {
    ref: containerRef,
    dimensions,
    padding,
  } = useChartDimensions({
    initialPadding,
    onPaddingChange,
  });
  const svgRef = useRef<SVGSVGElement>(null);
  const [mouseX, setMouseX] = useState<number | null>(null);

  // Handle mouse leave - clear both crosshair and hover state
  const handleMouseLeave = useCallback(() => {
    setMouseX(null);
    onHoverChange(null);
  }, [onHoverChange]);

  // Handle mouse move to show crosshair
  const handleMouseMove = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current || !dimensions) return;

      const svg = svgRef.current;
      const point = svg.createSVGPoint();
      point.x = event.clientX;
      point.y = event.clientY;

      const ctm = svg.getScreenCTM();
      if (!ctm) return;

      const svgPoint = point.matrixTransform(ctm.inverse());
      const x = svgPoint.x;

      const chartLeft = padding.left;
      const chartStart = chartLeft;
      const chartEnd = chartLeft + dimensions.chartWidth;

      if (x >= chartStart && x <= chartEnd) {
        setMouseX(x - chartStart);
      } else {
        setMouseX(null);
      }
    },
    [dimensions, padding]
  );

  // Wait for dimensions to be calculated by ResizeObserver
  if (!dimensions) {
    return <div ref={containerRef} className="relative w-full h-full" />;
  }

  // Filter curves based on selection
  const displayedCurves = selectedTraderId
    ? curves.filter((curve) => curve.traderId === selectedTraderId)
    : curves;

  // Handle curve click
  const handleCurveClick = (traderId: string) => {
    if (selectedTraderId === traderId) {
      // Click on already selected trader -> deselect
      onSelectChange(null);
    } else {
      // Click on different trader -> select it
      onSelectChange(traderId);
    }
  };

  // Calculate Y-axis ticks and dynamic range based on displayed curves
  const {
    ticks: yTickValues,
    minY: dynamicMinY,
    maxY: dynamicMaxY,
  } = calculateYAxisTicksFromCurves(
    displayedCurves,
    dimensions.chartHeight,
    initialAccountBalance,
    { displayMode }
  );

  // Use dynamic scale range that adapts to displayed data
  const dynamicScaleRange: ScaleRange = {
    minX: scaleRange.minX,
    maxX: scaleRange.maxX,
    minY: dynamicMinY,
    maxY: dynamicMaxY,
  };

  // Create scale functions with dynamic range
  const { scaleY } = createScaleFunctions(dimensions, dynamicScaleRange);
  const { chartWidth, chartHeight } = dimensions;

  // Calculate X-axis ticks based on data point indices, not timestamps
  // Select evenly distributed indices from the data points
  const calculateIndexBasedXTicks = (
    numDataPoints: number,
    chartWidth: number
  ): Array<{ index: number; timestamp: string; x: number }> => {
    if (numDataPoints === 0) return [];
    if (numDataPoints === 1) {
      const firstCurve = displayedCurves[0];
      return [
        {
          index: 0,
          timestamp: firstCurve.timestamps[0],
          x: chartWidth / 2,
        },
      ];
    }

    // Determine number of ticks based on chart width
    const minTickSpacing = 120; // pixels
    const maxTicks = Math.max(3, Math.min(Math.floor(chartWidth / minTickSpacing) + 1, 12));

    // Generate evenly spaced indices
    const tickIndices: number[] = [];
    const step = (numDataPoints - 1) / (maxTicks - 1);

    for (let i = 0; i < maxTicks; i++) {
      const index = Math.round(i * step);
      tickIndices.push(index);
    }

    // Use the first curve's timestamps for tick labels
    const firstCurve = displayedCurves[0];

    return tickIndices.map((index) => ({
      index,
      timestamp: firstCurve.timestamps[index] || firstCurve.timestamps[firstCurve.timestamps.length - 1],
      x: (index / (numDataPoints - 1)) * chartWidth,
    }));
  };

  const numDataPoints = displayedCurves.length > 0 ? displayedCurves[0].timestamps.length : 0;
  const xTicksData = calculateIndexBasedXTicks(numDataPoints, chartWidth);

  // Create index-based scaleX function for grid lines and axes
  const scaleXByIndex = (timestamp: string): number => {
    // Find the index of this timestamp in the first curve
    const firstCurve = displayedCurves[0];
    if (!firstCurve) return 0;

    const index = firstCurve.timestamps.indexOf(timestamp);
    if (index === -1) return 0;

    const totalPoints = firstCurve.timestamps.length;
    return totalPoints > 1 ? (index / (totalPoints - 1)) * chartWidth : chartWidth / 2;
  };

  // Convert curves to points using index-based positioning
  // X-axis is based on data point index (uniform distribution), not timestamp
  const curvesWithPoints: TraderCurve[] = displayedCurves.map((curve) => ({
    ...curve,
    points: curve.timestamps.map((ts, i) => ({
      x:
        curve.timestamps.length > 1
          ? (i / (curve.timestamps.length - 1)) * chartWidth
          : chartWidth / 2, // Single point: center it
      y: scaleY(curve.pnlValues[i]),
    })),
  }));

  // Calculate maximum PnL rect width across all traders
  const maxPnlRectWidth = Math.max(
    ...curvesWithPoints.map((curve) => {
      const finalPnl = curve.pnlValues[curve.pnlValues.length - 1];
      const finalPnlStr = formatYAxisLabel(finalPnl, displayMode);
      return Math.max(finalPnlStr.length * 10 + 10, 50);
    })
  );

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <svg
        ref={svgRef}
        width={chartWidth}
        height={chartHeight}
        className="overflow-visible"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <g transform={`translate(${padding.left}, ${padding.top})`}>
          <GridLines
            dimensions={dimensions}
            xTicks={xTicksData.map((t) => t.timestamp)}
            yTicks={yTickValues}
            scaleX={scaleXByIndex}
            scaleY={scaleY}
            initialAccountBalance={initialAccountBalance}
          />

          {/* Render curves */}
          {curvesWithPoints.length === 1 &&
            initialAccountBalance !== undefined && (
              <AreaFill
                curve={curvesWithPoints[0]}
                scaleY={scaleY}
                initialAccountBalance={initialAccountBalance}
                displayMode={displayMode}
              />
            )}

          {curvesWithPoints.map((curve) => {
            const isHovered = hoveredTraderId === curve.traderId;
            const isOtherHovered = hoveredTraderId !== null && !isHovered;

            return (
              <CurveLine
                key={curve.traderId}
                curve={curve}
                isHovered={isHovered}
                isOtherHovered={isOtherHovered}
                onMouseEnter={() => onHoverChange(curve.traderId)}
                onMouseLeave={() => onHoverChange(null)}
                onClick={() => handleCurveClick(curve.traderId)}
              />
            );
          })}

          {/* Render trader icons at curve endpoints */}
          {curvesWithPoints.map((curve) => {
            const isHovered = hoveredTraderId === curve.traderId;
            const isOtherHovered = hoveredTraderId !== null && !isHovered;
            const lastPoint = curve.points[curve.points.length - 1];
            const traderIcon = getTraderIcon(
              curve.traderName,
              curve.traderIndex,
              curve.description
            );

            const circleRadius = 14;
            const circleCenterX = lastPoint.x;
            const circleCenterY = lastPoint.y;

            return (
              <g
                key={`icon-${curve.traderId}`}
                className="cursor-pointer transition-transform duration-200 origin-center hover:scale-125"
                style={{
                  transformOrigin: `${circleCenterX}px ${circleCenterY}px`,
                }}
                onMouseEnter={() => onHoverChange(curve.traderId)}
                onMouseLeave={() => onHoverChange(null)}
                onClick={() => handleCurveClick(curve.traderId)}
              >
                {/* Shadow filter */}
                <defs>
                  <filter
                    id={`shadow-${curve.traderId}`}
                    x="-50%"
                    y="-50%"
                    width="200%"
                    height="200%"
                  >
                    <feDropShadow
                      dx="0"
                      dy="2"
                      stdDeviation="3"
                      floodOpacity="0.25"
                    />
                  </filter>
                </defs>

                {/* Ripple animation */}
                <circle
                  cx={circleCenterX}
                  cy={circleCenterY}
                  r={circleRadius}
                  fill={curve.color}
                  opacity="0"
                >
                  <animate
                    attributeName="r"
                    from={circleRadius}
                    to={circleRadius + 30}
                    dur="5s"
                    begin="0s"
                    repeatCount="indefinite"
                    keyTimes="0;0.2;1"
                    values={`${circleRadius};${circleRadius + 30};${circleRadius + 30}`}
                  />
                  <animate
                    attributeName="opacity"
                    dur="5s"
                    begin="0s"
                    repeatCount="indefinite"
                    keyTimes="0;0.2;1"
                    values="0.5;0;0"
                  />
                </circle>

                {/* Solid circle for trader icon */}
                <circle
                  cx={circleCenterX}
                  cy={circleCenterY}
                  r={circleRadius}
                  fill={curve.color}
                  opacity={isOtherHovered ? 0.2 : 1}
                  filter={`url(#shadow-${curve.traderId})`}
                  className="transition-all duration-200"
                />

                {/* Trader icon in circle */}
                <g
                  transform={`translate(${circleCenterX}, ${circleCenterY})`}
                  opacity={isOtherHovered ? 0.2 : 1}
                >
                  {traderIcon.type === "component" && traderIcon.component ? (
                    <g transform="translate(-12, -12)">
                      {React.createElement(traderIcon.component, {
                        width: 24,
                        height: 24,
                        fill: "white",
                      })}
                    </g>
                  ) : (
                    <path d={traderIcon.d} fill="white" stroke="none" />
                  )}
                </g>
              </g>
            );
          })}
        </g>

        <YAxis
          dimensions={dimensions}
          scaleRange={dynamicScaleRange}
          scaleY={scaleY}
          ticks={yTickValues}
          displayMode={displayMode}
        />
        <XAxis
          dimensions={dimensions}
          scaleRange={dynamicScaleRange}
          scaleX={scaleXByIndex}
          ticks={xTicksData.map((t) => t.timestamp)}
        />

        {/* Show crosshair on hover */}
        {mouseX !== null && (
          <Crosshair
            mouseX={mouseX}
            dimensions={dimensions}
            curves={curvesWithPoints}
            scaleRange={dynamicScaleRange}
            scaleY={scaleY}
            displayMode={displayMode}
          />
        )}
      </svg>

      {/* Show back button when a trader is selected */}

      {/* Render PnL badges outside SVG with absolute positioning */}
      {curvesWithPoints.map((curve) => {
        const isHovered = hoveredTraderId === curve.traderId;
        const isOtherHovered = hoveredTraderId !== null && !isHovered;
        const lastPoint = curve.points[curve.points.length - 1];
        const finalPnl = curve.pnlValues[curve.pnlValues.length - 1];

        // Calculate absolute position (accounting for SVG padding and icon)
        // Icon center is at: lastPoint.x + 12 + 14 (radius)
        // PnL badge starts after icon: lastPoint.x + 12 + 28 (diameter) + 4 (gap)
        const badgeX = padding.left + lastPoint.x + 12 + 4;
        const badgeY = padding.top + lastPoint.y;

        return (
          <div
            key={`badge-${curve.traderId}`}
            className="absolute pointer-events-auto cursor-pointer hidden sm:block"
            style={{
              left: `${badgeX}px`,
              top: `${badgeY}px`,
              transform: "translateY(-50%)",
            }}
            onMouseEnter={() => onHoverChange(curve.traderId)}
            onMouseLeave={() => onHoverChange(null)}
            onClick={() => handleCurveClick(curve.traderId)}
          >
            {/* PnL badge */}
            <div
              className="px-1 py-1 rounded text-white text-xs font-medium transition-all duration-200"
              style={{
                backgroundColor: curve.color,
                opacity: isOtherHovered ? 0.2 : isHovered ? 1 : 0.92,
                boxShadow: "0 2px 3px rgba(0,0,0,0.25)",
                minWidth: `${maxPnlRectWidth}px`,
                textAlign: "center",
              }}
            >
              {formatYAxisLabel(finalPnl, displayMode)}
            </div>

            {/* Tooltip on hover */}
            {isHovered && (
              <div
                className="absolute left-1/2 bottom-full mb-2 px-3 py-1 bg-white rounded border transition-opacity duration-200"
                style={{
                  transform: "translateX(-50%)",
                  borderColor: curve.color,
                  opacity: 0.95,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                }}
              >
                <span
                  className="text-xs font-semibold uppercase whitespace-nowrap"
                  style={{ color: curve.color }}
                >
                  {curve.traderName}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
