"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { DataSourceTitle } from "./DataSourceLogos";
import type { SearchConsoleData } from "./types";

type SearchQueriesPanelProps = {
  data: SearchConsoleData | null;
  loading?: boolean;
  programName: string;
  isProgramScope: boolean;
};

export function SearchQueriesPanel({
  data,
  loading,
  programName,
  isProgramScope,
}: SearchQueriesPanelProps) {
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

  const scopeLabel = isProgramScope
    ? `${programName} pages`
    : "all creativewaco.org pages";

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">
              <DataSourceTitle source="gsc">Search queries</DataSourceTitle>
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Organic Google keywords for {scopeLabel}. GA4 cannot provide this
              — Search Console can. Clicks here are not the same as GA4 organic
              sessions (see note below).
            </p>
          </div>
          {data.available && data.totals ? (
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                {data.totals.clicks.toLocaleString()} clicks
              </Badge>
              <Badge variant="secondary">
                {data.totals.impressions.toLocaleString()} impressions
              </Badge>
              <Badge variant="secondary">{data.totals.ctr}% CTR</Badge>
            </div>
          ) : null}
        </div>
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
        ) : data.queries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No search queries in this date range for {scopeLabel}.
          </p>
        ) : (
          <div className="min-w-0 overflow-hidden">
            <table className="w-full table-fixed text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="w-[44%] pb-2 pr-3 font-medium">Query</th>
                  <th className="w-[12%] pb-2 pr-2 text-right font-medium">
                    Clicks
                  </th>
                  <th className="w-[16%] pb-2 pr-2 text-right font-medium">
                    Impressions
                  </th>
                  <th className="w-[12%] pb-2 pr-2 text-right font-medium">
                    CTR
                  </th>
                  <th className="w-[16%] pb-2 text-right font-medium">
                    Avg position
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.queries.map((row, index) => (
                  <tr
                    key={`${row.query}-${index}`}
                    className="border-b last:border-0"
                  >
                    <td className="min-w-0 py-2.5 pr-3">
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <span className="block cursor-default truncate font-medium" />
                          }
                        >
                          {row.query}
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          align="start"
                          className="max-w-sm break-words"
                        >
                          {row.query}
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
                ))}
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
