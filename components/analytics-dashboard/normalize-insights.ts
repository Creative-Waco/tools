import type {
  SearchQueryInsight,
  SearchQueryInsightsSummary,
} from "./types";

export const EMPTY_INSIGHTS: SearchQueryInsightsSummary = {
  opportunities: [],
  rising: [],
  cannibalization: [],
  declining: [],
  all: [],
};

function normalizeInsightRow(
  row: Partial<SearchQueryInsight>,
): SearchQueryInsight {
  return {
    query: row.query ?? "",
    clicks: row.clicks ?? 0,
    impressions: row.impressions ?? 0,
    ctr: row.ctr ?? 0,
    position: row.position ?? 0,
    clicksChange: row.clicksChange ?? null,
    impressionsChange: row.impressionsChange ?? null,
    positionChange: row.positionChange ?? null,
    isNew: row.isNew ?? false,
    recentPositionGain: row.recentPositionGain ?? null,
    trend: row.trend ?? [],
    tags: row.tags ?? [],
    opportunityScore: row.opportunityScore ?? 0,
    expectedCtr: row.expectedCtr ?? 0,
    expectedClicks: row.expectedClicks ?? 0,
    potentialClicksGain: row.potentialClicksGain ?? 0,
    action: row.action ?? "monitor",
    actionDetail: row.actionDetail ?? "",
    topPage: row.topPage ?? null,
    competingPages: row.competingPages ?? null,
    recommendedAction: row.recommendedAction ?? null,
    previousClicks: row.previousClicks ?? null,
    previousImpressions: row.previousImpressions ?? null,
    previousPosition: row.previousPosition ?? null,
  };
}

function normalizeInsightList(
  rows: Partial<SearchQueryInsight>[] | undefined,
) {
  return (rows ?? []).map(normalizeInsightRow);
}

export function normalizeSearchInsights(
  raw: Partial<SearchQueryInsightsSummary> | null | undefined,
): SearchQueryInsightsSummary {
  if (!raw) return EMPTY_INSIGHTS;

  return {
    opportunities: normalizeInsightList(raw.opportunities),
    rising: normalizeInsightList(raw.rising),
    cannibalization: normalizeInsightList(raw.cannibalization),
    declining: normalizeInsightList(raw.declining),
    all: normalizeInsightList(raw.all),
  };
}
