import * as React from "react";

/**
 * Portfolio empty state icon - bold lines
 */
export const EmptyPortfolio = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="64"
    height="64"
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    {/* 文档/文件夹图标 */}
    <rect
      x="16"
      y="12"
      width="32"
      height="40"
      stroke="currentColor"
      strokeWidth="3"
      fill="none"
      rx="2"
    />
    <line
      x1="20"
      y1="24"
      x2="44"
      y2="24"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    />
    <line
      x1="20"
      y1="32"
      x2="44"
      y2="32"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    />
    <line
      x1="20"
      y1="40"
      x2="36"
      y2="40"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    />
    {/* 装饰性的折线 */}
    <path
      d="M20 48 L28 44 L36 48 L44 44"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

