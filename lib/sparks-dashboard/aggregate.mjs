import { fetchGivebutterDashboard } from "./givebutter.mjs";
import { fetchAsanaEventsDashboard } from "./asana-events.mjs";
import { loadLocalCredentials } from "./local-env.mjs";

let credentialsLoaded = false;

function ensureLocalCredentials() {
  if (credentialsLoaded) return;
  loadLocalCredentials();
  credentialsLoaded = true;
}

const GOALS = {
  members: { label: "Paid members", target: 90, unit: "paid", deadline: "Dec 31, 2026" },
  pipeline: { label: "6-month event pipeline", target: 12, unit: "events scheduled" },
};

const CACHE_TTL_MS = 5 * 60 * 1000;
let cache = { key: null, at: 0, payload: null };

function formatDelta(current, previous) {
  const diff = current - previous;
  if (diff === 0) return { text: "No change vs prior period", className: "is-flat" };
  const sign = diff > 0 ? "+" : "";
  const pct =
    previous === 0 ? "" : ` (${sign}${Math.round((diff / previous) * 100)}%)`;
  return {
    text: `${sign}${diff}${pct} vs prior period`,
    className: diff > 0 ? "is-up" : "is-down",
  };
}

function mergeMonthly(memberMonths, eventMonths) {
  const eventByKey = new Map((eventMonths ?? []).map((r) => [r.key, r.events]));
  const memberByKey = new Map((memberMonths ?? []).map((r) => [r.key, r]));
  const order = memberMonths?.length ? memberMonths : eventMonths ?? [];
  return order.map((row) => {
    const memberRow = memberByKey.get(row.key) ?? row;
    return {
      month: row.month,
      key: row.key,
      members: memberRow.members ?? 0,
      membersPaid: memberRow.membersPaid ?? 0,
      membersHonorary: memberRow.membersHonorary ?? 0,
      events: eventByKey.get(row.key) ?? 0,
    };
  });
}

function buildSyncHealth(gb, asana) {
  const gbIssues = gb.schemaIssues ?? [];
  const asanaIssues = asana.schemaIssues ?? [];
  const allIssues = [...gbIssues, ...asanaIssues];

  return {
    ok: allIssues.length === 0 && gb.ok !== false && asana.ok !== false,
    sources: {
      givebutter: { ok: gb.ok !== false && gbIssues.length === 0, schemaIssues: gbIssues },
      asana: { ok: asana.ok !== false && asanaIssues.length === 0, schemaIssues: asanaIssues },
    },
    schemaIssues: allIssues,
  };
}

