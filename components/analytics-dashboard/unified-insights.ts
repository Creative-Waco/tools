import { normalizeSearchInsights } from "./normalize-insights";
import { normalizeTrafficInsights } from "./normalize-traffic-insights";
import type {
  AnalyticsDashboardData,
  SearchQueryAction,
  SearchQueryInsight,
  SearchQueryInsightsSummary,
  TrafficInsight,
  TrafficInsightAction,
  TrafficInsightsSummary,
} from "./types";

export type UnifiedInsightSource = "search" | "traffic";

export type UnifiedInsightCategory =
  | "quick_wins"
  | "cannibalization"
  | "conversion"
  | "rising"
  | "watchlist";

export type UnifiedInsightGroupBy = "category" | "action" | "source" | "none";

export type UnifiedInsightSourceFilter = "all" | UnifiedInsightSource;

export type UnifiedInsight = {
  id: string;
  source: UnifiedInsightSource;
  category: UnifiedInsightCategory;
  /** Actionable recommendation — primary display text. */
  label: string;
  /** Query, path, channel, or source/medium — secondary context. */
  subject?: string;
  action: string;
  actionDetail: string;
  rawImpact: number;
  impactScore: number;
  impactLabel: string;
  change: number | null;
  secondaryMetricLabel?: string;
  secondaryMetric?: string;
  tags: string[];
  search?: SearchQueryInsight;
  traffic?: TrafficInsight;
};

export type UnifiedInsightsFilters = {
  source: UnifiedInsightSourceFilter;
  category: UnifiedInsightCategory | "all";
  groupBy: UnifiedInsightGroupBy;
  minImpact: number;
};

export const DEFAULT_UNIFIED_FILTERS: UnifiedInsightsFilters = {
  source: "all",
  category: "all",
  groupBy: "none",
  minImpact: 0,
};

export const CATEGORY_LABELS: Record<UnifiedInsightCategory, string> = {
  quick_wins: "Quick wins",
  cannibalization: "Cannibalization",
  conversion: "Conversion & experience",
  rising: "Rising",
  watchlist: "Watchlist",
};

const SEARCH_ACTION_LABELS: Record<SearchQueryAction, string> = {
  snippet: "Fix snippet",
  content: "Expand content",
  redirect: "Redirect",
  merge: "Merge pages",
  differentiate: "Differentiate",
  refresh: "Refresh page",
  faq: "Add FAQ",
  monitor: "Monitor",
  review: "Review",
};

const TRAFFIC_ACTION_LABELS: Record<TrafficInsightAction, string> = {
  landing_page: "Fix landing",
  content: "Expand content",
  cta: "Improve CTA",
  form: "Fix forms",
  campaign: "Scale channel",
  mobile: "Fix mobile",
  navigation: "Fix nav",
  monitor: "Monitor",
  review: "Review",
};

function searchActionLabel(action: SearchQueryAction | string) {
  return SEARCH_ACTION_LABELS[action as SearchQueryAction] ?? "Review";
}

function trafficActionLabel(action: TrafficInsightAction | string) {
  return TRAFFIC_ACTION_LABELS[action as TrafficInsightAction] ?? "Review";
}

function searchSubject(row: SearchQueryInsight): string {
  return row.topPage ? `${row.query} · ${row.topPage}` : row.query;
}

function trafficSubject(row: TrafficInsight): string | undefined {
  if (row.path) return row.path;
  if (row.kind === "channel" && row.channel) return row.channel;
  if (row.kind === "source" && row.source) {
    return row.medium ? `${row.source} / ${row.medium}` : row.source;
  }
  if (row.kind === "program") return "Site-wide";
  return undefined;
}

function fromSearchRow(
  row: SearchQueryInsight,
  category: UnifiedInsightCategory,
): Omit<UnifiedInsight, "impactScore"> {
  const rawImpact =
    row.potentialClicksGain > 0 ? row.potentialClicksGain : row.opportunityScore;

  return {
    id: `search:${category}:${row.query}`,
    source: "search",
    category,
    label: row.actionDetail,
    subject: searchSubject(row),
    action: searchActionLabel(row.action),
    actionDetail: row.actionDetail,
    rawImpact,
    impactLabel:
      row.potentialClicksGain > 0
        ? `+${row.potentialClicksGain} clicks`
        : `${rawImpact}`,
    change: row.clicksChange,
    secondaryMetricLabel: "Visibility",
    secondaryMetric: `Pos ${row.position} · ${row.impressions.toLocaleString()} imp`,
    tags: row.tags,
    search: row,
  };
}

