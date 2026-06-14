"use client";

import { format } from "date-fns";
import { TrendingDown, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";

import {
  InsightDetailModal,
} from "./InsightDetailModal";
import {
  buildInsightRationaleContext,
  type InsightRationaleContext,
} from "./insight-rationale";
import { QueryTrendSparkline } from "./QueryTrendSparkline";
import type { AnalyticsDashboardData } from "./types";
import {
  buildUnifiedInsightsFromDashboard,
  CATEGORY_LABELS,
  filterUnifiedInsights,
  type UnifiedInsight,
  type UnifiedInsightCategory,
  type UnifiedInsightSourceFilter,
  type UnifiedInsightsFilters,
} from "./unified-insights";
import { formatChange, formatSessionComparison } from "./utils";

const INITIAL_ROW_LIMIT = 30;

type UnifiedInsightsViewProps = {
  data: AnalyticsDashboardData | null;
  loading: boolean;
  scopeLabel: string;
  filters: UnifiedInsightsFilters;
  onFiltersChange: (filters: UnifiedInsightsFilters) => void;
};

function SourceBadge({ source }: { source: UnifiedInsight["source"] }) {
  const label =
    source === "search"
      ? "GSC"
      : source === "combined"
        ? "GSC+GA4"
        : source === "traffic"
          ? "GA4"
          : source === "audience"
            ? "Audience"
            : source === "gsc_page"
              ? "GSC page"
              : source === "navigation"
                ? "Nav"
                : source === "utm"
                  ? "UTM"
                  : "GA4";

  const variant =
    source === "search" || source === "gsc_page"
      ? "secondary"
      : source === "combined"
        ? "default"
        : "outline";

  return (
    <Badge variant={variant} className="shrink-0 text-[10px]">
      {label}
    </Badge>
  );
}

function ChangeCell({ row }: { row: UnifiedInsight }) {
  const change = row.change;

  if (change === null) {
    return <span className="text-muted-foreground">—</span>;
  }

  let absoluteLabel: string | null = null;
  if (row.traffic?.previousSessions != null) {
    absoluteLabel = formatSessionComparison(
      row.traffic.sessions,
      row.traffic.previousSessions,
      change,
    );
  } else if (row.search?.previousClicks != null) {
    const clicksLabel = formatSessionComparison(
      row.search.clicks,
      row.search.previousClicks,
      change,
    );
    absoluteLabel = clicksLabel ? clicksLabel.replace(/sessions/g, "clicks") : null;
  }

  const positive = change >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  const showAbsolute = Boolean(
    absoluteLabel &&
      absoluteLabel !== formatChange(change) &&
      absoluteLabel.includes("→"),
  );

  return (
    <span
      className={cn(
        "inline-flex max-w-[9rem] flex-col items-end gap-0.5 text-sm font-medium tabular-nums",
        positive ? "text-green-700" : "text-red-700",
      )}
    >
      <span className="inline-flex items-center gap-1">
        <Icon className="size-3.5 shrink-0" />
        {formatChange(change)}
      </span>
      {showAbsolute && absoluteLabel ? (
        <span className="text-[10px] font-normal leading-tight text-muted-foreground">
          {absoluteLabel.replace(/\s*\([^)]+\)$/, "")}
        </span>
      ) : null}
    </span>
  );
}

function InsightMeta({ row }: { row: UnifiedInsight }) {
  const parts = [CATEGORY_LABELS[row.category], row.secondaryMetric].filter(
    Boolean,
  );

  if (parts.length === 0) return null;

  return (
    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
      {parts.join(" · ")}
    </p>
  );
}

function UnifiedInsightRow({
  row,
  onSelect,
}: {
  row: UnifiedInsight;
  onSelect: (row: UnifiedInsight) => void;
}) {
  const searchTrend = row.search?.trend ?? [];

  return (
    <tr
      className="cursor-pointer border-b align-top transition-colors last:border-0 hover:bg-muted/40"
      onClick={() => onSelect(row)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(row);
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`View data for insight: ${row.subject ?? row.label}`}
    >
      <td className="py-2.5 pr-3 pl-3">
        <div className="flex items-start gap-2">
          <SourceBadge source={row.source} />
          <div className="min-w-0">
            <Tooltip>
              <TooltipTrigger
                render={
                  <p className="line-clamp-2 text-sm font-medium leading-snug">
                    {row.label}
                  </p>
                }
              />
              <TooltipContent side="top" align="start" className="max-w-sm text-xs">
                Click for source data
              </TooltipContent>
            </Tooltip>
            {row.subject ? (
              <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                {row.subject}
              </p>
            ) : null}
            <InsightMeta row={row} />
          </div>
        </div>
      </td>
      <td className="py-2.5 pr-3 text-right">
        <Tooltip>
          <TooltipTrigger
            render={
              <span className="cursor-help text-sm font-semibold tabular-nums">
                {row.impactScore}
              </span>
            }
          />
          <TooltipContent side="top" className="max-w-xs text-xs">
            Priority 0–100 · {row.impactLabel}
          </TooltipContent>
        </Tooltip>
      </td>
      <td className="py-2.5 pr-3 text-right">
        {row.search && searchTrend.length >= 2 ? (
          <QueryTrendSparkline trend={searchTrend} width={64} height={22} />
        ) : (
          <ChangeCell row={row} />
        )}
      </td>
    </tr>
  );
}

