import { format } from "date-fns";

import {
  getGa4Client,
  getGa4PropertyId,
  parseGa4Metric,
} from "../analytics-dashboard/ga4-client.mjs";

const SITE_ORIGIN = "https://creativewaco.org";

function landingPageToUrl(landingPage) {
  if (!landingPage) return SITE_ORIGIN;
  const path = landingPage.startsWith("/") ? landingPage : `/${landingPage}`;
  return `${SITE_ORIGIN}${path}`;
}

function reconstructTaggedUrl(landingPage, utm) {
  const base = landingPageToUrl(landingPage);
  const url = new URL(base);

  for (const key of [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "utm_id",
  ]) {
    const value = utm[key]?.trim();
    if (value) url.searchParams.set(key, value);
  }

  return url.toString();
}

const GA4_PLACEHOLDER_VALUES = new Set([
  "(not set)",
  "(direct)",
  "(none)",
  "(organic)",
  "(referral)",
  "(cross-network)",
  "(not provided)",
]);

function cleanDimension(value) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed || GA4_PLACEHOLDER_VALUES.has(trimmed)) return "";
  return trimmed;
}

function buildEntryId(utm, landingPage, referrer) {
  return [
    utm.utm_source,
    utm.utm_medium,
    utm.utm_campaign,
    utm.utm_term,
    utm.utm_content,
    landingPage,
    referrer,
  ].join("|");
}

function cleanReferrer(value) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed || GA4_PLACEHOLDER_VALUES.has(trimmed)) return "";
  return trimmed;
}

function topSuggestions(map, limit = 12) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([value, sessions]) => ({ value, sessions }));
}

function isGa4Configured() {
  try {
    getGa4PropertyId();
    return Boolean(
      process.env.GA4_SERVICE_ACCOUNT_JSON?.trim() ||
        process.env.GA4_SERVICE_ACCOUNT_PATH?.trim() ||
        process.env.GOOGLE_APPLICATION_CREDENTIALS,
    );
  } catch {
    return false;
  }
}

function mergeEntriesById(entries) {
  const merged = new Map();

  for (const entry of entries) {
    const existing = merged.get(entry.id);
    if (existing) {
      const totalSessions = existing.sessions + entry.sessions;
      const weightA = existing.sessions / totalSessions;
      const weightB = entry.sessions / totalSessions;

      existing.sessions = totalSessions;
      existing.activeUsers += entry.activeUsers;
      existing.engagedSessions += entry.engagedSessions;

      if (entry.engagementRate != null && existing.engagementRate != null) {
        existing.engagementRate =
          Math.round((existing.engagementRate * weightA + entry.engagementRate * weightB) * 10) /
          10;
      }
      if (entry.bounceRate != null && existing.bounceRate != null) {
        existing.bounceRate =
          Math.round((existing.bounceRate * weightA + entry.bounceRate * weightB) * 10) / 10;
      }
      continue;
    }

    merged.set(entry.id, { ...entry });
  }

  return [...merged.values()].sort((a, b) => b.sessions - a.sessions);
}

function parseRateMetric(row, index) {
  const value = parseGa4Metric(row, index);
  return value <= 1 ? Math.round(value * 1000) / 10 : Math.round(value * 10) / 10;
}

function buildManualCampaignFilter() {
  const placeholders = ["(not set)", "(organic)", "(referral)", "(direct)", "(none)"];

  return {
    notExpression: {
      orGroup: {
        expressions: placeholders.map((value) => ({
          filter: {
            fieldName: "sessionManualCampaignName",
            stringFilter: {
              matchType: "EXACT",
              value,
            },
          },
        })),
      },
    },
  };
}

/**
 * @param {{ startDate: Date, endDate: Date, limit?: number }} options
 */
