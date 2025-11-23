import type { FC } from "react";
import type { TraderCurve } from "../types";

/**
 * Trader curve line component
 */
export const CurveLine: FC<{
  curve: TraderCurve;
  isHovered: boolean;
  isOtherHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
}> = ({
  curve,
  isHovered,
  isOtherHovered,
  onMouseEnter,
  onMouseLeave,
  onClick,
}) => {
  const pathD = curve.points
    .map((point, i) => `${i === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  return (
    <g>
      {/* Invisible wider path for better hover interaction */}
      <path
        d={pathD}
        fill="none"
        stroke="transparent"
        strokeWidth={10}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="cursor-pointer"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
      />
      {/* Visible curve line */}
      <path
        d={pathD}
        fill="none"
        stroke={curve.color}
        strokeWidth={isHovered ? 3 : 1.5}
        opacity={isOtherHovered ? 0.15 : 1}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-all duration-200 pointer-events-none"
        style={{
          filter: isHovered ? "drop-shadow(0 0 4px rgba(0,0,0,0.3))" : "none",
        }}
      />
    </g>
  );
};
