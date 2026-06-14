import { expectedCtrForPosition } from "./gsc-insights.mjs";
import { landingLookup, normalizePath } from "./path-utils.mjs";
import { round1 } from "./insight-thresholds.mjs";
import { pctChange } from "./date-range.mjs";

function makeInsight({
  id,
  tags,
  category,
  label,
  subject,
  action,
  actionDetail,
  impactScore,
  path,
  query,
  metrics = {},
}) {
  return {
    id,
    tags,
    category,
    label,
    subject,
    action,
    actionDetail,
    impactScore: round1(impactScore),
    path,
    query,
    metrics,
  };
}

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
    if (key === "all") {
      summary.all.sort((a, b) => b.impactScore - a.impactScore);
    } else {
      summary[key].sort((a, b) => b.impactScore - a.impactScore);
    }
  }

  return summary;
}

function expectedClicks(impressions, position) {
  const expected = expectedCtrForPosition(position);
  return Math.round((impressions * expected) / 100);
}

/**
 * @param {{
 *   pages: Array<{ path: string; clicks: number; impressions: number; ctr: number; position: number }>;
 *   previousPages: Array<{ path: string; clicks: number; impressions: number; ctr: number; position: number }>;
 *   pairs: Array<{ query: string; path: string; impressions: number }>;
 *   trafficRaw: { landingPages?: object[]; pages?: object[] };
 *   kpis: object;
 * }} input
 */
export function computeGscPageInsights({
  pages,
  previousPages,
  pairs,
  trafficRaw,
  kpis,
}) {
  const rows = [];
  const landings = landingLookup(trafficRaw?.landingPages);
  const previousByPath = new Map(
    (previousPages ?? []).map((p) => [normalizePath(p.path), p]),
  );

  for (const page of pages ?? []) {
    const path = normalizePath(page.path);
    if (!path || page.impressions < 100) continue;

    const expected = expectedCtrForPosition(page.position);
    const potentialGain = Math.max(
      0,
      expectedClicks(page.impressions, page.position) - page.clicks,
    );

    if (page.ctr < expected * 0.65 && potentialGain >= 3) {
      rows.push(
        makeInsight({
          id: `gsc-page:ctr:${path}`,
          tags: ["page_ctr_opportunity"],
          category: "quick_wins",
          label: path,
          subject: path,
          action: "Fix snippet",
          actionDetail: `Page-level CTR (${page.ctr}%) underperforms expected (${expected}%) for position ${page.position} — review title and meta across ranking queries.`,
          impactScore: potentialGain,
          path,
          metrics: { ...page, potentialGain },
        }),
      );
    }

    const prev = previousByPath.get(path);
    if (prev && prev.clicks >= 10) {
      const clicksChange = pctChange(page.clicks, prev.clicks);
      if (clicksChange <= -25) {
        const landing = landings.get(path);
        const viewsStable =
          landing &&
          landing.previousSessions >= 10 &&
          pctChange(landing.sessions, landing.previousSessions) <= 10;

        rows.push(
          makeInsight({
            id: `gsc-page:declining:${path}`,
            tags: viewsStable
              ? ["page_search_declining", "serp_not_content"]
              : ["page_search_declining"],
            category: "watchlist",
            label: path,
            subject: path,
            action: viewsStable ? "Review" : "Refresh page",
            actionDetail: viewsStable
              ? `GSC clicks down ${Math.abs(clicksChange)}% but on-site sessions stable — likely SERP competition or snippet change, not page content.`
              : `GSC clicks down ${Math.abs(clicksChange)}% for this page — refresh content and check rankings.`,
            impactScore: prev.clicks * Math.abs(clicksChange) * 0.01,
            path,
            metrics: { ...page, clicksChange, previousClicks: prev.clicks },
          }),
        );
      }
    }
  }

  const queriesByPage = new Map();
  for (const pair of pairs ?? []) {
    const path = normalizePath(pair.path);
    if (!path) continue;
    const list = queriesByPage.get(path) ?? [];
    list.push(pair);
    queriesByPage.set(path, list);
  }

  for (const [path, pagePairs] of queriesByPage) {
    const uniqueQueries = new Set(pagePairs.map((p) => p.query));
    const totalImpressions = pagePairs.reduce(
      (sum, p) => sum + p.impressions,
      0,
    );
    if (uniqueQueries.size >= 5 && totalImpressions >= 200) {
      rows.push(
        makeInsight({
          id: `gsc-page:hub:${path}`,
          tags: ["page_query_hub"],
          category: "quick_wins",
          label: path,
          subject: `${uniqueQueries.size} queries · ${path}`,
          action: "Expand content",
          actionDetail: `Hub page ranks for ${uniqueQueries.size} queries (${totalImpressions.toLocaleString()} impressions) — strengthen internal linking and ensure the page satisfies multi-intent searches.`,
          impactScore: totalImpressions * 0.008,
          path,
          metrics: { queryCount: uniqueQueries.size, totalImpressions },
        }),
      );
    }
  }

  return bucketRows(rows);
}