export async function getSparksDashboard({
  period = "fy",
  membershipType = "all",
  refresh = false,
} = {}) {
  ensureLocalCredentials();
  const cacheKey = `${period}:${membershipType}`;
  const now = Date.now();
  if (
    !refresh &&
    cache.key === cacheKey &&
    cache.payload &&
    now - cache.at < CACHE_TTL_MS
  ) {
    return { ...cache.payload, cached: true };
  }

  const warnings = [];
  const [gb, asana] = await Promise.all([
    fetchGivebutterDashboard({ period, membershipType }),
    fetchAsanaEventsDashboard({ period }),
  ]);

  if (gb.error) warnings.push({ source: "givebutter", message: gb.error });
  if (asana.error) warnings.push({ source: "asana", message: asana.error });

  const syncHealth = buildSyncHealth(gb, asana);
  const gbData = gb.data;
  const asanaData = asana.data;
  const eventsDegraded = asanaData?.eventsDegraded || !asanaData;

  const paidMembers = gbData?.paidCount ?? null;
  const honoraryMembers = gbData?.honoraryCount ?? null;
  const totalMembers = gbData?.totalCount ?? null;
  const prevPaid = gbData?.prevPaidCount ?? 0;
  const newMembers = gbData?.newInPeriodPaid ?? null;
  const newMembersHonorary = gbData?.newInPeriodHonorary ?? 0;
  const prevNew = gbData?.prevNewInPeriodPaid ?? 0;
  const eventsHeld = asanaData?.eventsHeldInPeriod ?? null;
  const prevEventsHeld = asanaData?.prevEventsHeld ?? 0;
  const upcoming = asanaData?.upcomingCount ?? null;
  const pipeline = asanaData?.pipelineCount ?? null;

  const kpis = [
    {
      id: "paidMembers",
      label: "Paid members",
      value: paidMembers != null ? String(paidMembers) : "—",
      delta:
        paidMembers != null
          ? formatDelta(paidMembers, prevPaid)
          : { text: "Unavailable", className: "is-flat" },
      footnote:
        honoraryMembers != null && totalMembers != null
          ? `+ ${honoraryMembers} honorary · ${totalMembers} total`
          : null,
      accent: true,
      degraded: !gbData,
    },
    {
      id: "newMembers",
      label: "New paid this period",
      value: newMembers != null ? String(newMembers) : "—",
      delta:
        newMembers != null
          ? formatDelta(newMembers, prevNew)
          : { text: "Unavailable", className: "is-flat" },
      footnote: newMembersHonorary > 0 ? `+ ${newMembersHonorary} honorary` : null,
      degraded: !gbData,
    },
    {
      id: "eventsHeld",
      label: "Events held",
      value: eventsHeld != null ? String(eventsHeld) : "—",
      delta:
        eventsHeld != null
          ? formatDelta(eventsHeld, prevEventsHeld)
          : { text: "Unavailable", className: "is-flat" },
      degraded: eventsDegraded,
    },
    {
      id: "upcoming",
      label: "Upcoming events",
      value: upcoming != null ? String(upcoming) : "—",
      delta: { text: "Planning, Marketing, or Ready with a future date", className: "is-flat" },
      degraded: eventsDegraded,
    },
    {
      id: "pipeline",
      label: "Pipeline scheduled",
      value: pipeline != null ? String(pipeline) : "—",
      delta: { text: "Next 6 months", className: "is-flat" },
      degraded: eventsDegraded,
    },
  ];

  const paidCurrent = paidMembers ?? 0;
  const pipelineCurrent = pipeline ?? 0;

  const goals = [
    {
      ...GOALS.members,
      current: paidCurrent,
      honoraryCount: honoraryMembers ?? 0,
      note:
        paidMembers != null
          ? `${Math.max(GOALS.members.target - paidCurrent, 0)} paid to goal by ${GOALS.members.deadline}`
          : "Member data unavailable",
    },
    {
      ...GOALS.pipeline,
      current: pipelineCurrent,
      note:
        pipeline != null
          ? `${Math.max(GOALS.pipeline.target - pipelineCurrent, 0)} more dated events in pipeline`
          : "Event data unavailable",
      pipelineByMonth: asanaData?.pipelineByMonth ?? [],
    },
  ];

  const payload = {
    updatedAt: new Date().toISOString(),
    cached: false,
    syncHealth,
    warnings,
    kpis,
    goals,
    tierMix: gbData?.tierMix ?? { gold: 0, silver: 0, bronze: 0 },
    tierMixPaid: gbData?.tierMixPaid ?? { gold: 0, silver: 0, bronze: 0 },
    tierMixHonorary: gbData?.tierMixHonorary ?? { gold: 0, silver: 0, bronze: 0 },
    honoraryCount: gbData?.honoraryCount ?? 0,
    paidCount: gbData?.paidCount ?? 0,
    totalMemberCount: gbData?.totalCount ?? 0,
    totalForTiers: gbData?.totalCount ?? 0,
    monthly: mergeMonthly(gbData?.monthlyNewMembers, asanaData?.monthlyEventsHeld),
    events: asanaData?.events ?? [],
    members: gbData?.allMembers ?? [],
    undatedPipelineCount: asanaData?.undatedPipelineCount ?? 0,
  };

  cache = { key: cacheKey, at: now, payload };
  return payload;
}