function FilterBar({
  filters,
  onFiltersChange,
  totalCount,
  filteredCount,
}: {
  filters: UnifiedInsightsFilters;
  onFiltersChange: (filters: UnifiedInsightsFilters) => void;
  totalCount: number;
  filteredCount: number;
}) {
  const sources: { id: UnifiedInsightSourceFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "combined", label: "Combined" },
    { id: "search", label: "Search" },
    { id: "traffic", label: "Traffic" },
    { id: "audience", label: "Audience" },
    { id: "gsc_page", label: "GSC pages" },
    { id: "navigation", label: "Navigation" },
    { id: "utm", label: "UTM" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-full border p-0.5">
        {sources.map((item) => (
          <button
            key={item.id}
            type="button"
            className={cn(
              "h-8 rounded-full px-3 text-sm font-medium transition-colors",
              filters.source === item.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => onFiltersChange({ ...filters, source: item.id })}
          >
            {item.label}
          </button>
        ))}
      </div>

      <Select
        value={filters.category}
        onValueChange={(value) =>
          onFiltersChange({
            ...filters,
            category: (value ?? "all") as UnifiedInsightCategory | "all",
          })
        }
      >
        <SelectTrigger className="h-8 w-[11rem]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <SelectItem key={key} value={key}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <label className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-full border px-3 text-sm">
        <input
          type="checkbox"
          className="size-3.5 rounded border-input"
          checked={filters.minImpact >= 25}
          onChange={(event) =>
            onFiltersChange({
              ...filters,
              minImpact: event.target.checked ? 25 : 0,
            })
          }
        />
        High priority only
      </label>

      <span className="text-xs text-muted-foreground">
        {filteredCount} of {totalCount}
      </span>
    </div>
  );
}

export function UnifiedInsightsView({
  data,
  loading,
  scopeLabel,
  filters,
  onFiltersChange,
}: UnifiedInsightsViewProps) {
  const [showAll, setShowAll] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<UnifiedInsight | null>(
    null,
  );

  const allInsights = useMemo(
    () => buildUnifiedInsightsFromDashboard(data),
    [data],
  );

  const filtered = useMemo(
    () => filterUnifiedInsights(allInsights, filters),
    [allInsights, filters],
  );

  const visibleRows = showAll
    ? filtered
    : filtered.slice(0, INITIAL_ROW_LIMIT);

  const rationaleContext = useMemo(
    () => buildInsightRationaleContext(data),
    [data],
  );

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Loading insights…
      </p>
    );
  }

  if (!data) {
    return (
      <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        Could not load insights for this range. Try Refresh.
      </p>
    );
  }

  const gscUnavailable = !data.searchConsole?.available;

  return (
    <div className="space-y-4">
      {gscUnavailable ? (
        <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
          Search Console is not connected — showing GA4 traffic insights only.
        </p>
      ) : null}

      <FilterBar
        filters={filters}
        onFiltersChange={(next) => {
          setShowAll(false);
          onFiltersChange(next);
        }}
        totalCount={allInsights.length}
        filteredCount={filtered.length}
      />

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          No insights match these filters for {scopeLabel}. Try a wider date
          range or turn off High priority only.
        </p>
      ) : (
        <div className="max-w-full overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[28rem] text-sm">
            <thead>
              <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                <th className="pb-2 pr-3 pl-3 pt-2">Insight</th>
                <th className="w-16 pb-2 pr-3 pt-2 text-right">Impact</th>
                <th className="w-20 pb-2 pr-3 pt-2 text-right">Change</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <UnifiedInsightRow
                  key={row.id}
                  row={row}
                  onSelect={setSelectedInsight}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <InsightDetailModal
        row={selectedInsight}
        context={rationaleContext}
        open={selectedInsight !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedInsight(null);
        }}
      />

      {!showAll && filtered.length > INITIAL_ROW_LIMIT ? (
        <button
          type="button"
          className="text-sm font-medium text-primary hover:underline"
          onClick={() => setShowAll(true)}
        >
          Show all {filtered.length} insights
        </button>
      ) : null}

      {data.fetchedAt && data.dateRange ? (
        <p className="text-xs text-muted-foreground">
          vs{" "}
          {format(new Date(`${data.dateRange.comparisonStart}T12:00:00`), "MMM d")}{" "}
          –{" "}
          {format(new Date(`${data.dateRange.comparisonEnd}T12:00:00`), "MMM d")}{" "}
          · {format(new Date(data.fetchedAt), "MMM d, h:mm a")}
        </p>
      ) : null}
    </div>
  );
}
