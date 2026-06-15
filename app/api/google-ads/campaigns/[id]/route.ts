import { getGoogleAdsConfigStatus } from "@/lib/google-ads/config.mjs";
import {
  updateGoogleAdsCampaignBudget,
  updateGoogleAdsCampaignStatus,
} from "@/lib/google-ads/campaigns.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const status = getGoogleAdsConfigStatus();
  if (!status.configured) {
    return Response.json(
      {
        error: `Google Ads API is not configured. Missing: ${status.missing.join(", ")}`,
      },
      { status: 503 },
    );
  }

  const { id } = await context.params;

  try {
    const body = await request.json();

    if (body?.status === "ENABLED" || body?.status === "PAUSED") {
      const result = await updateGoogleAdsCampaignStatus(id, body.status);
      return Response.json(result, { headers: { "Cache-Control": "no-store" } });
    }

    if (body?.dailyBudget != null && body?.budgetResourceName) {
      const result = await updateGoogleAdsCampaignBudget(
        body.budgetResourceName,
        body.dailyBudget,
      );
      return Response.json(result, { headers: { "Cache-Control": "no-store" } });
    }

    return Response.json(
      { error: "Provide status (ENABLED|PAUSED) or dailyBudget + budgetResourceName." },
      { status: 400 },
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Google Ads update failed.",
      },
      { status: 500 },
    );
  }
}
