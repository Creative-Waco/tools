import { getRequestUserEmail } from "@/lib/auth-user";
import { upsertCampaignLinksBatch, getCampaignById } from "@/lib/airtable/campaigns.mjs";
import { getAirtableConfig } from "@/lib/airtable/config.mjs";
import { ensureLocalCredentials } from "@/lib/airtable/local-env.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    ensureLocalCredentials();
    const config = getAirtableConfig();
    if (!config.configured) {
      return Response.json({ error: config.message }, { status: 400 });
    }

    const { id } = await context.params;
    const campaign = await getCampaignById(id);
    if (!campaign) {
      return Response.json({ error: "Campaign not found." }, { status: 404 });
    }

    const body = await request.json();
    const utm = body.utm ?? {};
    const email = await getRequestUserEmail();

    const links = await upsertCampaignLinksBatch({
      campaignId: id,
      campaignSlug: campaign.utm_campaign,
      landing_url: campaign.landing_url,
      utm: {
        utm_source: String(utm.utm_source ?? ""),
        utm_medium: String(utm.utm_medium ?? ""),
        utm_campaign: campaign.utm_campaign,
        utm_term: String(utm.utm_term ?? ""),
        utm_content: String(utm.utm_content ?? ""),
        utm_id: String(utm.utm_id ?? ""),
      },
      channel_preset: body.channel_preset ?? "",
      customParams: body.customParams ?? [],
      contentVariants: Array.isArray(body.contentVariants) ? body.contentVariants : [],
      created_by: email,
    });

    return Response.json({ links }, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to save link." },
      { status: 500 },
    );
  }
}