function fromTrafficRow(
  row: TrafficInsight,
  category: UnifiedInsightCategory,
): Omit<UnifiedInsight, "impactScore"> {
  let secondaryMetricLabel: string | undefined;
  let secondaryMetric: string | undefined;
  if (row.bounceRate !== undefined) {
    secondaryMetricLabel = "Bounce rate";
    secondaryMetric = `${row.bounceRate}%`;
  } else if (row.metricValue !== undefined) {
    secondaryMetricLabel = row.tags.includes("low_engagement")
      ? "Avg. time"
      : "Engagement";
    secondaryMetric = row.tags.includes("low_engagement")
      ? `${row.metricValue}s`
      : `${row.metricValue}%`;
  } else if (row.engagementRate !== undefined) {
    secondaryMetricLabel = "Engagement";
    secondaryMetric = `${row.engagementRate}%`;
  }

  return {
    id: `traffic:${category}:${row.id}`,
    source: "traffic",
    category,
    label: row.actionDetail,
    subject: trafficSubject(row),
    action: trafficActionLabel(row.action),
    actionDetail: row.actionDetail,
    rawImpact: row.impactScore,
    impactLabel: `${row.impactScore}`,
    change: row.sessionsChange,
    secondaryMetricLabel,
    secondaryMetric,
    tags: row.tags,
    traffic: row,
  };
}

function appendSearchSection(
  items: Omit<UnifiedInsight, "impactScore">[],
  rows: SearchQueryInsight[],
  category: UnifiedInsightCategory,
) {
  for (const row of rows) {
    items.push(fromSearchRow(row, category));
  }
}

function appendTrafficSection(
  items: Omit<UnifiedInsight, "impactScore">[],
  rows: TrafficInsight[],
  category: UnifiedInsightCategory,
) {
  for (const row of rows) {
    items.push(fromTrafficRow(row, category));
  }
}

function normalizeImpactScores(
  items: Omit<UnifiedInsight, "impactScore">[],
): UnifiedInsight[] {
  const maxRaw = items.reduce((max, row) => Math.max(max, row.rawImpact), 0);

  return items.map((row) => ({
    ...row,
    impactScore:
      maxRaw > 0
        ? Math.round((row.rawImpact / maxRaw) * 1000) / 10
        : 0,
  }));
}

export function buildUnifiedInsights(
  search: SearchQueryInsightsSummary,
  traffic: TrafficInsightsSummary,
): UnifiedInsight[] {
  const items: Omit<UnifiedInsight, "impactScore">[] = [];

  appendSearchSection(items, search.opportunities, "quick_wins");
  appendSearchSection(items, search.cannibalization, "cannibalization");
  appendSearchSection(items, search.rising, "rising");
  appendSearchSection(items, search.declining, "watchlist");

  const trafficQuickWins = traffic.opportunities.filter(
    (row) =>
      row.tags.includes("high_bounce") ||
      row.tags.includes("low_engagement") ||
      row.tags.includes("retention_gap") ||
      row.tags.includes("mobile_gap"),
  );
  appendTrafficSection(items, trafficQuickWins, "quick_wins");
  appendTrafficSection(items, traffic.conversion, "conversion");
  appendTrafficSection(items, traffic.rising, "rising");
  appendTrafficSection(items, traffic.watchlist, "watchlist");

  const byId = new Map<string, Omit<UnifiedInsight, "impactScore">>();
  for (const row of items) {
    if (!byId.has(row.id)) {
      byId.set(row.id, row);
    }
  }

  const normalized = normalizeImpactScores(Array.from(byId.values()));
  return normalized.sort((a, b) => b.impactScore - a.impactScore);
}

