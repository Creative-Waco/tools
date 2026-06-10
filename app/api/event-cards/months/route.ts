import { getFeedMonths } from "@/lib/event-cards/feed-months.mjs";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const feedUrl = String(body.feedUrl ?? "").trim();
    if (!feedUrl) {
      return Response.json({ error: "Feed URL is required." }, { status: 400 });
    }

    const result = await getFeedMonths({
      feedUrl,
      enrich: body.enrich !== false,
    });

    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Could not load feed months.",
      },
      { status: 500 },
    );
  }
}
