"use client";

import { forwardRef } from "react";

type ChartTooltipProps = {
  visible: boolean;
  left: number;
  top: number;
  children: React.ReactNode;
};

export const ChartTooltip = forwardRef<HTMLDivElement, ChartTooltipProps>(function ChartTooltip(
  { visible, left, top, children },
  ref,
) {
  if (!visible) return null;

  return (
    <div
      ref={ref}
      id="chart-tooltip"
      className="chart-tooltip"
      role="tooltip"
      style={{ left: `${left}px`, top: `${top}px` }}
    >
      {children}
    </div>
  );
});
