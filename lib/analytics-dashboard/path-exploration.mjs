import { format } from "date-fns";

import { buildPagePathFilter, withFilter } from "./ga4-filters.mjs";
import {
  getAlphaGa4Client,
  getGa4Client,
  getGa4PropertyId,
  parseGa4Metric,
} from "./ga4-client.mjs";
import { getProgram } from "./programs.mjs";

const BRANCH_LIMIT = 5;
const LANDING_LIMIT = 8;

function toGaDate(date) {
  return format(date, "yyyy-MM-dd");
}

function normalizePath(path) {
  if (!path || path === "(not set)") return "";
  const trimmed = path.trim();
  if (!trimmed) return "/";
  return trimmed.replace(/\/$/, "") || "/";
}

function normalizePath(path) {
  id,
  path,
  value,
  step,
  metric = "sessions",
  label,
  isMore = false,
}) {
  return {
    id,
    path,
    label: label ?? path,
    value,
    step,
    metric,
    isMore,
  };
}

function buildPageViewStep(path, name) {
  return {
    name,
    filterExpression: {
      funnelEventFilter: {
        eventName: "page_view",
      },
      funnelFieldFilter: {
        fieldName: "unifiedPagePathScreen",
        stringFilter: {
          matchType: "EXACT",
          value: normalizePath(path),
        },
      },
    },
  };
}

function stepLabel(path) {
  const normalized = normalizePath(path);
  if (normalized === "/") return "Home";
  if (normalized.length > 48) return `${normalized.slice(0, 45)}…`;
  return normalized;
}

function buildFunnelSteps(pathSteps) {
  if (!pathSteps.length) return [];

  const steps = [
    {
      name: stepLabel(pathSteps[0]),
      filterExpression: {
        funnelEventFilter: {
          eventName: "page_view",
        },
        funnelFieldFilter: {
          fieldName: "landingPage",
          stringFilter: {
            matchType: "EXACT",
            value: normalizePath(pathSteps[0]),
          },
        },
      },
    },
  ];

  for (let index = 1; index < pathSteps.length; index += 1) {
    steps.push(buildPageViewStep(pathSteps[index], stepLabel(pathSteps[index])));
  }

  return steps;
}

async function runPathReport(client, property, range, request) {
  const [report] = await client.runReport({
    property,
    dateRanges: [range],
    ...request,
  });
  return report;
}

function mapTransitionsToNodes(transitions, step, pathSteps) {
  if (!transitions.length) return [];

  const selectedPaths = new Set(pathSteps.map((path) => normalizePath(path)));
  const filtered = transitions.filter(
    (row) =>
      row.sessions > 0 &&
      row.path !== "(not set)" &&
      !row.path.startsWith("/.wf_") &&
      !selectedPaths.has(normalizePath(row.path)),
  );

  const top = filtered.slice(0, BRANCH_LIMIT);
  const rest = filtered.slice(BRANCH_LIMIT);
  const restTotal = rest.reduce((sum, row) => sum + row.sessions, 0);

  const nodes = top.map((row, index) =>
    createNode({
      id: `${step}:${pathSteps.join(">")}>${row.path}:${index}`,
      path: row.path,
      value: row.sessions,
      step,
      metric: "sessions",
    }),
  );

  if (restTotal > 0) {
    nodes.push(
      createNode({
        id: `${step}:${pathSteps.join(">")}>__more__`,
        path: "__more__",
        label: "More pages",
        value: restTotal,
        step,
        metric: "sessions",
        isMore: true,
      }),
    );
  }

  return nodes;
}

