import { landingLookup, normalizePath } from "./path-utils.mjs";
import { round1 } from "./insight-thresholds.mjs";
import { pctChange } from "./date-range.mjs";

function bucketRows(rows) {
  const summary = {
    quick_wins: [],
    cannibalization: [],
    conversion: [],
    rising: [],
    watchlist: [],
    all: [],
  };
  for (const row of rows) {
    summary[row.category]?.push(row);
    summary.all.push(row);
  }
  for (const key of Object.keys(summary)) {
    summary[key].sort((a, b) => b.impactScore - a.impactScore);
  }
  return summary;
}

/**
 * @param {{
 *   entries: Array<{ campaign: string; landingPage: string; sessions: number; previousSessions: number }>;
 *   trafficRaw?: { landingPages?: object[] };
 *   kpis: object;
 * }} input
 */
export function computeUtmInsights({ entries, trafficRaw, kpis }) {
  const rows = [];
  const siteBounce = kpis.bounceRate?.value ?? 0;
  const landings = landingLookup(trafficRaw?.landingPages);

  for (const entry of entries ?? []) {
    const prev = entry.previousSessions ?? 0;
    const change = prev > 0 ? pctChange(entry.sessions, prev) : null;

    if (prev >= 15 && change !== null && change <= -30) {
      rows.push({
        id: `utm:drop:${entry.campaign}`,
        kind: "utm",
        tags: ["utm_campaign_drop"],
        category: "watchlist",
        label: entry.campaign,
        subject: entry.campaign,
        action: "Review",
        actionDetail: `Tagged campaign "${entry.campaign}" sessions down ${Math.abs(change)}% — check links, ads, or email UTMs.`,
        impactScore: round1(prev * Math.abs(change) * 0.01),
        campaign: entry.campaign,
        sessions: entry.sessions,
        previousSessions: prev,
      });
    }

    const path = normalizePath(entry.landingPage);
    const landing = landings.get(path);
    if (
      landing &&
      entry.sessions >= 10 &&
      landing.bounceRate >= siteBounce + 15
    ) {
      rows.push({
        id: `utm:landing:${entry.campaign}:${path}`,
        kind: "utm",
        tags: ["utm_landing_mismatch"],
        category: "quick_wins",
        label: entry.campaign,
        subject: `${entry.campaign} → ${path}`,
        action: "Fix landing",
        actionDetail: `Campaign "${entry.campaign}" lands on ${path} with ${landing.bounceRate}% bounce — align ad/email creative with the page.`,
        impactScore: round1(entry.sessions * (landing.bounceRate - siteBounce) * 0.02),
        campaign: entry.campaign,
        path,
        sessions: entry.sessions,
        bounceRate: landing.bounceRate,
      });
    }
  }

  return bucketRows(rows);
}
