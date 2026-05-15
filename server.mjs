import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateEmail } from "./lib/generate.mjs";

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

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
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
    console.log(`RSS Email Generator running at http://localhost:${PORT}`);
  });
}
