import { generateEmail } from "@/lib/generate.mjs";

export const runtime = "nodejs";
export const maxDuration = 60;

const LAYOUTS = new Set([
  "horizontal-right",
  "buttons-inline",
  "grid-2",
  "grid-3",
  "minimal",
]);

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const feedUrl = String(body.feedUrl ?? "").trim();
    if (!feedUrl) {
      return Response.json({ error: "Feed URL is required." }, { status: 400 });
    }

    const result = await generateEmail({
      feedUrl,
      limit: Math.min(Math.max(Number(body.limit) || 8, 1), 30),
      sort: String(body.sort ?? "date-asc"),
      upcomingOnly: body.upcomingOnly !== false,
      fromDate: String(body.fromDate ?? ""),
      enrich: body.enrich !== false,
      layout: LAYOUTS.has(String(body.layout))
        ? String(body.layout)
        : "horizontal-right",
      learnLabel: String(body.learnLabel ?? "Learn more"),
      websiteLabel: String(body.websiteLabel ?? "Event website"),
      primaryColor: String(body.primaryColor ?? "#1a1a1a"),
      includeImages: body.includeImages === true,
    });

    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Generation failed.",
      },
      { status: 500 },
    );
  }
}
