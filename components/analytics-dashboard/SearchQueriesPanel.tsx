"use client";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  FileText,
  Lightbulb,
  Search,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";

import { DataSourceTitle } from "./DataSourceLogos";
import type {
  SearchConsoleData,
  SearchPageRow,
  SearchQueryPageRow,
  SearchQueryRow,
} from "./types";

type SearchQueriesPanelProps = {
  data: SearchConsoleData | null;
  loading?: boolean;
  programName: string;
  isProgramScope: boolean;
  insightsHref?: string;
};

type ViewMode = "queries" | "pages";
type SortColumn = "label" | "clicks" | "impressions" | "ctr" | "position";
type SortDirection = "asc" | "desc";

type MetricRow = {
  label: string;
  sublabel?: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  filterQuery?: string;
  filterPath?: string;
};

function sumTotals(rows: Pick<MetricRow, "clicks" | "impressions">[]) {
  const clicks = rows.reduce((sum, row) => sum + row.clicks, 0);
  const impressions = rows.reduce((sum, row) => sum + row.impressions, 0);
  return {
    clicks,
    impressions,
    ctr:
      impressions > 0 ? Math.round((clicks / impressions) * 1000) / 10 : 0,
  };
}

function aggregatePairsByQuery(pairs: SearchQueryPageRow[]) {
  const map = new Map<string, SearchQueryRow>();

  for (const row of pairs) {
    const existing = map.get(row.query) ?? {
      query: row.query,
      clicks: 0,
      impressions: 0,
      ctr: 0,
      position: 0,
    };
    existing.clicks += row.clicks;
    existing.impressions += row.impressions;
    map.set(row.query, existing);
  }

  return Array.from(map.values()).map((row) => {
    const impressions = row.impressions;
    const positionWeight = pairs
      .filter((pair) => pair.query === row.query)
      .reduce((sum, pair) => sum + pair.position * pair.impressions, 0);

    return {
      ...row,
      ctr:
        impressions > 0
          ? Math.round((row.clicks / impressions) * 1000) / 10
          : 0,
      position:
        impressions > 0
          ? Math.round((positionWeight / impressions) * 10) / 10
          : 0,
    };
  });
}

function aggregatePairsByPage(pairs: SearchQueryPageRow[]) {
  const map = new Map<string, SearchPageRow>();

  for (const row of pairs) {
    const existing = map.get(row.path) ?? {
      page: row.page,
      path: row.path,
      clicks: 0,
      impressions: 0,
      ctr: 0,
      position: 0,
    };
    existing.clicks += row.clicks;
    existing.impressions += row.impressions;
    map.set(row.path, existing);
  }

  return Array.from(map.values()).map((row) => {
    const impressions = row.impressions;
    const positionWeight = pairs
      .filter((pair) => pair.path === row.path)
      .reduce((sum, pair) => sum + pair.position * pair.impressions, 0);

    return {
      ...row,
      ctr:
        impressions > 0
          ? Math.round((row.clicks / impressions) * 1000) / 10
          : 0,
      position:
        impressions > 0
          ? Math.round((positionWeight / impressions) * 10) / 10
          : 0,
    };
  });
}

function toQueryRows(rows: SearchQueryRow[]): MetricRow[] {
  return rows.map((row) => ({
    label: row.query,
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr,
    position: row.position,
    filterQuery: row.query,
  }));
}

function toPageRows(rows: SearchPageRow[]): MetricRow[] {
  return rows.map((row) => ({
    label: row.path,
    sublabel: row.page,
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr,
    position: row.position,
    filterPath: row.path,
  }));
}

function sortRows(
  rows: MetricRow[],
  column: SortColumn,
  direction: SortDirection,
) {
  const sorted = [...rows].sort((left, right) => {
    if (column === "label") {
      return left.label.localeCompare(right.label);
    }
    return left[column] - right[column];
  });

  return direction === "asc" ? sorted : sorted.reverse();
}

function SortIcon({
  column,
  activeColumn,
  direction,
}: {
  column: SortColumn;
  activeColumn: SortColumn;
  direction: SortDirection;
}) {
  if (column !== activeColumn) {
    return <ArrowUpDown className="size-3.5 opacity-40" />;
  }

  return direction === "asc" ? (
    <ArrowUp className="size-3.5" />
  ) : (
    <ArrowDown className="size-3.5" />
  );
}

