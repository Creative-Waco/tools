import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateEventCards } from "./lib/event-cards/generate.mjs";
import { generateEmail } from "./lib/generate.mjs";
import { getSparksDashboard } from "./lib/sparks-dashboard/aggregate.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3847;

const LAYOUTS = new Set([
  "horizontal-right",
  "buttons-inline",
  "grid-2",
  "grid-3",
  "minimal",
]);

const TOOLS = [
  {
    id: "rss-email",
    name: "RSS Email HTML Generator",
    path: "/rss-email/",
    description:
      "Turn an events RSS feed into HubSpot-ready HTML with dates, images, and ticket links.",
  },
  {
    id: "event-cards",
    name: "Event Card Graphics",
    path: "/event-cards/",
    description:
      "4:5 portrait cards from the events RSS feed — photo and title only, ready to export.",
  },
  {
    id: "sparks-dashboard",
    name: "Creative Spark Dashboard",
    path: "/sparks-dashboard/",
    description:
      "Track Creative Spark membership growth, tier mix, and member event momentum.",
  },
];

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, tools: TOOLS.map((t) => t.id) });
});

app.get("/api/tools", (_req, res) => {
  res.json({ tools: TOOLS });
});

app.get("/api/sparks-dashboard", async (req, res) => {
  try {
    const period = String(req.query.period ?? "fy");
    const membershipType = String(req.query.membershipType ?? "all");
    const allowedPeriods = new Set(["fy", "quarter", "month", "year"]);
    const allowedTypes = new Set(["all", "monthly", "annual"]);

    const refresh =
      req.query.refresh === "1" ||
      req.query.refresh === "true" ||
      req.query.nocache === "1";

    const result = await getSparksDashboard({
      period: allowedPeriods.has(period) ? period : "fy",
      membershipType: allowedTypes.has(membershipType) ? membershipType : "all",
      refresh,
    });

    res.set("Cache-Control", "no-store");
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Dashboard fetch failed.",
    });
  }
});

app.post("/api/event-cards/generate", async (req, res) => {
  try {
    const body = req.body ?? {};
    const feedUrl = String(body.feedUrl ?? "").trim();
    if (!feedUrl) {
      return res.status(400).json({ error: "Feed URL is required." });
    }

    const result = await generateEventCards({
      feedUrl,
      limit: Math.min(Math.max(Number(body.limit) || 8, 1), 30),
      sort: body.sort ?? "date-asc",
      upcomingOnly: body.upcomingOnly !== false,
      fromDate: body.fromDate || "",
      enrich: body.enrich !== false,
      cardWidth: Math.min(Math.max(Number(body.cardWidth) || 360, 240), 600),
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Generation failed.",
    });
  }
});

app.post("/api/generate", async (req, res) => {
  try {
    const body = req.body ?? {};
    const feedUrl = String(body.feedUrl ?? "").trim();
    if (!feedUrl) {
      return res.status(400).json({ error: "Feed URL is required." });
    }

    const result = await generateEmail({
      feedUrl,
      limit: Math.min(Math.max(Number(body.limit) || 8, 1), 30),
      sort: body.sort ?? "date-asc",
      upcomingOnly: body.upcomingOnly !== false,
      fromDate: body.fromDate || "",
      enrich: body.enrich !== false,
      layout: LAYOUTS.has(body.layout) ? body.layout : "horizontal-right",
      learnLabel: body.learnLabel || "Learn more",
      websiteLabel: body.websiteLabel || "Event website",
      primaryColor: body.primaryColor || "#1a1a1a",
      includeImages: body.includeImages === true,
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Generation failed.",
    });
  }
});

export default app;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Creative Waco Tools running at http://localhost:${PORT}`);
  });
}
