export type CampaignBenchmarkStatus = "no_traffic" | "on_track" | "below_target";

export type CampaignPerformanceMetrics = {
  sessions: number;
  activeUsers: number;
  engagedSessions: number;
  engagementRate: number | null;
  bounceRate: number | null;
};

export type CampaignBenchmark = {
  targets: {
    sessions: number | null;
    engagementRate: number | null;
    bounceRate: number | null;
  };
  targetSource: {
    sessions: "airtable" | "none";
    engagementRate: "airtable" | "site_average";
    bounceRate: "airtable" | "site_average";
  };
  vsBenchmark?: {
    sessionsPct?: number;
    engagementDelta?: number;
    bounceDelta?: number;
  };
  status: CampaignBenchmarkStatus;
};

export type CampaignLink = {
  id: string;
  name: string;
  campaignId: string | null;
  utm: {
    utm_source: string;
    utm_medium: string;
    utm_campaign: string;
    utm_term: string;
    utm_content: string;
    utm_id: string;
  };
  channel_preset: string;
  tagged_url: string;
  created_by: string;
  created_at: string | null;
  performance?: CampaignPerformanceMetrics;
};

export type CampaignRecord = {
  id: string;
  name: string;
  utm_campaign: string;
  landing_url: string;
  program: string | null;
  status: string;
  benchmark_sessions: number | null;
  benchmark_engagement_rate: number | null;
  benchmark_bounce_rate: number | null;
  notes: string;
  created_by: string;
  created_at: string | null;
  updated_at: string | null;
  links: CampaignLink[];
  performance?: CampaignPerformanceMetrics;
  benchmark?: CampaignBenchmark;
};

export type CampaignsApiResponse = {
  configured: boolean;
  message?: string;
  airtable?: boolean;
  ga4?: boolean;
  startDate?: string | null;
  endDate?: string | null;
  siteKpis?: {
    engagementRate: number;
    bounceRate: number;
    sessions: number;
  } | null;
  campaigns: CampaignRecord[];
};
