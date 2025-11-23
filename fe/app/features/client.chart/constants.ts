// Color palette for trader curves - dark series
export const TRADER_COLORS = [
  "#1e40af", // dark blue
  "#047857", // dark emerald
  "#b45309", // dark amber
  "#b91c1c", // dark red
  "#6d28d9", // dark violet
  "#be185d", // dark pink
  "#0f766e", // dark teal
  "#c2410c", // dark orange
];

// Trader icons - SVG paths and shapes
// Each icon is designed to fit in a 20x20 viewBox centered at (0, 0)
export const TRADER_ICONS = [
  {
    type: "path",
    d: "M0,-8 L2,-2 L8,-2 L3,2 L5,8 L0,4 L-5,8 L-3,2 L-8,-2 L-2,-2 Z", // Star
  },
  {
    type: "path",
    d: "M-6,-6 L6,-6 L6,6 L-6,6 Z", // Square
  },
  {
    type: "path",
    d: "M0,-7 L7,7 L-7,7 Z", // Triangle
  },
  {
    type: "path",
    d: "M0,-8 L5,0 L0,8 L-5,0 Z", // Diamond
  },
  {
    type: "path",
    d: "M0,-7 C-4,-7 -7,-4 -7,0 C-7,5 0,8 0,8 C0,8 7,5 7,0 C7,-4 4,-7 0,-7 Z", // Heart
  },
  {
    type: "path",
    d: "M2,-8 L0,-2 L4,-2 L-2,0 L2,0 L-3,8 L0,2 L-4,2 Z", // Lightning
  },
  {
    type: "path",
    d: "M-1,-8 L-2,-4 L-4,-5 L-3,-1 L-5,-2 L-3,2 L-5,1 L-2,6 L0,8 L2,6 L5,1 L3,2 L5,-2 L3,-1 L4,-5 L2,-4 L1,-8 Z", // Flame
  },
  {
    type: "path",
    d: "M-7,0 A7,7 0 1,1 7,0 A7,7 0 1,1 -7,0 M-4,0 A4,4 0 1,0 4,0 A4,4 0 1,0 -4,0", // Ring/Donut
  },
] as const;

// Chart padding configuration (constant design decision)
export const DEFAULT_CHART_PADDING = {
  top: 40,
  right: 100,
  bottom: 40,
  left: 60,
};
