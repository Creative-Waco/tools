export const TABLE_CAMPAIGNS = "CW Tools — Campaigns";
export const TABLE_CAMPAIGN_LINKS = "CW Tools — Campaign Links";
export const TABLE_KPIS = "CW Tools — KPIs";

export function getAirtableConfig() {
  const apiKey = process.env.AIRTABLE_API_KEY?.trim();
  const baseId = process.env.AIRTABLE_BASE_ID?.trim();

  if (!apiKey || !baseId) {
    return {
      configured: false,
      message:
        "Airtable is not configured. Set AIRTABLE_API_KEY and AIRTABLE_BASE_ID.",
    };
  }

  if (!apiKey.startsWith("pat")) {
    return {
      configured: false,
      message: "AIRTABLE_API_KEY must be a personal access token (starts with pat).",
    };
  }

  return {
    configured: true,
    apiKey,
    baseId,
    tables: {
      campaigns: TABLE_CAMPAIGNS,
      campaignLinks: TABLE_CAMPAIGN_LINKS,
      kpis: TABLE_KPIS,
    },
  };
}

export function requireAirtableConfig() {
  const config = getAirtableConfig();
  if (!config.configured) {
    throw new Error(config.message);
  }
  return config;
}
