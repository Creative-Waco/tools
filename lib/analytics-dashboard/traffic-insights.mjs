import { pctChange } from "./date-range.mjs";
import {
  BOUNCE_ABSOLUTE,
  BOUNCE_GAP_PROGRAM,
  BOUNCE_GAP_SITE,
  MIN_LANDING_SESSIONS,
  MIN_PAGE_VIEWS,
  MIN_PRIOR_SESSIONS_FOR_RISING,
  round1,
} from "./insight-thresholds.mjs";
import { normalizePath } from "./path-utils.mjs";

function parseRate(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return num <= 1 ? num * 100 : num;
}

function sessionsChangePct(current, previous) {
  if (previous === 0) return current > 0 ? 100 : null;
  return round1(pctChange(current, previous));
}

/** Cap % change used in scoring so tiny baselines do not explode impact. */
function cappedChangeForImpact(change) {
  if (change === null) return 0;
  return Math.min(Math.abs(change), 200);
}

function risingImpactScore(sessions, previousSessions, engagementRate, siteEngagement) {
  const delta = Math.max(0, sessions - (previousSessions ?? 0));
  let score = delta * 0.08;
  if (engagementRate < siteEngagement * 0.7) {
    score += delta * 0.04;
  }
  return round1(score);
}

function parseComparisonMetricValue(raw, isRate) {
  const num = Number(raw);
  const parsed = Number.isFinite(num) ? num : 0;
  return isRate ? parseRate(parsed) : parsed;
}

const MIN_PRIOR_SESSIONS_FOR_RISING_TRAFFIC = MIN_PRIOR_SESSIONS_FOR_RISING;

function makeId(kind, ...parts) {
  return `${kind}:${parts.join(":")}`;
}

function normalizePathLocal(path) {
  return normalizePath(path) || path;
}

function dedupeById(rows) {
  const byId = new Map();

  for (const row of rows) {
    const existing = byId.get(row.id);
    if (!existing || row.impactScore > existing.impactScore) {
      byId.set(row.id, row);
    }
  }

  return Array.from(byId.values());
}

export function dedupeLandingPagesByPath(rows) {
  const byPath = new Map();

  for (const row of rows ?? []) {
    const path = normalizePathLocal(row.path);
    const existing = byPath.get(path);
    if (!existing || row.sessions > existing.sessions) {
      byPath.set(path, { ...row, path });
    }
  }

  return Array.from(byPath.values());
}

function deriveLandingAction(bounceRate, siteBounce) {
  const gap = bounceRate - siteBounce;
  if (gap >= 25) {
    return {
      action: "landing_page",
      actionDetail:
        "Bounce is far above site average — tighten hero message, add clear next step, and match ad/search intent.",
    };
  }
  if (bounceRate >= 75) {
    return {
      action: "landing_page",
      actionDetail:
        "Most visitors leave immediately — check load speed, mobile layout, and whether the headline matches traffic source.",
    };
  }
  return {
    action: "cta",
    actionDetail:
      "Above-average bounce — test a stronger primary CTA and reduce distractions above the fold.",
  };
}

function derivePageAction(avgEngagementSec, siteAvgEngagement) {
  if (avgEngagementSec < siteAvgEngagement * 0.35) {
    return {
      action: "content",
      actionDetail:
        "Very low time on page — add scannable sections, visuals, or internal links; confirm the page answers the visitor's intent.",
    };
  }
  return {
    action: "content",
    actionDetail:
      "Engagement lags site average — expand useful detail, FAQs, or proof points; check for broken embeds on mobile.",
  };
}

