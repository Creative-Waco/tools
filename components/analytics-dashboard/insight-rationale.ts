import { format } from "date-fns";

import type { AnalyticsDashboardData } from "./types";
import type { UnifiedInsight } from "./unified-insights";
import { formatChange, formatSessionComparison } from "./utils";

export type InsightRationaleContext = {
  siteBounceRate?: number;
  siteEngagementRate?: number;
  siteAvgEngagementSec?: number;
  siteSessions?: number;
  period?: {
    current: string;
    comparison: string;
  };
};

export type InsightRationale = {
  periodLabel?: string;
  highlights: string[];
  why: string;
  caveat?: string;
};

function formatPeriodLabel(start: string, end: string) {
  const startDate = new Date(`${start}T12:00:00`);
  const endDate = new Date(`${end}T12:00:00`);
  return `${format(startDate, "MMM d")} – ${format(endDate, "MMM d, yyyy")}`;
}

function compactPeriodLabel(context: InsightRationaleContext): string | undefined {
  if (!context.period) return undefined;
  const current = context.period.current.replace(/, \d{4}$/, "");
  const comparison = context.period.comparison.replace(/, \d{4}$/, "");
  return `${current} vs ${comparison}`;
}

function tinyBaselineCaveat(
  previous: number | null | undefined,
  change: number | null,
): string | undefined {
  if (
    previous != null &&
    previous < 10 &&
    change !== null &&
    Math.abs(change) >= 200
  ) {
    return `Prior period had only ${previous} — focus on the before → after counts, not the % change.`;
  }
  return undefined;
}

function buildSearchRationale(
  row: UnifiedInsight,
  context: InsightRationaleContext,
): InsightRationale {
  const search = row.search;
  if (!search) {
    return { highlights: [row.impactLabel], why: row.label };
  }

  const highlights: string[] = [];

  if (row.subject) {
    highlights.push(row.subject);
  }

  if (search.previousClicks !== null) {
    const changeLabel = search.clicksChange
      ? formatSessionComparison(
          search.clicks,
          search.previousClicks,
          search.clicksChange,
        )?.replace(/sessions/g, "clicks")
      : null;
    highlights.push(
      changeLabel ??
        `${search.previousClicks} → ${search.clicks} clicks`,
    );
  } else {
    highlights.push(
      `${search.clicks.toLocaleString()} clicks · ${search.impressions.toLocaleString()} impressions`,
    );
  }

  highlights.push(
    `Position ${search.position} · ${search.ctr}% CTR (expected ~${search.expectedCtr}%)`,
  );

  if (search.potentialClicksGain > 0) {
    highlights.push(`Up to +${search.potentialClicksGain} clicks at benchmark CTR`);
  }

  highlights.push(`Priority ${row.impactScore}/100`);

  let why = row.label;
  if (search.tags.includes("low_ctr")) {
    why = "On page 1 (or close) but CTR is well below the benchmark for that rank.";
  } else if (search.tags.includes("cannibalized")) {
    why = "Multiple pages compete for the same query — consolidate or differentiate.";
  } else if (search.tags.includes("declining")) {
    why = "Clicks or rank dropped vs the comparison period.";
  } else if (search.tags.includes("rising")) {
    why = "Clicks or rank improved vs the comparison period.";
  } else if (search.tags.includes("page_two")) {
    why = "On page 2 with enough volume to push toward page 1.";
  }

  return {
    periodLabel: compactPeriodLabel(context),
    highlights,
    why,
    caveat: tinyBaselineCaveat(search.previousClicks, search.clicksChange),
  };
}

