import { computeAudienceInsights } from "./audience-insights.mjs";
import { computeCrossInsights } from "./cross-insights.mjs";
import { computeGscPageInsights } from "./gsc-page-insights.mjs";
import { computeProgramInsightRules } from "./program-insights-rules.mjs";
import { computeUtmInsights } from "./utm-insights.mjs";

function emptySummary() {
  return {
    quick_wins: [],
    cannibalization: [],
    conversion: [],
    rising: [],
    watchlist: [],
    all: [],
  };
}

/**
 * Run all cross-dataset insight engines over a shared raw context (no I/O).
 * @param {{
 *   kpis: object;
 *   searchConsole: object;
 *   trafficRaw: object;
 *   audienceRaw?: object | null;
 *   programInsights?: object | null;
 *   utmSummary?: object | null;
 *   startDate?: Date;
 *   endDate?: Date;
 * }} ctx
 */
export function runInsightPipeline(ctx) {
  const {
    kpis,
    searchConsole,
    trafficRaw,
    audienceRaw = null,
    programInsights = null,
    utmSummary = null,
    startDate,
    endDate,
  } = ctx;

  const gscPageInsights = computeGscPageInsights({
    pages: searchConsole?.pages ?? [],
    previousPages: searchConsole?.previousPages ?? [],
    pairs: searchConsole?.pairs ?? [],
    trafficRaw,
    kpis,
  });

  const audienceInsights = audienceRaw
    ? computeAudienceInsights({
        audienceRaw,
        kpis,
        programInsights,
        channels: trafficRaw?.channels ?? [],
      })
    : emptySummary();

  const programInsightsRules = programInsights
    ? computeProgramInsightRules({
        programInsights,
        kpis,
        landingPages: trafficRaw?.landingPages ?? [],
        existingTrafficIds: new Set(),
      })
    : emptySummary();

  const crossInsights = computeCrossInsights({
    searchConsole,
    trafficRaw,
    audienceRaw,
    kpis,
    programInsights,
    startDate,
    endDate,
  });

  const utmInsights = utmSummary
    ? computeUtmInsights({
        entries: utmSummary.entries ?? [],
        trafficRaw,
        kpis,
      })
    : emptySummary();

  return {
    crossInsights,
    audienceInsights,
    gscPageInsights,
    programInsightsRules,
    utmInsights,
  };
}

export function dedupeInsightRows(rows) {
  const byId = new Map();
  for (const row of rows ?? []) {
    const existing = byId.get(row.id);
    if (!existing || (row.impactScore ?? 0) > (existing.impactScore ?? 0)) {
      byId.set(row.id, row);
    }
  }
  return Array.from(byId.values());
}
