"use client";

import { format, parseISO } from "date-fns";

import type { SearchQueryTrendPoint } from "./types";

type QueryTrendChartProps = {
  query: string;
  trend: SearchQueryTrendPoint[];
};

const WIDTH = 560;
const HEIGHT = 160;
const PAD = { top: 12, right: 44, bottom: 28, left: 36 };

function scaleValue(
  value: number,
  min: number,
  max: number,
  range: number,
) {
  if (max === min) return PAD.top + range / 2;
  return PAD.top + range - ((value - min) / (max - min)) * range;
}

function buildPath(
  values: number[],
  min: number,
  max: number,
  innerWidth: number,
  innerHeight: number,
) {
  if (values.length === 0) return "";

  return values
    .map((value, index) => {
      const x =
        PAD.left + (index / Math.max(values.length - 1, 1)) * innerWidth;
      const y = scaleValue(value, min, max, innerHeight);
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

function buildAreaPath(
  values: number[],
  min: number,
  max: number,
  innerWidth: number,
  innerHeight: number,
) {
  if (values.length === 0) return "";

  const line = buildPath(values, min, max, innerWidth, innerHeight);
  const lastX = PAD.left + innerWidth;
  const baseY = PAD.top + innerHeight;
  const firstX = PAD.left;

  return `${line} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;
}

export function QueryTrendChart({ query, trend }: QueryTrendChartProps) {
  if (trend.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No daily trend data for this keyword in the selected range.
      </p>
    );
  }

  const clicks = trend.map((point) => point.clicks);
  const positions = trend.map((point) => point.position);
  const clicksMin = Math.min(...clicks);
  const clicksMax = Math.max(...clicks);
  const posMin = Math.min(...positions);
  const posMax = Math.max(...positions);

  const innerWidth = WIDTH - PAD.left - PAD.right;
  const innerHeight = HEIGHT - PAD.top - PAD.bottom;

  const clicksPath = buildPath(
    clicks,
    clicksMin,
    clicksMax,
    innerWidth,
    innerHeight,
  );
  const clicksArea = buildAreaPath(
    clicks,
    clicksMin,
    clicksMax,
    innerWidth,
    innerHeight,
  );
  const positionPath = buildPath(
    positions,
    posMin,
    posMax,
    innerWidth,
    innerHeight,
  );

  const tickIndexes =
    trend.length <= 4
      ? trend.map((_, index) => index)
      : [0, Math.floor(trend.length / 2), trend.length - 1];

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{query}</p>
      <div className="max-w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-44 w-full min-w-[20rem] text-muted-foreground"
          role="img"
          aria-label={`Trend chart for ${query}`}
        >
          <rect
            x={PAD.left}
            y={PAD.top}
            width={innerWidth}
            height={innerHeight}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.12}
          />

          {Array.from({ length: 3 }).map((_, index) => {
            const y = PAD.top + (innerHeight / 2) * index;
            return (
              <line
                key={index}
                x1={PAD.left}
                x2={PAD.left + innerWidth}
                y1={y}
                y2={y}
                stroke="currentColor"
                strokeOpacity={0.08}
              />
            );
          })}

          <path
            d={clicksArea}
            fill="var(--chart-1)"
            fillOpacity={0.15}
          />
          <path
            d={clicksPath}
            fill="none"
            stroke="var(--chart-1)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <path
            d={positionPath}
            fill="none"
            stroke="var(--chart-3)"
            strokeWidth={2}
            strokeDasharray="4 3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {tickIndexes.map((index) => {
            const x =
              PAD.left +
              (index / Math.max(trend.length - 1, 1)) * innerWidth;
            const point = trend[index];
            return (
              <text
                key={point.date}
                x={x}
                y={HEIGHT - 8}
                textAnchor="middle"
                className="fill-muted-foreground text-[10px]"
              >
                {format(parseISO(point.date), "MMM d")}
              </text>
            );
          })}

          <text
            x={8}
            y={PAD.top + 10}
            className="fill-muted-foreground text-[10px]"
          >
            Clicks
          </text>
          <text
            x={WIDTH - 8}
            y={PAD.top + 10}
            textAnchor="end"
            className="fill-muted-foreground text-[10px]"
          >
            Position
          </text>
        </svg>
      </div>
      <p className="text-xs text-muted-foreground">
        Solid line: clicks (filled area). Dashed line: average position — lower
        is better.
      </p>
    </div>
  );
}
