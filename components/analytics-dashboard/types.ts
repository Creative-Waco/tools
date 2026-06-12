export type KpiMetric = {
  value: number;
  change: number;
};

export type DailyPageRow = {
  path: string;
  views: number;
};

export type DailyRow = {
  date: string;
  dateKey: string;
  dateStr: string;
  sessions: number;
  activeUsers: number;
  pageViews?: number;
  pages?: DailyPageRow[];
};

export type ChannelSourceRow = {
  source: string;
  sessions: number;
};

export type ChannelRow = {
  name: string;
  value: number;
  sessions: number;
  fill: string;
  sources?: ChannelSourceRow[];
};

export type TopPageRow = {
  path: string;
  views: number;
  change: number;
};

export type TopReferrerRow = {
  source: string;
  sessions: number;
};

export type CitySourceRow = {
  source: string;
  sessions: number;
};

export type CityLandingRow = {
  path: string;
  sessions: number;
};

export type TopCityRow = {
  city: string;
  country?: string;
  region?: string;
  users: number;
  sessions: number;
  share: number;
  engagementRate: number;
  newUsers: number;
  returningUsers: number;
  sources?: CitySourceRow[];
  landingPages?: CityLandingRow[];
};

export type SearchQueryRow = {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type SearchConsoleData = {
  available: boolean;
  siteUrl: string | null;
  programId: string;
  queries: SearchQueryRow[];
  totals: {
    clicks: number;
    impressions: number;
    ctr: number;
  };
  error?: string;
  note?: string;
};

export type ProgramSummary = {
  id: string;
  name: string;
  description: string;
};

export type JourneyStep = {
  id: string;
  label: string;
  path?: string;
  metric: number;
  metricLabel: string;
  share?: number;
};

export type JourneyStage = {
  id: "arrival" | "landing" | "explore" | "continue" | "actions";
  title: string;
  description: string;
  steps: JourneyStep[];
  footnote?: string;
};

export type VisitorJourney = {
  scope: "site" | "program";
  stages: JourneyStage[];
};

export type ProgramInsights = {
  audience: {
    newUsers: number;
    returningUsers: number;
    newSessions: number;
    returningSessions: number;
  };
  devices: Array<{
    category: string;
    users: number;
    sessions: number;
  }>;
  cities: Array<{
    city: string;
    users: number;
    sessions: number;
  }>;
  landingPages: Array<{
    path: string;
    sessions: number;
    users: number;
  }>;
  acquisition: Array<{
    source: string;
    medium: string;
    sessions: number;
    users: number;
  }>;
  programPages: Array<{
    path: string;
    views: number;
    users: number;
    avgEngagementSec: number;
  }>;
  nextPages: Array<{
    path: string;
    views: number;
  }>;
  events: Array<{
    name: string;
    count: number;
  }>;
  engagement: {
    avgEngagementSecPerView: number;
    engagementRate: number;
    scrolls: number;
    formStarts: number;
    formSubmits: number;
    clicks: number;
  };
};

export type AnalyticsDashboardData = {
  propertyId: string;
  program: ProgramSummary;
  dateRange: {
    start: string;
    end: string;
    comparisonStart: string;
    comparisonEnd: string;
  };
  kpis: {
    activeUsers: KpiMetric;
    sessions: KpiMetric;
    engagementRate: KpiMetric;
    bounceRate: KpiMetric;
    pageViews: KpiMetric;
    avgEngagementSecPerView?: KpiMetric;
  };
  daily: DailyRow[];
  channels: ChannelRow[];
  channelConfig: Record<string, { label: string; color: string }>;
  topPages: TopPageRow[];
  topReferrers: TopReferrerRow[];
  topCities: TopCityRow[];
  programInsights: ProgramInsights | null;
  visitorJourney: VisitorJourney | null;
  searchConsole: SearchConsoleData;
  fetchedAt: string;
};

export type ProgramOption = {
  id: string;
  name: string;
  description: string;
};
