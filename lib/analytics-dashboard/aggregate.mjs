import { parseISO, subDays } from "date-fns";

import { fetchAnalyticsDashboard } from "./ga4.mjs";
import { fetchSearchConsoleQueries } from "./gsc.mjs";
import { runInsightPipeline } from "./insight-pipeline.mjs";
import { loadLocalCredentials } from "./local-env.mjs";

let credentialsLoaded = false;

function ensureCredentials() {
  if (!credentialsLoaded) {
    loadLocalCredentials();
    credentialsLoaded = true;
  }
}

function parseDateParam(value, fallback) {
  if (!value) return fallback;
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

/**
 * @param {{ startDate?: string, endDate?: string, programId?: string }} [options]
 */
export async function getAnalyticsDashboard({
  startDate,
  endDate,
  programId = "all",
} = {}) {
  ensureCredentials();

  const end = parseDateParam(endDate, new Date());
  const start = parseDateParam(startDate, subDays(end, 29));

  if (start > end) {
    throw new Error("Start date must be on or before end date.");
  }

  const dashboard = await fetchAnalyticsDashboard({
    startDate: start,
    endDate: end,
    programId,
  });

  const searchConsole = await fetchSearchConsoleQueries({
    startDate: start,
    endDate: end,
    programId,
  });

  const { _insightContext, ...publicDashboard } = dashboard;
  const pipeline = runInsightPipeline({
    kpis: publicDashboard.kpis,
    searchConsole,
    trafficRaw: _insightContext?.trafficRaw ?? {},
    audienceRaw: _insightContext?.audienceRaw ?? null,
    programInsights: publicDashboard.programInsights,
    utmSummary: _insightContext?.utmSummary ?? null,
    startDate: start,
    endDate: end,
  });

  return {
    ...publicDashboard,
    searchConsole,
    crossInsights: pipeline.crossInsights,
    audienceInsights: pipeline.audienceInsights,
    gscPageInsights: pipeline.gscPageInsights,
    programInsightsRules: pipeline.programInsightsRules,
    utmInsights: pipeline.utmInsights,
    _meta: {
      apiCalls: {
        ga4: _insightContext?.ga4ApiCalls ?? 0,
        gsc: searchConsole.gscApiCalls ?? 0,
      },
    },
  };
}
