/** Build visitor journey stages from GA4 aggregates (no individual users). */

function sharePercent(value, total) {
  if (!total || total <= 0) return 0;
  return Math.round((value / total) * 1000) / 10;
}

function mapPathSteps(rows, metricKey, metricLabel, total, limit = 5) {
  return rows.slice(0, limit).map((row) => ({
    id: row.path,
    label: row.path,
    path: row.path,
    metric: row[metricKey],
    metricLabel,
    share: sharePercent(row[metricKey], total),
  }));
}

function mapAcquisitionSteps(rows, total, limit = 5) {
  return rows.slice(0, limit).map((row) => {
    const label = `${row.source} / ${row.medium}`;
    return {
      id: label,
      label,
      metric: row.sessions,
      metricLabel: "sessions",
      share: sharePercent(row.sessions, total),
    };
  });
}

function mapChannelSteps(channels, limit = 5) {
  return channels.slice(0, limit).map((channel) => ({
    id: channel.name,
    label: channel.name,
    metric: channel.sessions,
    metricLabel: "sessions",
    share: channel.value,
  }));
}

function mapActionSteps(engagement) {
  if (!engagement) return [];

  const actions = [
    { id: "form_submit", label: "Form submits", metric: engagement.formSubmits },
    { id: "form_start", label: "Form starts", metric: engagement.formStarts },
    { id: "scroll", label: "Scroll events", metric: engagement.scrolls },
    { id: "click", label: "Click events", metric: engagement.clicks },
  ].filter((item) => item.metric > 0);

  const total = actions.reduce((sum, item) => sum + item.metric, 0);

  return actions.map((item) => ({
    ...item,
    metricLabel: "events",
    share: sharePercent(item.metric, total),
  }));
}

/**
 * @param {{
 *   programId: string;
 *   channels: Array<{ name: string; sessions: number; value: number }>;
 *   topReferrers: Array<{ source: string; sessions: number }>;
 *   topPages: Array<{ path: string; views: number }>;
 *   programInsights: object | null;
 *   siteLandingPages?: Array<{ path: string; sessions: number }>;
 *   siteNextPages?: Array<{ path: string; views: number }>;
 *   siteEngagement?: {
 *     formStarts: number;
 *     formSubmits: number;
 *     scrolls: number;
 *     clicks: number;
 *   } | null;
 * }} input
 */
export function buildVisitorJourney(input) {
  const {
    programId,
    channels,
    topReferrers,
    topPages,
    programInsights,
    siteLandingPages = [],
    siteNextPages = [],
    siteEngagement = null,
  } = input;

  const isProgram = programId !== "all" && programInsights;

  const arrivalTotal = isProgram
    ? programInsights.acquisition.reduce((sum, row) => sum + row.sessions, 0)
    : channels.reduce((sum, row) => sum + row.sessions, 0);

  const landingRows = isProgram
    ? programInsights.landingPages
    : siteLandingPages;
  const landingTotal = landingRows.reduce((sum, row) => sum + row.sessions, 0);

  const exploreRows = isProgram
    ? programInsights.programPages.map((row) => ({
        path: row.path,
        views: row.views,
      }))
    : topPages;
  const exploreTotal = exploreRows.reduce((sum, row) => sum + row.views, 0);

  const nextRows = isProgram ? programInsights.nextPages : siteNextPages;
  const nextTotal = nextRows.reduce((sum, row) => sum + row.views, 0);

  const engagement = isProgram ? programInsights.engagement : siteEngagement;
  const actionSteps = mapActionSteps(engagement);

  const topReferrerSteps = topReferrers.slice(0, 3).map((row) => ({
    id: row.source,
    label: row.source,
    metric: row.sessions,
    metricLabel: "sessions",
    share: sharePercent(
      row.sessions,
      topReferrers.reduce((sum, item) => sum + item.sessions, 0),
    ),
  }));

  return {
    scope: isProgram ? "program" : "site",
    stages: [
      {
        id: "arrival",
        title: "How they arrive",
        description: isProgram
          ? "Source and medium for sessions that include program pages"
          : "Default channel groups driving site sessions",
        steps: isProgram
          ? mapAcquisitionSteps(programInsights.acquisition, arrivalTotal)
          : mapChannelSteps(channels),
        footnote:
          topReferrerSteps.length > 0 && !isProgram
            ? `Top sources: ${topReferrerSteps.map((s) => s.label).join(", ")}`
            : undefined,
      },
      {
        id: "landing",
        title: "Where they land",
        description: "First page in a session",
        steps: mapPathSteps(
          landingRows.map((row) => ({
            path: row.path,
            sessions: row.sessions,
          })),
          "sessions",
          "sessions",
          landingTotal,
        ),
      },
      {
        id: "explore",
        title: "What they view",
        description: isProgram
          ? "Most viewed pages in this program"
          : "Most viewed pages on the site",
        steps: mapPathSteps(exploreRows, "views", "views", exploreTotal),
      },
      {
        id: "continue",
        title: "Where they go next",
        description: isProgram
          ? "Next page after a program page in the same visit"
          : "Next page after an internal link on creativewaco.org",
        steps: mapPathSteps(nextRows, "views", "views", nextTotal),
      },
      {
        id: "actions",
        title: "What they do",
        description: "Engagement events in this date range",
        steps: actionSteps,
      },
    ],
  };
}
