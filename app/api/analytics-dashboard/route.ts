import { getAnalyticsDashboard } from "@/lib/analytics-dashboard/aggregate.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate") ?? undefined;
    const endDate = searchParams.get("endDate") ?? undefined;
    const programId = searchParams.get("program") ?? "all";

    const result = await getAnalyticsDashboard({ startDate, endDate, programId });

    return Response.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Analytics fetch failed.",
      },
      { status: 500 },
    );
  }
}
