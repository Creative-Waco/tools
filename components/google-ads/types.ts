export type GoogleAdsCampaign = {
  id: string;
  name: string;
  status: string;
  channelType: string;
  budgetResourceName: string | null;
  dailyBudget: number;
  spend: number;
  clicks: number;
  impressions: number;
  conversions: number;
};

export type GoogleAdsSummary = {
  spend: number;
  clicks: number;
  impressions: number;
  conversions: number;
  enabledCount: number;
  pausedCount: number;
};

export type GoogleAdsDashboardData = {
  configured: boolean;
  missing?: string[];
  customerId?: string | null;
  loginCustomerId?: string | null;
  range?: string;
  campaigns?: GoogleAdsCampaign[];
  summary?: GoogleAdsSummary;
  error?: string;
};

export type GoogleAdsRange = "7d" | "30d" | "90d";
export type GoogleAdsStatusFilter = "all" | "enabled" | "paused";
