import type {
  ChannelRow,
  ProgramInsights,
  SearchQueryInsightTag,
  TrafficInsight,
  TrafficInsightTag,
} from "./types";
import type { UnifiedInsight } from "./unified-insights";
import type { InsightDetailRow, InsightDetailSection } from "./insight-detail-data";
import type { InsightRationaleContext } from "./insight-rationale";
import { formatSessionComparison } from "./utils";

export type InsightDetailContext = InsightRationaleContext & {
  channels?: ChannelRow[];
  programInsights?: ProgramInsights | null;
};

const SEARCH_TAG_TRIGGERS: Partial<Record<SearchQueryInsightTag, string>> = {
  low_ctr: "CTR is well below the expected benchmark for this rank.",
  cannibalized: "Multiple site pages compete for the same query.",
  rising: "Clicks or average position improved vs the prior period.",
  declining: "Clicks or average position dropped vs the prior period.",
  page_two: "Query ranks on page 2 (positions 11–20) with enough volume.",
  page_one: "Query ranks on page 1.",
  striking_distance: "Close to page 1 with room to improve.",
  new: "Query appeared in this period with no prior-period clicks.",
  accelerating: "Recent daily trend is improving faster than the period average.",
  impression_surge: "Impressions grew sharply vs the prior period.",
  question: "Question-style query — FAQ or snippet opportunity.",
  local: "Local intent query.",
  opportunity: "Meets opportunity scoring thresholds.",
};

const TRAFFIC_TAG_TRIGGERS: Partial<Record<TrafficInsightTag, string>> = {
  rising_channel:
    "Default channel group sessions grew ≥20% with ≥20 sessions this period.",
  rising_source:
    "Source/medium sessions grew ≥25% with ≥15 sessions this period.",
  declining_channel:
    "Default channel group sessions fell ≥20% with ≥25 sessions in the prior period.",
  declining_source:
    "Source/medium sessions fell ≥25% with ≥20 sessions in the prior period.",
  high_bounce:
    "Landing bounce rate is ≥8pp above site average or ≥65% on ≥15 sessions.",
  low_engagement:
    "Page avg. time is below 55% of the site average on ≥40 views.",
  conversion_leak: "Form submit rate is below 45% on ≥5 form starts.",
  retention_gap:
    "New visitors are ≥72% of audience with meaningful return traffic.",
  mobile_gap:
    "Mobile is ≥45% of sessions with higher sessions-per-user vs desktop.",
};

function fmtNum(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return value.toLocaleString();
}

function triggerRows(tags: string[], map: Record<string, string>): InsightDetailRow[] {
  const rules = tags
    .map((tag) => map[tag])
    .filter(Boolean) as string[];

  if (rules.length === 0) {
    return [{ label: "Rule", value: "Matched insight scoring rules." }];
  }

  return rules.map((rule, index) => ({
    label: rules.length === 1 ? "Rule" : `Rule ${index + 1}`,
    value: rule,
  }));
}

function buildSearchSourceData(row: UnifiedInsight): InsightDetailSection {
  const search = row.search!;
  return {
    title: "Source data",
    layout: "list",
    rows: [
      { label: "Data source", value: "Google Search Console" },
      { label: "Keyword", value: search.query },
      { label: "Clicks (this period)", value: fmtNum(search.clicks) },
      { label: "Impressions (this period)", value: fmtNum(search.impressions) },
      { label: "Avg. position", value: String(search.position) },
      { label: "CTR", value: `${search.ctr}%` },
    ],
  };
}

function buildSearchTriggerSection(row: UnifiedInsight): InsightDetailSection {
  return {
    title: "Trigger rules",
    layout: "list",
    rows: triggerRows(row.tags, SEARCH_TAG_TRIGGERS),
  };
}

function buildChannelSourceSection(
  channelName: string,
  context: InsightDetailContext,
): InsightDetailSection | null {
  const channel = context.channels?.find((entry) => entry.name === channelName);
  const sources = channel?.sources ?? [];
  if (sources.length === 0) return null;

  const hasPrior = sources.some(
    (source) => source.previousSessions !== undefined,
  );

  if (hasPrior) {
    return {
      title: "Top sources in channel",
      description:
        "GA4 sessionSource values within this channel (UTM source tags or referrers).",
      layout: "comparison",
      previousLabel: "Prior period",
      rows: sources.map((source) => ({
        label: source.source,
        current: fmtNum(source.sessions),
        previous: fmtNum(source.previousSessions),
      })),
    };
  }

  return {
    title: "Top sources in channel",
    description:
      "GA4 sessionSource values within this channel (UTM source tags or referrers).",
    layout: "list",
    rows: sources.map((source) => ({
      label: source.source,
      value: `${fmtNum(source.sessions)} sessions`,
    })),
  };
}

