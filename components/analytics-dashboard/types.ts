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
  previousSessions?: number;
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

export type UserDemographics = {
  coveragePercent: number;
  knownUsers: number;
  totalUsers: number;
  age: DemographicBreakdown;
  gender: DemographicBreakdown;
  interests: DemographicBreakdown;
  cities: TopCityRow[];
};

export type SearchQueryRow = {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type SearchQueryTrendPoint = {
  date: string;
  clicks: number;
  impressions: number;
  position: number;
};

export type SearchQueryInsightTag =
  | "opportunity"
  | "low_ctr"
  | "striking_distance"
  | "page_one"
  | "page_two"
  | "rising"
  | "new"
  | "accelerating"
  | "declining"
  | "impression_surge"
  | "cannibalized"
  | "question"
  | "local";

export type SearchQueryAction =
  | "snippet"
  | "content"
  | "redirect"
  | "merge"
  | "differentiate"
  | "refresh"
  | "faq"
  | "monitor"
  | "review";

export type SearchQueryCompetingPage = {
  path: string;
  clicks: number;
  impressions: number;
  position: number;
  impressionShare: number;
};

export type SearchQueryInsight = SearchQueryRow & {
  clicksChange: number | null;
  impressionsChange: number | null;
  positionChange: number | null;
  isNew: boolean;
  recentPositionGain: number | null;
  trend: SearchQueryTrendPoint[];
  tags: SearchQueryInsightTag[];
  opportunityScore: number;
  expectedCtr: number;
  expectedClicks: number;
  potentialClicksGain: number;
  action: SearchQueryAction;
  actionDetail: string;
  topPage: string | null;
  competingPages: SearchQueryCompetingPage[] | null;
  recommendedAction: "redirect" | "merge" | "differentiate" | null;
  previousClicks: number | null;
  previousImpressions: number | null;
  previousPosition: number | null;
};

export type SearchQueryInsightsSummary = {
  opportunities: SearchQueryInsight[];
  rising: SearchQueryInsight[];
  cannibalization: SearchQueryInsight[];
  declining: SearchQueryInsight[];
  all: SearchQueryInsight[];
};

export type TrafficInsightTag =
  | "opportunity"
  | "high_bounce"
  | "low_engagement"
  | "conversion_leak"
  | "rising_channel"
  | "rising_source"
  | "declining_channel"
  | "declining_source"
  | "retention_gap"
  | "mobile_gap";

export type TrafficInsightAction =
  | "landing_page"
  | "content"
  | "cta"
  | "form"
  | "campaign"
  | "mobile"
  | "navigation"
  | "monitor"
  | "review";

export type TrafficInsightKind =
  | "landing"
  | "page"
  | "channel"
  | "source"
  | "program";

export type TrafficInsight = {
  id: string;
  kind: TrafficInsightKind;
  label: string;
  path?: string;
  source?: string;
  medium?: string;
  channel?: string;
  sessions: number;
  previousSessions?: number | null;
  sessionsChange: number | null;
  bounceRate?: number;
  engagementRate?: number;
  metricValue?: number;
  formStarts?: number;
  formSubmits?: number;
  impactScore: number;
  tags: TrafficInsightTag[];
  action: TrafficInsightAction;
  actionDetail: string;
};

export type TrafficInsightsSummary = {
  opportunities: TrafficInsight[];
  conversion: TrafficInsight[];
  rising: TrafficInsight[];
  watchlist: TrafficInsight[];
  all: TrafficInsight[];
};

export type DerivedInsightCategory =
  | "quick_wins"
  | "cannibalization"
  | "conversion"
  | "rising"
  | "watchlist";

export type DerivedInsight = {
  id: string;
  kind?: string;
  tags: string[];
  category: DerivedInsightCategory;
  label: string;
  subject?: string;
  action: string;
  actionDetail: string;
  impactScore: number;
  query?: string;
  path?: string;
  gscNote?: string;
  coverageNote?: string;
  gsc?: Record<string, unknown>;
  ga4?: Record<string, unknown>;
  metrics?: Record<string, unknown>;
  [key: string]: unknown;
};

export type DerivedInsightsSummary = {
  quick_wins: DerivedInsight[];
  cannibalization: DerivedInsight[];
  conversion: DerivedInsight[];
  rising: DerivedInsight[];
  watchlist: DerivedInsight[];
  all: DerivedInsight[];
};

export type CombinedInsight = DerivedInsight & {
  gscNote: string;
  gsc?: Record<string, unknown>;
  ga4?: Record<string, unknown>;
};

export type AudienceInsight = DerivedInsight & {
  kind: "audience" | "demographic" | string;
  coverageNote?: string;
};

export type AnalyticsDashboardMeta = {
  apiCalls: {
    ga4: number;
    gsc: number;
  };
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
  previousPages?: SearchPageRow[];
  pairs: SearchQueryPageRow[];
  totals: {
    clicks: number;
    impressions: number;
    ctr: number;
  };
  insights: SearchQueryInsightsSummary;
  error?: string;
  note?: string;
  gscApiCalls?: number;
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
  trafficInsights: TrafficInsightsSummary;
  searchConsole: SearchConsoleData;
  crossInsights?: DerivedInsightsSummary;
  audienceInsights?: DerivedInsightsSummary;
  gscPageInsights?: DerivedInsightsSummary;
  programInsightsRules?: DerivedInsightsSummary;
  utmInsights?: DerivedInsightsSummary;
  _meta?: AnalyticsDashboardMeta;
  fetchedAt: string;
};

export type ProgramOption = {
  id: string;
  name: string;
  description: string;
};
