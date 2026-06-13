"use client";

import type { SearchQueryTrendPoint } from "./types";

type QueryTrendSparklineProps = {
  trend: SearchQueryTrendPoint[];
  metric?: "clicks" | "impressions";
  width?: number;
  height?: number;
  className?: string;
};

export function QueryTrendSparkline({
  trend = [],
  metric = "impressions",
  width = 80,
  height = 24,
  className,
}: QueryTrendSparklineProps) {
  if (trend.length < 2) {
    return (
      <svg
        width={width}
        height={height}
        className={className}
        aria-hidden
      >
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="currentColor"
          strokeOpacity={0.2}
          strokeWidth={1}
        />
      </svg>
    );
  }

  const values = trend.map((point) => point[metric]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const padding = 2;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  const points = values
    .map((value, index) => {
      const x = padding + (index / (values.length - 1)) * innerWidth;
      const y =
        padding + innerHeight - ((value - min) / range) * innerHeight;
      return `${x},${y}`;
    })
    .join(" ");

  const last = values[values.length - 1] ?? 0;
  const first = values[0] ?? 0;
  const rising = last >= first;

  return (
    <svg
      width={width}
      height={height}
      className={className}
      aria-hidden
    >
      <polyline
        fill="none"
        stroke={rising ? "var(--color-green-600, #16a34a)" : "var(--color-red-600, #dc2626)"}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
}