function parseFunnelNextActions(report, pathSteps) {
  const visualization = report.funnelVisualization;
  if (!visualization?.rows?.length) return [];

  const dimensionNames =
    visualization.dimensionHeaders?.map((header) => header.name) ?? [];
  const stepNameIndex = dimensionNames.indexOf("funnelStepName");
  const nextActionIndex = dimensionNames.indexOf("funnelStepNextAction");
  const activeUsersIndex =
    visualization.metricHeaders?.findIndex(
      (header) => header.name === "activeUsers",
    ) ?? 0;

  if (nextActionIndex === -1) return [];

  const lastStepPrefix = `${pathSteps.length}. `;

  return visualization.rows
    .map((row) => ({
      stepName: row.dimensionValues?.[stepNameIndex]?.value ?? "",
      path: row.dimensionValues?.[nextActionIndex]?.value ?? "",
      sessions: parseGa4Metric(row, activeUsersIndex),
    }))
    .filter(
      (row) =>
        row.stepName.startsWith(lastStepPrefix) &&
        row.path &&
        row.path !== "(not set)" &&
        row.path !== "(no next action)" &&
        row.path !== "RESERVED_TOTAL" &&
        row.sessions > 0,
    );
}

async function fetchFunnelNextPages(
  client,
  property,
  range,
  pathSteps,
  programId,
) {
  const programFilter = buildPagePathFilter(programId);
  const steps = buildFunnelSteps(pathSteps);

  const [report] = await client.runFunnelReport({
    property,
    dateRanges: [range],
    funnel: { steps },
    funnelNextAction: {
      nextActionDimension: { name: "unifiedPagePathScreen" },
      limit: String(BRANCH_LIMIT),
    },
    funnelVisualizationType: "STANDARD_FUNNEL",
    dimensionFilter: programFilter ?? undefined,
  });

  return parseFunnelNextActions(report, pathSteps);
}

async function fetchTopLandingPages(client, property, range, programId) {
  const programFilter = buildPagePathFilter(programId);
  const report = await runPathReport(
    client,
    property,
    range,
    withFilter(
      {
        dimensions: [{ name: "landingPage" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: LANDING_LIMIT + 10,
      },
      programFilter,
    ),
  );

  return (report.rows ?? [])
    .map((row) => ({
      path: row.dimensionValues?.[0]?.value ?? "/",
      sessions: parseGa4Metric(row, 0),
    }))
    .filter(
      (row) =>
        row.sessions > 0 &&
        row.path !== "(not set)" &&
        !row.path.startsWith("/.wf_"),
    )
    .slice(0, LANDING_LIMIT);
}

/**
 * @param {{
 *   startDate: Date;
 *   endDate: Date;
 *   programId?: string;
 *   mode?: string;
 *   pathSteps?: string[];
 * }} options
 */
export async function fetchPathExploration({
  startDate,
  endDate,
  programId = "all",
  mode = "landings",
  pathSteps = [],
}) {
  const program = getProgram(programId);
  const client = await getGa4Client();
  const propertyId = getGa4PropertyId();
  const property = `properties/${propertyId}`;
  const range = {
    startDate: toGaDate(startDate),
    endDate: toGaDate(endDate),
  };

  const base = {
    propertyId,
    program: {
      id: program.id,
      name: program.name,
    },
    dateRange: range,
    fetchedAt: new Date().toISOString(),
  };

  if (mode === "next") {
    const normalizedSteps = pathSteps
      .map((path) => normalizePath(path))
      .filter(Boolean);

    if (!normalizedSteps.length) {
      throw new Error("pathSteps is required for next-step path exploration.");
    }

    const alphaClient = await getAlphaGa4Client();
    const transitions = await fetchFunnelNextPages(
      alphaClient,
      property,
      range,
      normalizedSteps,
      program.id,
    );

    return {
      ...base,
      mode: "next",
      pathSteps: normalizedSteps,
      nodes: mapTransitionsToNodes(
        transitions,
        normalizedSteps.length,
        normalizedSteps,
      ),
    };
  }

  const landings = await fetchTopLandingPages(
    client,
    property,
    range,
    program.id,
  );

  return {
    ...base,
    mode: "landings",
    pathSteps: [],
    nodes: landings.map((landing, index) =>
      createNode({
        id: `landing:${landing.path}:${index}`,
        path: landing.path,
        value: landing.sessions,
        step: 0,
        metric: "sessions",
      }),
    ),
  };
}
