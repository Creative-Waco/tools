import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { differenceInDays, format, subDays } from "date-fns";

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

function comparisonRange(startDate, endDate) {
  const days = differenceInDays(endDate, startDate) + 1;
  const compEnd = subDays(startDate, 1);
  const compStart = subDays(compEnd, days - 1);
  return { startDate: compStart, endDate: compEnd };
}

function pctChange(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
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

  for (const row of rows ?? []) {
    const channel = row.dimensionValues?.[0]?.value ?? "Unknown";
    const source = row.dimensionValues?.[1]?.value ?? "(not set)";
    const sessions = parseMetric(row, 0);

    if (!byChannel.has(channel)) {
      byChannel.set(channel, []);
    }

    byChannel.get(channel).push({ source, sessions });
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

function mapCityBreakdown(rows, valueIndex = 0, topN = 5) {
  const byCity = new Map();

  for (const row of rows ?? []) {
    const city = row.dimensionValues?.[0]?.value ?? "";
    if (!city || city === "(not set)") continue;

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
    if (!city || city === "(not set)") continue;

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
    if (!city || city === "(not set)") continue;

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
    .filter((row) => row.dimensionValues?.[0]?.value !== "(not set)")
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
    });
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
    cities: [],
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
    client.runReport(
      withFilter(
        {
          property,
          dateRanges: [currentRange],
          metrics: overviewMetrics,
        },
        pageFilter,
      ),
    ),
    client.runReport(
      withFilter(
        {
          property,
          dateRanges: [previousRange],
          metrics: overviewMetrics.slice(0, 5),
        },
        pageFilter,
      ),
    ),
    client.runReport(
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
    client.runReport(
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
    client.runReport(
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
    client.runReport(
      withFilter(
        {
          property,
          dateRanges: [currentRange],
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
    client.runReport(
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
    client.runReport(
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
      ? fetchProgramInsights(client, property, currentRange, program.id)
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

  const topCities = await fetchTopCitiesWithBreakdowns(
    client,
    property,
    currentRange,
    pageFilter,
    sessions,
  );

  const programInsightsWithCities = programInsights
    ? {
        ...programInsights,
        cities: topCities.map(({ city, users, sessions: citySessions }) => ({
          city,
          users,
          sessions: citySessions,
        })),
      }
    : null;

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
    kpis: {
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
    },
    daily,
    channels: channelDataWithSources,
    channelConfig,
    topPages,
    topReferrers,
    topCities,
    programInsights: programInsightsWithCities,
    fetchedAt: new Date().toISOString(),
  };
}
