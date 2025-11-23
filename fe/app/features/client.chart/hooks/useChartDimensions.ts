import { useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import type { ChartDimensions } from "../types";

type Padding = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

type UseChartDimensionsArgs = {
  initialPadding: Padding;
  onPaddingChange?: (padding: Padding) => void;
};

type UseChartDimensionsResult = {
  ref: MutableRefObject<HTMLDivElement | null>;
  dimensions: ChartDimensions | null;
  padding: Padding;
};

/**
 * Keep chart dimensions in sync with the rendered container size.
 * Uses ResizeObserver to recalculate the effective drawing area and adjust padding dynamically.
 * Returns null until the first resize event is observed.
 */
export function useChartDimensions({
  initialPadding,
  onPaddingChange,
}: UseChartDimensionsArgs): UseChartDimensionsResult {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState<ChartDimensions | null>(null);
  const [padding, setPadding] = useState<Padding>(initialPadding);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const element = containerRef.current;
    if (!element) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      const { width, height } = entry.contentRect;

      if (width === 0 || height === 0) {
        return;
      }

      // Responsive padding adjustment logic
      const calculateResponsivePadding = (
        containerWidth: number,
        containerHeight: number
      ) => {
        // Define padding configurations for different size tiers
        const paddingConfigs = [
          // Extra large screen (>= 1200px)
          {
            minWidth: 1200,
            minHeight: 800,
            padding: {
              top: Math.max(initialPadding.top, 40),
              right: Math.min(initialPadding.right, 140),
              bottom: Math.max(initialPadding.bottom, 50),
              left: Math.min(initialPadding.left, 80),
            },
          },
          // Large screen (>= 900px)
          {
            minWidth: 900,
            minHeight: 600,
            padding: {
              top: Math.max(initialPadding.top, 30),
              right: Math.max(initialPadding.right, 30),
              bottom: Math.max(initialPadding.bottom, 40),
              left: Math.max(initialPadding.left, 70),
            },
          },
          // Medium screen (>= 600px)
          {
            minWidth: 600,
            minHeight: 400,
            padding: {
              top: Math.max(initialPadding.top, 25),
              right: Math.max(initialPadding.right, 25),
              bottom: Math.max(initialPadding.bottom, 35),
              left: Math.min(initialPadding.left, 60),
            },
          },
          // Small screen (>= 400px)
          {
            minWidth: 400,
            minHeight: 300,
            padding: {
              top: Math.max(initialPadding.top, 20),
              right: Math.min(initialPadding.right, 20),
              bottom: Math.max(initialPadding.bottom, 30),
              left: Math.min(initialPadding.left, 50),
            },
          },
          // Extra small screen (< 400px)
          {
            minWidth: 0,
            minHeight: 0,
            padding: {
              top: Math.max(initialPadding.top, 15),
              right: Math.min(initialPadding.right, 15),
              bottom: Math.max(initialPadding.bottom, 25),
              left: Math.min(initialPadding.left, 40),
            },
          },
        ];

        // Find appropriate configuration tier
        const config =
          paddingConfigs.find(
            (config) =>
              containerWidth >= config.minWidth &&
              containerHeight >= config.minHeight
          ) || paddingConfigs[paddingConfigs.length - 1]; // Default to smallest tier

        // Ensure chart area is not too small
        const minChartWidth = 200;
        const minChartHeight = 150;

        let { top, right, bottom, left } = config.padding;

        // If calculated chart area is too small, scale down padding proportionally
        const availableWidth = containerWidth - left - right;
        const availableHeight = containerHeight - top - bottom;

        if (availableWidth < minChartWidth) {
          const scale = (containerWidth - minChartWidth) / (left + right);
          left = Math.max(left * scale, 20);
          right = Math.max(right * scale, 20);
        }

        if (availableHeight < minChartHeight) {
          const scale = (containerHeight - minChartHeight) / (top + bottom);
          top = Math.max(top * scale, 15);
          bottom = Math.max(bottom * scale, 20);
        }

        return { top, right, bottom, left };
      };

      const newPadding = calculateResponsivePadding(width, height);

      // Update padding state
      setPadding(newPadding);
      onPaddingChange?.(newPadding);

      const chartWidth = Math.max(
        width - newPadding.left - newPadding.right,
        0
      );
      const chartHeight = Math.max(
        height - newPadding.top - newPadding.bottom,
        0
      );

      setDimensions({
        width,
        height,
        padding: newPadding,
        chartWidth,
        chartHeight,
      });
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [initialPadding, onPaddingChange]);

  return {
    ref: containerRef,
    dimensions,
    padding,
  };
}
