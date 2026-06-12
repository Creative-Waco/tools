"use client";

import { ArrowRight, Eye, LogIn, MousePointerClick, Radio } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";

import { DataSourceTitle } from "./DataSourceLogos";
import { formatJourneyPath, journeyPathSubtitle } from "./journey-utils";
import type { JourneyStage, JourneyStep, VisitorJourney } from "./types";

const STAGE_ICONS: Record<JourneyStage["id"], LucideIcon> = {
  arrival: Radio,
  landing: LogIn,
  explore: Eye,
  continue: ArrowRight,
  actions: MousePointerClick,
};

type VisitorJourneysProps = {
  journey: VisitorJourney | null;
  loading?: boolean;
  programName: string;
  isProgramScope: boolean;
};

function JourneyStepRow({
  step,
  maxMetric,
  rank,
}: {
  step: JourneyStep;
  maxMetric: number;
  rank: number;
}) {
  const displayLabel = step.path
    ? formatJourneyPath(step.path)
    : formatJourneyPath(step.label);
  const subtitle = step.path ? journeyPathSubtitle(step.path) : null;
  const barWidth =
    maxMetric > 0 ? Math.max(8, Math.round((step.metric / maxMetric) * 100)) : 0;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div className="group rounded-md border border-transparent px-2 py-2 transition-colors hover:border-border/60 hover:bg-muted/40" />
        }
      >
        <div className="flex items-start gap-2">
          <span className="mt-0.5 w-4 shrink-0 text-center text-xs text-muted-foreground">
            {rank}
          </span>
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium leading-tight">
                  {displayLabel}
                </p>
                {subtitle ? (
                  <p className="truncate text-xs text-muted-foreground">
                    {subtitle}
                  </p>
                ) : null}
              </div>
              <Badge variant="secondary" className="shrink-0 tabular-nums">
                {step.metric.toLocaleString()}
              </Badge>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary/70 transition-all group-hover:bg-primary"
                style={{ width: `${barWidth}%` }}
              />
            </div>
            {typeof step.share === "number" && step.share > 0 ? (
              <p className="text-xs text-muted-foreground">{step.share}% share</p>
            ) : null}
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" align="start" className="max-w-sm">
        <p className="font-medium">{step.path ?? step.label}</p>
        <p className="text-muted-foreground">
          {step.metric.toLocaleString()} {step.metricLabel}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

function JourneyStageCard({ stage }: { stage: JourneyStage }) {
  const Icon = STAGE_ICONS[stage.id];
  const maxMetric = Math.max(...stage.steps.map((step) => step.metric), 1);

  return (
    <Card className="flex h-full min-w-[220px] flex-1 flex-col border-dashed shadow-none">
      <CardHeader className="space-y-2 pb-3">
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-primary/10 p-1.5">
            <Icon className="size-4 text-primary" />
          </div>
          <CardTitle className="text-sm font-semibold">{stage.title}</CardTitle>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {stage.description}
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-1 pt-0">
        {stage.steps.length > 0 ? (
          stage.steps.map((step, index) => (
            <JourneyStepRow
              key={`${stage.id}-${step.id}`}
              step={step}
              maxMetric={maxMetric}
              rank={index + 1}
            />
          ))
        ) : (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            No data in this range
          </p>
        )}
        {stage.footnote ? (
          <p className="mt-auto px-2 pt-3 text-xs text-muted-foreground">
            {stage.footnote}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function JourneySkeleton() {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 lg:grid lg:grid-cols-5 lg:overflow-visible">
      {Array.from({ length: 5 }).map((_, index) => (
        <Card key={index} className="min-w-[220px] flex-1 border-dashed shadow-none">
          <CardHeader className="space-y-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-10 w-full" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 4 }).map((__, row) => (
              <Skeleton key={row} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function VisitorJourneys({
  journey,
  loading,
  programName,
  isProgramScope,
}: VisitorJourneysProps) {
  if (loading) {
    return (
      <section className="space-y-4">
        <div>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="mt-2 h-4 w-full max-w-2xl" />
        </div>
        <JourneySkeleton />
      </section>
    );
  }

  if (!journey) return null;

  const scopeLabel = isProgramScope ? programName : "creativewaco.org";

  return (
    <section className="space-y-4">
      <div>
        <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <DataSourceTitle source="ga4">Visitor journeys</DataSourceTitle>
        </h3>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          How people move through {scopeLabel} in this date range — arrival,
          landing page, views, next steps, and engagement events. Aggregated
          GA4 data only; not individual users.
        </p>
      </div>

      <div
        className={cn(
          "flex snap-x snap-mandatory items-stretch gap-3 overflow-x-auto pb-2",
          "xl:grid xl:grid-cols-5 xl:gap-4 xl:overflow-visible xl:pb-0",
        )}
      >
        {journey.stages.map((stage) => (
          <div
            key={stage.id}
            className="w-[min(88vw,260px)] shrink-0 snap-start xl:w-auto"
          >
            <JourneyStageCard stage={stage} />
          </div>
        ))}
      </div>
    </section>
  );
}
