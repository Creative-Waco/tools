import assert from "node:assert/strict";
import test from "node:test";

import { computeGscPageInsights } from "./gsc-page-insights.mjs";

test("GP1 page_ctr_opportunity for underperforming page CTR", () => {
  const result = computeGscPageInsights({
    pages: [
      {
        path: "/events",
        clicks: 5,
        impressions: 500,
        ctr: 1,
        position: 8,
      },
    ],
    previousPages: [],
    pairs: [],
    trafficRaw: { landingPages: [], pages: [] },
    kpis: { bounceRate: { value: 45 }, engagementRate: { value: 55 } },
  });

  assert.ok(result.all.some((row) => row.tags.includes("page_ctr_opportunity")));
});

test("GP3 page_query_hub when page ranks for many queries", () => {
  const pairs = Array.from({ length: 6 }, (_, index) => ({
    query: `query ${index}`,
    path: "/hub",
    impressions: 50,
  }));

  const result = computeGscPageInsights({
    pages: [],
    previousPages: [],
    pairs,
    trafficRaw: { landingPages: [], pages: [] },
    kpis: { bounceRate: { value: 45 }, engagementRate: { value: 55 } },
  });

  assert.ok(result.all.some((row) => row.tags.includes("page_query_hub")));
});