export async function fetchUtmHistory({ startDate, endDate, limit = 100 }) {
  if (!isGa4Configured()) {
    return {
      configured: false,
      message:
        "GA4 is not configured. Add GA4_PROPERTY_ID and service account credentials (same as Analytics Dashboard).",
    };
  }

  const client = await getGa4Client();
  const property = `properties/${getGa4PropertyId()}`;

  const [response] = await client.runReport({
    property,
    dateRanges: [
      {
        startDate: format(startDate, "yyyy-MM-dd"),
        endDate: format(endDate, "yyyy-MM-dd"),
      },
    ],
    dimensions: [
      { name: "sessionManualSource" },
      { name: "sessionManualMedium" },
      { name: "sessionManualCampaignName" },
      { name: "sessionManualTerm" },
      { name: "sessionManualAdContent" },
      { name: "landingPage" },
      { name: "pageReferrer" },
    ],
    metrics: [
      { name: "sessions" },
      { name: "activeUsers" },
      { name: "engagementRate" },
      { name: "bounceRate" },
      { name: "engagedSessions" },
    ],
    dimensionFilter: buildManualCampaignFilter(),
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    limit,
  });

  const sourceTotals = new Map();
  const mediumTotals = new Map();
  const campaignTotals = new Map();

  const rawEntries = (response.rows ?? [])
    .map((row) => {
      const dims = row.dimensionValues ?? [];
      const utm = {
        utm_source: cleanDimension(dims[0]?.value),
        utm_medium: cleanDimension(dims[1]?.value),
        utm_campaign: cleanDimension(dims[2]?.value),
        utm_term: cleanDimension(dims[3]?.value),
        utm_content: cleanDimension(dims[4]?.value),
        utm_id: "",
      };
      const landingPage = cleanDimension(dims[5]?.value);
      const referrer = cleanReferrer(dims[6]?.value);
      const sessions = parseGa4Metric(row, 0);
      const activeUsers = parseGa4Metric(row, 1);
      const engagementRate = parseRateMetric(row, 2);
      const bounceRate = parseRateMetric(row, 3);
      const engagedSessions = parseGa4Metric(row, 4);

      return {
        id: buildEntryId(utm, landingPage, referrer),
        utm,
        landingPage,
        referrer,
        taggedUrl: reconstructTaggedUrl(landingPage, utm),
        sessions,
        activeUsers,
        engagementRate,
        bounceRate,
        engagedSessions,
      };
    })
    .filter((entry) => entry.utm.utm_campaign);

  const entries = mergeEntriesById(rawEntries);

  for (const entry of entries) {
    if (entry.utm.utm_source) {
      sourceTotals.set(
        entry.utm.utm_source,
        (sourceTotals.get(entry.utm.utm_source) ?? 0) + entry.sessions,
      );
    }
    if (entry.utm.utm_medium) {
      mediumTotals.set(
        entry.utm.utm_medium,
        (mediumTotals.get(entry.utm.utm_medium) ?? 0) + entry.sessions,
      );
    }
    campaignTotals.set(
      entry.utm.utm_campaign,
      (campaignTotals.get(entry.utm.utm_campaign) ?? 0) + entry.sessions,
    );
  }

  const totalSessions = entries.reduce((sum, entry) => sum + entry.sessions, 0);
  const totalActiveUsers = entries.reduce((sum, entry) => sum + entry.activeUsers, 0);

  return {
    configured: true,
    startDate: format(startDate, "yyyy-MM-dd"),
    endDate: format(endDate, "yyyy-MM-dd"),
    totals: {
      campaigns: entries.length,
      sessions: totalSessions,
      activeUsers: totalActiveUsers,
    },
    entries,
    suggestions: {
      sources: topSuggestions(sourceTotals),
      mediums: topSuggestions(mediumTotals),
      campaigns: topSuggestions(campaignTotals),
    },
  };
}

/**
 * Site-wide KPIs for benchmark fallbacks.
 * @param {{ startDate: Date, endDate: Date }} options
 */
export async function fetchSiteKpis({ startDate, endDate }) {
  if (!isGa4Configured()) {
    return { configured: false };
  }

  const client = await getGa4Client();
  const property = `properties/${getGa4PropertyId()}`;

  const [response] = await client.runReport({
    property,
    dateRanges: [
      {
        startDate: format(startDate, "yyyy-MM-dd"),
        endDate: format(endDate, "yyyy-MM-dd"),
      },
    ],
    metrics: [
      { name: "sessions" },
      { name: "engagementRate" },
      { name: "bounceRate" },
    ],
  });

  const row = response.rows?.[0];
  if (!row) {
    return {
      configured: true,
      sessions: 0,
      engagementRate: 0,
      bounceRate: 0,
    };
  }

  return {
    configured: true,
    sessions: parseGa4Metric(row, 0),
    engagementRate: parseRateMetric(row, 1),
    bounceRate: parseRateMetric(row, 2),
  };
}
