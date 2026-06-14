import assert from "node:assert/strict";
import test from "node:test";

import { computeAudienceInsights } from "./audience-insights.mjs";

test("A6 city_concentration for Waco-heavy traffic", () => {
  const result = computeAudienceInsights({
    audienceRaw: {
      demographics: { coveragePercent: 60, knownUsers: 200 },
      cities: [
        {
          city: "Waco",
          sessions: 80,
          previousSessions: 60,
          share: 40,
          engagementRate: 50,
        },
        {
          city: "Austin",
          sessions: 30,
          previousSessions: 25,
          share: 15,
          engagementRate: 55,
        },
      ],
      devices: [],
      referrers: [],
    },
    kpis: {
      sessions: { value: 200 },
      engagementRate: { value: 55 },
      bounceRate: { value: 45 },
    },
    channels: [],
  });

  assert.ok(result.all.some((row) => row.tags.includes("city_concentration")));
});

test("A3 mobile_gap when mobile share is high with weak engagement", () => {
  const result = computeAudienceInsights({
    audienceRaw: {
      demographics: { coveragePercent: 0, knownUsers: 0 },
      cities: [],
      devices: [
        {
          category: "mobile",
          sessions: 120,
          previousSessions: 100,
          users: 90,
        },
        {
          category: "desktop",
          sessions: 80,
          previousSessions: 90,
          users: 70,
        },
      ],
      referrers: [],
    },
    kpis: {
      sessions: { value: 200 },
      engagementRate: { value: 55 },
      bounceRate: { value: 45 },
    },
    channels: [],
  });

  assert.ok(result.all.some((row) => row.tags.includes("mobile_gap")));
});
