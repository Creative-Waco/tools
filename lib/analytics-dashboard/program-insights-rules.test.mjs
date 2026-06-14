import assert from "node:assert/strict";
import test from "node:test";

import { computeProgramInsightRules } from "./program-insights-rules.mjs";

const programInsights = {
  audience: {
    newUsers: 80,
    returningUsers: 20,
    newSessions: 90,
    returningSessions: 10,
  },
  devices: [],
  cities: [],
  landingPages: [{ path: "/program", sessions: 50, users: 40 }],
  nextPages: [{ path: "/", views: 3 }],
  programPages: [{ path: "/program/detail", views: 60, avgEngagementSec: 10 }],
  acquisition: [{ source: "google", medium: "organic", sessions: 50, users: 40 }],
  events: [],
  engagement: {
    avgEngagementSecPerView: 30,
    engagementRate: 50,
    scrolls: 10,
    formStarts: 3,
    formSubmits: 0,
    clicks: 30,
  },
};

test("N1 navigation_dead_end when continuation rate is low", () => {
  const result = computeProgramInsightRules({
    programInsights,
    kpis: {
      bounceRate: { value: 45 },
      engagementRate: { value: 55 },
      avgEngagementSecPerView: { value: 40 },
      sessions: { value: 200 },
    },
    landingPages: [],
  });

  assert.ok(result.all.some((row) => row.tags.includes("navigation_dead_end")));
});

test("E2 click_without_conversion when form starts lag clicks", () => {
  const result = computeProgramInsightRules({
    programInsights,
    kpis: {
      bounceRate: { value: 45 },
      engagementRate: { value: 55 },
      avgEngagementSecPerView: { value: 40 },
      sessions: { value: 200 },
    },
    landingPages: [],
  });

  assert.ok(
    result.all.some((row) => row.tags.includes("click_without_conversion")),
  );
});
