"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { DataSourceTitle } from "./DataSourceLogos";
import type { ProgramInsights as ProgramInsightsData } from "./types";

type ProgramInsightsProps = {
  insights: ProgramInsightsData | null;
  loading?: boolean;
  programName: string;
};

function InsightListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-5 w-full" />
      ))}
    </div>
  );
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder > 0 ? `${minutes}m ${remainder}s` : `${minutes}m`;
}

export function ProgramInsights({
  insights,
  loading,
  programName,
}: ProgramInsightsProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent>
              <InsightListSkeleton />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!insights) return null;

  const totalUsers =
    insights.audience.newUsers + insights.audience.returningUsers;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <DataSourceTitle source="ga4">{programName} insights</DataSourceTitle>
        </h3>
        <p className="text-sm text-muted-foreground">
          Who visits, how they find it, what they do, and where they go next
          (aggregated — GA4 does not identify individuals)
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Who&apos;s visiting</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">New visitors</p>
                <p className="text-xl font-bold">
                  {insights.audience.newUsers.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {insights.audience.newSessions.toLocaleString()} sessions
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Returning</p>
                <p className="text-xl font-bold">
                  {insights.audience.returningUsers.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {insights.audience.returningSessions.toLocaleString()}{" "}
                  sessions
                </p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Devices
              </p>
              <div className="space-y-2">
                {insights.devices.map((device) => (
                  <div
                    key={device.category}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="capitalize">{device.category}</span>
                    <span className="text-muted-foreground">
                      {device.users.toLocaleString()} users ·{" "}
                      {device.sessions.toLocaleString()} sessions
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Top cities
              </p>
              <div className="space-y-2">
                {insights.cities.slice(0, 5).map((city) => (
                  <div
                    key={city.city}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>{city.city}</span>
                    <span className="text-muted-foreground">
                      {city.users.toLocaleString()} users
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {totalUsers > 0 ? (
              <p className="text-xs text-muted-foreground">
                {Math.round(
                  (insights.audience.returningUsers / totalUsers) * 100,
                )}
                % returning · {Math.round(
                  (insights.audience.newUsers / totalUsers) * 100,
                )}
                % new
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">How they find it</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Source / medium
              </p>
              <div className="space-y-2">
                {insights.acquisition.slice(0, 6).map((row) => (
                  <div
                    key={`${row.source}-${row.medium}`}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="min-w-0 truncate font-medium">
                      {row.source} / {row.medium}
                    </span>
                    <Badge variant="secondary" className="shrink-0">
                      {row.sessions.toLocaleString()} sessions
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Landing pages
              </p>
              <div className="space-y-2">
                {insights.landingPages.slice(0, 5).map((page) => (
                  <div
                    key={page.path}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="min-w-0 truncate">{page.path}</span>
                    <span className="shrink-0 text-muted-foreground">
                      {page.sessions.toLocaleString()} landings
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">What they&apos;re doing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Avg time on page</p>
                <p className="text-xl font-bold">
                  {formatDuration(insights.engagement.avgEngagementSecPerView)}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Engagement rate</p>
                <p className="text-xl font-bold">
                  {insights.engagement.engagementRate}%
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-muted/50 px-3 py-2">
                <span className="text-muted-foreground">Scrolls</span>
                <p className="font-semibold">
                  {insights.engagement.scrolls.toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 px-3 py-2">
                <span className="text-muted-foreground">Form starts</span>
                <p className="font-semibold">
                  {insights.engagement.formStarts.toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 px-3 py-2">
                <span className="text-muted-foreground">Form submits</span>
                <p className="font-semibold">
                  {insights.engagement.formSubmits.toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 px-3 py-2">
                <span className="text-muted-foreground">Clicks</span>
                <p className="font-semibold">
                  {insights.engagement.clicks.toLocaleString()}
                </p>
              </div>
            </div>

            {insights.events.length > 0 ? (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Other events
                </p>
                <div className="space-y-2">
                  {insights.events.slice(0, 5).map((event) => (
                    <div
                      key={event.name}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="font-mono text-xs">{event.name}</span>
                      <span className="text-muted-foreground">
                        {event.count.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {insights.programPages.length > 0 ? (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Pages in this program
                </p>
                <div className="space-y-2">
                  {insights.programPages.slice(0, 4).map((page) => (
                    <div
                      key={page.path}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="min-w-0 truncate">{page.path}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {page.views.toLocaleString()} views ·{" "}
                        {formatDuration(page.avgEngagementSec)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Where they go next</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Pages viewed immediately after a {programName} page in the same
              visit (internal navigation only).
            </p>
            {insights.nextPages.length > 0 ? (
              <div className="space-y-2">
                {insights.nextPages.map((page, index) => (
                  <div
                    key={`${page.path}-${index}`}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="w-5 shrink-0 text-center text-muted-foreground">
                        {index + 1}
                      </span>
                      <span className="truncate font-medium">{page.path}</span>
                    </div>
                    <span className="shrink-0 text-muted-foreground">
                      {page.views.toLocaleString()} views
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Not enough path data in this date range yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
