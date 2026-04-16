"use client";

import type { ReactNode } from "react";
import { ResponsiveContainer } from "recharts";

const DEFAULT_INITIAL_WIDTH = 800;

type RechartsViewportProps = {
  /** Pixel height (same intent as a Tailwind `h-[…px]` wrapper). */
  height: number;
  /** Extra classes on the outer wrapper (e.g. `relative` for donut overlays). */
  className?: string;
  /** Guess for first paint; ResizeObserver corrects width after layout. */
  initialWidth?: number;
  children: ReactNode;
};

/**
 * Recharts 3 + flex/scroll layouts: `ResponsiveContainer` with 100%/100% starts
 * with invalid dimensions and renders null until measured. If the parent is
 * briefly 0×0, charts never appear. This wrapper sets a positive
 * `initialDimension` and `min-h-0` so the first paint is valid.
 */
export function RechartsViewport({
  height,
  className = "",
  initialWidth = DEFAULT_INITIAL_WIDTH,
  children,
}: RechartsViewportProps) {
  return (
    <div
      className={`w-full min-h-0 ${className}`.trim()}
      style={{ height }}
    >
      <ResponsiveContainer
        width="100%"
        height="100%"
        initialDimension={{ width: initialWidth, height }}
      >
        {children}
      </ResponsiveContainer>
    </div>
  );
}
