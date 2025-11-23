import * as React from "react";

/**
 * Order empty state icon - bold lines
 */
export const EmptyOrder = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="64"
    height="64"
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    {/* 列表图标 */}
    <rect
      x="12"
      y="12"
      width="40"
      height="40"
      stroke="currentColor"
      strokeWidth="3"
      fill="none"
      rx="2"
    />
    {/* 列表项 */}
    <line
      x1="18"
      y1="22"
      x2="46"
      y2="22"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    />
    <line
      x1="18"
      y1="32"
      x2="40"
      y2="32"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    />
    <line
      x1="18"
      y1="42"
      x2="42"
      y2="42"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    />
    {/* 复选框样式 */}
    <rect
      x="36"
      y="18"
      width="8"
      height="8"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
      rx="1"
    />
  </svg>
);

