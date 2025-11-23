import type { FC } from "react";
import type { ChartDimensions } from "../types";

/**
 * Back button component - shown when a single trader is selected
 */
export const BackButton: FC<{
  dimensions: ChartDimensions;
  selectedTraderName: string;
  onClick: () => void;
}> = ({ dimensions, onClick }) => {
  const buttonX = dimensions.padding.left;
  const buttonY = 10;
  const buttonWidth = 80;
  const buttonHeight = 28;

  return (
    <g className="cursor-pointer transition-all duration-200" onClick={onClick}>
      {/* Button background */}
      <rect
        x={buttonX}
        y={buttonY}
        width={buttonWidth}
        height={buttonHeight}
        rx="6"
        fill="#000"
        stroke="#000"
        strokeWidth="1.5"
        opacity="0.9"
        className="hover:opacity-100 transition-opacity duration-200"
      />

      {/* Back arrow icon */}
      <path
        d={`M ${buttonX + 15} ${buttonY + buttonHeight / 2} L ${buttonX + 20} ${
          buttonY + buttonHeight / 2 - 4
        } M ${buttonX + 15} ${buttonY + buttonHeight / 2} L ${buttonX + 20} ${
          buttonY + buttonHeight / 2 + 4
        }`}
        stroke="#e5e7eb"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Button text */}
      <text
        x={buttonX + 30}
        y={buttonY + buttonHeight / 2}
        textAnchor="start"
        dominantBaseline="middle"
        className="fill-white"
        style={{ fontSize: 15 }}
      >
        BACK
      </text>
    </g>
  );
};
