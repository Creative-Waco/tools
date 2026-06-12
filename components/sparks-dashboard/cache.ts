import type { DashboardData } from "./types";

const CACHE_PREFIX = "cw-sparks-dashboard:v1:";

type CacheEntry = {
  data: DashboardData;
  cachedAt: string;
};

export function buildDashboardCacheKey(period: string, membershipType: string): string {
  return `${CACHE_PREFIX}${period}:${membershipType}`;
}

export function readCachedDashboard(cacheKey: string): DashboardData | null {
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

export function writeCachedDashboard(cacheKey: string, data: DashboardData) {
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
