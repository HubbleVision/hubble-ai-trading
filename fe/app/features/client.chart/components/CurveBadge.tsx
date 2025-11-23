import type { FC } from "react";
import type { TraderCurve } from "../types";
import { TRADER_ICONS } from "../constants";

/**
 * Curve badge component (displayed at the end of each curve)
 */
export const CurveBadge: FC<{
  curve: TraderCurve;
  isHovered: boolean;
  isOtherHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
  maxPnlRectWidth: number;
}> = ({
  curve,
  isHovered,
  isOtherHovered,
  onMouseEnter,
  onMouseLeave,
  onClick,
  maxPnlRectWidth,
}) => {
  const lastPoint = curve.points[curve.points.length - 1];
  const finalPnl = curve.pnlValues[curve.pnlValues.length - 1];
  const finalPnlStr =
    finalPnl >= 0 ? `+${finalPnl.toFixed(0)}` : finalPnl.toFixed(0);

  // Get trader icon based on index (cycle through available icons)
  const traderIcon = TRADER_ICONS[(curve.traderIndex - 1) % TRADER_ICONS.length];

  // Circle dimensions
  const circleRadius = 14;
  const circleCenterX = lastPoint.x + 12 + circleRadius;
  const circleCenterY = lastPoint.y;

  // PnL rect dimensions - use unified width
  const pnlRectWidth = maxPnlRectWidth;
  const pnlRectHeight = circleRadius; // Half of circle diameter (2*circleRadius)
  const gap = 4;
  const pnlRectX = circleCenterX + circleRadius + gap;
  const pnlRectY = lastPoint.y - pnlRectHeight / 2;

  // Tooltip dimensions
  const tooltipPadding = 12;
  const tooltipTextWidth = curve.traderName.length * 8;
  const tooltipHeight = 16;
  const tooltipX = circleCenterX - tooltipTextWidth / 2;
  const tooltipY = circleCenterY - circleRadius - tooltipHeight - 8;

  return (
    <g
      className="cursor-pointer transition-all duration-200"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
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
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Tooltip - ghost style */}
      {isHovered && (
        <g className="tooltip" opacity="0.95">
          <rect
            x={tooltipX}
            y={tooltipY}
            width={tooltipTextWidth}
            height={tooltipHeight}
            rx="6"
            fill="#fff"
            stroke={curve.color}
            strokeWidth="1"
            opacity="0.92"
            filter={`url(#shadow-${curve.traderId})`}
          />
          <text
            x={circleCenterX}
            y={tooltipY + tooltipHeight / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{
              fontSize: 10,
              fontWeight: 600,
              fill: curve.color,
              textTransform: "uppercase",
            }}
          >
            {curve.traderName}
          </text>
        </g>
      )}

      {/* Ripple animation - single solid wave emanating from the trader circle */}
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

      {/* Solid circle for trader index */}
      <circle
        cx={circleCenterX}
        cy={circleCenterY}
        r={circleRadius}
        fill={curve.color}
        opacity={isOtherHovered ? 0.2 : isHovered ? 1 : 1}
        filter={`url(#shadow-${curve.traderId})`}
        className="transition-all duration-200"
      />

      {/* Trader icon in circle */}
      <g
        transform={`translate(${circleCenterX}, ${circleCenterY})`}
        opacity={isOtherHovered ? 0.2 : 1}
      >
        <path
          d={traderIcon.d}
          fill="white"
          stroke="none"
        />
      </g>

      {/* PnL rect */}
      <rect
        x={pnlRectX}
        y={pnlRectY}
        width={pnlRectWidth}
        height={pnlRectHeight}
        rx="4"
        fill={curve.color}
        opacity={isOtherHovered ? 0.2 : isHovered ? 1 : 0.92}
        filter={`url(#shadow-${curve.traderId})`}
        className="transition-all duration-200"
      />

      {/* PnL value in rect */}
      <text
        x={pnlRectX + pnlRectWidth / 2}
        y={pnlRectY + pnlRectHeight / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-white"
        style={{ fontSize: 10 }}
        opacity={isOtherHovered ? 0.2 : 1}
      >
        {finalPnlStr}
      </text>
    </g>
  );
};
