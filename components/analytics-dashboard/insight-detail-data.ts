import type { SearchQueryCompetingPage } from "./types";
import type { UnifiedInsight } from "./unified-insights";
import { CATEGORY_LABELS, getSourceLabel } from "./unified-insights";
import {
  buildSearchEvidenceSections,
  buildTrafficEvidenceSections,
} from "./insight-evidence";
import type { InsightRationaleContext } from "./insight-rationale";
import { formatChange, formatSessionComparison } from "./utils";

export type InsightDetailRow = {
  label: string;
  current?: string;
  previous?: string;
  value?: string;
};

export type InsightDetailSection = {
  title: string;
  description?: string;
  rows: InsightDetailRow[];
  /** comparison = 3-col table; list = label / value rows */
  layout?: "comparison" | "list";
  previousLabel?: string;
};

export type InsightDetailTrendPoint = {
  date: string;
  clicks: number;
  impressions: number;
  position: number;
};

export type InsightDetailModel = {
  title: string;
  subtitle?: string;
  source: UnifiedInsight["source"];
  sourceLabel: string;
  recommendation: string;
  sections: InsightDetailSection[];
  trend?: InsightDetailTrendPoint[];
  meta: InsightDetailRow[];
  caveat?: string;
};

function fmtNum(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return value.toLocaleString();
}

function fmtPct(value: number | null | undefined, suffix = "%") {
  if (value === null || value === undefined) return "—";
  return `${value}${suffix}`;
}

function fmtDelta(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return formatChange(value);
}

function buildSearchDetail(row: UnifiedInsight): InsightDetailModel {
  const search = row.search!;
  const sections: InsightDetailSection[] = [
    ...buildSearchEvidenceSections(row),
    {
      title: "Period comparison",
      layout: "comparison",
      previousLabel: "Prior period",
      rows: [
        {
          label: "Clicks",
          current: fmtNum(search.clicks),
          previous: fmtNum(search.previousClicks),
        },
        {
          label: "Impressions",
          current: fmtNum(search.impressions),
          previous: fmtNum(search.previousImpressions),
        },
        {
          label: "Avg. position",
          current: fmtPct(search.position, ""),
          previous: fmtNum(search.previousPosition),
        },
      ],
    },
    {
      title: "Rates & changes",
      layout: "list",
      rows: [
        { label: "CTR", value: fmtPct(search.ctr) },
        {
          label: "Clicks change",
          value: fmtDelta(search.clicksChange),
        },
        {
          label: "Impressions change",
          value: fmtDelta(search.impressionsChange),
        },
        {
          label: "Rank change",
          value:
            search.positionChange === null
              ? "—"
              : `${search.positionChange >= 0 ? "+" : ""}${search.positionChange} positions`,
        },
      ],
    },
    {
      title: "Opportunity model",
      layout: "list",
      rows: [
        {
          label: "Expected CTR at rank",
          value: fmtPct(search.expectedCtr),
        },
        {
          label: "Expected clicks at benchmark",
          value: fmtNum(search.expectedClicks),
        },
        {
          label: "Potential extra clicks",
          value:
            search.potentialClicksGain > 0
              ? `+${search.potentialClicksGain}`
              : "0",
        },
      ],
    },
  ];

  if (search.topPage) {
    sections.push({
      title: "Landing page",
      layout: "list",
      rows: [{ label: "Top page", value: search.topPage }],
    });
  }

  if (search.competingPages && search.competingPages.length > 0) {
    sections.push({
      title: "Competing pages",
      layout: "list",
      rows: search.competingPages.map((page: SearchQueryCompetingPage) => ({
        label: page.path,
        value: `${page.impressions.toLocaleString()} imp · pos ${page.position}`,
      })),
    });
  }

  const trend = search.trend.map((point) => ({
    date: point.date,
    clicks: point.clicks,
    impressions: point.impressions,
    position: point.position,
  }));

  return {
    title: search.query,
    subtitle: row.subject,
    source: "search",
    sourceLabel: getSourceLabel("search"),
    recommendation: row.label,
    sections,
    trend: trend.length > 0 ? trend : undefined,
    meta: buildMetaRows(row),
  };
}

