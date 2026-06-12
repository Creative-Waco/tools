"use client";

import { format } from "date-fns";
import {
  Activity,
  CalendarIcon,
  Globe,
  MousePointerClick,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DateRange } from "react-day-picker";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

import { StatusLine } from "@/components/StatusLine";
import { DataSourceTitle } from "./DataSourceLogos";
import { ProgramInsights } from "./ProgramInsights";
import { VisitorJourneys } from "./VisitorJourneys";
import { PROGRAM_SEASON_SLUG } from "./program-seasons";
import { PROGRAM_OPTIONS } from "./programs";
import { SearchQueriesPanel } from "./SearchQueriesPanel";
import type {
  AnalyticsDashboardData,
  ChannelRow,
  DailyRow,
  TopCityRow,
} from "./types";
import { buildDashboardCacheKey, readCachedDashboard } from "./cache";
import {
  buildDashboardPath,
  DEFAULT_PRESET,
  getDatePresetsForProgram,
  presetLabelForRange,
  readDashboardUrlState,
} from "./url-state";
import { fetchAnalyticsDashboard, formatChange } from "./utils";

const sessionsConfig = {
  sessions: { label: "Sessions", color: "var(--chart-1)" },
} satisfies ChartConfig;

const pageViewsConfig = {
  pageViews: { label: "Page views", color: "var(--chart-1)" },
} satisfies ChartConfig;

const TREND_CHART_HEIGHT =
  "!aspect-auto h-52 min-h-52 max-h-52 w-full overflow-hidden";

function trendChartYDomain([, dataMax]: readonly [number, number]): [number, number] {
  const max = Math.max(0, Number.isFinite(dataMax) ? dataMax : 0);
  if (max === 0) return [0, 10];

  const padded = max * 1.12;
  const step =
    padded <= 20
      ? 5
      : padded <= 50
        ? 10
        : padded <= 200
          ? 25
          : padded <= 500
            ? 50
            : 100;

  return [0, Math.ceil(padded / step) * step];
}

function ChangeBadge({
  change,
  invert = false,
}: {
  change: number;
  invert?: boolean;
}) {
  const positive = invert ? change < 0 : change >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;

  return (
    <Badge
      variant="secondary"
      className={cn(
        positive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700",
      )}
    >
      <Icon className="mr-1 size-3" />
      {formatChange(change)}
    </Badge>
  );
}

function KpiSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <div className="mt-3 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

