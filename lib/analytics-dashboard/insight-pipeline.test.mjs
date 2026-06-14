import assert from "node:assert/strict";
import test from "node:test";

import { runInsightPipeline } from "./insight-pipeline.mjs";

test("runInsightPipeline returns all insight buckets without I/O", () => {
  const pipeline = runInsightPipeline({
    kpis: {
      bounceRate: { value: 45 },
      engagementRate: { value: 55 },
      avgEngagementSecPerView: { value: 40 },
      sessions: { value: 500 },
    },
    searchConsole: {
      available: true,
      pages: [{ path: "/events", clicks: 5, impressions: 500, ctr: 1, position: 8 }],
      previousPages: [],
      pairs: [],
      insights: {
        opportunities: [],
        rising: [],
        cannibalization: [],
        declining: [],
      },
    },
    trafficRaw: {
      landingPages: [],
      pages: [],
      channels: [],
      sources: [],
    },
    audienceRaw: {
      demographics: { coveragePercent: 0, knownUsers: 0 },
      cities: [],
      devices: [],
      referrers: [],
    },
    programInsights: null,
    utmSummary: { entries: [] },
  });

  assert.ok(pipeline.crossInsights);
  assert.ok(pipeline.audienceInsights);
  assert.ok(pipeline.gscPageInsights);
  assert.ok(pipeline.programInsightsRules);
  assert.ok(pipeline.utmInsights);
  assert.ok(Array.isArray(pipeline.gscPageInsights.all));
});
