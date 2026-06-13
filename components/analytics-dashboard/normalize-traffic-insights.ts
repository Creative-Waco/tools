import type {
  TrafficInsight,
  TrafficInsightsSummary,
} from "./types";

export const EMPTY_TRAFFIC_INSIGHTS: TrafficInsightsSummary = {
  opportunities: [],
  conversion: [],
  rising: [],
  watchlist: [],
  all: [],
};

function normalizeTrafficRow(
  row: Partial<TrafficInsight>,
): TrafficInsight {
  return {
    id: row.id ?? "",
    kind: row.kind ?? "page",
    label: row.label ?? "",
    path: row.path,
    source: row.source,
    medium: row.medium,
    channel: row.channel,
    sessions: row.sessions ?? 0,
    previousSessions: row.previousSessions ?? null,
    sessionsChange: row.sessionsChange ?? null,
    bounceRate: row.bounceRate,
    engagementRate: row.engagementRate,
    metricValue: row.metricValue,
    formStarts: row.formStarts,
    formSubmits: row.formSubmits,
    impactScore: row.impactScore ?? 0,
    tags: row.tags ?? [],
    action: row.action ?? "monitor",
    actionDetail: row.actionDetail ?? "",
  };
}

function normalizeList(rows: Partial<TrafficInsight>[] | undefined) {
  const normalized = (rows ?? []).map(normalizeTrafficRow);
  const byId = new Map<string, TrafficInsight>();

  for (const row of normalized) {
    const key = row.id || `${row.kind}:${row.label}`;
    const existing = byId.get(key);
    if (!existing || row.impactScore > existing.impactScore) {
      byId.set(key, row);
    }
  }

  return Array.from(byId.values());
}

export function normalizeTrafficInsights(
  raw: Partial<TrafficInsightsSummary> | null | undefined,
): TrafficInsightsSummary {
  if (!raw) return EMPTY_TRAFFIC_INSIGHTS;

  return {
    opportunities: normalizeList(raw.opportunities),
    conversion: normalizeList(raw.conversion),
    rising: normalizeList(raw.rising),
    watchlist: normalizeList(raw.watchlist),
    all: normalizeList(raw.all),
  };
}
