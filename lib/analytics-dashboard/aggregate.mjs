import { parseISO, subDays } from "date-fns";

import { fetchAnalyticsDashboard } from "./ga4.mjs";
import { fetchSearchConsoleQueries } from "./gsc.mjs";
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

  return fetchAnalyticsDashboard({
    startDate: start,
    endDate: end,
    programId,
  }).then(async (dashboard) => {
    const searchConsole = await fetchSearchConsoleQueries({
      startDate: start,
      endDate: end,
      programId,
    });
    return { ...dashboard, searchConsole };
  });
}
