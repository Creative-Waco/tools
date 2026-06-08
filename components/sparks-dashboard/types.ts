export type Tier = "bronze" | "silver" | "gold";

export type KpiDelta = {
  text: string;
  className: string;
};

export type Kpi = {
  id: string;
  label: string;
  value: string;
  delta: KpiDelta;
  footnote?: string | null;
  accent?: boolean;
  degraded?: boolean;
};

export type PipelineMonth = {
  label: string;
  count: number;
  target: number;
};

export type Goal = {
  label: string;
  target: number;
  unit: string;
  deadline?: string;
  current: number;
  honoraryCount?: number;
  note: string;
  pipelineByMonth?: PipelineMonth[];
};

export type TierMix = Record<Tier, number>;

export type MonthlyRow = {
  month: string;
  key: string;
  members?: number;
  membersPaid?: number;
  membersHonorary?: number;
  events?: number;
};

export type DashboardEvent = {
  title: string;
  date?: string | null;
  status: string;
  statusLabel?: string;
  asanaUrl?: string;
};

export type DashboardMember = {
  displayName?: string;
  profileUrl?: string;
  tier: Tier;
  type: string;
  memberSince?: string;
  honorarySince?: string;
  honoraryExpires?: string;
  isHonorary?: boolean;
};

export type SchemaIssue = {
  source: string;
  message: string;
};

export type DashboardWarning = {
  source: string;
  message: string;
};

export type SyncHealth = {
  ok: boolean;
  sources: {
    givebutter: { ok: boolean; schemaIssues: SchemaIssue[] };
    asana: { ok: boolean; schemaIssues: SchemaIssue[] };
  };
  schemaIssues: SchemaIssue[];
};

export type DashboardData = {
  updatedAt: string;
  cached?: boolean;
  syncHealth: SyncHealth;
  warnings: DashboardWarning[];
  kpis: Kpi[];
  goals: Goal[];
  tierMix: TierMix;
  tierMixPaid: TierMix;
  tierMixHonorary: TierMix;
  honoraryCount: number;
  paidCount: number;
  totalMemberCount: number;
  totalForTiers: number;
  monthly: MonthlyRow[];
  events: DashboardEvent[];
  members: DashboardMember[];
  undatedPipelineCount: number;
};

export type Period = "fy" | "quarter" | "month" | "year";
export type MembershipTypeFilter = "all" | "monthly" | "annual";
