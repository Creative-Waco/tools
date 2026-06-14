import { GSC_NOTE, LOCAL_CITY_NAMES, round1 } from "./insight-thresholds.mjs";
import { landingLookup, normalizePath, pageLookup } from "./path-utils.mjs";
import { pctChange } from "./date-range.mjs";

function makeCrossInsight(fields) {
  return {
    gscNote: GSC_NOTE,
    ...fields,
    impactScore: round1(fields.impactScore ?? 0),
  };
}

function bucketRows(rows) {
  const summary = {
    quick_wins: [],
    cannibalization: [],
    conversion: [],
    rising: [],
    watchlist: [],
    all: [],
  };
  for (const row of rows) {
    summary[row.category]?.push(row);
    summary.all.push(row);
  }
  for (const key of Object.keys(summary)) {
    summary[key].sort((a, b) => b.impactScore - a.impactScore);
  }
  return summary;
}

function sessionsChangePct(current, previous) {
  if (previous === 0) return current > 0 ? 100 : null;
  return round1(pctChange(current, previous));
}

function isLocalQuery(query) {
  return /\bwaco\b/i.test(query ?? "");
}

function searchOpportunityRows(searchConsole) {
  if (!searchConsole?.available) return [];
  const ins = searchConsole.insights;
  const seen = new Set();
  const rows = [];
  for (const bucket of [
    ins.opportunities,
    ins.rising,
    ins.cannibalization,
    ins.declining,
  ]) {
    for (const row of bucket ?? []) {
      if (!seen.has(row.query)) {
        seen.add(row.query);
        rows.push(row);
      }
    }
  }
  return rows;
}

/**
 * @param {{
 *   searchConsole: object;
 *   trafficRaw: object;
 *   audienceRaw?: object | null;
 *   kpis: object;
 *   programInsights?: object | null;
 * }} input
 */