export function buildUnifiedInsightsFromDashboard(
  data: AnalyticsDashboardData | null,
): UnifiedInsight[] {
  if (!data) return [];

  const search = data.searchConsole?.available
    ? normalizeSearchInsights(data.searchConsole.insights)
    : normalizeSearchInsights(null);
  const traffic = normalizeTrafficInsights(data.trafficInsights);

  return buildUnifiedInsights(search, traffic);
}

export function filterUnifiedInsights(
  items: UnifiedInsight[],
  filters: UnifiedInsightsFilters,
): UnifiedInsight[] {
  return items.filter((row) => {
    if (filters.source !== "all" && row.source !== filters.source) {
      return false;
    }
    if (filters.category !== "all" && row.category !== filters.category) {
      return false;
    }
    if (row.impactScore < filters.minImpact) {
      return false;
    }
    return true;
  });
}

export type UnifiedInsightGroup = {
  key: string;
  label: string;
  rows: UnifiedInsight[];
};

export function groupUnifiedInsights(
  items: UnifiedInsight[],
  groupBy: UnifiedInsightGroupBy,
): UnifiedInsightGroup[] {
  if (groupBy === "none") {
    return [{ key: "all", label: "All insights", rows: items }];
  }

  const groups = new Map<string, UnifiedInsight[]>();

  for (const row of items) {
    let key: string;
    let label: string;

    if (groupBy === "category") {
      key = row.category;
      label = CATEGORY_LABELS[row.category];
    } else if (groupBy === "action") {
      key = row.action;
      label = row.action;
    } else {
      key = row.source;
      label = row.source === "search" ? "Search (GSC)" : "Traffic (GA4)";
    }

    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  const order =
    groupBy === "category"
      ? [
          "quick_wins",
          "conversion",
          "cannibalization",
          "rising",
          "watchlist",
        ]
      : null;

  const entries = Array.from(groups.entries()).map(([key, rows]) => ({
    key,
    label:
      groupBy === "category"
        ? CATEGORY_LABELS[key as UnifiedInsightCategory]
        : groupBy === "source"
          ? key === "search"
            ? "Search (GSC)"
            : "Traffic (GA4)"
          : key,
    rows: rows.sort((a, b) => b.impactScore - a.impactScore),
  }));

  if (order) {
    entries.sort(
      (a, b) => order.indexOf(a.key) - order.indexOf(b.key),
    );
  } else {
    entries.sort((a, b) => b.rows[0].impactScore - a.rows[0].impactScore);
  }

  return entries;
}

export function readUnifiedInsightsFilters(
  search = typeof window !== "undefined" ? window.location.search : "",
): UnifiedInsightsFilters {
  const params = new URLSearchParams(search);
  const legacySection = params.get("section")?.trim();

  let source: UnifiedInsightSourceFilter = "all";
  const sourceParam = params.get("source")?.trim();
  if (sourceParam === "search" || sourceParam === "traffic") {
    source = sourceParam;
  } else if (legacySection === "search" || legacySection === "traffic") {
    source = legacySection;
  }

  let category: UnifiedInsightsFilters["category"] = "all";
  const categoryParam = params.get("category")?.trim();
  if (
    categoryParam &&
    categoryParam in CATEGORY_LABELS
  ) {
    category = categoryParam as UnifiedInsightCategory;
  }

  let groupBy: UnifiedInsightGroupBy = "none";
  const groupParam = params.get("group")?.trim();
  if (
    groupParam === "category" ||
    groupParam === "action" ||
    groupParam === "source" ||
    groupParam === "none"
  ) {
    groupBy = groupParam;
  }

  const minImpactParam = Number(params.get("minImpact") ?? "0");
  const minImpact =
    Number.isFinite(minImpactParam) && minImpactParam >= 0
      ? minImpactParam
      : 0;

  return { source, category, groupBy, minImpact };
}

export function unifiedFiltersToSearchParams(
  filters: UnifiedInsightsFilters,
): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.source !== "all") {
    params.set("source", filters.source);
  }
  if (filters.category !== "all") {
    params.set("category", filters.category);
  }
  if (filters.groupBy !== "none") {
    params.set("group", filters.groupBy);
  }
  if (filters.minImpact > 0) {
    params.set("minImpact", String(filters.minImpact));
  }

  return params;
}
