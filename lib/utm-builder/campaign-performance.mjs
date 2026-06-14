import { subDays } from "date-fns";

import { listCampaigns } from "../airtable/campaigns.mjs";
import { getAirtableConfig } from "../airtable/config.mjs";
import { ensureLocalCredentials } from "../airtable/local-env.mjs";
import { loadLocalCredentials } from "../analytics-dashboard/local-env.mjs";
import { fetchSiteKpis, fetchUtmHistory } from "./ga4-history.mjs";

const MIN_SESSIONS_FOR_RATES = 10;

function ga4CredentialsLoaded() {
  ensureLocalCredentials();
  loadLocalCredentials();
}

function linkMatchKey(utm) {
  return [
    utm.utm_campaign,
    utm.utm_source,
    utm.utm_medium,
    utm.utm_content,
    utm.utm_term,
  ]
    .map((v) => v?.trim() ?? "")
    .join("|");
}

function percentFromAirtable(value) {
  if (value == null || value === "") return null;
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return num <= 1 ? Math.round(num * 1000) / 10 : Math.round(num * 10) / 10;
}

function buildBenchmarkTargets(campaign, siteKpis) {
  const engagementAirtable = percentFromAirtable(campaign.benchmark_engagement_rate);
  const bounceAirtable = percentFromAirtable(campaign.benchmark_bounce_rate);

  return {
    sessions: campaign.benchmark_sessions ?? null,
    engagementRate:
      engagementAirtable ?? (siteKpis?.configured ? siteKpis.engagementRate : null),
    bounceRate: bounceAirtable ?? (siteKpis?.configured ? siteKpis.bounceRate : null),
    targetSource: {
      sessions: campaign.benchmark_sessions != null ? "airtable" : "none",
      engagementRate: engagementAirtable != null ? "airtable" : "site_average",
      bounceRate: bounceAirtable != null ? "airtable" : "site_average",
    },
  };
}

function rollupMetrics(rows) {
  const sessions = rows.reduce((sum, row) => sum + (row.sessions ?? 0), 0);
  const activeUsers = rows.reduce((sum, row) => sum + (row.activeUsers ?? 0), 0);
  const engagedSessions = rows.reduce((sum, row) => sum + (row.engagedSessions ?? 0), 0);

  let engagementRate = null;
  let bounceRate = null;

  if (sessions >= MIN_SESSIONS_FOR_RATES) {
    let engagementWeighted = 0;
    let bounceWeighted = 0;
    let weightSum = 0;

    for (const row of rows) {
      if (!row.sessions) continue;
      weightSum += row.sessions;
      if (row.engagementRate != null) engagementWeighted += row.engagementRate * row.sessions;
      if (row.bounceRate != null) bounceWeighted += row.bounceRate * row.sessions;
    }

    if (weightSum > 0) {
      engagementRate = Math.round((engagementWeighted / weightSum) * 10) / 10;
      bounceRate = Math.round((bounceWeighted / weightSum) * 10) / 10;
    }
  }

  return { sessions, activeUsers, engagedSessions, engagementRate, bounceRate };
}

function computeStatus(actual, targets) {
  if (actual.sessions === 0) return "no_traffic";

  let misses = 0;

  if (targets.sessions != null && actual.sessions < targets.sessions) misses += 1;

  if (
    actual.sessions >= MIN_SESSIONS_FOR_RATES &&
    targets.engagementRate != null &&
    actual.engagementRate != null &&
    actual.engagementRate < targets.engagementRate
  ) {
    misses += 1;
  }

  if (
    actual.sessions >= MIN_SESSIONS_FOR_RATES &&
    targets.bounceRate != null &&
    actual.bounceRate != null &&
    actual.bounceRate > targets.bounceRate
  ) {
    misses += 1;
  }

  return misses === 0 ? "on_track" : "below_target";
}

function buildVsBenchmark(actual, targets) {
  const vsBenchmark = {};

  if (targets.sessions != null && targets.sessions > 0) {
    vsBenchmark.sessionsPct = Math.round((actual.sessions / targets.sessions) * 1000) / 10;
  }

  if (
    actual.sessions >= MIN_SESSIONS_FOR_RATES &&
    targets.engagementRate != null &&
    actual.engagementRate != null
  ) {
    vsBenchmark.engagementDelta =
      Math.round((actual.engagementRate - targets.engagementRate) * 10) / 10;
  }

  if (
    actual.sessions >= MIN_SESSIONS_FOR_RATES &&
    targets.bounceRate != null &&
    actual.bounceRate != null
  ) {
    vsBenchmark.bounceDelta = Math.round((actual.bounceRate - targets.bounceRate) * 10) / 10;
  }

  return Object.keys(vsBenchmark).length ? vsBenchmark : undefined;
}

function matchGa4ForLink(link, ga4Entries, campaignSlug) {
  const key = linkMatchKey({
    utm_campaign: campaignSlug,
    utm_source: link.utm.utm_source,
    utm_medium: link.utm.utm_medium,
    utm_content: link.utm.utm_content,
    utm_term: link.utm.utm_term,
  });

  const matches = ga4Entries.filter(
    (entry) =>
      linkMatchKey(entry.utm) === key ||
      (entry.utm.utm_campaign === campaignSlug &&
        entry.utm.utm_source === link.utm.utm_source &&
        entry.utm.utm_medium === link.utm.utm_medium &&
        entry.utm.utm_content === link.utm.utm_content &&
        entry.utm.utm_term === link.utm.utm_term),
  );

  return rollupMetrics(matches);
}

function matchGa4ForCampaign(campaignSlug, ga4Entries) {
  const matches = ga4Entries.filter((entry) => entry.utm.utm_campaign === campaignSlug);
  return rollupMetrics(matches);
}

/**
 * @param {{ days?: number }} options
 */
export async function getCampaignsWithPerformance({ days = 90 } = {}) {
  ga4CredentialsLoaded();

  const airtableConfig = getAirtableConfig();
  if (!airtableConfig.configured) {
    return {
      configured: false,
      message: airtableConfig.message,
      campaigns: [],
    };
  }

  const endDate = new Date();
  const startDate = subDays(endDate, days);

  const [campaigns, ga4History, siteKpis] = await Promise.all([
    listCampaigns(),
    fetchUtmHistory({ startDate, endDate, limit: 1000 }),
    fetchSiteKpis({ startDate, endDate }),
  ]);

  const ga4Entries = ga4History.configured ? ga4History.entries : [];

  const enriched = campaigns.map((campaign) => {
    const targets = buildBenchmarkTargets(campaign, siteKpis);
    const actual = matchGa4ForCampaign(campaign.utm_campaign, ga4Entries);
    const status = computeStatus(actual, targets);

    const links = campaign.links.map((link) => {
      const linkActual = matchGa4ForLink(link, ga4Entries, campaign.utm_campaign);
      return {
        ...link,
        performance: linkActual,
      };
    });

    return {
      ...campaign,
      links,
      performance: actual,
      benchmark: {
        targets,
        targetSource: targets.targetSource,
        vsBenchmark: buildVsBenchmark(actual, targets),
        status,
      },
    };
  });

  return {
    configured: true,
    airtable: true,
    ga4: ga4History.configured,
    startDate: ga4History.configured ? ga4History.startDate : null,
    endDate: ga4History.configured ? ga4History.endDate : null,
    siteKpis: siteKpis.configured
      ? {
          engagementRate: siteKpis.engagementRate,
          bounceRate: siteKpis.bounceRate,
          sessions: siteKpis.sessions,
        }
      : null,
    campaigns: enriched,
  };
}
