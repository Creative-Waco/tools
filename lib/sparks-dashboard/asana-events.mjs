import { getValidAccessToken } from "./asana-auth.mjs";
import { getPeriodRange, isInRange, last12MonthLabels, monthKey } from "./period.mjs";
import {
  PIPELINE_STATUSES,
  UPCOMING_STATUSES,
  createSchemaIssue,
  findCustomField,
  getAliasesConfig,
  getCustomFieldEnumValue,
  isEventTaskType,
  isEventsSection,
  normalizeEventStatus,
} from "./asana-schema.mjs";

const ASANA_BASE = "https://app.asana.com/api/1.0";

function projectGid() {
  return process.env.ASANA_SPARKS_PROJECT_GID ?? "1213968849649812";
}

async function asanaFetch(path, params = {}, { retry = true } = {}) {
  const token = await getValidAccessToken();

  const url = new URL(`${ASANA_BASE}/${path.replace(/^\//, "")}`);
  for (const [k, v] of Object.entries(params)) {
    if (v != null) url.searchParams.set(k, String(v));
  }

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (res.status === 401 && retry) {
    delete process.env.ASANA_ACCESS_TOKEN;
    return asanaFetch(path, params, { retry: false });
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Asana API ${res.status}: ${text.slice(0, 200)}`);
  }

  return res.json();
}

async function fetchAllProjectTasks(gid) {
  const tasks = [];
  let offset = null;

  const optFields = [
    "name",
    "due_on",
    "completed",
    "completed_at",
    "permalink_url",
    "custom_fields.name",
    "custom_fields.gid",
    "custom_fields.display_value",
    "custom_fields.enum_value.name",
    "memberships.section.name",
  ].join(",");

  do {
    const params = {
      project: gid,
      opt_fields: optFields,
      limit: 100,
    };
    if (offset) params.offset = offset;

    const data = await asanaFetch("tasks", params);
    tasks.push(...(data.data ?? []));
    offset = data.next_page?.offset ?? null;
  } while (offset);

  return tasks;
}

function parseEventDate(task) {
  return task.due_on ?? task.completed_at?.slice(0, 10) ?? null;
}

function isFutureDate(iso, today) {
  if (!iso) return false;
  return iso >= today;
}

function monthsAhead(n, from = new Date()) {
  const end = new Date(from.getFullYear(), from.getMonth() + n, from.getDate());
  return end.toISOString().slice(0, 10);
}

function shouldSkipTaskName(name) {
  const n = String(name ?? "").trim();
  if (!n) return true;
  if (/^\[duplicate\]/i.test(n)) return true;
  return false;
}

export async function fetchAsanaEventsDashboard({ period = "fy" } = {}) {
  const schemaIssues = [];
  const aliasesConfig = getAliasesConfig();
  const range = getPeriodRange(period);
  const today = new Date().toISOString().slice(0, 10);
  const pipelineEnd = monthsAhead(6);

  try {
    const rawTasks = await fetchAllProjectTasks(projectGid());

    const { field: eventStatusField, issue: eventStatusFieldIssue } = findCustomField(
      rawTasks[0]?.custom_fields ?? [],
      "eventStatus",
      aliasesConfig,
    );

    if (eventStatusFieldIssue && !eventStatusField) {
      schemaIssues.push(eventStatusFieldIssue);
    }

    const events = [];
    let fieldNotFoundLogged = false;

    for (const task of rawTasks) {
      if (!isEventsSection(task.memberships, aliasesConfig)) continue;

      const typeCheck = isEventTaskType(task.custom_fields, aliasesConfig);
      if (typeCheck.issue) schemaIssues.push(typeCheck.issue);
      if (!typeCheck.ok) continue;

      if (shouldSkipTaskName(task.name)) continue;

      const { field: statusField } = findCustomField(
        task.custom_fields,
        "eventStatus",
        aliasesConfig,
      );

      if (!statusField && !fieldNotFoundLogged) {
        if (eventStatusFieldIssue) schemaIssues.push(eventStatusFieldIssue);
        fieldNotFoundLogged = true;
      }

      const rawStatus = getCustomFieldEnumValue(statusField);
      const { slug, label } = normalizeEventStatus(
        rawStatus,
        aliasesConfig,
        task.name,
        schemaIssues,
      );

      const date = parseEventDate(task);

      events.push({
        title: task.name,
        date,
        status: slug ?? "unknown",
        statusLabel: label ?? rawStatus ?? "—",
        asanaUrl: task.permalink_url ?? null,
      });
    }

    if (rawTasks.length > 0 && events.length === 0) {
      schemaIssues.push(
        createSchemaIssue({
          code: "no_events_parsed",
          field: "events",
          expected: "Tasks in Events section with Task Type = Event",
          found: `${rawTasks.length} project tasks`,
          message:
            "Fetched Asana tasks but none matched Events section + Event type. Section or field names may have changed.",
        }),
      );
    }

    const eventsHeldInPeriod = events.filter((e) => {
      if (e.status !== "done") return false;
      const d = e.date ?? null;
      return d && isInRange(`${d}T12:00:00`, range);
    }).length;

    const prevRange = { start: range.prevStart, end: range.prevEnd };
    const prevEventsHeld = events.filter((e) => {
      if (e.status !== "done") return false;
      const d = e.date ?? null;
      return d && isInRange(`${d}T12:00:00`, prevRange);
    }).length;

    const upcomingCount = events.filter(
      (e) => UPCOMING_STATUSES.has(e.status) && e.date && isFutureDate(e.date, today),
    ).length;

    const pipelineEvents = events.filter((e) => {
      if (!PIPELINE_STATUSES.has(e.status)) return false;
      if (!e.date) return false;
      return e.date >= today && e.date <= pipelineEnd;
    });

    const pipelineCount = pipelineEvents.length;
    const undatedPipelineCount = events.filter(
      (e) => PIPELINE_STATUSES.has(e.status) && !e.date,
    ).length;

    const pipelineByMonth = buildPipelineByMonth(pipelineEvents, today);

    const monthLabels = last12MonthLabels();
    const monthlyEventsHeld = monthLabels.map(({ key, label }) => ({
      month: label,
      key,
      events: events.filter((e) => {
        if (e.status !== "done" || !e.date) return false;
        return monthKey(`${e.date}T12:00:00`) === key;
      }).length,
    }));

    const sortedEvents = sortEventsForDisplay(events, today);

    const uniqueIssues = dedupeIssues(schemaIssues);

    return {
      ok: !uniqueIssues.some((i) =>
        ["field_not_found", "no_events_parsed", "ambiguous_field"].includes(i.code),
      ),
      schemaIssues: uniqueIssues,
      data: {
        events: sortedEvents,
        eventsHeldInPeriod,
        prevEventsHeld,
        upcomingCount,
        pipelineCount,
        pipelineByMonth,
        undatedPipelineCount,
        monthlyEventsHeld,
        eventsDegraded: uniqueIssues.length > 0,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Asana fetch failed.",
      schemaIssues: [],
      data: null,
    };
  }
}

function isDoneOrCanceled(status) {
  return status === "done" || status === "canceled" || status === "cancelled";
}

function sortEventsForDisplay(events, today) {
  const upcoming = [];
  const ideas = [];
  const done = [];

  for (const event of events) {
    if (event.status === "idea") ideas.push(event);
    else if (isDoneOrCanceled(event.status)) done.push(event);
    else upcoming.push(event);
  }

  const byDateAsc = (a, b) => {
    const da = a.date ?? "9999-12-31";
    const db = b.date ?? "9999-12-31";
    if (da !== db) return da.localeCompare(db);
    return a.title.localeCompare(b.title);
  };

  const byDateDesc = (a, b) => {
    const da = a.date ?? "0000-01-01";
    const db = b.date ?? "0000-01-01";
    if (da !== db) return db.localeCompare(da);
    return a.title.localeCompare(b.title);
  };

  upcoming.sort((a, b) => {
    const aFuture = a.date && a.date >= today;
    const bFuture = b.date && b.date >= today;
    if (aFuture !== bFuture) return aFuture ? -1 : 1;
    return byDateAsc(a, b);
  });

  ideas.sort((a, b) => {
    const aDated = Boolean(a.date);
    const bDated = Boolean(b.date);
    if (aDated !== bDated) return aDated ? -1 : 1;
    return byDateAsc(a, b);
  });

  done.sort(byDateDesc);

  return [...upcoming, ...ideas, ...done];
}

function buildPipelineByMonth(pipelineEvents, todayIso) {
  const today = new Date(`${todayIso}T12:00:00`);
  const months = [];

  for (let i = 0; i < 6; i += 1) {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const key = monthKey(d);
    const label = d.toLocaleDateString("en-US", { month: "short" });
    const count = pipelineEvents.filter((e) => monthKey(`${e.date}T12:00:00`) === key).length;
    months.push({ label, key, count, target: 2 });
  }

  return months;
}

function dedupeIssues(issues) {
  const seen = new Set();
  return issues.filter((i) => {
    const key = `${i.code}:${i.field}:${i.found}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
