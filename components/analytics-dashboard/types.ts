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

export type DemographicRow = {
  label: string;
  fullLabel?: string;
  users: number;
  share: number;
};

export type DemographicBreakdown = {
  rows: DemographicRow[];
  knownUsers: number;
  totalUsers: number;
};

export type UserDemographics = {
  coveragePercent: number;
  knownUsers: number;
  totalUsers: number;
  age: DemographicBreakdown;
  gender: DemographicBreakdown;
  interests: DemographicBreakdown;
};

export type SearchQueryRow = {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type SearchPageRow = {
  page: string;
  path: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type SearchQueryPageRow = SearchQueryRow &
  Pick<SearchPageRow, "page" | "path">;

export type SearchConsoleData = {
  available: boolean;
  siteUrl: string | null;
  programId: string;
  queries: SearchQueryRow[];
  pages: SearchPageRow[];
  pairs: SearchQueryPageRow[];
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
  userDemographics: UserDemographics | null;
  programInsights: ProgramInsights | null;
  searchConsole: SearchConsoleData;
  fetchedAt: string;
};

export type ProgramOption = {
  id: string;
  name: string;
  description: string;
};