function buildTrafficDetail(
  row: UnifiedInsight,
  context: InsightRationaleContext,
): InsightDetailModel {
  const traffic = row.traffic!;
  const sections: InsightDetailSection[] = [
    ...buildTrafficEvidenceSections(row, context),
  ];

  const comparisonRows: InsightDetailRow[] = [
    {
      label: "Sessions",
      current: fmtNum(traffic.sessions),
      previous: fmtNum(traffic.previousSessions),
    },
  ];

  sections.push({
    title: "Period comparison",
    layout: "comparison",
    previousLabel: "Prior period",
    rows: comparisonRows,
  });

  const vsSiteRows: InsightDetailRow[] = [];

  if (traffic.bounceRate !== undefined) {
    vsSiteRows.push({
      label: "Bounce rate",
      current: fmtPct(traffic.bounceRate),
      previous:
        context.siteBounceRate !== undefined
          ? fmtPct(context.siteBounceRate)
          : undefined,
    });
  }

  if (traffic.engagementRate !== undefined) {
    vsSiteRows.push({
      label: "Engagement rate",
      current: fmtPct(traffic.engagementRate),
      previous:
        context.siteEngagementRate !== undefined
          ? fmtPct(context.siteEngagementRate)
          : undefined,
    });
  }

  if (vsSiteRows.length > 0) {
    sections.push({
      title: "Vs site average",
      layout: "comparison",
      previousLabel: "Site avg",
      rows: vsSiteRows,
    });
  }

  const summaryRows: InsightDetailRow[] = [];

  if (traffic.sessionsChange !== null) {
    summaryRows.push({
      label: "Session change",
      value:
        formatSessionComparison(
          traffic.sessions,
          traffic.previousSessions,
          traffic.sessionsChange,
        ) ?? fmtDelta(traffic.sessionsChange),
    });
  }

  if (context.siteSessions) {
    summaryRows.push({
      label: "Share of site sessions",
      value: fmtPct(
        Math.round((traffic.sessions / context.siteSessions) * 1000) / 10,
      ),
    });
  }

  if (traffic.metricValue !== undefined) {
    const label = traffic.tags.includes("low_engagement")
      ? "Avg. time on page"
      : traffic.tags.includes("conversion_leak")
        ? "Form submit rate"
        : traffic.tags.includes("retention_gap")
          ? "New visitor share"
          : traffic.tags.includes("mobile_gap")
            ? "Mobile session share"
            : "Metric";
    summaryRows.push({
      label,
      value: traffic.tags.includes("low_engagement")
        ? `${traffic.metricValue}s`
        : fmtPct(traffic.metricValue),
    });
  }

  if (traffic.formStarts !== undefined) {
    summaryRows.push({
      label: "Form starts / submits",
      value: `${traffic.formStarts} / ${traffic.formSubmits ?? 0}`,
    });
  }

  summaryRows.push({
    label: "Priority score",
    value: `${row.impactScore}/100`,
  });

  if (summaryRows.length > 0) {
    sections.push({
      title: "Summary",
      layout: "list",
      rows: summaryRows,
    });
  }

  return {
    title: row.subject ?? traffic.label,
    subtitle: CATEGORY_LABELS[row.category],
    source: "traffic",
    sourceLabel: getSourceLabel("traffic"),
    recommendation: row.label,
    sections,
    meta: buildMetaRows(row),
  };
}

function buildCombinedDetail(row: UnifiedInsight): InsightDetailModel {
  const combined = row.combined!;
  const gsc = combined.gsc ?? {};
  const ga4 = combined.ga4 ?? {};
  const sections: InsightDetailSection[] = [
    {
      title: "Search Console",
      layout: "list",
      rows: [
        {
          label: "Query",
          value: combined.query ?? "—",
        },
        {
          label: "Clicks",
          value: fmtNum(gsc.clicks as number | undefined),
        },
        {
          label: "Impressions",
          value: fmtNum(gsc.impressions as number | undefined),
        },
        {
          label: "Potential gain",
          value:
            gsc.potentialClicksGain && (gsc.potentialClicksGain as number) > 0
              ? `+${gsc.potentialClicksGain}`
              : "—",
        },
      ],
    },
    {
      title: "GA4 landing",
      layout: "list",
      rows: [
        {
          label: "Path",
          value: combined.path ?? "—",
        },
        {
          label: "Sessions",
          value: fmtNum(ga4.sessions as number | undefined),
        },
        {
          label: "Bounce rate",
          value: fmtPct(ga4.bounceRate as number | undefined),
        },
        {
          label: "Engagement",
          value: fmtPct(ga4.engagementRate as number | undefined),
        },
      ],
    },
  ];

  return {
    title: combined.query ?? combined.path ?? row.label,
    subtitle: row.subject,
    source: "combined",
    sourceLabel: getSourceLabel("combined"),
    recommendation: row.label,
    sections,
    caveat: combined.gscNote,
    meta: buildMetaRows(row),
  };
}

function buildDerivedDetail(row: UnifiedInsight): InsightDetailModel {
  const derived = row.derived!;
  const sections: InsightDetailSection[] = [
    {
      title: "Signal",
      layout: "list",
      rows: [
        { label: "Tags", value: derived.tags.join(", ") || "—" },
        {
          label: "Impact score",
          value: `${derived.impactScore}`,
        },
        ...(derived.path
          ? [{ label: "Path", value: derived.path }]
          : []),
        ...(derived.query
          ? [{ label: "Query", value: derived.query }]
          : []),
      ],
    },
  ];

  if (derived.metrics && Object.keys(derived.metrics).length > 0) {
    sections.push({
      title: "Metrics",
      layout: "list",
      rows: Object.entries(derived.metrics).map(([key, value]) => ({
        label: key,
        value: String(value),
      })),
    });
  }

  return {
    title: derived.subject ?? derived.label,
    subtitle: CATEGORY_LABELS[row.category],
    source: row.source,
    sourceLabel: getSourceLabel(row.source),
    recommendation: row.label,
    sections,
    caveat: derived.coverageNote ?? derived.gscNote,
    meta: buildMetaRows(row),
  };
}

function buildMetaRows(row: UnifiedInsight): InsightDetailRow[] {
  return [
    { label: "Category", value: CATEGORY_LABELS[row.category] },
    { label: "Action", value: row.action },
    { label: "Impact label", value: row.impactLabel },
    { label: "Raw impact", value: String(row.rawImpact) },
    { label: "Tags", value: row.tags.join(", ") || "—" },
  ];
}

export function buildInsightDetailModel(
  row: UnifiedInsight | null,
  context: InsightRationaleContext,
): InsightDetailModel | null {
  if (!row) return null;

  if (row.source === "search" && row.search) {
    return buildSearchDetail(row);
  }

  if (row.source === "traffic" && row.traffic) {
    return buildTrafficDetail(row, context);
  }

  if (row.source === "combined" && row.combined) {
    return buildCombinedDetail(row);
  }

  if (row.derived) {
    return buildDerivedDetail(row);
  }

  return {
    title: row.subject ?? "Insight",
    source: row.source,
    sourceLabel: getSourceLabel(row.source),
    recommendation: row.label,
    sections: [],
    meta: buildMetaRows(row),
  };
}