function SortableHeader({
  label,
  column,
  align = "left",
  activeColumn,
  direction,
  onSort,
}: {
  label: string;
  column: SortColumn;
  align?: "left" | "right";
  activeColumn: SortColumn;
  direction: SortDirection;
  onSort: (column: SortColumn) => void;
}) {
  return (
    <th className={cn("pb-2 font-medium", align === "right" ? "text-right" : "text-left")}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn(
          "inline-flex items-center gap-1 transition-colors hover:text-foreground",
          align === "right" && "ml-auto",
          column === activeColumn && "text-foreground",
        )}
      >
        {label}
        <SortIcon
          column={column}
          activeColumn={activeColumn}
          direction={direction}
        />
      </button>
    </th>
  );
}

export function SearchQueriesPanel({
  data,
  loading,
  programName,
  isProgramScope,
  insightsHref,
}: SearchQueriesPanelProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("queries");
  const [sortColumn, setSortColumn] = useState<SortColumn>("clicks");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [filterQuery, setFilterQuery] = useState<string | null>(null);
  const [filterPath, setFilterPath] = useState<string | null>(null);

  const scopeLabel = isProgramScope
    ? `${programName} pages`
    : "all creativewaco.org pages";

  const pairs = data?.pairs ?? [];
  const pages = data?.pages ?? [];
  const queries = data?.queries ?? [];
  const hasKeywordData = queries.length > 0 || pairs.length > 0;
  const hasPageData = pages.length > 0 || pairs.length > 0;

  const displayRows = useMemo(() => {
    if (!data?.available) return [];

    let rows: MetricRow[] = [];

    if (viewMode === "queries") {
      if (filterPath) {
        const filtered = pairs.filter((pair) => pair.path === filterPath);
        rows = toQueryRows(
          filterQuery
            ? filtered.filter((pair) => pair.query === filterQuery)
            : aggregatePairsByQuery(filtered),
        );
      } else if (filterQuery) {
        rows = toQueryRows(
          aggregatePairsByQuery(
            pairs.filter((pair) => pair.query === filterQuery),
          ),
        );
      } else {
        rows = toQueryRows(queries);
      }
    } else if (filterQuery) {
      const filtered = pairs.filter((pair) => pair.query === filterQuery);
      rows = toPageRows(
        filterPath
          ? filtered.filter((pair) => pair.path === filterPath)
          : aggregatePairsByPage(filtered),
      );
    } else if (filterPath) {
      rows = toPageRows(
        aggregatePairsByPage(pairs.filter((pair) => pair.path === filterPath)),
      );
    } else {
      rows = toPageRows(pages);
    }

    return sortRows(rows, sortColumn, sortDirection);
  }, [
    data?.available,
    filterPath,
    filterQuery,
    pages,
    pairs,
    queries,
    sortColumn,
    sortDirection,
    viewMode,
  ]);

  const headerTotals = useMemo(() => {
    if (filterQuery || filterPath) {
      return sumTotals(displayRows);
    }
    return data?.totals ?? { clicks: 0, impressions: 0, ctr: 0 };
  }, [data?.totals, displayRows, filterPath, filterQuery]);

  const handleSort = (column: SortColumn) => {
    if (column === sortColumn) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortColumn(column);
    setSortDirection(column === "label" ? "asc" : "desc");
  };

  const handleQueryClick = (query: string) => {
    setFilterQuery(query);
    setViewMode("pages");
  };

  const handlePageClick = (path: string) => {
    setFilterPath(path);
    setViewMode("queries");
  };

  const clearFilters = () => {
    setFilterQuery(null);
    setFilterPath(null);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-56" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-5 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const hasRows = viewMode === "queries" ? hasKeywordData : hasPageData;

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-base">
              <DataSourceTitle source="gsc">Search queries</DataSourceTitle>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Organic Google keywords for {scopeLabel}. Click a keyword to see
              landing pages, or a page to see its queries. GA4 cannot provide
              this — Search Console can.
            </p>
          </div>
          {data.available && data.totals ? (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                {headerTotals.clicks.toLocaleString()} clicks
              </Badge>
              <Badge variant="secondary">
                {headerTotals.impressions.toLocaleString()} impressions
              </Badge>
              <Badge variant="secondary">{headerTotals.ctr}% CTR</Badge>
              {insightsHref ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1.5"
                  nativeButton={false}
                  render={<Link href={insightsHref} />}
                >
                  <Lightbulb className="size-3.5" />
                  Insights
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>

        {data.available && hasRows ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-full border p-0.5">
              <Button
                type="button"
                size="sm"
                variant={viewMode === "queries" ? "default" : "ghost"}
                className="h-8 gap-1.5 rounded-full px-3"
                onClick={() => setViewMode("queries")}
              >
                <Search className="size-3.5" />
                Keywords
              </Button>
              <Button
                type="button"
                size="sm"
                variant={viewMode === "pages" ? "default" : "ghost"}
                className="h-8 gap-1.5 rounded-full px-3"
                onClick={() => setViewMode("pages")}
              >
                <FileText className="size-3.5" />
                Pages
              </Button>
            </div>

            {filterQuery ? (
              <Badge variant="outline" className="gap-1 pr-1">
                Keyword: {filterQuery}
                <button
                  type="button"
                  className="rounded-sm p-0.5 hover:bg-muted"
                  aria-label="Clear keyword filter"
                  onClick={() => setFilterQuery(null)}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ) : null}

            {filterPath ? (
              <Badge variant="outline" className="max-w-xs gap-1 pr-1">
                <span className="truncate">Page: {filterPath}</span>
                <button
                  type="button"
                  className="shrink-0 rounded-sm p-0.5 hover:bg-muted"
                  aria-label="Clear page filter"
                  onClick={() => setFilterPath(null)}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ) : null}

            {filterQuery || filterPath ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-muted-foreground"
                onClick={clearFilters}
              >
                Clear filters
              </Button>
            ) : null}
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="min-w-0">
        {!data.available ? (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">
              Search Console not connected yet
            </p>
            <p className="mt-1">{data.error}</p>
            <ol className="mt-3 list-decimal space-y-1 pl-5">
              <li>
                Enable{" "}
                <a
                  href="https://console.cloud.google.com/apis/library/searchconsole.googleapis.com?project=civic-shell-472218-g7"
                  className="underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Search Console API
                </a>{" "}
                in Google Cloud
              </li>
              <li>
                In{" "}
                <a
                  href="https://search.google.com/search-console"
                  className="underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Search Console
                </a>
                , add{" "}
                <code className="text-xs">
                  cursor-ga4-reader@civic-shell-472218-g7.iam.gserviceaccount.com
                </code>{" "}
                as a user on creativewaco.org
              </li>
            </ol>
          </div>
        ) : !hasRows ? (
          <p className="text-sm text-muted-foreground">
            No search queries in this date range for {scopeLabel}.
          </p>
        ) : displayRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No {viewMode === "queries" ? "keywords" : "pages"} match the
            current filters.
          </p>
        ) : (
          <div className="max-w-full overflow-x-auto">
            <table className="w-full min-w-[28rem] table-fixed text-sm">
              <colgroup>
                <col className="w-[42%]" />
                <col className="w-[13%]" />
                <col className="w-[17%]" />
                <col className="w-[12%]" />
                <col className="w-[16%]" />
              </colgroup>
              <thead>
                <tr className="border-b text-muted-foreground">
                  <SortableHeader
                    label={viewMode === "queries" ? "Query" : "Page"}
                    column="label"
                    activeColumn={sortColumn}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Clicks"
                    column="clicks"
                    align="right"
                    activeColumn={sortColumn}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Impressions"
                    column="impressions"
                    align="right"
                    activeColumn={sortColumn}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="CTR"
                    column="ctr"
                    align="right"
                    activeColumn={sortColumn}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Avg position"
                    column="position"
                    align="right"
                    activeColumn={sortColumn}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row, index) => {
                  const isActiveQuery =
                    filterQuery !== null && row.filterQuery === filterQuery;
                  const isActivePage =
                    filterPath !== null && row.filterPath === filterPath;

                  return (
                    <tr
                      key={`${row.label}-${index}`}
                      className={cn(
                        "border-b last:border-0",
                        (isActiveQuery || isActivePage) && "bg-muted/40",
                      )}
                    >
                      <td className="min-w-0 py-2.5 pr-3">
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <button
                                type="button"
                                className="block w-full cursor-pointer truncate text-left font-medium hover:text-primary"
                                onClick={() => {
                                  if (viewMode === "queries" && row.filterQuery) {
                                    handleQueryClick(row.filterQuery);
                                  } else if (row.filterPath) {
                                    handlePageClick(row.filterPath);
                                  }
                                }}
                              />
                            }
                          >
                            {row.label}
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            align="start"
                            className="max-w-sm break-words"
                          >
                            {row.sublabel ?? row.label}
                          </TooltipContent>
                        </Tooltip>
                      </td>
                      <td className="whitespace-nowrap py-2.5 pr-2 text-right tabular-nums">
                        {row.clicks.toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap py-2.5 pr-2 text-right tabular-nums text-muted-foreground">
                        {row.impressions.toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap py-2.5 pr-2 text-right tabular-nums">
                        {row.ctr}%
                      </td>
                      <td className="whitespace-nowrap py-2.5 text-right tabular-nums text-muted-foreground">
                        {row.position}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {data.note ? (
          <p className="mt-3 text-xs text-muted-foreground">{data.note}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