function deriveSourceAction({
  change,
  engagementRate,
  siteEngagement,
  label,
  sessions,
  previousSessions,
}) {
  const isNewOrResurgent = (previousSessions ?? 0) < MIN_PRIOR_SESSIONS_FOR_RISING_TRAFFIC;

  if (isNewOrResurgent) {
    return {
      action: "campaign",
      actionDetail: `${label} added ${sessions - (previousSessions ?? 0)} sessions (${previousSessions ?? 0} → ${sessions}) — new or returning source; confirm tracking and tighten landing pages before scaling.`,
    };
  }

  if (change >= 50 && engagementRate < siteEngagement * 0.7) {
    return {
      action: "campaign",
      actionDetail: `${label} grew ${change}% to ${sessions} sessions but engagement (${engagementRate}%) trails site average (${siteEngagement}%) — audit landing pages and pause weak placements.`,
    };
  }
  if (change >= 25) {
    return {
      action: "campaign",
      actionDetail: `${label} gained ${change}% sessions (${previousSessions} → ${sessions}) — double down with consistent UTMs and a dedicated landing experience.`,
    };
  }
  return {
    action: "monitor",
    actionDetail: `${label} sessions trending up — watch conversion events before scaling spend or outreach.`,
  };
}

function deriveDeclineAction(kind, label, change) {
  return {
    action: "review",
    actionDetail:
      kind === "channel"
        ? `${label} traffic dropped ${Math.abs(change)}% vs last period — check for broken links, paused campaigns, or seasonality.`
        : `${label} lost ${Math.abs(change)}% of sessions — verify tracking, recent URL changes, and referral partnerships.`,
  };
}

/**
 * @param {{
 *   kpis: { sessions: { value: number }; bounceRate: { value: number }; engagementRate: { value: number }; avgEngagementSecPerView?: { value: number } };
 *   landingPages: Array<{ path: string; sessions: number; previousSessions: number; bounceRate: number; engagementRate: number }>;
 *   pages: Array<{ path: string; views: number; avgEngagementSec: number; bounceRate: number }>;
 *   channels: Array<{ name: string; sessions: number; previousSessions: number }>;
 *   sources: Array<{ source: string; medium: string; sessions: number; previousSessions: number; engagementRate: number }>;
 *   programInsights: import("./ga4.mjs").ProgramInsights | null;
 * }} input
 */
