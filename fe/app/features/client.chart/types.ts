// Types for the trading chart components

export type Point = { x: number; y: number };

export type DisplayMode = "balance" | "percentage";

export type TraderCurve = {
  traderId: string;
  traderName: string;
  traderIndex: number;
  color: string;
  points: Point[];
  timestamps: string[];
  pnlValues: number[];
  description?: string | null;
};

export type ChartDimensions = {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
  chartWidth: number;
  chartHeight: number;
};

export type ScaleRange = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

export type CompetitorChartProps = {
  className?: string;
};
