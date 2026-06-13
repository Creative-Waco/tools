import { format } from "date-fns";
import type { DateRange } from "react-day-picker";

import {
  buildDashboardCacheKey,
  clearCachedDashboard,
  readCachedDashboard,
  writeCachedDashboard,
} from "./cache";
import type { AnalyticsDashboardData } from "./types";

type FetchAnalyticsOptions = {
  force?: boolean;
};

export async function fetchAnalyticsDashboard(
  dateRange: DateRange,
  programId = "all",
  options: FetchAnalyticsOptions = {},
): Promise<AnalyticsDashboardData> {
  if (!dateRange.from || !dateRange.to) {
    throw new Error("A start and end date are required.");
  }

  const cacheKey = buildDashboardCacheKey(programId, dateRange);

  if (!options.force) {
    const cached = readCachedDashboard(cacheKey);
    if (cached) return cached;
  } else {
    clearCachedDashboard(cacheKey);
  }

  const params = new URLSearchParams();
  params.set("startDate", format(dateRange.from, "yyyy-MM-dd"));
  params.set("endDate", format(dateRange.to, "yyyy-MM-dd"));
  if (programId && programId !== "all") {
    params.set("program", programId);
  }

  const response = await fetch(`/api/analytics-dashboard/?${params.toString()}`, {
    cache: "no-store",
  });

  const payload = (await response.json()) as AnalyticsDashboardData & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "Could not load analytics.");
  }

  writeCachedDashboard(cacheKey, payload);
  return payload;
}

export function formatChange(change: number) {
  const rounded = Math.round(change * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded}%`;
}

/** Show absolute counts when % change is misleading (tiny prior baseline). */
export function formatSessionComparison(
  current: number,
  previous: number | null | undefined,
  change: number | null,
): string | null {
  if (change === null) return null;

  if (
    previous !== null &&
    previous !== undefined &&
    previous >= 0 &&
    (previous < 10 || Math.abs(change) >= 500)
  ) {
    return `${previous.toLocaleString()} → ${current.toLocaleString()} sessions (${formatChange(change)})`;
  }

  return formatChange(change);
}
