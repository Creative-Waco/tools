import { getGoogleAdsConfigStatus } from "@/lib/google-ads/config.mjs";
import { listGoogleAdsCampaigns } from "@/lib/google-ads/campaigns.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const status = getGoogleAdsConfigStatus();

  if (!status.configured) {
    return Response.json(
      {
        configured: false,
        missing: status.missing,
        customerId: status.customerId,
        loginCustomerId: status.loginCustomerId,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") ?? "30d";
    const campaignStatus = searchParams.get("status") ?? "all";

    const data = await listGoogleAdsCampaigns({
      range,
      status: campaignStatus,
    });

    return Response.json(
      {
        configured: true,
        ...data,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return Response.json(
      {
        configured: true,
        error:
          error instanceof Error ? error.message : "Google Ads fetch failed.",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
