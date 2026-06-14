import { normalizeDerivedInsights } from "./normalize-derived-insights";
import { normalizeSearchInsights } from "./normalize-insights";
import { normalizeTrafficInsights } from "./normalize-traffic-insights";
import type {
  AnalyticsDashboardData,
  DerivedInsight,
  DerivedInsightCategory,
  SearchQueryInsight,
  SearchQueryInsightsSummary,
  TrafficInsight,
  TrafficInsightsSummary,
} from "./types";

export type UnifiedInsightSource =
  | "search"
  | "traffic"
  | "combined"
  | "audience"
  | "gsc_page"
  | "navigation"
  | "utm";

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
  combined?: DerivedInsight;
  derived?: DerivedInsight;
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

const SEARCH_ACTION_LABELS: Record<string, string> = {
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

const TRAFFIC_ACTION_LABELS: Record<string, string> = {
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

const SOURCE_LABELS: Record<UnifiedInsightSource, string> = {
  search: "Search (GSC)",
  traffic: "Traffic (GA4)",
  combined: "GSC + GA4",
  audience: "Audience (GA4)",
  gsc_page: "GSC pages",
  navigation: "Navigation (GA4)",
  utm: "UTM campaigns",
};

function normalizePath(path: string | undefined | null) {
  if (!path || path === "(not set)") return "";
  const trimmed = path.trim();
  if (!trimmed || trimmed === "/") return "/";
  return trimmed.replace(/\/+$/, "") || "/";
}

function searchActionLabel(action: string) {
  return SEARCH_ACTION_LABELS[action] ?? "Review";
}

function trafficActionLabel(action: string) {
  return TRAFFIC_ACTION_LABELS[action] ?? "Review";
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

function fromCombinedRow(
  row: DerivedInsight,
  category: UnifiedInsightCategory,
): Omit<UnifiedInsight, "impactScore"> {
  const ga4 = row.ga4 as { sessionsChange?: number | null } | undefined;
  const gsc = row.gsc as { potentialClicksGain?: number } | undefined;
  const rawImpact =
    row.impactScore > 0
      ? row.impactScore
      : gsc?.potentialClicksGain ?? row.impactScore;

  return {
    id: `combined:${row.id}`,
    source: "combined",
    category,
    label: row.actionDetail,
    subject: row.subject ?? row.query ?? row.path,
    action: row.action,
    actionDetail: row.actionDetail,
    rawImpact,
    impactLabel:
      gsc?.potentialClicksGain && gsc.potentialClicksGain > 0
        ? `+${gsc.potentialClicksGain} clicks`
        : `${rawImpact}`,
    change: ga4?.sessionsChange ?? null,
    secondaryMetricLabel: row.path ? "Path" : undefined,
    secondaryMetric: row.path,
    tags: row.tags,
    combined: row,
  };
}

function fromDerivedRow(
  row: DerivedInsight,
  source: Exclude<UnifiedInsightSource, "search" | "traffic" | "combined">,
  category: UnifiedInsightCategory,
): Omit<UnifiedInsight, "impactScore"> {
  return {
    id: `${source}:${row.id}`,
    source,
    category,
    label: row.actionDetail,
    subject: row.subject ?? row.path ?? row.label,
    action: row.action,
    actionDetail: row.actionDetail,
    rawImpact: row.impactScore,
    impactLabel: `${row.impactScore}`,
    change: null,
    secondaryMetricLabel: row.path ? "Path" : undefined,
    secondaryMetric: row.path,
    tags: row.tags,
    derived: row,
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

function appendDerivedSection(
  items: Omit<UnifiedInsight, "impactScore">[],
  rows: DerivedInsight[],
  source: Exclude<UnifiedInsightSource, "search" | "traffic" | "combined">,
  category: UnifiedInsightCategory,
) {
  for (const row of rows) {
    items.push(fromDerivedRow(row, source, category));
  }
}

function appendCombinedSection(
  items: Omit<UnifiedInsight, "impactScore">[],
  rows: DerivedInsight[],
  category: UnifiedInsightCategory,
) {
  for (const row of rows) {
    items.push(fromCombinedRow(row, category));
  }
}

function normalizeImpactScores(
  items: Omit<UnifiedInsight, "impactScore">[],
): UnifiedInsight[] {
  const maxRaw = items.reduce((max, row) => Math.max(max, row.rawImpact), 0);

  return items.map((row) => ({
    ...row,
    impactScore:
      maxRaw > 0 ? Math.round((row.rawImpact / maxRaw) * 1000) / 10 : 0,
  }));
}

function replaceSingleSourceRows(
  items: Omit<UnifiedInsight, "impactScore">[],
): Omit<UnifiedInsight, "impactScore">[] {
  const combined = items.filter((row) => row.source === "combined");
  if (combined.length === 0) return items;

  const suppressSearchQueries = new Set<string>();
  const suppressTrafficPaths = new Set<string>();

  for (const row of combined) {
    const c = row.combined;
    if (!c) continue;
    if (c.query) suppressSearchQueries.add(c.query);
    if (c.path) suppressTrafficPaths.add(normalizePath(c.path));
  }

  return items.filter((row) => {
    if (row.source === "combined") return true;

    if (row.source === "search" && row.search) {
      if (!suppressSearchQueries.has(row.search.query)) return true;
      const combinedForQuery = combined.find(
        (c) => c.combined?.query === row.search?.query,
      );
      const combinedPath = normalizePath(combinedForQuery?.combined?.path ?? "");
      const searchPath = normalizePath(row.search.topPage ?? "");
      if (!combinedPath || !searchPath) return false;
      return combinedPath !== searchPath;
    }

    if (row.source === "traffic" && row.traffic?.path) {
      const path = normalizePath(row.traffic.path);
      if (!suppressTrafficPaths.has(path)) return true;
      if (row.traffic.kind !== "landing" && row.traffic.kind !== "page") {
        return true;
      }
      return false;
    }

    return true;
  });
}

export function buildUnifiedInsights(
  search: SearchQueryInsightsSummary,
  traffic: TrafficInsightsSummary,
  options: {
    cross?: ReturnType<typeof normalizeDerivedInsights>;
    audience?: ReturnType<typeof normalizeDerivedInsights>;
    gscPage?: ReturnType<typeof normalizeDerivedInsights>;
    navigation?: ReturnType<typeof normalizeDerivedInsights>;
    utm?: ReturnType<typeof normalizeDerivedInsights>;
  } = {},
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

  const cross = options.cross ?? normalizeDerivedInsights(null);
  appendCombinedSection(items, cross.quick_wins, "quick_wins");
  appendCombinedSection(items, cross.cannibalization, "cannibalization");
  appendCombinedSection(items, cross.conversion, "conversion");
  appendCombinedSection(items, cross.rising, "rising");
  appendCombinedSection(items, cross.watchlist, "watchlist");

  const audience = options.audience ?? normalizeDerivedInsights(null);
  appendDerivedSection(items, audience.quick_wins, "audience", "quick_wins");
  appendDerivedSection(items, audience.conversion, "audience", "conversion");
  appendDerivedSection(items, audience.rising, "audience", "rising");
  appendDerivedSection(items, audience.watchlist, "audience", "watchlist");

  const gscPage = options.gscPage ?? normalizeDerivedInsights(null);
  appendDerivedSection(items, gscPage.quick_wins, "gsc_page", "quick_wins");
  appendDerivedSection(items, gscPage.watchlist, "gsc_page", "watchlist");

  const navigation = options.navigation ?? normalizeDerivedInsights(null);
  appendDerivedSection(items, navigation.quick_wins, "navigation", "quick_wins");
  appendDerivedSection(
    items,
    navigation.conversion,
    "navigation",
    "conversion",
  );
  appendDerivedSection(items, navigation.watchlist, "navigation", "watchlist");

  const utm = options.utm ?? normalizeDerivedInsights(null);
  appendDerivedSection(items, utm.quick_wins, "utm", "quick_wins");
  appendDerivedSection(items, utm.watchlist, "utm", "watchlist");

  const deduped = replaceSingleSourceRows(items);

  const byId = new Map<string, Omit<UnifiedInsight, "impactScore">>();
  for (const row of deduped) {
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

  return buildUnifiedInsights(search, traffic, {
    cross: normalizeDerivedInsights(data.crossInsights),
    audience: normalizeDerivedInsights(data.audienceInsights),
    gscPage: normalizeDerivedInsights(data.gscPageInsights),
    navigation: normalizeDerivedInsights(data.programInsightsRules),
    utm: normalizeDerivedInsights(data.utmInsights),
  });
}

export function getSourceLabel(source: UnifiedInsightSource) {
  return SOURCE_LABELS[source];
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
      label = getSourceLabel(row.source);
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
          ? getSourceLabel(key as UnifiedInsightSource)
          : key,
    rows: rows.sort((a, b) => b.impactScore - a.impactScore),
  }));

  if (order) {
    entries.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
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
  const validSources: UnifiedInsightSourceFilter[] = [
    "all",
    "search",
    "traffic",
    "combined",
    "audience",
    "gsc_page",
    "navigation",
    "utm",
  ];
  if (
    sourceParam &&
    validSources.includes(sourceParam as UnifiedInsightSourceFilter)
  ) {
    source = sourceParam as UnifiedInsightSourceFilter;
  } else if (legacySection === "search" || legacySection === "traffic") {
    source = legacySection;
  }

  let category: UnifiedInsightsFilters["category"] = "all";
  const categoryParam = params.get("category")?.trim();
  if (categoryParam && categoryParam in CATEGORY_LABELS) {
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
