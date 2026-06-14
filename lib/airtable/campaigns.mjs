import { buildLinkLabel, buildUtmUrl } from "../utm-builder/server-build-url.mjs";
import { getConfiguredClient, createRecord, listRecords, updateRecord } from "./client.mjs";
import { ensureToolsSchema } from "./schema.mjs";
import { TABLE_CAMPAIGN_LINKS, TABLE_CAMPAIGNS } from "./config.mjs";

function escapeFormulaValue(value) {
  return String(value ?? "").replace(/'/g, "\\'");
}

function linkKey(source, medium, content, term) {
  return [source, medium, content, term].map((v) => v?.trim() ?? "").join("|");
}

const PRESET_LABELS = {
  instagram: "Instagram",
  facebook: "Facebook",
  newsletter: "Newsletter",
  "google-ads": "Google Ads",
  "print-qr": "Print / QR",
  partner: "Partner site",
};

function mapCampaignRecord(record) {
  const fields = record.fields ?? {};
  return {
    id: record.id,
    name: fields.Name ?? "",
    utm_campaign: fields.utm_campaign ?? "",
    landing_url: fields.landing_url ?? "",
    program: fields.program ?? null,
    status: fields.status ?? "Draft",
    benchmark_sessions: fields.benchmark_sessions ?? null,
    benchmark_engagement_rate: fields.benchmark_engagement_rate ?? null,
    benchmark_bounce_rate: fields.benchmark_bounce_rate ?? null,
    notes: fields.notes ?? "",
    created_by: fields.created_by ?? "",
    created_at: fields.created_at ?? null,
    updated_at: fields.updated_at ?? null,
    linkIds: fields["CW Tools — Campaign Links"] ?? [],
  };
}

function mapLinkRecord(record) {
  const fields = record.fields ?? {};
  const campaignIds = fields.Campaign ?? [];
  return {
    id: record.id,
    name: fields.Name ?? "",
    campaignId: campaignIds[0] ?? null,
    utm: {
      utm_source: fields.utm_source ?? "",
      utm_medium: fields.utm_medium ?? "",
      utm_campaign: "",
      utm_term: fields.utm_term ?? "",
      utm_content: fields.utm_content ?? "",
      utm_id: fields.utm_id ?? "",
    },
    channel_preset: fields.channel_preset ?? "",
    tagged_url: fields.tagged_url ?? "",
    created_by: fields.created_by ?? "",
    created_at: fields.created_at ?? null,
  };
}

export async function listCampaigns() {
  const schema = await ensureToolsSchema();
  const config = getConfiguredClient();

  const [campaignRecords, linkRecords] = await Promise.all([
    listRecords(config.apiKey, config.baseId, TABLE_CAMPAIGNS, {
      sort: [{ field: "updated_at", direction: "desc" }],
    }),
    listRecords(config.apiKey, config.baseId, TABLE_CAMPAIGN_LINKS),
  ]);

  const linksByCampaign = new Map();
  for (const record of linkRecords) {
    const link = mapLinkRecord(record);
    if (!link.campaignId) continue;
    const list = linksByCampaign.get(link.campaignId) ?? [];
    list.push(link);
    linksByCampaign.set(link.campaignId, list);
  }

  return campaignRecords.map((record) => {
    const campaign = mapCampaignRecord(record);
    return {
      ...campaign,
      links: linksByCampaign.get(campaign.id) ?? [],
    };
  });
}

export async function getCampaignById(campaignId) {
  const campaigns = await listCampaigns();
  return campaigns.find((campaign) => campaign.id === campaignId) ?? null;
}

export async function createCampaign({
  name,
  utm_campaign,
  landing_url,
  program,
  status = "Draft",
  benchmark_sessions,
  benchmark_engagement_rate,
  benchmark_bounce_rate,
  notes,
  created_by,
}) {
  await ensureToolsSchema();
  const config = getConfiguredClient();
  const now = new Date().toISOString();

  const fields = {
    Name: name.trim(),
    utm_campaign: utm_campaign.trim(),
    landing_url: landing_url.trim(),
    status,
    notes: notes?.trim() ?? "",
    created_by: created_by ?? "",
    created_at: now,
    updated_at: now,
  };

  if (program) fields.program = program;
  if (benchmark_sessions != null) fields.benchmark_sessions = benchmark_sessions;
  if (benchmark_engagement_rate != null) {
    fields.benchmark_engagement_rate = benchmark_engagement_rate / 100;
  }
  if (benchmark_bounce_rate != null) {
    fields.benchmark_bounce_rate = benchmark_bounce_rate / 100;
  }

  const record = await createRecord(config.apiKey, config.baseId, TABLE_CAMPAIGNS, fields);
  return mapCampaignRecord(record);
}

export async function updateCampaign(campaignId, updates) {
  await ensureToolsSchema();
  const config = getConfiguredClient();

  const fields = { updated_at: new Date().toISOString() };

  if (updates.name != null) fields.Name = updates.name.trim();
  if (updates.utm_campaign != null) fields.utm_campaign = updates.utm_campaign.trim();
  if (updates.landing_url != null) fields.landing_url = updates.landing_url.trim();
  if (updates.program != null) fields.program = updates.program;
  if (updates.status != null) fields.status = updates.status;
  if (updates.notes != null) fields.notes = updates.notes.trim();
  if (updates.benchmark_sessions != null) fields.benchmark_sessions = updates.benchmark_sessions;
  if (updates.benchmark_engagement_rate != null) {
    fields.benchmark_engagement_rate = updates.benchmark_engagement_rate / 100;
  }
  if (updates.benchmark_bounce_rate != null) {
    fields.benchmark_bounce_rate = updates.benchmark_bounce_rate / 100;
  }

  const record = await updateRecord(
    config.apiKey,
    config.baseId,
    TABLE_CAMPAIGNS,
    campaignId,
    fields,
  );
  return mapCampaignRecord(record);
}

export async function rebuildCampaignLinks(campaignId, { landing_url, utm_campaign }) {
  await ensureToolsSchema();
  const config = getConfiguredClient();

  const linkRecords = await listRecords(config.apiKey, config.baseId, TABLE_CAMPAIGN_LINKS, {
    filterByFormula: `FIND('${escapeFormulaValue(campaignId)}', ARRAYJOIN({Campaign}&''))`,
    maxRecords: 100,
  });

  const landing = landing_url.trim();
  const slug = utm_campaign.trim();
  let rebuilt = 0;

  for (const record of linkRecords) {
    const fields = record.fields ?? {};
    const ids = fields.Campaign ?? [];
    if (!ids.includes(campaignId)) continue;

    const fullUtm = {
      utm_source: fields.utm_source ?? "",
      utm_medium: fields.utm_medium ?? "",
      utm_campaign: slug,
      utm_term: fields.utm_term ?? "",
      utm_content: fields.utm_content ?? "",
      utm_id: fields.utm_id ?? "",
    };

    const built = buildUtmUrl(landing, fullUtm);
    if (built.error || !built.url) {
      throw new Error(built.error ?? `Could not rebuild link ${record.id}.`);
    }

    await updateRecord(config.apiKey, config.baseId, TABLE_CAMPAIGN_LINKS, record.id, {
      tagged_url: built.url,
    });
    rebuilt += 1;
  }

  if (rebuilt > 0) {
    await updateCampaign(campaignId, {});
  }

  return rebuilt;
}

export async function upsertCampaignLink({
  campaignId,
  campaignSlug,
  landing_url,
  utm,
  channel_preset,
  customParams = [],
  created_by,
}) {
  await ensureToolsSchema();
  const config = getConfiguredClient();

  const fullUtm = { ...utm, utm_campaign: campaignSlug };
  const built = buildUtmUrl(landing_url, fullUtm, customParams);
  if (built.error || !built.url) {
    throw new Error(built.error ?? "Could not build tagged URL.");
  }

  const source = fullUtm.utm_source.trim();
  const medium = fullUtm.utm_medium.trim();
  const content = fullUtm.utm_content.trim();
  const term = fullUtm.utm_term.trim();
  const key = linkKey(source, medium, content, term);

  const campaignLinks = await listRecords(config.apiKey, config.baseId, TABLE_CAMPAIGN_LINKS, {
    filterByFormula: `FIND('${escapeFormulaValue(campaignId)}', ARRAYJOIN({Campaign}&''))`,
    maxRecords: 100,
  });

  const existing = campaignLinks.filter((record) => {
    const fields = record.fields ?? {};
    const ids = fields.Campaign ?? [];
    if (!ids.includes(campaignId)) return false;
    return (
      linkKey(
        fields.utm_source,
        fields.utm_medium,
        fields.utm_content,
        fields.utm_term,
      ) === key
    );
  });

  const now = new Date().toISOString();
  const fields = {
    Name: buildLinkLabel(fullUtm, channel_preset, PRESET_LABELS),
    Campaign: [campaignId],
    utm_source: source,
    utm_medium: medium,
    utm_term: term,
    utm_content: content,
    utm_id: fullUtm.utm_id.trim(),
    channel_preset: channel_preset ?? "",
    tagged_url: built.url,
    created_by: created_by ?? "",
    created_at: now,
  };

  if (existing.length > 0) {
    const record = await updateRecord(
      config.apiKey,
      config.baseId,
      TABLE_CAMPAIGN_LINKS,
      existing[0].id,
      fields,
    );
    await updateCampaign(campaignId, {});
    return mapLinkRecord(record);
  }

  const record = await createRecord(config.apiKey, config.baseId, TABLE_CAMPAIGN_LINKS, fields);
  await updateCampaign(campaignId, {});
  return mapLinkRecord(record);
}

export async function upsertCampaignLinksBatch({
  campaignId,
  campaignSlug,
  landing_url,
  utm,
  channel_preset,
  customParams = [],
  contentVariants = [],
  created_by,
}) {
  const variants =
    contentVariants.length > 0
      ? contentVariants
      : [utm.utm_content?.trim() ?? ""];

  const results = [];
  for (const content of variants) {
    const linkUtm = { ...utm, utm_content: content };
    if (!linkUtm.utm_source?.trim() || !linkUtm.utm_medium?.trim()) {
      throw new Error("utm_source and utm_medium are required.");
    }
    const saved = await upsertCampaignLink({
      campaignId,
      campaignSlug,
      landing_url,
      utm: linkUtm,
      channel_preset,
      customParams,
      created_by,
    });
    results.push(saved);
  }
  return results;
}

export { linkKey };
