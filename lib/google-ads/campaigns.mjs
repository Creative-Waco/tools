import { enums, toMicros } from "google-ads-api";

import { getGoogleAdsConfig } from "./config.mjs";
import { getGoogleAdsCustomer } from "./client.mjs";

const DATE_RANGES = {
  "7d": "LAST_7_DAYS",
  "30d": "LAST_30_DAYS",
  "90d": "LAST_90_DAYS",
};

const STATUS_LABELS = {
  [enums.CampaignStatus.UNSPECIFIED]: "UNSPECIFIED",
  [enums.CampaignStatus.UNKNOWN]: "UNKNOWN",
  [enums.CampaignStatus.ENABLED]: "ENABLED",
  [enums.CampaignStatus.PAUSED]: "PAUSED",
  [enums.CampaignStatus.REMOVED]: "REMOVED",
};

const CHANNEL_LABELS = {
  [enums.AdvertisingChannelType.UNSPECIFIED]: "Unspecified",
  [enums.AdvertisingChannelType.UNKNOWN]: "Unknown",
  [enums.AdvertisingChannelType.SEARCH]: "Search",
  [enums.AdvertisingChannelType.DISPLAY]: "Display",
  [enums.AdvertisingChannelType.SHOPPING]: "Shopping",
  [enums.AdvertisingChannelType.HOTEL]: "Hotel",
  [enums.AdvertisingChannelType.VIDEO]: "Video",
  [enums.AdvertisingChannelType.MULTI_CHANNEL]: "App",
  [enums.AdvertisingChannelType.LOCAL]: "Local",
  [enums.AdvertisingChannelType.SMART]: "Smart",
  [enums.AdvertisingChannelType.PERFORMANCE_MAX]: "Performance Max",
  [enums.AdvertisingChannelType.LOCAL_SERVICES]: "Local Services",
  [enums.AdvertisingChannelType.TRAVEL]: "Travel",
  [enums.AdvertisingChannelType.DEMAND_GEN]: "Demand Gen",
};

function microsToDollars(micros) {
  const value = Number(micros ?? 0);
  if (!Number.isFinite(value)) return 0;
  return value / 1_000_000;
}

function formatStatus(status) {
  return STATUS_LABELS[status] ?? String(status);
}

function formatChannel(channelType) {
  return CHANNEL_LABELS[channelType] ?? String(channelType);
}

function resolveDateRange(rangeKey = "30d") {
  return DATE_RANGES[rangeKey] ?? DATE_RANGES["30d"];
}

function aggregateCampaignRows(rows) {
  const byId = new Map();

  for (const row of rows) {
    const id = String(row.campaign?.id ?? "");
    if (!id) continue;

    const existing = byId.get(id) ?? {
      id,
      name: row.campaign?.name ?? "Untitled campaign",
      status: formatStatus(row.campaign?.status),
      channelType: formatChannel(row.campaign?.advertising_channel_type),
      budgetResourceName: row.campaign_budget?.resource_name ?? null,
      dailyBudget: microsToDollars(row.campaign_budget?.amount_micros),
      spend: 0,
      clicks: 0,
      impressions: 0,
      conversions: 0,
    };

    existing.spend += microsToDollars(row.metrics?.cost_micros);
    existing.clicks += Number(row.metrics?.clicks ?? 0);
    existing.impressions += Number(row.metrics?.impressions ?? 0);
    existing.conversions += Number(row.metrics?.conversions ?? 0);

    byId.set(id, existing);
  }

  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function summarizeCampaigns(campaigns) {
  return campaigns.reduce(
    (summary, campaign) => {
      summary.spend += campaign.spend;
      summary.clicks += campaign.clicks;
      summary.impressions += campaign.impressions;
      summary.conversions += campaign.conversions;
      if (campaign.status === "ENABLED") summary.enabledCount += 1;
      if (campaign.status === "PAUSED") summary.pausedCount += 1;
      return summary;
    },
    {
      spend: 0,
      clicks: 0,
      impressions: 0,
      conversions: 0,
      enabledCount: 0,
      pausedCount: 0,
    },
  );
}

export async function listGoogleAdsCampaigns({
  range = "30d",
  status = "all",
} = {}) {
  const customer = await getGoogleAdsCustomer();
  const config = getGoogleAdsConfig();
  const during = resolveDateRange(range);

  const statusClause =
    status === "enabled"
      ? `AND campaign.status = "ENABLED"`
      : status === "paused"
        ? `AND campaign.status = "PAUSED"`
        : `AND campaign.status != "REMOVED"`;

  const rows = await customer.query(`
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.advertising_channel_type,
      campaign_budget.resource_name,
      campaign_budget.amount_micros,
      metrics.cost_micros,
      metrics.clicks,
      metrics.impressions,
      metrics.conversions
    FROM campaign
    WHERE segments.date DURING ${during}
      ${statusClause}
    ORDER BY campaign.name
  `);

  const campaigns = aggregateCampaignRows(rows);

  return {
    customerId: config.customerId,
    range,
    campaigns,
    summary: summarizeCampaigns(campaigns),
  };
}

export async function updateGoogleAdsCampaignStatus(campaignId, nextStatus) {
  const customer = await getGoogleAdsCustomer();
  const config = getGoogleAdsConfig();
  const normalizedId = String(campaignId).replace(/\D/g, "");

  const statusEnum =
    nextStatus === "ENABLED"
      ? enums.CampaignStatus.ENABLED
      : enums.CampaignStatus.PAUSED;

  const resourceName = `customers/${config.customerId}/campaigns/${normalizedId}`;

  await customer.campaigns.update([
    {
      resource_name: resourceName,
      status: statusEnum,
    },
  ]);

  return {
    id: normalizedId,
    status: nextStatus,
    resourceName,
  };
}

export async function updateGoogleAdsCampaignBudget(budgetResourceName, amountDollars) {
  const customer = await getGoogleAdsCustomer();
  const amount = Number(amountDollars);

  if (!budgetResourceName?.trim()) {
    throw new Error("Campaign budget resource name is required.");
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Daily budget must be a positive number.");
  }

  await customer.campaignBudgets.update([
    {
      resource_name: budgetResourceName,
      amount_micros: toMicros(amount),
    },
  ]);

  return {
    budgetResourceName,
    dailyBudget: amount,
  };
}
