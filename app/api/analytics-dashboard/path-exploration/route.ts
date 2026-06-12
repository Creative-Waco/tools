import { parseISO, subDays } from "date-fns";

import { fetchPathExploration } from "@/lib/analytics-dashboard/path-exploration.mjs";
import { loadLocalCredentials } from "@/lib/analytics-dashboard/local-env.mjs";

let credentialsLoaded = false;

function ensureCredentials() {
  if (!credentialsLoaded) {
    loadLocalCredentials();
    credentialsLoaded = true;
  }
}

function parseDateParam(value: string | null, fallback: Date) {
  if (!value) return fallback;
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

export async function GET(request: Request) {
  try {
    ensureCredentials();

    const { searchParams } = new URL(request.url);
    const end = parseDateParam(searchParams.get("endDate"), new Date());
    const start = parseDateParam(searchParams.get("startDate"), subDays(end, 29));
    const programId = searchParams.get("program") ?? "all";
    const mode = searchParams.get("mode") ?? "landings";
    const pathStepsParam = searchParams.get("pathSteps");
    const fromPath = searchParams.get("fromPath") ?? undefined;
    const pathSteps = pathStepsParam
      ? JSON.parse(pathStepsParam)
      : fromPath
        ? [fromPath]
        : [];

    if (start > end) {
      return Response.json(
        { error: "Start date must be on or before end date." },
        { status: 400 },
      );
    }

    const result = await fetchPathExploration({
      startDate: start,
      endDate: end,
      programId,
      mode,
      pathSteps,
    });

    return Response.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Path exploration fetch failed.",
      },
      { status: 500 },
    );
  }
}
