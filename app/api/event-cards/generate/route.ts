import { generateEventCards } from "@/lib/event-cards/generate.mjs";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const feedUrl = String(body.feedUrl ?? "").trim();
    if (!feedUrl) {
      return Response.json({ error: "Feed URL is required." }, { status: 400 });
    }

    const result = await generateEventCards({
      feedUrl,
      limit: Math.min(Math.max(Number(body.limit) || 8, 1), 30),
      sort: String(body.sort ?? "date-asc"),
      upcomingOnly: body.upcomingOnly !== false,
      fromDate: String(body.fromDate ?? ""),
      enrich: body.enrich !== false,
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
