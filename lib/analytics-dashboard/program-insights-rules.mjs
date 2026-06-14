import { landingLookup, normalizePath } from "./path-utils.mjs";
import { round1 } from "./insight-thresholds.mjs";
import { pctChange } from "./date-range.mjs";

const GENERIC_NEXT_PATHS = new Set(["/", "/about", "/events", "/contact"]);

function makeInsight(fields) {
  return { kind: fields.kind ?? "program", ...fields, impactScore: round1(fields.impactScore ?? 0) };
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

/**
 * @param {{
 *   programInsights: object;
 *   kpis: object;
 *   landingPages: object[];
 *   existingTrafficIds?: Set<string>;
 * }} input
 */
export function computeProgramInsightRules({
  programInsights,
  kpis,
  landingPages,
}) {
  const rows = [];
  const siteBounce = kpis.bounceRate?.value ?? 0;
  const siteAvgEngagement = kpis.avgEngagementSecPerView?.value ?? 30;
  const siteSessions = kpis.sessions?.value ?? 1;
  const landings = landingLookup(landingPages);

  const { audience, engagement, acquisition, landingPages: programLandings, nextPages, programPages } =
    programInsights;

  const topLanding = programLandings?.[0];
  const topNext = nextPages?.[0];
  if (topLanding && topLanding.sessions >= 30 && topNext) {
    const continuationRate = topNext.views / topLanding.sessions;
    if (continuationRate < 0.15) {
      rows.push(
        makeInsight({
          id: "program:nav:dead_end",
          tags: ["navigation_dead_end"],
          category: "conversion",
          label: topLanding.path,
          subject: topLanding.path,
          action: "Fix nav",
          actionDetail: `Only ${Math.round(continuationRate * 100)}% of program landing sessions continue to an internal page — add a clear next step (tickets, events, member CTA).`,
          impactScore: topLanding.sessions * (0.15 - continuationRate),
          path: topLanding.path,
          sessions: topLanding.sessions,
        }),
      );
    }

    const nextPath = normalizePath(topNext.path);
    if (GENERIC_NEXT_PATHS.has(nextPath)) {
      rows.push(
        makeInsight({
          id: `program:nav:weak_next:${nextPath}`,
          tags: ["weak_next_step"],
          category: "quick_wins",
          label: topLanding.path,
          subject: `${topLanding.path} → ${nextPath}`,
          action: "Fix nav",
          actionDetail: `Most continuing visitors go to generic ${nextPath} — route program traffic to conversion-focused pages instead.`,
          impactScore: topNext.views * 0.06,
          path: topLanding.path,
        }),
      );
    }
  }

  for (const page of programPages ?? []) {
    const views = page.views ?? 0;
    const scrolls = engagement?.scrolls ?? 0;
    if (views >= 50 && scrolls / views < 0.4) {
      rows.push(
        makeInsight({
          id: `program:scroll:${normalizePath(page.path)}`,
          tags: ["scroll_engagement_gap"],
          category: "quick_wins",
          label: page.path,
          subject: page.path,
          action: "Expand content",
          actionDetail: `Low scroll rate on ${page.path} (${views} views) — add headings, visuals, or move key info above the fold.`,
          impactScore: views * 0.03,
          path: page.path,
        }),
      );
    }
  }

  const clicks = engagement?.clicks ?? 0;
  const formStarts = engagement?.formStarts ?? 0;
  if (clicks >= 20 && formStarts >= 3 && formStarts / clicks < 0.15) {
    rows.push(
      makeInsight({
        id: "program:click_no_form",
        tags: ["click_without_conversion"],
        category: "conversion",
        label: "CTA → form gap",
        subject: "Program engagement",
        action: "Fix forms",
        actionDetail: `Only ${Math.round((formStarts / clicks) * 100)}% of CTA clicks reach forms — check link targets and mobile tap targets.`,
        impactScore: clicks * 0.08,
      }),
    );
  }

  const totalAcq = (acquisition ?? []).reduce((s, a) => s + a.sessions, 0);
  if (totalAcq >= 40) {
    const top = [...(acquisition ?? [])].sort((a, b) => b.sessions - a.sessions)[0];
    if (top && top.sessions / totalAcq >= 0.55) {
      rows.push(
        makeInsight({
          id: `program:acq:${top.source}:${top.medium}`,
          tags: ["acquisition_concentration"],
          category: "watchlist",
          label: `${top.source} / ${top.medium}`,
          subject: `${top.source} / ${top.medium}`,
          action: "Review",
          actionDetail: `${Math.round((top.sessions / totalAcq) * 100)}% of program sessions from one source — diversify channels.`,
          impactScore: top.sessions * 0.05,
          sessions: top.sessions,
        }),
      );
    }
  }

  if (audience) {
    const total = audience.newUsers + audience.returningUsers || 1;
    const newShare = round1((audience.newUsers / total) * 100);
    if (siteSessions >= 30 && newShare >= 72 && audience.returningUsers >= 5) {
      rows.push(
        makeInsight({
          id: "program:retention",
          tags: ["retention_gap", "new_vs_returning_imbalance"],
          category: "quick_wins",
          label: "Returning visitor share",
          subject: "Program audience",
          action: "Improve CTA",
          actionDetail: `${newShare}% of program visitors are new — add email capture and return-visit hooks.`,
          impactScore: round1((newShare - 50) * 2),
          share: newShare,
        }),
      );
    }
  }

  for (const page of programPages ?? []) {
    if (page.views >= 40 && page.avgEngagementSec < siteAvgEngagement * 0.55) {
      rows.push(
        makeInsight({
          id: `program:page:${normalizePath(page.path)}`,
          tags: ["low_engagement"],
          category: "quick_wins",
          label: page.path,
          subject: page.path,
          action: "Expand content",
          actionDetail: `Program page engagement (${page.avgEngagementSec}s) lags site average — expand useful detail or FAQs.`,
          impactScore: round1((page.views * (siteAvgEngagement - page.avgEngagementSec)) / 60),
          path: page.path,
        }),
      );
    }
  }

  return bucketRows(rows);
}
