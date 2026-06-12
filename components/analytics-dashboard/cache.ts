import { format } from "date-fns";
import type { DateRange } from "react-day-picker";

import type { AnalyticsDashboardData } from "./types";

const CACHE_PREFIX = "cw-analytics-dashboard:v4:";

type CacheEntry = {
  data: AnalyticsDashboardData;
  cachedAt: string;
};

export function buildDashboardCacheKey(
  programId: string,
  dateRange: DateRange,
) {
  const start = format(dateRange.from!, "yyyy-MM-dd");
  const end = format(dateRange.to!, "yyyy-MM-dd");
  return `${CACHE_PREFIX}${programId}:${start}:${end}`;
}

export function readCachedDashboard(
  cacheKey: string,
): AnalyticsDashboardData | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(cacheKey);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry;
    return entry.data ?? null;
  } catch {
    return null;
  }
}

export function writeCachedDashboard(
  cacheKey: string,
  data: AnalyticsDashboardData,
) {
  if (typeof window === "undefined") return;

  const entry: CacheEntry = {
    data,
    cachedAt: new Date().toISOString(),
  };

  try {
    window.sessionStorage.setItem(cacheKey, JSON.stringify(entry));
  } catch {
    // Ignore quota errors — dashboard still works without cache.
  }
}

export function clearCachedDashboard(cacheKey: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(cacheKey);
}