export function computeTrafficInsights({
  kpis,
  landingPages,
  pages,
  channels,
  sources,
  programInsights,
}) {
  const siteSessions = kpis.sessions.value || 1;
  const siteBounce = kpis.bounceRate.value;
  const siteEngagement = kpis.engagementRate.value;
  const siteAvgEngagement = kpis.avgEngagementSecPerView?.value ?? 30;

  const all = [];

  for (const row of landingPages) {
    if (row.sessions < MIN_LANDING_SESSIONS) continue;
    if (row.path.startsWith("/.wf_")) continue;

    const bounceGap = row.bounceRate - siteBounce;
    const change = sessionsChangePct(row.sessions, row.previousSessions);
    const prevBounce = row.previousBounceRate ?? row.bounceRate;
    const bounceWorsened = row.bounceRate > prevBounce + 3;

    if (
      row.previousSessions >= 20 &&
      change !== null &&
      change <= -20 &&
      bounceWorsened
    ) {
      all.push({
        id: makeId("landing", row.path),
        kind: "landing",
        label: row.path,
        path: row.path,
        sessions: row.sessions,
        previousSessions: row.previousSessions,
        sessionsChange: change,
        bounceRate: round1(row.bounceRate),
        engagementRate: round1(row.engagementRate),
        impactScore: round1((row.previousSessions * Math.abs(change)) / 100),
        tags: ["declining_landing"],
        action: "review",
        actionDetail: `${row.path} sessions fell ${Math.abs(change)}% and bounce worsened — check traffic sources and landing experience.`,
      });
    }

    if (
      row.bounceRate >= siteBounce + BOUNCE_GAP_SITE ||
      row.bounceRate >= BOUNCE_ABSOLUTE
    ) {
      const impactScore = round1(
        (row.sessions * Math.max(bounceGap, 5)) / 100,
      );
      const { action, actionDetail } = deriveLandingAction(
        row.bounceRate,
        siteBounce,
      );

      all.push({
        id: makeId("landing", row.path),
        kind: "landing",
        label: row.path,
        path: row.path,
        sessions: row.sessions,
        previousSessions: row.previousSessions,
        sessionsChange: change,
        bounceRate: round1(row.bounceRate),
        engagementRate: round1(row.engagementRate),
        impactScore,
        tags: ["high_bounce", "opportunity"],
        action,
        actionDetail,
      });
    }
  }

  for (const row of pages) {
    if (row.views < MIN_PAGE_VIEWS) continue;
    if (row.path.startsWith("/.wf_")) continue;

    const engagementGap = siteAvgEngagement - row.avgEngagementSec;
    const viewsChange =
      row.previousViews != null
        ? sessionsChangePct(row.views, row.previousViews)
        : null;

    if (row.avgEngagementSec >= siteAvgEngagement * 0.55) {
      if (
        viewsChange !== null &&
        viewsChange <= -25 &&
        row.previousViews >= 20
      ) {
        all.push({
          id: makeId("page", row.path),
          kind: "page",
          label: row.path,
          path: row.path,
          sessions: row.views,
          previousSessions: row.previousViews,
          sessionsChange: viewsChange,
          bounceRate: round1(row.bounceRate),
          metricValue: row.avgEngagementSec,
          impactScore: round1((row.previousViews * Math.abs(viewsChange)) / 100),
          tags: ["declining_engagement"],
          action: "review",
          actionDetail: `${row.path} views down ${Math.abs(viewsChange)}% — check for broken content or seasonal drop-off.`,
        });
      }
      continue;
    }

    const impactScore = round1((row.views * Math.max(engagementGap, 5)) / 60);
    const { action, actionDetail } = derivePageAction(
      row.avgEngagementSec,
      siteAvgEngagement,
    );

    all.push({
      id: makeId("page", row.path),
      kind: "page",
      label: row.path,
      path: row.path,
      sessions: row.views,
      sessionsChange: null,
      bounceRate: round1(row.bounceRate),
      engagementRate: undefined,
      metricValue: row.avgEngagementSec,
      impactScore,
      tags: ["low_engagement", "opportunity"],
      action,
      actionDetail,
    });
  }

  for (const row of channels) {
    const change = sessionsChangePct(row.sessions, row.previousSessions);
    if (change === null) continue;

    if (row.sessions >= 20 && change >= 20) {
      all.push({
        id: makeId("channel", row.name),
        kind: "channel",
        label: row.name,
        channel: row.name,
        sessions: row.sessions,
        previousSessions: row.previousSessions,
        sessionsChange: change,
        impactScore:
          row.previousSessions >= MIN_PRIOR_SESSIONS_FOR_RISING_TRAFFIC
            ? round1((row.sessions * cappedChangeForImpact(change)) / 100)
            : round1(Math.max(0, row.sessions - row.previousSessions) * 0.08),
        tags: ["rising_channel"],
        action: "campaign",
        actionDetail:
          row.previousSessions >= MIN_PRIOR_SESSIONS_FOR_RISING_TRAFFIC
            ? `${row.name} gained ${change}% sessions (${row.previousSessions} → ${row.sessions}) — identify what's working and allocate more to this channel.`
            : `${row.name} added ${row.sessions - row.previousSessions} sessions (${row.previousSessions} → ${row.sessions}) — new or returning channel activity.`,
      });
    } else if (row.previousSessions >= 25 && change <= -20) {
      const { action, actionDetail } = deriveDeclineAction(
        "channel",
        row.name,
        change,
      );
      all.push({
        id: makeId("channel", row.name),
        kind: "channel",
        label: row.name,
        channel: row.name,
        sessions: row.sessions,
        previousSessions: row.previousSessions,
        sessionsChange: change,
        impactScore: round1((row.previousSessions * Math.abs(change)) / 100),
        tags: ["declining_channel"],
        action,
        actionDetail,
      });
    }
  }

  for (const row of sources) {
    const change = sessionsChangePct(row.sessions, row.previousSessions);
    if (change === null) continue;

    const label = `${row.source} / ${row.medium}`;

    if (row.sessions >= 15 && change >= 25) {
      const engagementRate = round1(row.engagementRate);
      const { action, actionDetail } = deriveSourceAction({
        change,
        engagementRate,
        siteEngagement,
        label,
        sessions: row.sessions,
        previousSessions: row.previousSessions,
      });
      all.push({
        id: makeId("source", row.source, row.medium),
        kind: "source",
        label,
        source: row.source,
        medium: row.medium,
        sessions: row.sessions,
        previousSessions: row.previousSessions,
        sessionsChange: change,
        engagementRate,
        impactScore: risingImpactScore(
          row.sessions,
          row.previousSessions,
          engagementRate,
          siteEngagement,
        ),
        tags: ["rising_source"],
        action,
        actionDetail,
      });
    } else if (row.previousSessions >= 20 && change <= -25) {
      const { action, actionDetail } = deriveDeclineAction(
        "source",
        label,
        change,
      );
      all.push({
        id: makeId("source", row.source, row.medium),
        kind: "source",
        label,
        source: row.source,
        medium: row.medium,
        sessions: row.sessions,
        previousSessions: row.previousSessions,
        sessionsChange: change,
        impactScore: round1((row.previousSessions * Math.abs(change)) / 100),
        tags: ["declining_source"],
        action,
        actionDetail,
      });
    }
  }

  if (programInsights) {
    const { audience, engagement, devices, landingPages: programLandings } =
      programInsights;
    const totalAudience =
      audience.newUsers + audience.returningUsers || 1;
    const newShare = round1((audience.newUsers / totalAudience) * 100);

    if (
      siteSessions >= 30 &&
      newShare >= 72 &&
      audience.returningUsers >= 5
    ) {
      all.push({
        id: makeId("program", "retention"),
        kind: "program",
        label: "Returning visitor share",
        sessions: audience.returningUsers + audience.newUsers,
        sessionsChange: null,
        metricValue: newShare,
        impactScore: round1((newShare - 50) * 2),
        tags: ["retention_gap", "opportunity"],
        action: "cta",
        actionDetail: `${newShare}% of visitors are new — add email capture, event reminders, or member CTAs to grow return visits.`,
      });
    }

    if (engagement.formStarts >= 5) {
      const submitRate = round1(
        (engagement.formSubmits / engagement.formStarts) * 100,
      );
      if (submitRate < 45) {
        all.push({
          id: makeId("program", "forms"),
          kind: "program",
          label: "Form completion",
          sessions: engagement.formStarts,
          previousSessions: null,
          sessionsChange: null,
          metricValue: submitRate,
          formStarts: engagement.formStarts,
          formSubmits: engagement.formSubmits,
          impactScore: round1(engagement.formStarts * (45 - submitRate) / 100),
          tags: ["conversion_leak", "opportunity"],
          action: "form",
          actionDetail: `Only ${submitRate}% of form starts submit (${engagement.formSubmits}/${engagement.formStarts}) — shorten fields, fix mobile validation, and clarify required steps.`,
        });
      }
    }

    const mobile = devices.find((d) => d.category === "mobile");
    const desktop = devices.find((d) => d.category === "desktop");
    if (mobile && desktop && mobile.sessions >= 20) {
      const mobileShare = round1((mobile.sessions / siteSessions) * 100);
      if (
        mobileShare >= 45 &&
        mobile.sessions / (mobile.users || 1) >
          desktop.sessions / (desktop.users || 1) * 1.15
      ) {
        all.push({
          id: makeId("program", "mobile"),
          kind: "program",
          label: "Mobile experience",
          sessions: mobile.sessions,
          sessionsChange: null,
          metricValue: mobileShare,
          impactScore: round1(mobile.sessions * 0.08),
          tags: ["mobile_gap", "opportunity"],
          action: "mobile",
          actionDetail: `${mobileShare}% of sessions are mobile — test forms, nav, and hero on a phone; compare to desktop engagement.`,
        });
      }
    }

    for (const landing of programLandings.slice(0, 5)) {
      if (landing.sessions < 20) continue;
      const siteLanding = landingPages.find((row) => row.path === landing.path);
      if (
        siteLanding &&
        siteLanding.bounceRate >= siteBounce + BOUNCE_GAP_PROGRAM &&
        !all.some((item) => item.id === makeId("landing", landing.path))
      ) {
        const { action, actionDetail } = deriveLandingAction(
          siteLanding.bounceRate,
          siteBounce,
        );
        all.push({
          id: makeId("landing", landing.path),
          kind: "landing",
          label: landing.path,
          path: landing.path,
          sessions: landing.sessions,
          previousSessions: siteLanding.previousSessions,
          sessionsChange: sessionsChangePct(
            landing.sessions,
            siteLanding.previousSessions,
          ),
          bounceRate: round1(siteLanding.bounceRate),
          impactScore: round1(
            (landing.sessions * (siteLanding.bounceRate - siteBounce)) / 100,
          ),
          tags: ["high_bounce", "opportunity"],
          action,
          actionDetail,
        });
      }
    }
  }

  const uniqueAll = dedupeById(all);

  const opportunities = uniqueAll
    .filter((row) =>
      row.tags.some((tag) =>
        ["high_bounce", "low_engagement", "retention_gap", "mobile_gap"].includes(
          tag,
        ),
      ),
    )
    .sort((a, b) => b.impactScore - a.impactScore);

  const conversion = uniqueAll
    .filter((row) => row.tags.includes("conversion_leak"))
    .sort((a, b) => b.impactScore - a.impactScore);

  const rising = uniqueAll
    .filter((row) =>
      row.tags.some((tag) =>
        ["rising_channel", "rising_source"].includes(tag),
      ),
    )
    .sort((a, b) => (b.sessionsChange ?? 0) - (a.sessionsChange ?? 0));

  const watchlist = uniqueAll
    .filter((row) =>
      row.tags.some((tag) =>
        ["declining_channel", "declining_source", "declining_landing", "declining_engagement"].includes(
          tag,
        ),
      ),
    )
    .sort((a, b) => (a.sessionsChange ?? 0) - (b.sessionsChange ?? 0));

  return { opportunities, conversion, rising, watchlist, all: uniqueAll };
}

