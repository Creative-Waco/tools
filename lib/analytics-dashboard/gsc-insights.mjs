import { differenceInDays, parseISO } from "date-fns";

import { pctChange } from "./date-range.mjs";

/** Expected CTR (%) by rounded average position — industry benchmark curve. */
export function expectedCtrForPosition(position) {
  const pos = Math.max(1, Math.round(position));
  const curve = {
    1: 28,
    2: 15,
    3: 11,
    4: 8,
    5: 6,
    6: 5,
    7: 4,
    8: 3.5,
    9: 3,
    10: 2.8,
  };
  if (pos <= 10) return curve[pos] ?? 2.8;
  if (pos <= 20) return 1.5;
  return 0.8;
}

function expectedClicks(impressions, position) {
  const expected = expectedCtrForPosition(position);
  return Math.round((impressions * expected) / 100);
}

function impressionWeightedPosition(points) {
  const impressions = points.reduce((sum, p) => sum + p.impressions, 0);
  if (impressions === 0) return null;
  const weighted = points.reduce(
    (sum, p) => sum + p.position * p.impressions,
    0,
  );
  return Math.round((weighted / impressions) * 10) / 10;
}

function computeRecentPositionGain(trend, startDate, endDate) {
  if (!trend.length) return null;

  const days = differenceInDays(endDate, startDate) + 1;
  if (days < 4) return null;

  const midpoint = parseISO(
    trend[Math.floor(trend.length / 2)]?.date ??
      formatMidDate(startDate, endDate),
  );

  const early = trend.filter((p) => parseISO(p.date) < midpoint);
  const late = trend.filter((p) => parseISO(p.date) >= midpoint);

  const earlyPos = impressionWeightedPosition(early);
  const latePos = impressionWeightedPosition(late);

  if (earlyPos === null || latePos === null) return null;
  return Math.round((earlyPos - latePos) * 10) / 10;
}

function formatMidDate(startDate, endDate) {
  const mid = new Date((startDate.getTime() + endDate.getTime()) / 2);
  return mid.toISOString().slice(0, 10);
}

