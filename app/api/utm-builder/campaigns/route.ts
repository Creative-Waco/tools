import { getRequestUserEmail } from "@/lib/auth-user";
import { getCampaignsWithPerformance } from "@/lib/utm-builder/campaign-performance.mjs";
import {
  createCampaign,
} from "@/lib/airtable/campaigns.mjs";
import { getAirtableConfig } from "@/lib/airtable/config.mjs";
import { ensureLocalCredentials } from "@/lib/airtable/local-env.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    ensureLocalCredentials();
    const config = getAirtableConfig();
    if (!config.configured) {
      return Response.json({
        configured: false,
        message: config.message,
        campaigns: [],
      });
    }

    const { searchParams } = new URL(request.url);
    const days = Math.min(365, Math.max(7, Number(searchParams.get("days") ?? 90) || 90));

    const result = await getCampaignsWithPerformance({ days });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json(
      {
        configured: false,
        error: error instanceof Error ? error.message : "Failed to load campaigns.",
        campaigns: [],
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    ensureLocalCredentials();
    const config = getAirtableConfig();
    if (!config.configured) {
      return Response.json({ error: config.message }, { status: 400 });
    }

    const body = await request.json();
    const email = await getRequestUserEmail();

    const name = String(body.name ?? "").trim();
    const utm_campaign = String(body.utm_campaign ?? "").trim();
    const landing_url = String(body.landing_url ?? "").trim();

    if (!name || !utm_campaign || !landing_url) {
      return Response.json(
        { error: "name, utm_campaign, and landing_url are required." },
        { status: 400 },
      );
    }

    const campaign = await createCampaign({
      name,
      utm_campaign,
      landing_url,
      program: body.program ?? null,
      status: body.status ?? "Draft",
      benchmark_sessions:
        body.benchmark_sessions != null ? Number(body.benchmark_sessions) : null,
      benchmark_engagement_rate:
        body.benchmark_engagement_rate != null
          ? Number(body.benchmark_engagement_rate)
          : null,
      benchmark_bounce_rate:
        body.benchmark_bounce_rate != null ? Number(body.benchmark_bounce_rate) : null,
      notes: body.notes ?? "",
      created_by: email,
    });

    return Response.json({ campaign }, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to create campaign." },
      { status: 500 },
    );
  }
}