/**
 * Map GA4 comparison report rows (2 date ranges × N metrics).
 * @param {Array} rows
 * @param {string[]} metricKeys - e.g. ['sessions', 'bounceRate']
 * @param {{ rateMetrics?: Set<string> }} [options]
 */
export function mapComparisonDimensionRows(
  rows,
  metricKeys,
  { rateMetrics = new Set(["bounceRate", "engagementRate"]) } = {},
) {
  const rawRows = rows ?? [];
  if (rawRows.length === 0) return [];

  const sampleDims = (rawRows[0].dimensionValues ?? []).map((d) => d.value ?? "");
  const dateRangeDimIndex = sampleDims.findIndex((value) =>
    value.startsWith("date_range_"),
  );

  if (dateRangeDimIndex >= 0) {
    const byKey = new Map();

    for (const row of rawRows) {
      const dimensions = (row.dimensionValues ?? []).map((d) => d.value ?? "");
      const dateRange = dimensions[dateRangeDimIndex] ?? "date_range_0";
      const bizDims = dimensions.filter((_, index) => index !== dateRangeDimIndex);
      const key = bizDims.join("\0");

      const entry = byKey.get(key) ?? {
        dimensions: bizDims,
        metrics: Object.fromEntries(
          metricKeys.map((metricKey) => [
            metricKey,
            { current: 0, previous: 0 },
          ]),
        ),
      };

      const period = dateRange === "date_range_1" ? "previous" : "current";
      for (let i = 0; i < metricKeys.length; i++) {
        const metricKey = metricKeys[i];
        const raw = row.metricValues?.[i]?.value ?? "0";
        entry.metrics[metricKey][period] = parseComparisonMetricValue(
          raw,
          rateMetrics.has(metricKey),
        );
      }

      byKey.set(key, entry);
    }

    return Array.from(byKey.values());
  }

  return rawRows
    .map((row) => {
      const dimensions = (row.dimensionValues ?? []).map((d) => d.value ?? "");
      const values = row.metricValues ?? [];

      const read = (metricIndex, rangeIndex) => {
        const index = metricIndex * 2 + rangeIndex;
        const raw = values[index]?.value ?? "0";
        return parseComparisonMetricValue(
          raw,
          rateMetrics.has(metricKeys[metricIndex]),
        );
      };

      const metrics = {};
      for (let i = 0; i < metricKeys.length; i++) {
        metrics[metricKeys[i]] = {
          current: read(i, 0),
          previous: read(i, 1),
        };
      }

      return { dimensions, metrics };
    })
    .filter((row) => row.dimensions.some(Boolean));
}