export function computeCrossInsights({
  searchConsole,
  trafficRaw,
  audienceRaw = null,
  kpis,
  programInsights = null,
}) {
  const rows = [];
  if (!searchConsole?.available) return bucketRows(rows);

  const siteBounce = kpis.bounceRate?.value ?? 0;
  const siteEngagement = kpis.engagementRate?.value ?? 0;
  const siteAvgEngagement = kpis.avgEngagementSecPerView?.value ?? 30;
  const siteSessions = kpis.sessions?.value ?? 1;
  const landings = landingLookup(trafficRaw?.landingPages);
  const pages = pageLookup(trafficRaw?.pages);

  for (const searchRow of searchOpportunityRows(searchConsole)) {
    const path = normalizePath(searchRow.topPage ?? "");
    if (!path) continue;
    const landing = landings.get(path);
    const page = pages.get(path);

    const isOpp =
      searchRow.potentialClicksGain >= 5 || searchRow.impressions >= 50;
    const isRising = searchRow.tags?.some((t) =>
      ["rising", "accelerating", "new"].includes(t),
    );
    const isDeclining = searchRow.tags?.includes("declining");
    const isCannibal = searchRow.tags?.includes("cannibalized");

    if (
      landing &&
      isOpp &&
      landing.sessions >= 15 &&
      (landing.bounceRate >= siteBounce + 12 || landing.bounceRate >= 65)
    ) {
      const bounceGap = Math.max(landing.bounceRate - siteBounce, 5);
      const factor = 1 + Math.min(bounceGap / 50, 0.5);
      rows.push(
        makeCrossInsight({
          id: `cross:poor_landing:${searchRow.query}:${path}`,
          tags: ["search_clicks_poor_landing"],
          category: "quick_wins",
          query: searchRow.query,
          path,
          label: searchRow.actionDetail,
          subject: `${searchRow.query} · ${path}`,
          action: "Fix landing",
          actionDetail: `Search sends clicks for "${searchRow.query}" but ${path} bounces at ${landing.bounceRate}% — fix SERP snippet and landing intent match (hero, CTA, mobile).`,
          impactScore: searchRow.potentialClicksGain * factor,
          gsc: {
            clicks: searchRow.clicks,
            impressions: searchRow.impressions,
            position: searchRow.position,
            potentialClicksGain: searchRow.potentialClicksGain,
            tags: searchRow.tags,
          },
          ga4: {
            sessions: landing.sessions,
            bounceRate: landing.bounceRate,
            engagementRate: landing.engagementRate,
          },
        }),
      );
    }

    const snippetTags = ["low_ctr", "striking_distance", "impression_surge"];
    if (
      landing &&
      searchRow.tags?.some((t) => snippetTags.includes(t)) &&
      landing.engagementRate >= siteEngagement * 0.85 &&
      landing.bounceRate <= siteBounce + 5
    ) {
      rows.push(
        makeCrossInsight({
          id: `cross:snippet_ready:${searchRow.query}:${path}`,
          tags: ["snippet_ready_good_page"],
          category: "quick_wins",
          query: searchRow.query,
          path,
          label: searchRow.query,
          subject: `${searchRow.query} · ${path}`,
          action: "Fix snippet",
          actionDetail: `Page works once visitors arrive (engagement ${landing.engagementRate}%) — prioritize title and meta for "${searchRow.query}".`,
          impactScore: searchRow.potentialClicksGain * 1.2,
          gsc: {
            clicks: searchRow.clicks,
            impressions: searchRow.impressions,
            potentialClicksGain: searchRow.potentialClicksGain,
          },
          ga4: {
            sessions: landing.sessions,
            bounceRate: landing.bounceRate,
            engagementRate: landing.engagementRate,
          },
        }),
      );
    }

    const impressionSurge =
      searchRow.tags?.includes("impression_surge") ||
      (searchRow.impressionsChange >= 25 &&
        (searchRow.clicksChange === null || searchRow.clicksChange < 10));
    if (landing && impressionSurge && landing.previousSessions >= 10) {
      const sessChange = sessionsChangePct(
        landing.sessions,
        landing.previousSessions,
      );
      if (sessChange !== null && sessChange <= 5) {
        rows.push(
          makeCrossInsight({
            id: `cross:visibility:${searchRow.query}:${path}`,
            tags: ["visibility_without_visits"],
            category: "watchlist",
            query: searchRow.query,
            path,
            label: searchRow.query,
            subject: searchRow.query,
            action: "Review",
            actionDetail: `Impressions up for "${searchRow.query}" but landing sessions flat — check positions 8–15 and SERP presentation.`,
            impactScore: searchRow.impressions * 0.015,
            gsc: { impressions: searchRow.impressions, impressionsChange: searchRow.impressionsChange },
            ga4: { sessions: landing.sessions, sessionsChange: sessChange },
          }),
        );
      }
    }

    if (isCannibal && searchRow.competingPages?.length >= 2) {
      const competingSessions = searchRow.competingPages.reduce((sum, p) => {
        const l = landings.get(normalizePath(p.path));
        return sum + (l?.sessions >= 10 ? l.sessions : 0);
      }, 0);
      if (competingSessions >= 10) {
        rows.push(
          makeCrossInsight({
            id: `cross:cannibal:${searchRow.query}`,
            tags: ["cannibalization_confirmed"],
            category: "cannibalization",
            query: searchRow.query,
            path: path || searchRow.topPage,
            label: searchRow.query,
            subject: searchRow.query,
            action: searchRow.action === "redirect" ? "Redirect" : "Merge pages",
            actionDetail: `GSC and GA4 both show split traffic for "${searchRow.query}" — ${searchRow.actionDetail}`,
            impactScore:
              searchRow.potentialClicksGain * 1.3 + competingSessions * 0.05,
            gsc: {
              competingPages: searchRow.competingPages,
              potentialClicksGain: searchRow.potentialClicksGain,
            },
            ga4: { competingSessions },
          }),
        );
      }
    }

    if (isRising && landing && landing.sessions >= 10) {
      const weakLanding =
        landing.bounceRate >= siteBounce + 15 ||
        (page && page.avgEngagementSec < siteAvgEngagement * 0.5);
      if (weakLanding) {
        rows.push(
          makeCrossInsight({
            id: `cross:rising_weak:${searchRow.query}:${path}`,
            tags: ["rising_query_weak_landing"],
            category: "rising",
            query: searchRow.query,
            path,
            label: searchRow.query,
            subject: `${searchRow.query} · ${path}`,
            action: "Fix landing",
            actionDetail: `"${searchRow.query}" is rising in search but ${path} doesn't retain visitors — strengthen before scaling content elsewhere.`,
            impactScore:
              (searchRow.positionChange ?? 0) * landing.sessions * 0.1 ||
              (searchRow.clicksChange ?? 0) * 0.5,
            gsc: { tags: searchRow.tags, positionChange: searchRow.positionChange },
            ga4: { sessions: landing.sessions, bounceRate: landing.bounceRate },
          }),
        );
      }
    }

    if (
      isDeclining &&
      landing &&
      landing.engagementRate >= siteEngagement * 0.8 &&
      landing.bounceRate <= siteBounce + 8
    ) {
      rows.push(
        makeCrossInsight({
          id: `cross:declining_serp:${searchRow.query}:${path}`,
          tags: ["declining_serp_not_content"],
          category: "watchlist",
          query: searchRow.query,
          path,
          label: searchRow.query,
          subject: searchRow.query,
          action: "Review",
          actionDetail: `"${searchRow.query}" declining in search but landing engagement healthy — investigate SERP competition, not page rewrites.`,
          impactScore: Math.min(
            Math.abs(searchRow.clicksChange ?? 0) * 0.3,
            searchRow.previousClicks ?? 100,
          ),
          gsc: { clicksChange: searchRow.clicksChange, declining: true },
          ga4: {
            engagementRate: landing.engagementRate,
            bounceRate: landing.bounceRate,
          },
        }),
      );
    }

    const local =
      searchRow.tags?.includes("local") || isLocalQuery(searchRow.query);
    if (local && searchRow.impressions >= 30 && audienceRaw?.cities?.length) {
      const sorted = [...audienceRaw.cities].sort(
        (a, b) => b.sessions - a.sessions,
      );
      const top = sorted[0];
      const totalCitySessions = sorted.reduce((s, c) => s + c.sessions, 0);
      const wacoSessions = sorted
        .filter((c) => LOCAL_CITY_NAMES.has((c.city ?? "").toLowerCase()))
        .reduce((s, c) => s + c.sessions, 0);
      const wacoShare =
        totalCitySessions > 0 ? (wacoSessions / totalCitySessions) * 100 : 0;
      const topIsLocal = LOCAL_CITY_NAMES.has((top?.city ?? "").toLowerCase());

      if (
        !topIsLocal &&
        wacoShare < 40 &&
        top.sessions >= 20
      ) {
        rows.push(
          makeCrossInsight({
            id: `cross:local_mismatch:${searchRow.query}`,
            tags: ["local_search_city_mismatch"],
            category: "quick_wins",
            query: searchRow.query,
            path,
            label: searchRow.query,
            subject: searchRow.query,
            action: "Expand content",
            actionDetail: `Local query "${searchRow.query}" but top city is ${top.city} (${top.sessions} sessions) — clarify geo-targeting in content and meta.`,
            impactScore: searchRow.impressions * 0.01 + top.sessions * 0.05,
            gsc: { impressions: searchRow.impressions, local: true },
            ga4: { topCity: top.city, wacoShare: round1(wacoShare) },
          }),
        );
      }
    }

    const mobileDevice =
      programInsights?.devices?.find((d) => d.category === "mobile") ??
      audienceRaw?.devices?.find((d) => d.category === "mobile");
    const mobileShare = mobileDevice
      ? round1((mobileDevice.sessions / siteSessions) * 100)
      : 0;
    if (
      isOpp &&
      path &&
      landing &&
      mobileShare >= 55 &&
      landing.bounceRate >= siteBounce + 12
    ) {
      rows.push(
        makeCrossInsight({
          id: `cross:mobile_skew:${searchRow.query}:${path}`,
          tags: ["search_traffic_mobile_skew"],
          category: "quick_wins",
          query: searchRow.query,
          path,
          label: searchRow.query,
          subject: `${searchRow.query} · ${path}`,
          action: "Fix mobile",
          actionDetail: `${mobileShare}% mobile sessions — search visitors hit ${path} on phones; prioritize mobile layout and forms.`,
          impactScore:
            searchRow.potentialClicksGain * 1.1 + mobileDevice.sessions * 0.06,
          gsc: { potentialClicksGain: searchRow.potentialClicksGain },
          ga4: { mobileShare, bounceRate: landing.bounceRate },
        }),
      );
    }
  }

  for (const gscPage of searchConsole.pages ?? []) {
    const path = normalizePath(gscPage.path);
    const page = pages.get(path);
    const prevPage = (searchConsole.previousPages ?? []).find(
      (p) => normalizePath(p.path) === path,
    );
    if (!prevPage || prevPage.clicks < 10) continue;
    const clicksChange = pctChange(gscPage.clicks, prevPage.clicks);
    if (clicksChange > -25) continue;
    const landing = landings.get(path);
    const viewsStable =
      landing &&
      landing.previousSessions >= 10 &&
      pctChange(landing.sessions, landing.previousSessions) <= 10;
    if (viewsStable) {
      rows.push(
        makeCrossInsight({
          id: `cross:page_serp:${path}`,
          tags: ["gsc_page_ga4_stable"],
          category: "watchlist",
          query: null,
          path,
          label: path,
          subject: path,
          action: "Review",
          actionDetail: `GSC clicks down for ${path} but GA4 sessions stable — SERP issue, not content.`,
          impactScore: Math.abs(clicksChange) * 0.3,
          gsc: { clicksChange, path: gscPage },
          ga4: { sessions: landing.sessions },
        }),
      );
    }

    const queryCount = (searchConsole.pairs ?? []).filter(
      (p) => normalizePath(p.path) === path,
    ).length;
    if (queryCount >= 5 && page && page.avgEngagementSec < siteAvgEngagement * 0.5) {
      rows.push(
        makeCrossInsight({
          id: `cross:hub_weak:${path}`,
          tags: ["search_hub_weak_engagement"],
          category: "quick_wins",
          path,
          label: path,
          subject: path,
          action: "Expand content",
          actionDetail: `Multi-query hub page ${path} underperforms on engagement — visitors from search aren't finding what they need.`,
          impactScore: gscPage.impressions * 0.008,
          gsc: { impressions: gscPage.impressions, queryCount },
          ga4: { avgEngagementSec: page.avgEngagementSec },
        }),
      );
    }
  }

  return bucketRows(rows);
}
