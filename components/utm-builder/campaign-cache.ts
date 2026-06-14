import type { Ga4UtmHistoryResult } from "@/lib/utm-builder/ga4-history-types";

const CACHE_PREFIX = "cw-utm-campaign-tracker:v3:";

type CacheEntry = {
  data: Ga4UtmHistoryResult;
  cachedAt: string;
};

export function buildCampaignCacheKey(days: number): string {
  return `${CACHE_PREFIX}${days}`;
}

export function readCachedCampaignHistory(days: number): Ga4UtmHistoryResult | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(buildCampaignCacheKey(days));
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry;
    return entry.data ?? null;
  } catch {
    return null;
  }
}

export function writeCachedCampaignHistory(days: number, data: Ga4UtmHistoryResult) {
  if (typeof window === "undefined") return;

  const entry: CacheEntry = {
    data,
    cachedAt: new Date().toISOString(),
  };

  try {
    window.sessionStorage.setItem(buildCampaignCacheKey(days), JSON.stringify(entry));
  } catch {
    // Ignore quota errors — tracker still works without cache.
  }
}

export function clearCachedCampaignHistory(days: number) {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(buildCampaignCacheKey(days));
}
