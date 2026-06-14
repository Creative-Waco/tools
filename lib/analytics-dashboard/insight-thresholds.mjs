/** Shared volume and scoring thresholds for insight engines. */

export const MIN_LANDING_SESSIONS = 15;
export const MIN_PAGE_VIEWS = 40;
export const MIN_CHANNEL_SESSIONS_RISING = 20;
export const MIN_SOURCE_SESSIONS_RISING = 15;
export const MIN_PRIOR_SESSIONS_FOR_RISING = 10;

export const BOUNCE_GAP_SITE = 10;
export const BOUNCE_ABSOLUTE = 65;
export const BOUNCE_GAP_PROGRAM = 10;

export const DEMO_COVERAGE_MIN = 15;
export const DEMO_KNOWN_USERS_MIN = 50;
export const DEMO_SHIFT_KNOWN_USERS = 100;

export const LOCAL_CITY_NAMES = new Set([
  "waco",
  "woodway",
  "hewitt",
  "robinson",
  "lorena",
]);

export const GSC_NOTE =
  "Search Console counts search-result clicks only; GA4 sessions include other organic paths. GSC data is typically 2–3 days behind GA4.";

export const DEMO_COVERAGE_NOTE =
  "GA4 demographics are modeled estimates for a subset of visitors.";

export function round1(value) {
  return Math.round(value * 10) / 10;
}

export function pctChangeThreshold(relativePct, absoluteMin) {
  return (change, baseline) => {
    if (change === null) return false;
    const absDelta = Math.abs((change / 100) * (baseline ?? 0));
    return Math.abs(change) >= relativePct && absDelta >= absoluteMin;
  };
}