function buildTrafficRationale(
  row: UnifiedInsight,
  context: InsightRationaleContext,
): InsightRationale {
  const traffic = row.traffic;
  if (!traffic) {
    return { highlights: [row.impactLabel], why: row.label };
  }

  const highlights: string[] = [];
  const subject =
    row.subject ??
    traffic.channel ??
    (traffic.source
      ? traffic.medium
        ? `${traffic.source} / ${traffic.medium}`
        : traffic.source
      : undefined);

  if (subject) {
    highlights.push(subject);
  }

  if (traffic.previousSessions != null && traffic.sessionsChange !== null) {
    highlights.push(
      formatSessionComparison(
        traffic.sessions,
        traffic.previousSessions,
        traffic.sessionsChange,
      ) ?? `${traffic.previousSessions} → ${traffic.sessions} sessions`,
    );
  } else {
    highlights.push(`${traffic.sessions.toLocaleString()} sessions`);
  }

  if (traffic.bounceRate !== undefined && context.siteBounceRate !== undefined) {
    highlights.push(
      `${traffic.bounceRate}% bounce (site avg ${context.siteBounceRate}%)`,
    );
  }

  if (
    traffic.engagementRate !== undefined &&
    context.siteEngagementRate !== undefined
  ) {
    highlights.push(
      `${traffic.engagementRate}% engagement (site avg ${context.siteEngagementRate}%)`,
    );
  }

  if (traffic.metricValue !== undefined && traffic.tags.includes("low_engagement")) {
    highlights.push(
      `${traffic.metricValue}s avg on page (site avg ${context.siteAvgEngagementSec ?? "—"}s)`,
    );
  }

  if (traffic.formStarts !== undefined) {
    highlights.push(
      `${traffic.formSubmits ?? 0}/${traffic.formStarts} form submits (${traffic.metricValue}%)`,
    );
  }

  if (context.siteSessions && context.siteSessions > 0) {
    highlights.push(
      `${Math.round((traffic.sessions / context.siteSessions) * 1000) / 10}% of site sessions`,
    );
  }

  highlights.push(`Priority ${row.impactScore}/100`);

  let why = row.label;
  if (traffic.tags.includes("rising_channel")) {
    why = "Channel sessions grew ≥ 20% with enough volume to act on.";
  } else if (traffic.tags.includes("rising_source")) {
    why =
      traffic.engagementRate !== undefined &&
      context.siteEngagementRate !== undefined &&
      traffic.engagementRate < context.siteEngagementRate * 0.7
        ? "Source grew ≥ 25% but engagement trails the site average."
        : "Source/medium sessions grew ≥ 25% with enough volume to act on.";
  } else if (traffic.tags.includes("high_bounce")) {
    why = "Bounce rate is well above the site average on meaningful traffic.";
  } else if (traffic.tags.includes("low_engagement")) {
    why = "Time on page is well below the site average.";
  } else if (traffic.tags.includes("conversion_leak")) {
    why = "Too many form starts fail to submit.";
  } else if (traffic.tags.includes("declining_channel") || traffic.tags.includes("declining_source")) {
    why = "Sessions fell ≥ 20–25% vs the comparison period.";
  }

  return {
    periodLabel: compactPeriodLabel(context),
    highlights,
    why,
    caveat: tinyBaselineCaveat(
      traffic.previousSessions,
      traffic.sessionsChange,
    ),
  };
}

export function buildInsightRationaleContext(
  data: AnalyticsDashboardData | null,
): InsightRationaleContext {
  if (!data) return {};

  const context: InsightRationaleContext = {};

  if (data.kpis) {
    context.siteBounceRate = data.kpis.bounceRate.value;
    context.siteEngagementRate = data.kpis.engagementRate.value;
    context.siteAvgEngagementSec = data.kpis.avgEngagementSecPerView?.value;
    context.siteSessions = data.kpis.sessions.value;
  }

  if (data.dateRange) {
    context.period = {
      current: formatPeriodLabel(
        data.dateRange.start,
        data.dateRange.end,
      ),
      comparison: formatPeriodLabel(
        data.dateRange.comparisonStart,
        data.dateRange.comparisonEnd,
      ),
    };
  }

  return context;
}

export function buildInsightRationale(
  row: UnifiedInsight,
  context: InsightRationaleContext = {},
): InsightRationale {
  return row.source === "search"
    ? buildSearchRationale(row, context)
    : buildTrafficRationale(row, context);
}
