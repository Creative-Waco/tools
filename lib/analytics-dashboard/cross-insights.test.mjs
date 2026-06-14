import assert from "node:assert/strict";
import test from "node:test";

import { computeCrossInsights } from "./cross-insights.mjs";

const baseKpis = {
  bounceRate: { value: 45 },
  engagementRate: { value: 55 },
  avgEngagementSecPerView: { value: 40 },
  sessions: { value: 1000 },
};

test("C1 search_clicks_poor_landing joins GSC query with high-bounce landing", () => {
  const result = computeCrossInsights({
    searchConsole: {
      available: true,
      insights: {
        opportunities: [
          {
            query: "waco art events",
            topPage: "/events",
            potentialClicksGain: 12,
            impressions: 120,
            clicks: 8,
            position: 5,
            ctr: 6,
            tags: ["low_ctr"],
            actionDetail: "Improve snippet",
            clicksChange: 0,
            impressionsChange: 10,
          },
        ],
        rising: [],
        cannibalization: [],
        declining: [],
      },
    },
    trafficRaw: {
      landingPages: [
        {
          path: "/events",
          sessions: 40,
          previousSessions: 35,
          bounceRate: 72,
          engagementRate: 40,
        },
      ],
      pages: [],
    },
    kpis: baseKpis,
  });

  const match = result.all.find((row) =>
    row.tags.includes("search_clicks_poor_landing"),
  );
  assert.ok(match);
  assert.equal(match.query, "waco art events");
  assert.equal(match.path, "/events");
  assert.equal(match.category, "quick_wins");
});

test("C2 snippet_ready_good_page when landing engagement is healthy", () => {
  const result = computeCrossInsights({
    searchConsole: {
      available: true,
      insights: {
        opportunities: [
          {
            query: "creative waco",
            topPage: "/about",
            potentialClicksGain: 8,
            impressions: 200,
            clicks: 10,
            position: 6,
            ctr: 5,
            tags: ["low_ctr"],
            actionDetail: "Fix title",
            clicksChange: 0,
            impressionsChange: 0,
          },
        ],
        rising: [],
        cannibalization: [],
        declining: [],
      },
    },
    trafficRaw: {
      landingPages: [
        {
          path: "/about",
          sessions: 50,
          previousSessions: 45,
          bounceRate: 48,
          engagementRate: 52,
        },
      ],
      pages: [],
    },
    kpis: baseKpis,
  });

  assert.ok(
    result.all.some((row) => row.tags.includes("snippet_ready_good_page")),
  );
});
