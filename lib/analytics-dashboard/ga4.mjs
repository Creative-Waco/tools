import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { format } from "date-fns";

import { comparisonRange, pctChange } from "./date-range.mjs";
import {
  computeTrafficInsights,
  dedupeLandingPagesByPath,
  mapComparisonDimensionRows,
} from "./traffic-insights.mjs";
import {
  buildPagePathFilter,
  buildReferrerFromProgramFilter,
  withFilter,
} from "./ga4-filters.mjs";
import { getProgram } from "./programs.mjs";

const CHANNEL_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

let clientPromise = null;

function getPropertyId() {
  const id = process.env.GA4_PROPERTY_ID?.trim();
  if (!id) {
    throw new Error(
      "GA4_PROPERTY_ID is not set. Add your GA4 property ID to .env.local or Vercel env vars.",
    );
  }
  return id.replace(/^properties\//, "");
}

function getClient() {
  if (!clientPromise) {
    const json = process.env.GA4_SERVICE_ACCOUNT_JSON?.trim();
    const filePath = process.env.GA4_SERVICE_ACCOUNT_PATH?.trim();

    if (json) {
      clientPromise = Promise.resolve(
        new BetaAnalyticsDataClient({
          credentials: JSON.parse(json),
        }),
      );
    } else if (filePath) {
      clientPromise = Promise.resolve(
        new BetaAnalyticsDataClient({
          keyFilename: filePath,
        }),
      );
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      clientPromise = Promise.resolve(new BetaAnalyticsDataClient());
    } else {
      throw new Error(
        "GA4 credentials are not configured. Set GA4_SERVICE_ACCOUNT_JSON, GA4_SERVICE_ACCOUNT_PATH, or GOOGLE_APPLICATION_CREDENTIALS.",
      );
    }
  }
  return clientPromise;
}

function toGaDate(date) {
  return format(date, "yyyy-MM-dd");
}

function parseMetric(row, index) {
  const raw = row.metricValues?.[index]?.value ?? "0";
  const num = Number(raw);
  return Number.isFinite(num) ? num : 0;
}

function parseRateMetric(row, index) {
  const value = parseMetric(row, index);
  return value <= 1 ? value * 100 : value;
}

function parseDurationSeconds(row, index) {
  return Math.round(parseMetric(row, index));
}

function mapDailyRows(rows) {
  return (rows ?? []).map((row) => {
    const dateKey = row.dimensionValues?.[0]?.value ?? "";
    const year = dateKey.slice(0, 4);
    const month = dateKey.slice(4, 6);
    const day = dateKey.slice(6, 8);
    const date = new Date(`${year}-${month}-${day}T12:00:00`);
    return {
      date: date.toISOString(),
      dateKey,
      dateStr: format(date, "MMM d"),
      sessions: parseMetric(row, 0),
      activeUsers: parseMetric(row, 1),
      pageViews: parseMetric(row, 2),
    };
  });
}

function mapDailyPageBreakdown(rows, topN = 8) {
  const byDate = new Map();

  for (const row of rows ?? []) {
    const dateKey = row.dimensionValues?.[0]?.value ?? "";
    const path = row.dimensionValues?.[1]?.value ?? "/";
    const views = parseMetric(row, 0);

    if (!byDate.has(dateKey)) {
      byDate.set(dateKey, []);
    }

    byDate.get(dateKey).push({ path, views });
  }

  for (const [dateKey, pages] of byDate) {
    pages.sort((a, b) => b.views - a.views);
    byDate.set(dateKey, pages.slice(0, topN));
  }

  return byDate;
}

function mergeDailyPages(daily, pagesByDate) {
  return daily.map((row) => ({
    ...row,
    pages: pagesByDate.get(row.dateKey) ?? [],
  }));
}

function mapChannelRows(rows) {
  const channelRows = rows ?? [];
  const channelTotal = channelRows.reduce(
    (sum, row) => sum + parseMetric(row, 0),
    0,
  );

  const channelData = channelRows.map((row, index) => {
    const name = row.dimensionValues?.[0]?.value ?? "Unknown";
    const sessionsCount = parseMetric(row, 0);
    const value =
      channelTotal > 0
        ? Math.round((sessionsCount / channelTotal) * 1000) / 10
        : 0;
    return {
      name,
      value,
      sessions: sessionsCount,
      fill: CHANNEL_COLORS[index % CHANNEL_COLORS.length],
    };
  });

  return {
    channels: channelData,
    channelConfig: Object.fromEntries(
      channelData.map((item) => [
        item.name,
        { label: item.name, color: item.fill },
      ]),
    ),
  };
}

function mapChannelSourceBreakdown(rows, topN = 6) {
  const byChannel = new Map();

  for (const row of mapComparisonDimensionRows(rows, ["sessions"])) {
    const channel = row.dimensions[0] ?? "Unknown";
    const source = row.dimensions[1] ?? "(not set)";

    if (!byChannel.has(channel)) {
      byChannel.set(channel, []);
    }

    byChannel.get(channel).push({
      source,
      sessions: Math.round(row.metrics.sessions.current),
      previousSessions: Math.round(row.metrics.sessions.previous),
    });
  }

  for (const [channel, sources] of byChannel) {
    sources.sort((a, b) => b.sessions - a.sessions);
    byChannel.set(channel, sources.slice(0, topN));
  }

  return byChannel;
}

function mergeChannelSources(channels, sourcesByChannel) {
  return channels.map((channel) => ({
    ...channel,
    sources: sourcesByChannel.get(channel.name) ?? [],
  }));
}

const UNKNOWN_DEMOGRAPHIC = new Set(["(not set)", "unknown", ""]);
const EXCLUDED_CITIES = new Set(["singapore"]);

function isExcludedCity(city) {
  if (!city) return true;
  return EXCLUDED_CITIES.has(city.toLowerCase());
}

function isUnknownDemographic(value) {
  if (!value) return true;
  return UNKNOWN_DEMOGRAPHIC.has(value.toLowerCase());
}

function formatGenderLabel(value) {
  if (value === "female") return "Female";
  if (value === "male") return "Male";
  return value;
}

function formatInterestLabel(value) {
  if (!value) return value;
  const parts = value.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? value;
}

function mapDemographicRows(rows, { topN = 6, formatLabel = (value) => value } = {}) {
  const entries = (rows ?? []).map((row) => {
    const raw = row.dimensionValues?.[0]?.value ?? "";
    const label = formatLabel(raw);
    return {
      raw,
      label,
      users: parseMetric(row, 0),
    };
  });

  const totalUsers = entries.reduce((sum, entry) => sum + entry.users, 0);
  const knownEntries = entries.filter((entry) => !isUnknownDemographic(entry.raw));
  const knownUsers = knownEntries.reduce((sum, entry) => sum + entry.users, 0);
  const sorted = [...knownEntries]
    .sort((a, b) => b.users - a.users)
    .slice(0, topN);

  return {
    rows: sorted.map((entry) => ({
      label: entry.label,
      fullLabel: entry.raw.includes("/") ? entry.raw : undefined,
      users: entry.users,
      share:
        knownUsers > 0
          ? Math.round((entry.users / knownUsers) * 1000) / 10
          : 0,
    })),
    knownUsers,
    totalUsers,
  };
}

function mapCityBreakdown(rows, valueIndex = 0, topN = 5) {
  const byCity = new Map();

  for (const row of rows ?? []) {
    const city = row.dimensionValues?.[0]?.value ?? "";
    if (!city || city === "(not set)" || isExcludedCity(city)) continue;

    const label = row.dimensionValues?.[1]?.value ?? "";
    if (!label || label === "(not set)" || label.startsWith("/.wf_")) continue;

    const value = parseMetric(row, valueIndex);

    if (!byCity.has(city)) {
      byCity.set(city, []);
    }

    byCity.get(city).push({ label, value });
  }

  for (const [city, items] of byCity) {
    items.sort((a, b) => b.value - a.value);
    byCity.set(
      city,
      items.slice(0, topN).map(({ label, value }) => ({ label, value })),
    );
  }

  return byCity;
}

function mapCityLocationRows(rows) {
  const byCity = new Map();

  for (const row of rows ?? []) {
    const city = row.dimensionValues?.[0]?.value ?? "";
    if (!city || city === "(not set)" || isExcludedCity(city)) continue;

    const region = row.dimensionValues?.[1]?.value ?? "";
    const country = row.dimensionValues?.[2]?.value ?? "";
    const sessions = parseMetric(row, 0);

    const existing = byCity.get(city);
    if (!existing || sessions > existing.sessions) {
      byCity.set(city, {
        region: region === "(not set)" ? "" : region,
        country: country === "(not set)" ? "" : country,
        sessions,
      });
    }
  }

  return byCity;
}

function mapCityAudienceRows(rows) {
  const byCity = new Map();

  for (const row of rows ?? []) {
    const city = row.dimensionValues?.[0]?.value ?? "";
    if (!city || city === "(not set)" || isExcludedCity(city)) continue;

    const audience = row.dimensionValues?.[1]?.value ?? "";
    const users = parseMetric(row, 0);

    if (!byCity.has(city)) {
      byCity.set(city, { newUsers: 0, returningUsers: 0 });
    }

    const entry = byCity.get(city);
    if (audience === "new") entry.newUsers = users;
    if (audience === "returning") entry.returningUsers = users;
  }

  return byCity;
}

function mapTopCityRows(
  rows,
  {
    totalSessions = 0,
    locationsByCity = new Map(),
    sourcesByCity = new Map(),
    landingsByCity = new Map(),
    audienceByCity = new Map(),
  } = {},
) {
  return (rows ?? [])
    .filter((row) => {
      const city = row.dimensionValues?.[0]?.value ?? "";
      return city !== "(not set)" && !isExcludedCity(city);
    })
    .map((row) => {
      const city = row.dimensionValues?.[0]?.value ?? "Unknown";
      const users = parseMetric(row, 0);
      const sessions = parseMetric(row, 1);
      const engagementRate = parseRateMetric(row, 2);
      const location = locationsByCity.get(city);
      const audience = audienceByCity.get(city) ?? {
        newUsers: 0,
        returningUsers: 0,
      };

      return {
        city,
        country: location?.country,
        region: location?.region,
        users,
        sessions,
        share:
          totalSessions > 0
            ? Math.round((sessions / totalSessions) * 1000) / 10
            : 0,
        engagementRate: Math.round(engagementRate * 10) / 10,
        newUsers: audience.newUsers,
        returningUsers: audience.returningUsers,
        sources: (sourcesByCity.get(city) ?? []).map(({ label, value }) => ({
          source: label,
          sessions: value,
        })),
        landingPages: (landingsByCity.get(city) ?? []).map(
          ({ label, value }) => ({
            path: label,
            sessions: value,
          }),
        ),
      };
    })
    .slice(0, 8);
}

async function fetchTopCitiesWithBreakdowns(
  client,
  property,
  currentRange,
  pageFilter,
  totalSessions = 0,
) {
  const [
    [cities],
    [cityLocations],
    [citySources],
    [cityLandings],
    [cityAudience],
  ] = await Promise.all([
    client.runReport(
      withFilter(
        {
          property,
          dateRanges: [currentRange],
          dimensions: [{ name: "city" }],
          metrics: [
            { name: "activeUsers" },
            { name: "sessions" },
            { name: "engagementRate" },
          ],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: 9,
        },
        pageFilter,
      ),
    ),
    client.runReport(
      withFilter(
        {
          property,
          dateRanges: [currentRange],
          dimensions: [
            { name: "city" },
            { name: "region" },
            { name: "country" },
          ],
          metrics: [{ name: "sessions" }],
          orderBys: [
            { dimension: { dimensionName: "city" } },
            { metric: { metricName: "sessions" }, desc: true },
          ],
          limit: 10000,
        },
        pageFilter,
      ),
    ),
    client.runReport(
      withFilter(
        {
          property,
          dateRanges: [currentRange],
          dimensions: [{ name: "city" }, { name: "sessionSource" }],
          metrics: [{ name: "sessions" }],
          orderBys: [
            { dimension: { dimensionName: "city" } },
            { metric: { metricName: "sessions" }, desc: true },
          ],
          limit: 10000,
        },
        pageFilter,
      ),
    ),
    client.runReport(
      withFilter(
        {
          property,
          dateRanges: [currentRange],
          dimensions: [{ name: "city" }, { name: "landingPage" }],
          metrics: [{ name: "sessions" }],
          orderBys: [
            { dimension: { dimensionName: "city" } },
            { metric: { metricName: "sessions" }, desc: true },
          ],
          limit: 10000,
        },
        pageFilter,
      ),
    ),
    client.runReport(
      withFilter(
        {
          property,
          dateRanges: [currentRange],
          dimensions: [{ name: "city" }, { name: "newVsReturning" }],
          metrics: [{ name: "activeUsers" }],
          orderBys: [{ dimension: { dimensionName: "city" } }],
          limit: 10000,
        },
        pageFilter,
      ),
    ),
  ]);

  const sourcesByCity = mapCityBreakdown(citySources.rows);
  const landingsByCity = mapCityBreakdown(cityLandings.rows);

  return mapTopCityRows(cities.rows, {
    totalSessions,
    locationsByCity: mapCityLocationRows(cityLocations.rows),
    sourcesByCity,
    landingsByCity,
    audienceByCity: mapCityAudienceRows(cityAudience.rows),
  });
}

async function fetchUserDemographics(
  client,
  property,
  currentRange,
  pageFilter,
  activeUsers = 0,
) {
  const [[ageReport], [genderReport], [interestsReport]] = await Promise.all([
    client.runReport(
      withFilter(
        {
          property,
          dateRanges: [currentRange],
          dimensions: [{ name: "userAgeBracket" }],
          metrics: [{ name: "activeUsers" }],
          orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
          limit: 20,
        },
        pageFilter,
      ),
    ),
    client.runReport(
      withFilter(
        {
          property,
          dateRanges: [currentRange],
          dimensions: [{ name: "userGender" }],
          metrics: [{ name: "activeUsers" }],
          orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
          limit: 10,
        },
        pageFilter,
      ),
    ),
    client.runReport(
      withFilter(
        {
          property,
          dateRanges: [currentRange],
          dimensions: [{ name: "brandingInterest" }],
          metrics: [{ name: "activeUsers" }],
          orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
          limit: 12,
        },
        pageFilter,
      ),
    ),
  ]);

  const age = mapDemographicRows(ageReport.rows, { topN: 6 });
  const gender = mapDemographicRows(genderReport.rows, {
    topN: 4,
    formatLabel: formatGenderLabel,
  });
  const interests = mapDemographicRows(interestsReport.rows, {
    topN: 6,
    formatLabel: formatInterestLabel,
  });

  const knownUsers = age.knownUsers;
  const totalUsers = activeUsers > 0 ? activeUsers : age.totalUsers;

  return {
    coveragePercent:
      totalUsers > 0 ? Math.round((knownUsers / totalUsers) * 1000) / 10 : 0,
    knownUsers,
    totalUsers,
    age,
    gender,
    interests,
  };
}

async function fetchProgramInsights(client, property, currentRange, programId) {
  const pageFilter = buildPagePathFilter(programId);
  const referrerFilter = buildReferrerFromProgramFilter(programId);
  if (!pageFilter) return null;

  const [
    [audience],
    [landing],
    [acquisition],
    [programPages],
    [nextPages],
    [events],
    [devices],
    [engagement],
    [cities],
  ] = await Promise.all([
    client.runReport(
      withFilter(
        {
          property,
          dateRanges: [currentRange],
          dimensions: [{ name: "newVsReturning" }],
          metrics: [{ name: "activeUsers" }, { name: "sessions" }],
        },
        pageFilter,
      ),
    ),
    client.runReport(
      withFilter(
        {
          property,
          dateRanges: [currentRange],
          dimensions: [{ name: "landingPage" }],
          metrics: [{ name: "sessions" }, { name: "activeUsers" }],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: 8,
        },
        pageFilter,
      ),
    ),
    client.runReport(
      withFilter(
        {
          property,
          dateRanges: [currentRange],
          dimensions: [
            { name: "sessionSource" },
            { name: "sessionMedium" },
          ],
          metrics: [{ name: "sessions" }, { name: "activeUsers" }],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: 10,
        },
        pageFilter,
      ),
    ),
    client.runReport(
      withFilter(
        {
          property,
          dateRanges: [currentRange],
          dimensions: [{ name: "pagePath" }],
          metrics: [
            { name: "screenPageViews" },
            { name: "activeUsers" },
            { name: "userEngagementDuration" },
          ],
          orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
          limit: 10,
        },
        pageFilter,
      ),
    ),
    referrerFilter
      ? client.runReport(
          withFilter(
            {
              property,
              dateRanges: [currentRange],
              dimensions: [{ name: "pagePath" }],
              metrics: [{ name: "screenPageViews" }],
              orderBys: [
                { metric: { metricName: "screenPageViews" }, desc: true },
              ],
              limit: 10,
            },
            referrerFilter,
          ),
        )
      : Promise.resolve([{ rows: [] }]),
    client.runReport(
      withFilter(
        {
          property,
          dateRanges: [currentRange],
          dimensions: [{ name: "eventName" }],
          metrics: [{ name: "eventCount" }],
          orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
          limit: 12,
        },
        pageFilter,
      ),
    ),
    client.runReport(
      withFilter(
        {
          property,
          dateRanges: [currentRange],
          dimensions: [{ name: "deviceCategory" }],
          metrics: [{ name: "activeUsers" }, { name: "sessions" }],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: 5,
        },
        pageFilter,
      ),
    ),
    client.runReport(
      withFilter(
        {
          property,
          dateRanges: [currentRange],
          metrics: [
            { name: "userEngagementDuration" },
            { name: "engagementRate" },
            { name: "screenPageViews" },
          ],
        },
        pageFilter,
      ),
    ),
    client.runReport(
      withFilter(
        {
          property,
          dateRanges: [currentRange],
          dimensions: [{ name: "city" }],
          metrics: [{ name: "activeUsers" }, { name: "sessions" }],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: 5,
        },
        pageFilter,
      ),
    ),
  ]);

  const audienceRows = audience.rows ?? [];
  const newRow = audienceRows.find(
    (row) => row.dimensionValues?.[0]?.value === "new",
  );
  const returningRow = audienceRows.find(
    (row) => row.dimensionValues?.[0]?.value === "returning",
  );

  const eventRows = events.rows ?? [];
  const eventMap = Object.fromEntries(
    eventRows.map((row) => [
      row.dimensionValues?.[0]?.value ?? "",
      parseMetric(row, 0),
    ]),
  );

  const engagementRow = engagement.rows?.[0];
  const totalViews = engagementRow ? parseMetric(engagementRow, 2) : 0;
  const totalEngagementSec = engagementRow
    ? parseDurationSeconds(engagementRow, 0)
    : 0;

  return {
    audience: {
      newUsers: newRow ? parseMetric(newRow, 0) : 0,
      returningUsers: returningRow ? parseMetric(returningRow, 0) : 0,
      newSessions: newRow ? parseMetric(newRow, 1) : 0,
      returningSessions: returningRow ? parseMetric(returningRow, 1) : 0,
    },
    devices: (devices.rows ?? []).map((row) => ({
      category: row.dimensionValues?.[0]?.value ?? "Unknown",
      users: parseMetric(row, 0),
      sessions: parseMetric(row, 1),
    })),
    cities: (cities.rows ?? [])
      .filter((row) => {
        const city = row.dimensionValues?.[0]?.value ?? "";
        return city !== "(not set)" && !isExcludedCity(city);
      })
      .map((row) => ({
        city: row.dimensionValues?.[0]?.value ?? "Unknown",
        users: parseMetric(row, 0),
        sessions: parseMetric(row, 1),
      })),
    landingPages: (landing.rows ?? [])
      .filter((row) => row.dimensionValues?.[0]?.value !== "(not set)")
      .map((row) => ({
        path: row.dimensionValues?.[0]?.value ?? "/",
        sessions: parseMetric(row, 0),
        users: parseMetric(row, 1),
      })),
    acquisition: (acquisition.rows ?? []).map((row) => ({
      source: row.dimensionValues?.[0]?.value ?? "(direct)",
      medium: row.dimensionValues?.[1]?.value ?? "(none)",
      sessions: parseMetric(row, 0),
      users: parseMetric(row, 1),
    })),
    programPages: (programPages.rows ?? []).map((row) => {
      const views = parseMetric(row, 0);
      const engagementSec = parseDurationSeconds(row, 2);
      return {
        path: row.dimensionValues?.[0]?.value ?? "/",
        views,
        users: parseMetric(row, 1),
        avgEngagementSec:
          views > 0 ? Math.round(engagementSec / views) : 0,
      };
    }),
    nextPages: (nextPages.rows ?? [])
      .filter((row) => {
        const path = row.dimensionValues?.[0]?.value ?? "";
        return !path.startsWith("/.wf_");
      })
      .map((row) => ({
        path: row.dimensionValues?.[0]?.value ?? "/",
        views: parseMetric(row, 0),
      })),
    events: eventRows
      .filter((row) => {
        const name = row.dimensionValues?.[0]?.value ?? "";
        return !["page_view", "session_start", "first_visit", "user_engagement"].includes(
          name,
        );
      })
      .map((row) => ({
        name: row.dimensionValues?.[0]?.value ?? "",
        count: parseMetric(row, 0),
      })),
    engagement: {
      avgEngagementSecPerView:
        totalViews > 0 ? Math.round(totalEngagementSec / totalViews) : 0,
      engagementRate: engagementRow
        ? Math.round(parseRateMetric(engagementRow, 1) * 10) / 10
        : 0,
      scrolls: eventMap.scroll ?? 0,
      formStarts: eventMap.form_start ?? 0,
      formSubmits: eventMap.form_submit ?? 0,
      clicks: eventMap.click ?? 0,
    },
  };
}

async function fetchTrafficInsightsRaw(
  client,
  property,
  currentRange,
  previousRange,
  pageFilter,
) {
  const comparisonRanges = [currentRange, previousRange];

  const [
    [landingReport],
    [channelReport],
    [sourceReport],
    [pageReport],
  ] = await Promise.all([
    client.runReport(
      withFilter(
        {
          property,
          dateRanges: comparisonRanges,
          dimensions: [{ name: "landingPage" }],
          metrics: [
            { name: "sessions" },
            { name: "bounceRate" },
            { name: "engagementRate" },
          ],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: 30,
        },
        pageFilter,
      ),
    ),
    client.runReport(
      withFilter(
        {
          property,
          dateRanges: comparisonRanges,
          dimensions: [{ name: "sessionDefaultChannelGroup" }],
          metrics: [{ name: "sessions" }],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: 12,
        },
        pageFilter,
      ),
    ),
    client.runReport(
      withFilter(
        {
          property,
          dateRanges: comparisonRanges,
          dimensions: [
            { name: "sessionSource" },
            { name: "sessionMedium" },
          ],
          metrics: [{ name: "sessions" }, { name: "engagementRate" }],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: 40,
        },
        pageFilter,
      ),
    ),
    client.runReport(
      withFilter(
        {
          property,
          dateRanges: comparisonRanges,
          dimensions: [{ name: "pagePath" }],
          metrics: [
            { name: "screenPageViews" },
            { name: "userEngagementDuration" },
            { name: "bounceRate" },
          ],
          orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
          limit: 30,
        },
        pageFilter,
      ),
    ),
  ]);

  const landingPages = dedupeLandingPagesByPath(
    mapComparisonDimensionRows(
      landingReport.rows,
      ["sessions", "bounceRate", "engagementRate"],
    )
      .filter((row) => {
        const path = row.dimensions[0] ?? "";
        return path && path !== "(not set)" && !path.startsWith("/.wf_");
      })
      .map((row) => ({
        path: row.dimensions[0],
        sessions: Math.round(row.metrics.sessions.current),
        previousSessions: Math.round(row.metrics.sessions.previous),
        bounceRate: row.metrics.bounceRate.current,
        previousBounceRate: row.metrics.bounceRate.previous,
        engagementRate: row.metrics.engagementRate.current,
      })),
  );

  const channels = mapComparisonDimensionRows(channelReport.rows, [
    "sessions",
  ]).map((row) => ({
    name: row.dimensions[0] ?? "Unknown",
    sessions: Math.round(row.metrics.sessions.current),
    previousSessions: Math.round(row.metrics.sessions.previous),
  }));

  const sources = mapComparisonDimensionRows(
    sourceReport.rows,
    ["sessions", "engagementRate"],
  ).map((row) => ({
    source: row.dimensions[0] ?? "(direct)",
    medium: row.dimensions[1] ?? "(none)",
    sessions: Math.round(row.metrics.sessions.current),
    previousSessions: Math.round(row.metrics.sessions.previous),
    engagementRate: row.metrics.engagementRate.current,
  }));

  const pages = mapComparisonDimensionRows(pageReport.rows, [
    "screenPageViews",
    "userEngagementDuration",
    "bounceRate",
  ])
    .filter((row) => {
      const path = row.dimensions[0] ?? "";
      return path && path !== "(not set)" && !path.startsWith("/.wf_");
    })
    .map((row) => {
      const views = Math.round(row.metrics.screenPageViews.current);
      const prevViews = Math.round(row.metrics.screenPageViews.previous);
      const engagementSec = row.metrics.userEngagementDuration.current;
      return {
        path: row.dimensions[0] ?? "/",
        views,
        previousViews: prevViews,
        avgEngagementSec: views > 0 ? Math.round(engagementSec / views) : 0,
        bounceRate: row.metrics.bounceRate.current,
      };
    });

  return { landingPages, channels, sources, pages };
}

async function fetchAudienceInsightsRaw(
  client,
  property,
  currentRange,
  previousRange,
  pageFilter,
  siteSessions,
  programInsights,
) {
  const comparisonRanges = [currentRange, previousRange];
  const prevSessions = programInsights?.audience
    ? programInsights.audience.newSessions +
      programInsights.audience.returningSessions
    : 0;

  const [
    [deviceReport],
    [referrerReport],
    [cityReport],
  ] = await Promise.all([
    client.runReport(
      withFilter(
        {
          property,
          dateRanges: comparisonRanges,
          dimensions: [{ name: "deviceCategory" }],
          metrics: [{ name: "sessions" }, { name: "activeUsers" }],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: 5,
        },
        pageFilter,
      ),
    ),
    client.runReport(
      withFilter(
        {
          property,
          dateRanges: comparisonRanges,
          dimensions: [{ name: "sessionSource" }],
          metrics: [{ name: "sessions" }, { name: "engagementRate" }],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: 15,
        },
        pageFilter,
      ),
    ),
    client.runReport(
      withFilter(
        {
          property,
          dateRanges: comparisonRanges,
          dimensions: [{ name: "city" }],
          metrics: [
            { name: "sessions" },
            { name: "engagementRate" },
          ],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: 9,
        },
        pageFilter,
      ),
    ),
  ]);

  const devices = mapComparisonDimensionRows(deviceReport.rows, ["sessions"]).map(
    (row) => ({
      category: row.dimensions[0] ?? "Unknown",
      sessions: Math.round(row.metrics.sessions.current),
      previousSessions: Math.round(row.metrics.sessions.previous),
      users: Math.round(row.metrics.sessions.current),
    }),
  );

  const devicesPrevious = devices.map((d) => ({
    category: d.category,
    sessions: d.previousSessions,
  }));

  const referrers = mapComparisonDimensionRows(referrerReport.rows, [
    "sessions",
    "engagementRate",
  ]).map((row) => ({
    source: row.dimensions[0] ?? "(direct)",
    sessions: Math.round(row.metrics.sessions.current),
    previousSessions: Math.round(row.metrics.sessions.previous),
    engagementRate: row.metrics.engagementRate.current,
  }));

  const cities = mapComparisonDimensionRows(cityReport.rows, [
    "sessions",
    "engagementRate",
  ])
    .filter((row) => {
      const city = row.dimensions[0] ?? "";
      return city !== "(not set)" && !isExcludedCity(city);
    })
    .map((row) => ({
      city: row.dimensions[0] ?? "Unknown",
      sessions: Math.round(row.metrics.sessions.current),
      previousSessions: Math.round(row.metrics.sessions.previous),
      engagementRate: row.metrics.engagementRate.current,
    }));

  return {
    devices,
    devicesPrevious,
    referrers,
    cities,
    previousSiteSessions: siteSessions,
    demographics: null,
    demographicsPrevious: null,
    programAudiencePrevious: programInsights?.audience ?? null,
  };
}

async function fetchUtmSummary(client, property, currentRange, previousRange) {
  try {
    const comparisonRanges = [currentRange, previousRange];
    const [report] = await client.runReport({
      property,
      dateRanges: comparisonRanges,
      dimensions: [
        { name: "sessionManualCampaignName" },
        { name: "landingPage" },
      ],
      metrics: [{ name: "sessions" }],
      dimensionFilter: {
        filter: {
          fieldName: "sessionManualCampaignName",
          stringFilter: {
            matchType: "FULL_REGEXP",
            value: ".+",
          },
        },
      },
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 20,
    });

    const rows = mapComparisonDimensionRows(report.rows ?? [], ["sessions"])
      .filter((row) => row.dimensions[0] && row.dimensions[0] !== "(not set)")
      .map((row) => ({
        campaign: row.dimensions[0],
        landingPage: row.dimensions[1] ?? "/",
        sessions: Math.round(row.metrics.sessions.current),
        previousSessions: Math.round(row.metrics.sessions.previous),
      }));

    return { entries: rows, insights: null };
  } catch {
    return { entries: [], insights: null };
  }
}

export async function fetchAnalyticsDashboard({
  startDate,
  endDate,
  programId = "all",
}) {
  const program = getProgram(programId);
  const pageFilter = buildPagePathFilter(program.id);
  const propertyId = getPropertyId();
  const client = await getClient();
  const property = `properties/${propertyId}`;
  const currentRange = {
    startDate: toGaDate(startDate),
    endDate: toGaDate(endDate),
  };
  const previous = comparisonRange(startDate, endDate);
  const previousRange = {
    startDate: toGaDate(previous.startDate),
    endDate: toGaDate(previous.endDate),
  };
  const comparisonRanges = [currentRange, previousRange];

  const overviewMetrics = pageFilter
    ? [
        { name: "activeUsers" },
        { name: "sessions" },
        { name: "engagementRate" },
        { name: "bounceRate" },
        { name: "screenPageViews" },
        { name: "userEngagementDuration" },
      ]
    : [
        { name: "activeUsers" },
        { name: "sessions" },
        { name: "engagementRate" },
        { name: "bounceRate" },
        { name: "screenPageViews" },
      ];

  let ga4ApiCalls = 0;
  const countingClient = {
    runReport: (...args) => {
      ga4ApiCalls += 1;
      return client.runReport(...args);
    },
  };

  const [
    [overviewCurrent],
    [overviewPrevious],
    [timeSeries],
    [dailyPages],
    [channels],
    [channelSources],
    [pages],
    [referrers],
    programInsights,
  ] = await Promise.all([
    countingClient.runReport(
      withFilter(
        {
          property,
          dateRanges: [currentRange],
          metrics: overviewMetrics,
        },
        pageFilter,
      ),
    ),
    countingClient.runReport(
      withFilter(
        {
          property,
          dateRanges: [previousRange],
          metrics: overviewMetrics.slice(0, 5),
        },
        pageFilter,
      ),
    ),
    countingClient.runReport(
      withFilter(
        {
          property,
          dateRanges: [currentRange],
          dimensions: [{ name: "date" }],
          metrics: pageFilter
            ? [
                { name: "sessions" },
                { name: "activeUsers" },
                { name: "screenPageViews" },
              ]
            : [{ name: "sessions" }, { name: "activeUsers" }],
          orderBys: [{ dimension: { dimensionName: "date" } }],
        },
        pageFilter,
      ),
    ),
    countingClient.runReport(
      withFilter(
        {
          property,
          dateRanges: [currentRange],
          dimensions: [{ name: "date" }, { name: "pagePath" }],
          metrics: [{ name: "screenPageViews" }],
          orderBys: [
            { dimension: { dimensionName: "date" } },
            { metric: { metricName: "screenPageViews" }, desc: true },
          ],
          limit: 10000,
        },
        pageFilter,
      ),
    ),
    countingClient.runReport(
      withFilter(
        {
          property,
          dateRanges: [currentRange],
          dimensions: [{ name: "sessionDefaultChannelGroup" }],
          metrics: [{ name: "sessions" }],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: 8,
        },
        pageFilter,
      ),
    ),
    countingClient.runReport(
      withFilter(
        {
          property,
          dateRanges: comparisonRanges,
          dimensions: [
            { name: "sessionDefaultChannelGroup" },
            { name: "sessionSource" },
          ],
          metrics: [{ name: "sessions" }],
          orderBys: [
            {
              dimension: { dimensionName: "sessionDefaultChannelGroup" },
            },
            { metric: { metricName: "sessions" }, desc: true },
          ],
          limit: 10000,
        },
        pageFilter,
      ),
    ),
    countingClient.runReport(
      withFilter(
        {
          property,
          dateRanges: [currentRange],
          dimensions: [{ name: "pagePath" }],
          metrics: [{ name: "screenPageViews" }],
          orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
          limit: pageFilter ? 10 : 5,
        },
        pageFilter,
      ),
    ),
    countingClient.runReport(
      withFilter(
        {
          property,
          dateRanges: [currentRange],
          dimensions: [{ name: "sessionSource" }],
          metrics: [{ name: "sessions" }],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: pageFilter ? 10 : 5,
        },
        pageFilter,
      ),
    ),
    pageFilter
      ? fetchProgramInsights(countingClient, property, currentRange, program.id)
      : Promise.resolve(null),
  ]);

  const currentRow = overviewCurrent.rows?.[0];
  const previousRow = overviewPrevious.rows?.[0];

  const activeUsers = currentRow ? parseMetric(currentRow, 0) : 0;
  const sessions = currentRow ? parseMetric(currentRow, 1) : 0;
  const engagementRate = currentRow ? parseRateMetric(currentRow, 2) : 0;
  const bounceRate = currentRow ? parseRateMetric(currentRow, 3) : 0;
  const pageViews = currentRow ? parseMetric(currentRow, 4) : 0;
  const totalEngagementSec = currentRow
    ? parseDurationSeconds(currentRow, 5)
    : 0;

  const prevActiveUsers = previousRow ? parseMetric(previousRow, 0) : 0;
  const prevSessions = previousRow ? parseMetric(previousRow, 1) : 0;
  const prevEngagementRate = previousRow ? parseRateMetric(previousRow, 2) : 0;
  const prevBounceRate = previousRow ? parseRateMetric(previousRow, 3) : 0;
  const prevPageViews = previousRow ? parseMetric(previousRow, 4) : 0;

  const daily = mergeDailyPages(
    mapDailyRows(timeSeries.rows),
    mapDailyPageBreakdown(dailyPages.rows),
  );
  const { channels: channelData, channelConfig } = mapChannelRows(
    channels.rows,
  );
  const channelDataWithSources = mergeChannelSources(
    channelData,
    mapChannelSourceBreakdown(channelSources.rows),
  );

  const topPages = (pages.rows ?? []).map((row) => ({
    path: row.dimensionValues?.[0]?.value ?? "/",
    views: parseMetric(row, 0),
    change: 0,
  }));

  const topReferrers = (referrers.rows ?? []).map((row) => ({
    source: row.dimensionValues?.[0]?.value ?? "(direct)",
    sessions: parseMetric(row, 0),
  }));

  const [userDemographics, topCities, trafficRaw, audienceRaw, utmSummary] =
    await Promise.all([
      fetchUserDemographics(
        countingClient,
        property,
        currentRange,
        pageFilter,
        activeUsers,
      ),
      fetchTopCitiesWithBreakdowns(
        countingClient,
        property,
        currentRange,
        pageFilter,
        sessions,
      ),
      fetchTrafficInsightsRaw(
        countingClient,
        property,
        currentRange,
        previousRange,
        pageFilter,
      ),
      fetchAudienceInsightsRaw(
        countingClient,
        property,
        currentRange,
        previousRange,
        pageFilter,
        sessions,
        null,
      ),
      fetchUtmSummary(countingClient, property, currentRange, previousRange),
    ]);

  audienceRaw.demographics = {
    coveragePercent: userDemographics.coveragePercent,
    knownUsers: userDemographics.knownUsers,
    age: userDemographics.age,
    gender: userDemographics.gender,
    interests: userDemographics.interests,
  };

  if (programInsights?.devices?.length) {
    audienceRaw.devices = programInsights.devices.map((d) => ({
      category: d.category,
      sessions: d.sessions,
      previousSessions: d.sessions,
      users: d.users,
    }));
  }

  const kpis = {
    activeUsers: {
      value: activeUsers,
      change: pctChange(activeUsers, prevActiveUsers),
    },
    sessions: {
      value: sessions,
      change: pctChange(sessions, prevSessions),
    },
    engagementRate: {
      value: Math.round(engagementRate * 10) / 10,
      change: pctChange(engagementRate, prevEngagementRate),
    },
    bounceRate: {
      value: Math.round(bounceRate * 10) / 10,
      change: pctChange(bounceRate, prevBounceRate),
    },
    pageViews: {
      value: pageViews,
      change: pctChange(pageViews, prevPageViews),
    },
    avgEngagementSecPerView: {
      value: pageViews > 0 ? Math.round(totalEngagementSec / pageViews) : 0,
      change: 0,
    },
  };

  const trafficInsights = computeTrafficInsights({
    kpis,
    landingPages: trafficRaw.landingPages,
    pages: trafficRaw.pages,
    channels: trafficRaw.channels,
    sources: trafficRaw.sources,
    programInsights,
  });

  return {
    propertyId,
    program: {
      id: program.id,
      name: program.name,
      description: program.description,
    },
    dateRange: {
      start: currentRange.startDate,
      end: currentRange.endDate,
      comparisonStart: previousRange.startDate,
      comparisonEnd: previousRange.endDate,
    },
    kpis,
    daily,
    channels: channelDataWithSources,
    channelConfig,
    topPages,
    topReferrers,
    userDemographics: {
      ...userDemographics,
      cities: topCities,
    },
    programInsights,
    trafficInsights,
    fetchedAt: new Date().toISOString(),
    _insightContext: {
      trafficRaw,
      audienceRaw,
      utmSummary,
      ga4ApiCalls,
      startDate,
      endDate,
    },
  };
}
