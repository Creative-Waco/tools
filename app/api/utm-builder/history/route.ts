import { subDays } from "date-fns";

import { loadLocalCredentials } from "@/lib/analytics-dashboard/local-env.mjs";
import { fetchUtmHistory } from "@/lib/utm-builder/ga4-history.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let credentialsLoaded = false;

function ensureCredentials() {
  if (!credentialsLoaded) {
    loadLocalCredentials();
    credentialsLoaded = true;
  }
}

function parseDaysParam(value: string | null): number {
  const parsed = Number(value ?? "90");
  if (!Number.isFinite(parsed)) return 90;
  return Math.min(365, Math.max(7, Math.round(parsed)));
}

export async function GET(request: Request) {
  try {
    ensureCredentials();

    const { searchParams } = new URL(request.url);
    const days = parseDaysParam(searchParams.get("days"));
    const limit = Math.min(1000, Math.max(10, Number(searchParams.get("limit") ?? "500") || 500));
    const endDate = new Date();
    const startDate = subDays(endDate, days - 1);

    const result = await fetchUtmHistory({ startDate, endDate, limit });

    return Response.json(result, {
      headers: { "Cache-Control": "private, max-age=300" },
    });
  } catch (error) {
    return Response.json(
      {
        configured: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to load UTM history from GA4.",
      },
      { status: 500 },
    );
  }
}