function bucketTrendWeekly(dailyTrend) {
  const buckets = new Map();

  for (const point of dailyTrend) {
    const date = parseISO(point.date);
    const weekStart = getWeekStart(date);
    const key = weekStart.toISOString().slice(0, 10);
    const existing = buckets.get(key) ?? {
      date: key,
      clicks: 0,
      impressions: 0,
      positionWeight: 0,
    };
    existing.clicks += point.clicks;
    existing.impressions += point.impressions;
    existing.positionWeight += point.position * point.impressions;
    buckets.set(key, existing);
  }

  return Array.from(buckets.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((bucket) => ({
      date: bucket.date,
      clicks: bucket.clicks,
      impressions: bucket.impressions,
      position:
        bucket.impressions > 0
          ? Math.round((bucket.positionWeight / bucket.impressions) * 10) / 10
          : 0,
    }));
}

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function isQuestionQuery(query) {
  return /^(who|what|when|where|why|how|is|are|can|does|do)\b/i.test(
    query.trim(),
  );
}

function isLocalQuery(query) {
  return /\bwaco\b/i.test(query);
}

function getTopPageForQuery(pairs, query) {
  const pages = pairs
    .filter((pair) => pair.query === query && pair.impressions > 0)
    .sort((a, b) => b.impressions - a.impressions);
  return pages[0]?.path ?? null;
}

/**
 * @param {Array<{ query: string; path: string; clicks: number; impressions: number; position: number }>} pairs
 */
export function buildCannibalizationByQuery(pairs) {
  const byQuery = new Map();

  for (const pair of pairs) {
    if (pair.impressions < 15) continue;
    const list = byQuery.get(pair.query) ?? [];
    list.push(pair);
    byQuery.set(pair.query, list);
  }

  const result = new Map();

  for (const [query, pages] of byQuery) {
    if (pages.length < 2) continue;

    const sorted = [...pages].sort((a, b) => b.impressions - a.impressions);
    const totalImpressions = sorted.reduce(
      (sum, page) => sum + page.impressions,
      0,
    );
    const secondaryShare = sorted[1].impressions / totalImpressions;

    if (secondaryShare < 0.2) continue;

    const posDiff = Math.abs(sorted[0].position - sorted[1].position);
    if (posDiff > 8 && secondaryShare < 0.35) continue;

    const clickShare =
      sorted.reduce((sum, page) => sum + page.clicks, 0) > 0
        ? sorted[1].clicks /
          sorted.reduce((sum, page) => sum + page.clicks, 0)
        : 0;

    let recommendedAction = "differentiate";
    if (sorted[0].clicks >= sorted[1].clicks * 2) {
      recommendedAction = "redirect";
    } else if (clickShare >= 0.25 && clickShare <= 0.75) {
      recommendedAction = "merge";
    } else if (
      sorted[2] &&
      sorted[2].impressions / totalImpressions >= 0.15
    ) {
      recommendedAction = "merge";
    }

    result.set(query, {
      competingPages: sorted.slice(0, 4).map((page) => ({
        path: page.path,
        clicks: page.clicks,
        impressions: page.impressions,
        position: page.position,
        impressionShare:
          totalImpressions > 0
            ? Math.round((page.impressions / totalImpressions) * 1000) / 10
            : 0,
      })),
      recommendedAction,
      primaryPage: sorted[0].path,
    });
  }

  return result;
}

function computeOpportunityScore(row, tags, potentialClicksGain) {
  let score = potentialClicksGain;

  if (tags.includes("cannibalized")) {
    score += row.impressions * 0.02;
  }

  if (tags.includes("page_one") && tags.includes("low_ctr")) {
    score += row.impressions * 0.015;
  }

  if (tags.includes("page_two")) {
    score += row.impressions * 0.01;
  }

  return Math.round(score * 100) / 100;
}

function deriveAction(row, tags, context) {
  const { cannibalization, recommendedAction } = context;

  if (tags.includes("cannibalized") && cannibalization) {
    if (recommendedAction === "redirect") {
      return {
        action: "redirect",
        actionDetail: `301 weaker URLs to ${cannibalization.primaryPage} — one page should own this query.`,
      };
    }
    if (recommendedAction === "merge") {
      return {
        action: "merge",
        actionDetail:
          "Merge overlapping content into one page, then redirect the duplicate.",
      };
    }
    return {
      action: "differentiate",
      actionDetail:
        "Rewrite titles/H1s so each page targets a distinct intent, or consolidate.",
    };
  }

  if (
    tags.includes("declining") &&
    (tags.includes("low_ctr") || tags.includes("page_two"))
  ) {
    return {
      action: "review",
      actionDetail:
        "Rank or clicks dropped while CTR or content opportunity remains — review both SERP competition and on-page optimization.",
    };
  }

  if (tags.includes("declining")) {
    return {
      action: "refresh",
      actionDetail:
        "Rank or clicks dropped vs last period — refresh content, check SERP competitors, or update the snippet.",
    };
  }

  if (tags.includes("local") && tags.includes("question")) {
    return {
      action: "faq",
      actionDetail:
        "Local Waco question query — add a direct-answer FAQ with location-specific details near the top.",
    };
  }

  if (tags.includes("low_ctr") && tags.includes("page_one")) {
    return {
      action: "snippet",
      actionDetail:
        "Rewrite title tag and meta description — you're on page 1 but the snippet underperforms expected CTR.",
    };
  }

  if (tags.includes("page_two")) {
    return {
      action: "content",
      actionDetail:
        "Expand on-page content, add internal links from strong pages, and align H1 with the query.",
    };
  }

  if (tags.includes("impression_surge")) {
    return {
      action: "snippet",
      actionDetail:
        "Impressions surged but clicks lag — improve title/meta to capture visibility.",
    };
  }

  if (tags.includes("question")) {
    return {
      action: "faq",
      actionDetail:
        "Add a direct-answer section or FAQ block near the top of the page.",
    };
  }

  if (tags.includes("rising") || tags.includes("accelerating")) {
    return {
      action: "monitor",
      actionDetail: "Momentum is positive — avoid major URL changes; monitor weekly.",
    };
  }

  if (tags.includes("new")) {
    return {
      action: "monitor",
      actionDetail:
        "New visibility this period — confirm the landing page matches intent.",
    };
  }

  if (tags.includes("low_ctr")) {
    return {
      action: "snippet",
      actionDetail: "Improve title and meta description to lift CTR at current rank.",
    };
  }

  return {
    action: "review",
    actionDetail: "Review landing page relevance and on-page optimization.",
  };
}

function buildTags(row, context) {
  const tags = [];
  const {
    positionChange,
    clicksChange,
    impressionsChange,
    isNew,
    recentPositionGain,
    hasPrevious,
    isCannibalized,
    previous,
  } = context;

  const expected = expectedCtrForPosition(row.position);
  const lowCtr =
    row.impressions >= 50 &&
    row.position <= 10 &&
    row.ctr < expected * 0.6;

  if (lowCtr) tags.push("low_ctr");

  const onPageOne =
    row.position >= 1 && row.position <= 10 && row.impressions >= 30;
  const onPageTwo = row.position >= 11 && row.position <= 20;

  if (onPageOne && (lowCtr || row.position >= 4)) tags.push("page_one");
  if (onPageTwo && row.impressions >= 30) tags.push("page_two");

  const expectedGain = Math.max(
    0,
    expectedClicks(row.impressions, row.position) - row.clicks,
  );
  const strikingDistance =
    row.position >= 4 &&
    row.position <= 20 &&
    row.impressions >= 30 &&
    (lowCtr || expectedGain >= 3 || row.position <= 12);

  if (strikingDistance) tags.push("striking_distance");

  if (lowCtr || strikingDistance) tags.push("opportunity");

  if (isNew && row.impressions >= 20) tags.push("new");

  if (hasPrevious) {
    const minClickDelta = Math.max(25, (row.clicks + (previous?.clicks ?? 0)) * 0.25, 5);
    const risingRank = positionChange !== null && positionChange >= 2;
    const risingClicks =
      clicksChange !== null &&
      clicksChange >= minClickDelta &&
      row.impressions >= 20;
    if (risingRank || risingClicks) tags.push("rising");

    const decliningRank = positionChange !== null && positionChange <= -2;
    const decliningClicks =
      clicksChange !== null &&
      clicksChange <= -minClickDelta &&
      row.impressions >= 20;
    if (decliningRank || decliningClicks) tags.push("declining");

    const impressionSurge =
      impressionsChange !== null &&
      impressionsChange >= 30 &&
      (clicksChange === null || clicksChange < 15) &&
      row.impressions >= 50;
    if (impressionSurge) tags.push("impression_surge");
  }

  if (recentPositionGain !== null && recentPositionGain >= 2) {
    tags.push("accelerating");
  }

  if (isCannibalized) tags.push("cannibalized");
  if (isQuestionQuery(row.query)) tags.push("question");
  if (isLocalQuery(row.query)) tags.push("local");

  return tags;
}

function enrichRow(row, context) {
  const {
    previous,
    priorImpressions,
    isNew,
    hasPrevious,
    trend,
    cannibalization,
    isCannibalized,
    topPage,
    startDate,
    endDate,
  } = context;

  const clicksChange = hasPrevious
    ? pctChange(row.clicks, previous.clicks)
    : isNew && row.clicks > 0
      ? 100
      : null;

  const impressionsChange = hasPrevious
    ? pctChange(row.impressions, previous.impressions)
    : isNew && row.impressions > 0
      ? 100
      : null;

  const positionChange =
    hasPrevious && previous.position > 0
      ? Math.round((previous.position - row.position) * 10) / 10
      : null;

  const recentPositionGain = computeRecentPositionGain(
    trend,
    startDate,
    endDate,
  );

  const tags = buildTags(row, {
    positionChange,
    clicksChange,
    impressionsChange,
    isNew,
    recentPositionGain,
    hasPrevious,
    isCannibalized,
    previous,
  });

  const expectedCtr = expectedCtrForPosition(row.position);
  const expectedClickCount = expectedClicks(row.impressions, row.position);
  const potentialClicksGain = Math.max(0, expectedClickCount - row.clicks);

  const { action, actionDetail } = deriveAction(row, tags, {
    cannibalization,
    recommendedAction: cannibalization?.recommendedAction,
  });

  const opportunityScore = computeOpportunityScore(
    row,
    tags,
    potentialClicksGain,
  );

  return {
    query: row.query,
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr,
    position: row.position,
    clicksChange:
      clicksChange !== null ? Math.round(clicksChange * 10) / 10 : null,
    impressionsChange:
      impressionsChange !== null
        ? Math.round(impressionsChange * 10) / 10
        : null,
    positionChange,
    isNew,
    recentPositionGain,
    trend,
    tags,
    opportunityScore,
    expectedCtr: Math.round(expectedCtr * 10) / 10,
    expectedClicks: expectedClickCount,
    potentialClicksGain,
    action,
    actionDetail,
    topPage,
    competingPages: cannibalization?.competingPages ?? null,
    recommendedAction: cannibalization?.recommendedAction ?? null,
    previousClicks: hasPrevious ? previous.clicks : null,
    previousImpressions: hasPrevious ? previous.impressions : null,
    previousPosition:
      hasPrevious && previous.position > 0 ? previous.position : null,
  };
}

/**
 * @param {{
 *   currentQueries: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>;
 *   previousQueries: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>;
 *   queryTrends: Map<string, Array<{ date: string; clicks: number; impressions: number; position: number }>>;
 *   pairs: Array<{ query: string; path: string; clicks: number; impressions: number; position: number }>;
 *   startDate: Date;
 *   endDate: Date;
 * }} input
 */
export function computeSearchQueryInsights({
  currentQueries,
  previousQueries,
  queryTrends,
  pairs,
  startDate,
  endDate,
}) {
  const previousByQuery = new Map(
    previousQueries.map((row) => [row.query, row]),
  );
  const cannibalizationByQuery = buildCannibalizationByQuery(pairs);

  const rangeDays = differenceInDays(endDate, startDate) + 1;
  const useWeeklyBuckets = rangeDays > 60;

  const all = currentQueries.map((row) => {
    const previous = previousByQuery.get(row.query);
    const priorImpressions = previous?.impressions ?? 0;
    const isNew = !previous || priorImpressions < 5;
    const hasPrevious = Boolean(previous) && priorImpressions >= 5;
    const cannibalization = cannibalizationByQuery.get(row.query) ?? null;

    let trend = queryTrends.get(row.query) ?? [];
    if (useWeeklyBuckets && trend.length > 0) {
      trend = bucketTrendWeekly(trend);
    }

    return enrichRow(row, {
      previous,
      priorImpressions,
      isNew,
      hasPrevious,
      trend,
      cannibalization,
      isCannibalized: Boolean(cannibalization),
      topPage: getTopPageForQuery(pairs, row.query),
      startDate,
      endDate,
    });
  });

  const opportunities = all
    .filter(
      (row) =>
        row.tags.some((tag) =>
          [
            "opportunity",
            "low_ctr",
            "striking_distance",
            "impression_surge",
          ].includes(tag),
        ) && !row.tags.includes("cannibalized"),
    )
    .sort((a, b) => b.potentialClicksGain - a.potentialClicksGain);

  const rising = all
    .filter((row) =>
      row.tags.some((tag) =>
        ["rising", "new", "accelerating"].includes(tag),
      ),
    )
    .sort((a, b) => {
      const posA = a.positionChange ?? 0;
      const posB = b.positionChange ?? 0;
      if (posB !== posA) return posB - posA;
      return (b.clicksChange ?? 0) - (a.clicksChange ?? 0);
    });

  const cannibalization = all
    .filter((row) => row.tags.includes("cannibalized"))
    .sort((a, b) => b.potentialClicksGain - a.potentialClicksGain);

  const declining = all
    .filter((row) => row.tags.includes("declining"))
    .sort((a, b) => {
      const posA = a.positionChange ?? 0;
      const posB = b.positionChange ?? 0;
      if (posA !== posB) return posA - posB;
      return (a.clicksChange ?? 0) - (b.clicksChange ?? 0);
    });

  return { opportunities, rising, cannibalization, declining, all };
}

/**
 * @param {Array<{ keys?: string[]; clicks?: number; impressions?: number; position?: number; ctr?: number }>} rows
 * @param {Set<string>} topQueries
 */
export function mapQueryTrendRows(rows, topQueries) {
  const byQuery = new Map();

  for (const row of rows) {
    const date = row.keys?.[0] ?? "";
    const query = row.keys?.[1] ?? "";
    if (!date || !query || !topQueries.has(query)) continue;

    const point = {
      date,
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      position: Math.round((row.position ?? 0) * 10) / 10,
    };

    const list = byQuery.get(query) ?? [];
    list.push(point);
    byQuery.set(query, list);
  }

  for (const [query, points] of byQuery) {
    byQuery.set(
      query,
      points.sort((a, b) => a.date.localeCompare(b.date)),
    );
  }

  return byQuery;
}