function buildTrafficSourceData(
  row: UnifiedInsight,
  traffic: TrafficInsight,
  context: InsightDetailContext,
): InsightDetailSection {
  const rows: InsightDetailRow[] = [
    { label: "Data source", value: "Google Analytics 4" },
  ];

  if (traffic.kind === "channel" && traffic.channel) {
    rows.push(
      { label: "Dimension", value: "Default channel group" },
      { label: "Channel", value: traffic.channel },
    );
  } else if (traffic.kind === "source" && traffic.source) {
    rows.push(
      { label: "Dimension", value: "Session source / medium" },
      { label: "Source", value: traffic.source },
      { label: "Medium", value: traffic.medium ?? "(none)" },
    );
  } else if (traffic.path) {
    rows.push(
      {
        label: "Dimension",
        value:
          traffic.kind === "landing" ? "Landing page" : "Page path",
      },
      { label: "Page", value: traffic.path },
    );
  } else if (traffic.kind === "program") {
    rows.push(
      { label: "Dimension", value: "Program-scoped aggregate" },
      { label: "Metric", value: traffic.label },
    );
  }

  if (traffic.sessionsChange !== null && traffic.previousSessions != null) {
    rows.push({
      label: "Sessions",
      value:
        formatSessionComparison(
          traffic.sessions,
          traffic.previousSessions,
          traffic.sessionsChange,
        ) ?? `${traffic.previousSessions} → ${traffic.sessions}`,
    });
  } else {
    rows.push({ label: "Sessions", value: fmtNum(traffic.sessions) });
  }

  if (traffic.bounceRate !== undefined) {
    rows.push({ label: "Bounce rate", value: `${traffic.bounceRate}%` });
  }

  if (traffic.engagementRate !== undefined) {
    rows.push({ label: "Engagement rate", value: `${traffic.engagementRate}%` });
  }

  if (context.siteBounceRate !== undefined && traffic.bounceRate !== undefined) {
    rows.push({
      label: "Site bounce rate",
      value: `${context.siteBounceRate}%`,
    });
  }

  if (
    context.siteEngagementRate !== undefined &&
    traffic.engagementRate !== undefined
  ) {
    rows.push({
      label: "Site engagement rate",
      value: `${context.siteEngagementRate}%`,
    });
  }

  if (traffic.metricValue !== undefined && traffic.tags.includes("low_engagement")) {
    rows.push({
      label: "Avg. time on page",
      value: `${traffic.metricValue}s`,
    });
    if (context.siteAvgEngagementSec !== undefined) {
      rows.push({
        label: "Site avg. time on page",
        value: `${context.siteAvgEngagementSec}s`,
      });
    }
  }

  return {
    title: "Source data",
    layout: "list",
    rows,
  };
}

function buildProgramEvidence(
  traffic: TrafficInsight,
  programInsights: ProgramInsights,
): InsightDetailSection[] {
  const sections: InsightDetailSection[] = [];

  if (traffic.tags.includes("retention_gap")) {
    const { audience } = programInsights;
    const total = audience.newUsers + audience.returningUsers || 1;
    sections.push({
      title: "Audience breakdown",
      layout: "list",
      rows: [
        { label: "New users", value: fmtNum(audience.newUsers) },
        { label: "Returning users", value: fmtNum(audience.returningUsers) },
        {
          label: "New user share",
          value: `${Math.round((audience.newUsers / total) * 1000) / 10}%`,
        },
        { label: "New sessions", value: fmtNum(audience.newSessions) },
        {
          label: "Returning sessions",
          value: fmtNum(audience.returningSessions),
        },
      ],
    });
  }

  if (traffic.tags.includes("conversion_leak")) {
    const { engagement } = programInsights;
    sections.push({
      title: "Form events",
      layout: "list",
      rows: [
        { label: "Form starts", value: fmtNum(engagement.formStarts) },
        { label: "Form submits", value: fmtNum(engagement.formSubmits) },
        {
          label: "Submit rate",
          value: `${traffic.metricValue ?? 0}%`,
        },
      ],
    });
  }

  if (traffic.tags.includes("mobile_gap")) {
    const mobile = programInsights.devices.find(
      (device) => device.category === "mobile",
    );
    const desktop = programInsights.devices.find(
      (device) => device.category === "desktop",
    );
    const rows: InsightDetailRow[] = [];

    if (mobile) {
      rows.push(
        { label: "Mobile sessions", value: fmtNum(mobile.sessions) },
        { label: "Mobile users", value: fmtNum(mobile.users) },
      );
    }
    if (desktop) {
      rows.push(
        { label: "Desktop sessions", value: fmtNum(desktop.sessions) },
        { label: "Desktop users", value: fmtNum(desktop.users) },
      );
    }

    if (rows.length > 0) {
      sections.push({
        title: "Device breakdown",
        layout: "list",
        rows,
      });
    }
  }

  return sections;
}

function buildTrafficTriggerSection(row: UnifiedInsight): InsightDetailSection {
  return {
    title: "Trigger rules",
    layout: "list",
    rows: triggerRows(row.tags, TRAFFIC_TAG_TRIGGERS),
  };
}

export function buildSearchEvidenceSections(
  row: UnifiedInsight,
): InsightDetailSection[] {
  return [buildSearchSourceData(row), buildSearchTriggerSection(row)];
}

export function buildTrafficEvidenceSections(
  row: UnifiedInsight,
  context: InsightDetailContext,
): InsightDetailSection[] {
  const traffic = row.traffic;
  if (!traffic) return [];

  const sections: InsightDetailSection[] = [
    buildTrafficSourceData(row, traffic, context),
    buildTrafficTriggerSection(row),
  ];

  if (traffic.kind === "channel" && traffic.channel) {
    const channelSources = buildChannelSourceSection(traffic.channel, context);
    if (channelSources) {
      sections.push(channelSources);
    }
  }

  if (traffic.kind === "program" && context.programInsights) {
    sections.push(
      ...buildProgramEvidence(traffic, context.programInsights),
    );
  }

  return sections;
}
