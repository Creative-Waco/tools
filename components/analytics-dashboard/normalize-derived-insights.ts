import type {
  DerivedInsight,
  DerivedInsightCategory,
  DerivedInsightsSummary,
} from "./types";

export const EMPTY_DERIVED_INSIGHTS: DerivedInsightsSummary = {
  quick_wins: [],
  cannibalization: [],
  conversion: [],
  rising: [],
  watchlist: [],
  all: [],
};

function normalizeRow(row: Partial<DerivedInsight>): DerivedInsight {
  return {
    id: row.id ?? "",
    kind: row.kind,
    tags: row.tags ?? [],
    category: (row.category ?? "watchlist") as DerivedInsightCategory,
    label: row.label ?? row.actionDetail ?? "",
    subject: row.subject,
    action: row.action ?? "Review",
    actionDetail: row.actionDetail ?? "",
    impactScore: row.impactScore ?? 0,
    query: row.query,
    path: row.path,
    gscNote: row.gscNote,
    coverageNote: row.coverageNote,
    gsc: row.gsc,
    ga4: row.ga4,
    metrics: row.metrics,
    ...row,
  };
}

function normalizeList(rows: Partial<DerivedInsight>[] | undefined) {
  return (rows ?? []).map(normalizeRow);
}

export function normalizeDerivedInsights(
  raw: Partial<DerivedInsightsSummary> | null | undefined,
): DerivedInsightsSummary {
  if (!raw) return EMPTY_DERIVED_INSIGHTS;

  return {
    quick_wins: normalizeList(raw.quick_wins),
    cannibalization: normalizeList(raw.cannibalization),
    conversion: normalizeList(raw.conversion),
    rising: normalizeList(raw.rising),
    watchlist: normalizeList(raw.watchlist),
    all: normalizeList(raw.all),
  };
}

export function flattenDerivedInsights(
  summary: DerivedInsightsSummary,
): DerivedInsight[] {
  const byId = new Map<string, DerivedInsight>();
  for (const row of summary.all) {
    if (!byId.has(row.id)) {
      byId.set(row.id, row);
    }
  }
  return Array.from(byId.values());
}
