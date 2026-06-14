import {
  getCampaignById,
  rebuildCampaignLinks,
  updateCampaign,
} from "@/lib/airtable/campaigns.mjs";
import { getAirtableConfig } from "@/lib/airtable/config.mjs";
import { ensureLocalCredentials } from "@/lib/airtable/local-env.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    ensureLocalCredentials();
    const config = getAirtableConfig();
    if (!config.configured) {
      return Response.json({ error: config.message }, { status: 400 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const existing = await getCampaignById(id);

    const campaign = await updateCampaign(id, {
      name: body.name,
      utm_campaign: body.utm_campaign,
      landing_url: body.landing_url,
      program: body.program,
      status: body.status,
      notes: body.notes,
      benchmark_sessions:
        body.benchmark_sessions != null ? Number(body.benchmark_sessions) : undefined,
      benchmark_engagement_rate:
        body.benchmark_engagement_rate != null
          ? Number(body.benchmark_engagement_rate)
          : undefined,
      benchmark_bounce_rate:
        body.benchmark_bounce_rate != null ? Number(body.benchmark_bounce_rate) : undefined,
    });

    const landingChanged =
      body.landing_url != null &&
      body.landing_url.trim() !== (existing?.landing_url ?? "").trim();
    const slugChanged =
      body.utm_campaign != null &&
      body.utm_campaign.trim() !== (existing?.utm_campaign ?? "").trim();

    let linksRebuilt = 0;
    if (existing && (landingChanged || slugChanged)) {
      linksRebuilt = await rebuildCampaignLinks(id, {
        landing_url: campaign.landing_url,
        utm_campaign: campaign.utm_campaign,
      });
    }

    return Response.json({ campaign, linksRebuilt });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to update campaign." },
      { status: 500 },
    );
  }
}
