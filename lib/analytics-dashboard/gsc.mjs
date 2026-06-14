import { format } from "date-fns";
import { google } from "googleapis";

import { comparisonRange } from "./date-range.mjs";
import {
  computeSearchQueryInsights,
  mapQueryTrendRows,
} from "./gsc-insights.mjs";
import { gscPageToPath } from "./path-utils.mjs";
import { getProgram } from "./programs.mjs";

let clientPromise = null;

const QUERY_ROW_LIMIT = 100;
const TOP_TREND_QUERIES = 40;
const TREND_ROW_LIMIT = 25000;

const DEFAULT_SITE_URLS = [
  "sc-domain:creativewaco.org",
  "https://creativewaco.org/",
  "https://www1.creativewaco.org/",
];

function getSiteUrls() {
  const configured = process.env.GSC_SITE_URL?.trim();
  if (configured) return [configured, ...DEFAULT_SITE_URLS.filter((u) => u !== configured)];
  return DEFAULT_SITE_URLS;
}

function getAuth() {
  if (!clientPromise) {
    const json = process.env.GA4_SERVICE_ACCOUNT_JSON?.trim();
    const filePath = process.env.GA4_SERVICE_ACCOUNT_PATH?.trim();

    if (json) {
      clientPromise = Promise.resolve(
        new google.auth.GoogleAuth({
          credentials: JSON.parse(json),
          scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
        }),
      );
    } else if (filePath) {
      clientPromise = Promise.resolve(
        new google.auth.GoogleAuth({
          keyFile: filePath,
          scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
        }),
      );
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      clientPromise = Promise.resolve(
        new google.auth.GoogleAuth({
          scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
        }),
      );
    } else {
      clientPromise = Promise.reject(
        new Error("GSC credentials are not configured."),
      );
    }
  }
  return clientPromise;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildPageFilterGroup(pageContains) {
  if (!pageContains?.length) return undefined;

  if (pageContains.length === 1) {
    return [
      {
        filters: [
          {
            dimension: "page",
            operator: "contains",
            expression: pageContains[0],
          },
        ],
      },
    ];
  }

  // GSC only supports groupType "and"; OR within a group is not available.
  // Combine multiple page paths into one includingRegex filter instead.
  return [
    {
      filters: [
        {
          dimension: "page",
          operator: "includingRegex",
          expression: pageContains.map(escapeRegex).join("|"),
        },
      ],
    },
  ];
}

function friendlyGscError(error) {
  const message = error?.message ?? String(error);

  if (message.includes("has not been used") || message.includes("disabled")) {
    return "Enable the Google Search Console API in the civic-shell-472218-g7 Google Cloud project.";
  }
  if (message.includes("403") || message.includes("Forbidden")) {
    return "Add cursor-ga4-reader@civic-shell-472218-g7.iam.gserviceaccount.com as a user on creativewaco.org in Search Console.";
  }
  if (message.includes("404") || message.includes("not found")) {
    return "Search Console property not found. Set GSC_SITE_URL in env (e.g. sc-domain:creativewaco.org).";
  }

  return message;
}

async function querySearchAnalytics(searchconsole, siteUrl, requestBody) {
  const response = await searchconsole.searchanalytics.query({
    siteUrl,
    requestBody,
  });
  return response.data.rows ?? [];
}

function isDisplayableQuery(query) {
  const value = query.trim();
  if (!value) return false;
  if (value.length > 100) return false;
  if (/(&amp;){3,}/.test(value)) return false;
  if ((value.match(/-site:/gi) ?? []).length >= 2) return false;
  return true;
}

function mapPageRows(rows) {
  return (rows ?? [])
    .map((row) => {
      const pageUrl = row.keys?.[0] ?? "";
      return {
        page: pageUrl,
        path: gscPageToPath(pageUrl),
        clicks: row.clicks ?? 0,
        impressions: row.impressions ?? 0,
        ctr: Math.round((row.ctr ?? 0) * 1000) / 10,
        position: Math.round((row.position ?? 0) * 10) / 10,
      };
    })
    .filter((row) => row.path);
}

function mapQueryPageRows(rows) {
  return rows
    .map((row) => {
      const pageUrl = row.keys?.[1] ?? "";
      return {
        query: row.keys?.[0] ?? "",
        page: pageUrl,
        path: gscPageToPath(pageUrl),
        clicks: row.clicks ?? 0,
        impressions: row.impressions ?? 0,
        ctr: Math.round((row.ctr ?? 0) * 1000) / 10,
        position: Math.round((row.position ?? 0) * 10) / 10,
      };
    })
    .filter((row) => isDisplayableQuery(row.query) && row.path);
}

function mapQueryRows(rows) {
  return rows
    .map((row) => ({
      query: row.keys?.[0] ?? "",
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      ctr: Math.round((row.ctr ?? 0) * 1000) / 10,
      position: Math.round((row.position ?? 0) * 10) / 10,
    }))
    .filter((row) => isDisplayableQuery(row.query));
}

function mapTotalsRow(row) {
  if (!row) return { clicks: 0, impressions: 0, ctr: 0 };
  const clicks = row.clicks ?? 0;
  const impressions = row.impressions ?? 0;
  return {
    clicks,
    impressions,
    ctr:
      impressions > 0 ? Math.round((clicks / impressions) * 1000) / 10 : 0,
  };
}

function emptyInsights() {
  return {
    opportunities: [],
    rising: [],
    cannibalization: [],
    declining: [],
    all: [],
  };
}

export async function fetchSearchConsoleQueries({
  startDate,
  endDate,
  programId = "all",
}) {
  const program = getProgram(programId);
  const previous = comparisonRange(startDate, endDate);

  try {
    const auth = await getAuth();
    const searchconsole = google.searchconsole({ version: "v1", auth });
    const baseRequest = {
      startDate: format(startDate, "yyyy-MM-dd"),
      endDate: format(endDate, "yyyy-MM-dd"),
      dimensionFilterGroups: buildPageFilterGroup(program.gscPageContains),
    };
    const previousRequest = {
      startDate: format(previous.startDate, "yyyy-MM-dd"),
      endDate: format(previous.endDate, "yyyy-MM-dd"),
      dimensionFilterGroups: baseRequest.dimensionFilterGroups,
    };
    const totalsRequestBody = {
      startDate: baseRequest.startDate,
      endDate: baseRequest.endDate,
      dimensionFilterGroups: baseRequest.dimensionFilterGroups,
    };

    let lastError = null;
    for (const siteUrl of getSiteUrls()) {
      try {
        const [
          totalsRows,
          queryRows,
          pageRows,
          queryPageRows,
          previousQueryRows,
          trendRows,
          previousPageRows,
        ] = await Promise.all([
          querySearchAnalytics(searchconsole, siteUrl, totalsRequestBody),
          querySearchAnalytics(searchconsole, siteUrl, {
            ...baseRequest,
            dimensions: ["query"],
            rowLimit: QUERY_ROW_LIMIT,
          }),
          querySearchAnalytics(searchconsole, siteUrl, {
            ...baseRequest,
            dimensions: ["page"],
            rowLimit: 50,
          }),
          querySearchAnalytics(searchconsole, siteUrl, {
            ...baseRequest,
            dimensions: ["query", "page"],
            rowLimit: 500,
          }),
          querySearchAnalytics(searchconsole, siteUrl, {
            ...previousRequest,
            dimensions: ["query"],
            rowLimit: QUERY_ROW_LIMIT,
          }),
          querySearchAnalytics(searchconsole, siteUrl, {
            ...baseRequest,
            dimensions: ["date", "query"],
            rowLimit: TREND_ROW_LIMIT,
          }),
          querySearchAnalytics(searchconsole, siteUrl, {
            ...previousRequest,
            dimensions: ["page"],
            rowLimit: 50,
          }),
        ]);

        const gscApiCalls = 7;

        const currentQueriesFull = mapQueryRows(queryRows);
        const previousQueriesFull = mapQueryRows(previousQueryRows);
        const queries = currentQueriesFull.slice(0, 25);
        const pages = mapPageRows(pageRows).slice(0, 25);
        const previousPages = mapPageRows(previousPageRows).slice(0, 50);
        const pairs = mapQueryPageRows(queryPageRows);
        const totals = mapTotalsRow(totalsRows[0]);

        const topTrendQueries = new Set(
          [...currentQueriesFull]
            .sort((a, b) => b.impressions - a.impressions)
            .slice(0, TOP_TREND_QUERIES)
            .map((row) => row.query),
        );

        const queryTrends = mapQueryTrendRows(trendRows, topTrendQueries);

        const insights = computeSearchQueryInsights({
          currentQueries: currentQueriesFull,
          previousQueries: previousQueriesFull,
          queryTrends,
          pairs,
          startDate,
          endDate,
        });

        return {
          available: true,
          siteUrl,
          programId: program.id,
          queries,
          pages,
          previousPages,
          pairs,
          totals,
          insights,
          gscApiCalls,
          note: "Search Console counts clicks from Google Search results to these pages. GA4 organic sessions also include visitors who landed on another page (e.g. homepage) and navigated here, plus Google Discover/News. GSC data is typically 2–3 days behind GA4.",
        };
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError ?? new Error("Search Console query failed.");
  } catch (error) {
    return {
      available: false,
      siteUrl: null,
      programId: program.id,
      queries: [],
      pages: [],
      previousPages: [],
      pairs: [],
      totals: { clicks: 0, impressions: 0, ctr: 0 },
      insights: emptyInsights(),
      error: friendlyGscError(error),
      note: "Search Console counts clicks from Google Search results to these pages. GA4 organic sessions also include visitors who landed on another page (e.g. homepage) and navigated here, plus Google Discover/News. GSC data is typically 2–3 days behind GA4.",
    };
  }
}
