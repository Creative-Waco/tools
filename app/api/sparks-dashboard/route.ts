import { getSparksDashboard } from "@/lib/sparks-dashboard/aggregate.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = String(searchParams.get("period") ?? "fy");
    const membershipType = String(searchParams.get("membershipType") ?? "all");
    const allowedPeriods = new Set(["fy", "quarter", "month", "year"]);
    const allowedTypes = new Set(["all", "monthly", "annual"]);

    const refresh =
      searchParams.get("refresh") === "1" ||
      searchParams.get("refresh") === "true" ||
      searchParams.get("nocache") === "1";

    const result = await getSparksDashboard({
      period: allowedPeriods.has(period) ? period : "fy",
      membershipType: allowedTypes.has(membershipType) ? membershipType : "all",
      refresh,
    });

    return Response.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Dashboard fetch failed.",
      },
      { status: 500 },
    );
  }
}
