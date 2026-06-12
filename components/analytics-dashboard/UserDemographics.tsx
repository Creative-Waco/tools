"use client";

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
  UserDemographics,
} from "./types";

type UserDemographicsPanelProps = {
  demographics: UserDemographics | null;
  loading?: boolean;
};

function DemographicsSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 3 }).map((_, index) => (
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

export function UserDemographicsPanel({
  demographics,
  loading,
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
