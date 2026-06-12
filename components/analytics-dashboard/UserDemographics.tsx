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
import type {
  DemographicBreakdown,
  DemographicRow,
  TopCityRow,
  UserDemographics,
} from "./types";

type UserDemographicsPanelProps = {
  demographics: UserDemographics | null;
  loading?: boolean;
  isProgramScope?: boolean;
};

function DemographicsSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="space-y-3">
          <Skeleton className="h-4 w-24" />
          {Array.from({ length: 4 }).map((__, row) => (
            <Skeleton key={row} className="h-5 w-full" />
          ))}
        </div>
      ))}
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

function DemographicBar({ row }: { row: DemographicRow }) {
  const label = (
    <span className="min-w-0 truncate text-sm font-medium">{row.label}</span>
  );

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-3">
        {row.fullLabel ? (
          <Tooltip>
            <TooltipTrigger
              render={<div className="min-w-0 cursor-default truncate" />}
            >
              {label}
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs">
              {row.fullLabel}
            </TooltipContent>
          </Tooltip>
        ) : (
          label
        )}
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
          {row.users.toLocaleString()} · {row.share}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary/80"
          style={{ width: `${Math.max(row.share, 2)}%` }}
        />
      </div>
    </div>
  );
}

function DemographicSection({
  title,
  breakdown,
}: {
  title: string;
  breakdown: DemographicBreakdown;
}) {
  if (breakdown.rows.length === 0) {
    return (
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
        <p className="text-sm text-muted-foreground">No data in this range.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <div className="space-y-3">
        {breakdown.rows.map((row) => (
          <DemographicBar key={`${title}-${row.label}`} row={row} />
        ))}
      </div>
    </div>
  );
}

function CitiesSection({
  cities,
  isProgramScope,
}: {
  cities: TopCityRow[];
  isProgramScope: boolean;
}) {
  const title = isProgramScope ? "Top visitor cities" : "Top cities";

  if (cities.length === 0) {
    return (
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
        <p className="text-sm text-muted-foreground">No city data in this range.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <div className="space-y-3">
        {cities.map((city, index) => {
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
    </div>
  );
}

export function UserDemographicsPanel({
  demographics,
  loading,
  isProgramScope = false,
}: UserDemographicsPanelProps) {
  return (
    <Card className="md:col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          <DataSourceTitle source="ga4">User demographics</DataSourceTitle>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <DemographicsSkeleton />
        ) : demographics ? (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Modeled by Google for{" "}
              <span className="font-medium text-foreground">
                {demographics.coveragePercent}%
              </span>{" "}
              of active users ({demographics.knownUsers.toLocaleString()} of{" "}
              {demographics.totalUsers.toLocaleString()}). Most visitors are
              not assigned age or gender; shares below are among known users
              only.
            </p>
            <DemographicSection title="Age" breakdown={demographics.age} />
            <DemographicSection title="Gender" breakdown={demographics.gender} />
            <DemographicSection
              title="Interests"
              breakdown={demographics.interests}
            />
            <CitiesSection
              cities={demographics.cities ?? []}
              isProgramScope={isProgramScope}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No demographic data in this range.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