function ChannelBreakdownContent({ channel }: { channel: ChannelRow }) {
  const sources = channel.sources ?? [];

  return (
    <div className="grid min-w-48 max-w-xs gap-2 text-xs">
      <div className="font-medium">{channel.name}</div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-muted-foreground">Sessions</span>
        <span className="font-mono font-medium tabular-nums">
          {channel.sessions.toLocaleString()}
        </span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-muted-foreground">Share</span>
        <span className="font-mono font-medium tabular-nums">
          {channel.value}%
        </span>
      </div>
      {sources.length > 0 ? (
        <div className="space-y-1 border-t border-border/50 pt-2">
          <p className="text-muted-foreground">Top sources</p>
          <ul className="space-y-1">
            {sources.map((source) => (
              <li
                key={source.source}
                className="flex items-start justify-between gap-3"
              >
                <span className="min-w-0 truncate font-medium">
                  {source.source}
                </span>
                <span className="shrink-0 font-mono tabular-nums text-muted-foreground">
                  {source.sessions.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function ChannelChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: ChannelRow }>;
}) {
  if (!active || !payload?.length) return null;

  const channel = payload[0]?.payload;
  if (!channel) return null;

  return (
    <div className="rounded-lg border border-border/50 bg-background px-2.5 py-2 shadow-xl">
      <ChannelBreakdownContent channel={channel} />
    </div>
  );
}

function formatCityLocation(city: TopCityRow) {
  const parts: string[] = [];
  if (city.region) parts.push(city.region);
  if (city.country && city.country !== city.city) parts.push(city.country);
  return parts.join(", ");
}

function CityBreakdownContent({ city }: { city: TopCityRow }) {
  const location = formatCityLocation(city);
  const sources = city.sources ?? [];
  const landingPages = city.landingPages ?? [];
  const totalUsers = city.newUsers + city.returningUsers;

  return (
    <div className="grid min-w-52 max-w-xs gap-2 text-xs">
      <div>
        <div className="font-medium">{city.city}</div>
        {location ? (
          <div className="text-muted-foreground">{location}</div>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-muted-foreground">Users</span>
        <span className="font-mono font-medium tabular-nums">
          {city.users.toLocaleString()}
        </span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-muted-foreground">Sessions</span>
        <span className="font-mono font-medium tabular-nums">
          {city.sessions.toLocaleString()}
        </span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-muted-foreground">Share</span>
        <span className="font-mono font-medium tabular-nums">{city.share}%</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-muted-foreground">Engagement</span>
        <span className="font-mono font-medium tabular-nums">
          {city.engagementRate}%
        </span>
      </div>
      {totalUsers > 0 ? (
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">New vs returning</span>
          <span className="font-mono font-medium tabular-nums">
            {Math.round((city.newUsers / totalUsers) * 100)}% new
          </span>
        </div>
      ) : null}
      {sources.length > 0 ? (
        <div className="space-y-1 border-t border-border/50 pt-2">
          <p className="text-muted-foreground">Top sources</p>
          <ul className="space-y-1">
            {sources.map((source) => (
              <li
                key={source.source}
                className="flex items-start justify-between gap-3"
              >
                <span className="min-w-0 truncate font-medium">
                  {source.source}
                </span>
                <span className="shrink-0 font-mono tabular-nums text-muted-foreground">
                  {source.sessions.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {landingPages.length > 0 ? (
        <div className="space-y-1 border-t border-border/50 pt-2">
          <p className="text-muted-foreground">Top landing pages</p>
          <ul className="space-y-1">
            {landingPages.map((page) => (
              <li
                key={page.path}
                className="flex items-start justify-between gap-3"
              >
                <span className="min-w-0 truncate font-medium">{page.path}</span>
                <span className="shrink-0 font-mono tabular-nums text-muted-foreground">
                  {page.sessions.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function trendTooltipMetricValue(
  payload: Array<{
    payload?: DailyRow;
    value?: number | string;
    dataKey?: string | number;
  }>,
  metricKey: "sessions" | "pageViews",
) {
  const item = payload[0];
  if (!item) return 0;

  const rawValue = item.value;
  if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
    return rawValue;
  }
  if (typeof rawValue === "string" && rawValue.trim() !== "") {
    const parsed = Number(rawValue);
    if (Number.isFinite(parsed)) return parsed;
  }

  const row = item.payload;
  if (!row) return 0;

  const fromRow = row[metricKey];
  if (typeof fromRow === "number" && Number.isFinite(fromRow)) {
    return fromRow;
  }

  return row.sessions ?? 0;
}

function TrendChartTooltip({
  active,
  payload,
  metricLabel,
  metricKey,
}: {
  active?: boolean;
  payload?: Array<{
    payload?: DailyRow;
    value?: number | string;
    dataKey?: string | number;
  }>;
  metricLabel: string;
  metricKey: "sessions" | "pageViews";
}) {
  if (!active || !payload?.length) return null;

  const row = payload[0]?.payload;
  if (!row) return null;

  const total = trendTooltipMetricValue(payload, metricKey);
  const pages = (row.pages ?? [])
    .filter((page) => !page.path.startsWith("/.wf_"))
    .slice(0, 5);

  return (
    <div className="grid w-72 max-w-[min(18rem,calc(100vw-2rem))] gap-2 overflow-hidden rounded-lg border border-border/50 bg-background px-2.5 py-2 text-xs shadow-xl">
      <div className="font-medium">
        {format(new Date(row.date), "EEEE, MMM d, yyyy")}
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="shrink-0 text-muted-foreground">{metricLabel}</span>
        <span className="shrink-0 font-mono font-medium tabular-nums">
          {total.toLocaleString()}
        </span>
      </div>
      {pages.length > 0 ? (
        <div className="space-y-1 border-t border-border/50 pt-2">
          <p className="text-muted-foreground">Top pages that day</p>
          <ul className="max-h-36 space-y-1 overflow-y-auto pr-1">
            {pages.map((page) => (
              <li
                key={page.path}
                className="flex min-w-0 items-start justify-between gap-3"
              >
                <span className="min-w-0 flex-1 truncate font-medium">
                  {page.path}
                </span>
                <span className="shrink-0 font-mono tabular-nums text-muted-foreground">
                  {page.views.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function AnalyticsDashboard() {
  const skipUrlSync = useRef(true);
  const [urlReady, setUrlReady] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedPreset, setSelectedPreset] = useState("Last 30 days");
  const [programId, setProgramId] = useState("all");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsDashboardData | null>(null);
  const [statusMessage, setStatusMessage] = useState("");

  const isProgramScope = programId !== "all";
  const selectedProgram = PROGRAM_OPTIONS.find((p) => p.id === programId);
  const datePresets = useMemo(
    () => getDatePresetsForProgram(programId),
    [programId],
  );

  useEffect(() => {
    const state = readDashboardUrlState();
    setProgramId(state.programId);
    setDateRange(state.dateRange);
    setSelectedPreset(state.presetLabel);
    setUrlReady(true);
    window.setTimeout(() => {
      skipUrlSync.current = false;
    }, 0);
  }, []);

  useEffect(() => {
    if (skipUrlSync.current || !urlReady) return;

    const nextPath = buildDashboardPath(programId, dateRange, selectedPreset);
    const currentPath = `${window.location.pathname}${window.location.search}`;

    if (currentPath !== nextPath) {
      window.history.replaceState(null, "", nextPath);
    }
  }, [dateRange, programId, selectedPreset, urlReady]);

  useEffect(() => {
    const onPopState = () => {
      skipUrlSync.current = true;
      const state = readDashboardUrlState();
      setProgramId(state.programId);
      setDateRange(state.dateRange);
      setSelectedPreset(state.presetLabel);
      window.setTimeout(() => {
        skipUrlSync.current = false;
      }, 0);
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const loadDashboard = useCallback(
    async (force = false) => {
      if (!dateRange?.from || !dateRange?.to) return;

      const cacheKey = buildDashboardCacheKey(programId, dateRange);
      const cached = !force ? readCachedDashboard(cacheKey) : null;

      if (cached) {
        setData(cached);
        setLoading(false);
        setStatusMessage("");
        return;
      }

      setLoading(true);
      setStatusMessage("");

      try {
        const result = await fetchAnalyticsDashboard(dateRange, programId, {
          force,
        });
        setData(result);
      } catch (error) {
        setData(null);
        setStatusMessage(
          error instanceof Error ? error.message : "Could not load analytics.",
        );
      } finally {
        setLoading(false);
      }
    },
    [dateRange, programId],
  );

  useEffect(() => {
    if (!urlReady) return;
    loadDashboard(false);
  }, [urlReady, loadDashboard]);

  const channelConfig = useMemo(() => {
    if (!data?.channelConfig) return {};
    return data.channelConfig satisfies ChartConfig;
  }, [data?.channelConfig]);

  const handlePresetChange = (value: string | null) => {
    if (!value) return;
    const preset = datePresets.find((item) => item.label === value);
    if (preset) {
      setDateRange(preset.getValue());
      setSelectedPreset(value);
    }
  };

  const handleProgramChange = (value: string | null) => {
    if (!value) return;
    const nextProgramId = value;
    const nextPresets = getDatePresetsForProgram(nextProgramId);
    const seasonPreset = nextPresets.find(
      (preset) => preset.slug === PROGRAM_SEASON_SLUG,
    );

    setProgramId(nextProgramId);

    if (
      seasonPreset &&
      selectedPreset === seasonPreset.label &&
      nextProgramId !== programId
    ) {
      setDateRange(seasonPreset.getValue());
      setSelectedPreset(seasonPreset.label);
      return;
    }

    if (
      selectedPreset !== "Custom" &&
      !nextPresets.some((preset) => preset.label === selectedPreset)
    ) {
      setDateRange(DEFAULT_PRESET.getValue());
      setSelectedPreset(DEFAULT_PRESET.label);
    }
  };

  const kpis = data?.kpis;
  const daily = data?.daily ?? [];
  const channels = data?.channels ?? [];
  const topPages = data?.topPages ?? [];
  const topReferrers = data?.topReferrers ?? [];
  const topCities = data?.topCities ?? [];

  const trendData = isProgramScope
    ? daily.map((row) => ({
        ...row,
        sessions: row.pageViews ?? row.sessions,
      }))
    : daily;

  const trendConfig = isProgramScope ? pageViewsConfig : sessionsConfig;
  const trendLabel = isProgramScope ? "Page views trend" : "Sessions trend";
  const trendKey = isProgramScope ? "pageViews" : "sessions";

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={programId}
            onValueChange={handleProgramChange}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROGRAM_OPTIONS.map((program) => (
                <SelectItem key={program.id} value={program.id}>
                  {program.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedPreset} onValueChange={handlePresetChange}>
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {datePresets.map((preset) => (
                <SelectItem key={preset.label} value={preset.label}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger render={<Button variant="outline" />}>
              <CalendarIcon className="mr-2 size-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "MMM d")} -{" "}
                    {format(dateRange.to, "MMM d")}
                  </>
                ) : (
                  format(dateRange.from, "MMM d, yyyy")
                )
              ) : (
                "Pick dates"
              )}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                numberOfMonths={2}
                selected={dateRange}
                onSelect={(range) => {
                  setDateRange(range);
                  setSelectedPreset(presetLabelForRange(range, programId));
                }}
              />
            </PopoverContent>
          </Popover>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadDashboard(true)}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {isProgramScope && selectedProgram ? (
        <p className="text-sm text-muted-foreground">
          {selectedProgram.description}
        </p>
      ) : null}

      {statusMessage ? <StatusLine message={statusMessage} /> : null}

      {loading ? (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Loading GA4 data… first load can take several seconds.
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <>
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
          </>
        ) : (
          <>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Users className="size-5 text-primary" />
                  </div>
                  {kpis ? <ChangeBadge change={kpis.activeUsers.change} /> : null}
                </div>
                <div className="mt-3">
                  <p className="text-sm text-muted-foreground">
                    {isProgramScope ? "Program visitors" : "Active users"}
                  </p>
                  <p className="text-2xl font-bold">
                    {kpis?.activeUsers.value.toLocaleString() ?? "—"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="rounded-lg bg-blue-100 p-2">
                    <Activity className="size-5 text-blue-600" />
                  </div>
                  {kpis ? <ChangeBadge change={kpis.sessions.change} /> : null}
                </div>
                <div className="mt-3">
                  <p className="text-sm text-muted-foreground">
                    {isProgramScope ? "Sessions with program pages" : "Sessions"}
                  </p>
                  <p className="text-2xl font-bold">
                    {kpis?.sessions.value.toLocaleString() ?? "—"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="rounded-lg bg-green-100 p-2">
                    <MousePointerClick className="size-5 text-green-600" />
                  </div>
                  {kpis ? (
                    <ChangeBadge change={kpis.engagementRate.change} />
                  ) : null}
                </div>
                <div className="mt-3">
                  <p className="text-sm text-muted-foreground">
                    Engagement rate
                  </p>
                  <p className="text-2xl font-bold">
                    {kpis ? `${kpis.engagementRate.value}%` : "—"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="rounded-lg bg-orange-100 p-2">
                    <Globe className="size-5 text-orange-600" />
                  </div>
                  {kpis ? (
                    <ChangeBadge change={kpis.bounceRate.change} invert />
                  ) : null}
                </div>
                <div className="mt-3">
                  <p className="text-sm text-muted-foreground">Bounce rate</p>
                  <p className="text-2xl font-bold">
                    {kpis ? `${kpis.bounceRate.value}%` : "—"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              <DataSourceTitle source="ga4">{trendLabel}</DataSourceTitle>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-52 w-full" />
            ) : (
              <ChartContainer config={trendConfig} className={TREND_CHART_HEIGHT}>
                <AreaChart
                  data={trendData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="sessionsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor={
                          isProgramScope
                            ? "var(--color-pageViews)"
                            : "var(--color-sessions)"
                        }
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="100%"
                        stopColor={
                          isProgramScope
                            ? "var(--color-pageViews)"
                            : "var(--color-sessions)"
                        }
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="dateStr"
                    axisLine={false}
                    tickLine={false}
                    tickMargin={8}
                    fontSize={11}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tickMargin={8}
                    fontSize={11}
                    domain={trendChartYDomain}
                    allowDecimals={false}
                  />
                  <ChartTooltip
                    allowEscapeViewBox={{ x: true, y: true }}
                    wrapperClassName="z-50 !pointer-events-none"
                    content={
                      <TrendChartTooltip
                        metricKey={trendKey}
                        metricLabel={
                          isProgramScope ? "Page views" : "Sessions"
                        }
                      />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey={trendKey}
                    stroke={
                      isProgramScope
                        ? "var(--color-pageViews)"
                        : "var(--color-sessions)"
                    }
                    strokeWidth={2}
                    fill="url(#sessionsGrad)"
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              <DataSourceTitle source="ga4">
                {isProgramScope ? "Top visitor cities" : "Top cities"}
              </DataSourceTitle>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-5 w-full" />
                ))}
              </div>
            ) : topCities.length > 0 ? (
              <div className="space-y-3">
                {topCities.map((city, index) => {
                  const location = formatCityLocation(city);

                  return (
                    <Tooltip key={`${city.city}-${index}`}>
                      <TooltipTrigger
                        render={
                          <div className="flex cursor-default items-center justify-between rounded-md px-1 py-0.5 transition-colors hover:bg-muted/60" />
                        }
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="w-5 shrink-0 text-center text-sm text-muted-foreground">
                            {index + 1}
                          </span>
                          <div className="min-w-0">
                            <span className="block truncate text-sm font-medium">
                              {city.city}
                            </span>
                            {location ? (
                              <span className="block truncate text-xs text-muted-foreground">
                                {location}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <Badge variant="secondary" className="shrink-0">
                          {city.users.toLocaleString()} users ·{" "}
                          {city.sessions.toLocaleString()} sessions
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent
                        side="left"
                        align="start"
                        className="border border-border/50 bg-background px-2.5 py-2 text-foreground shadow-xl"
                      >
                        <CityBreakdownContent city={city} />
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No city data in this range.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              <DataSourceTitle source="ga4">Traffic channels</DataSourceTitle>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <div className="flex items-center gap-6">
                {channels.length > 0 ? (
                  <ChartContainer
                    config={channelConfig}
                    className="relative size-32 shrink-0"
                  >
                    <PieChart>
                      <ChartTooltip
                        content={<ChannelChartTooltip />}
                        cursor={false}
                      />
                      <Pie
                        data={channels}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={55}
                        paddingAngle={2}
                        dataKey="sessions"
                        nameKey="name"
                        strokeWidth={0}
                      />
                    </PieChart>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold">
                        {kpis?.sessions.value.toLocaleString() ?? "0"}
                      </span>
                    </div>
                  </ChartContainer>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No channel data in this range.
                  </p>
                )}
                <div className="flex-1 space-y-2">
                  {channels.map((item) => (
                    <Tooltip key={item.name}>
                      <TooltipTrigger
                        render={
                          <div className="flex cursor-default items-center justify-between rounded-md px-1 py-0.5 text-sm transition-colors hover:bg-muted/60" />
                        }
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="size-2 rounded-full"
                            style={{ backgroundColor: item.fill }}
                          />
                          <span className="text-muted-foreground">
                            {item.name}
                          </span>
                        </div>
                        <span className="font-medium">{item.value}%</span>
                      </TooltipTrigger>
                      <TooltipContent
                        side="left"
                        align="start"
                        className="border border-border/50 bg-background px-2.5 py-2 text-foreground shadow-xl"
                      >
                        <ChannelBreakdownContent channel={item} />
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              <DataSourceTitle source="ga4">
                {isProgramScope ? "Top program pages" : "Top pages"}
              </DataSourceTitle>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-5 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {topPages.map((page, index) => (
                  <div
                    key={`${page.path}-${index}`}
                    className="flex items-center justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="w-5 shrink-0 text-center text-sm text-muted-foreground">
                        {index + 1}
                      </span>
                      <span className="truncate text-sm font-medium">
                        {page.path}
                      </span>
                    </div>
                    <span className="shrink-0 text-sm text-muted-foreground">
                      {page.views.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              <DataSourceTitle source="ga4">
                {isProgramScope ? "Top traffic sources" : "Top referrers"}
              </DataSourceTitle>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-5 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {topReferrers.map((referrer, index) => (
                  <div
                    key={`${referrer.source}-${index}`}
                    className="flex items-center justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="w-5 shrink-0 text-center text-sm text-muted-foreground">
                        {index + 1}
                      </span>
                      <span className="truncate text-sm font-medium">
                        {referrer.source}
                      </span>
                    </div>
                    <Badge variant="secondary">
                      {referrer.sessions.toLocaleString()} sessions
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <VisitorJourneys
        journey={data?.visitorJourney ?? null}
        loading={loading}
        programName={data?.program.name ?? selectedProgram?.name ?? "Site"}
        isProgramScope={isProgramScope}
      />

      <SearchQueriesPanel
        data={data?.searchConsole ?? null}
        loading={loading}
        programName={data?.program.name ?? selectedProgram?.name ?? "Site"}
        isProgramScope={isProgramScope}
      />

      {isProgramScope ? (
        <ProgramInsights
          insights={data?.programInsights ?? null}
          loading={loading}
          programName={data?.program.name ?? selectedProgram?.name ?? "Program"}
        />
      ) : null}

      {data?.fetchedAt && !loading ? (
        <p className="text-xs text-muted-foreground">
          GA4 property {data.propertyId} · compared to{" "}
          {format(new Date(`${data.dateRange.comparisonStart}T12:00:00`), "MMM d")}{" "}
          –{" "}
          {format(new Date(`${data.dateRange.comparisonEnd}T12:00:00`), "MMM d")}{" "}
          · updated {format(new Date(data.fetchedAt), "MMM d, h:mm a")}
        </p>
      ) : null}
    </div>
  );
}
