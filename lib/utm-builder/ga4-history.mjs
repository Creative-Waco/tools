import { format } from "date-fns";

import {
  getGa4Client,
  getGa4PropertyId,
  parseGa4Metric,
} from "../analytics-dashboard/ga4-client.mjs";

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

function buildEntryId(utm, landingPage) {
  return [
    utm.utm_source,
    utm.utm_medium,
    utm.utm_campaign,
    utm.utm_term,
    utm.utm_content,
    landingPage,
  ].join("|");
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
      { name: "sessionSource" },
      { name: "sessionMedium" },
      { name: "sessionManualCampaignName" },
      { name: "sessionManualTerm" },
      { name: "sessionManualAdContent" },
      { name: "landingPage" },
    ],
    metrics: [{ name: "sessions" }],
    dimensionFilter: buildManualCampaignFilter(),
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    limit,
  });

  const sourceTotals = new Map();
  const mediumTotals = new Map();
  const campaignTotals = new Map();

  const entries = (response.rows ?? [])
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
      const sessions = parseGa4Metric(row, 0);

      return {
        id: buildEntryId(utm, landingPage),
        utm,
        landingPage,
        sessions,
      };
    })
    .filter((entry) => entry.utm.utm_campaign);

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

  return {
    configured: true,
    startDate: format(startDate, "yyyy-MM-dd"),
    endDate: format(endDate, "yyyy-MM-dd"),
    entries,
    suggestions: {
      sources: topSuggestions(sourceTotals),
      mediums: topSuggestions(mediumTotals),
      campaigns: topSuggestions(campaignTotals),
    },
  };
}
