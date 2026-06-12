"use client";

import { format } from "date-fns";
import { GitBranch, LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { DataSourceTitle } from "./DataSourceLogos";
import { formatPathLabel } from "./path-labels";
import { PathExplorationChart } from "./PathExplorationChart";
import type {
  PathExplorationColumn,
  PathExplorationNode,
  PathExplorationResponse,
} from "./path-exploration-types";

type PathExplorationProps = {
  dateRange: DateRange | undefined;
  programId: string;
  programName: string;
  isProgramScope: boolean;
};

const DEFAULT_STEP_COUNT = 3;
const MAX_STEP_COUNT = 8;

function emptyColumn(stepIndex: number): PathExplorationColumn {
  return {
    stepIndex,
    nodes: [],
    loading: false,
    selectedPath: null,
  };
}

async function fetchPathData(
  dateRange: DateRange,
  programId: string,
  mode: "landings" | "next",
  pathSteps?: string[],
) {
  if (!dateRange.from || !dateRange.to) {
    throw new Error("A start and end date are required.");
  }

  const params = new URLSearchParams();
  params.set("startDate", format(dateRange.from, "yyyy-MM-dd"));
  params.set("endDate", format(dateRange.to, "yyyy-MM-dd"));
  params.set("mode", mode);
  if (programId && programId !== "all") {
    params.set("program", programId);
  }
  if (pathSteps?.length) {
    params.set("pathSteps", JSON.stringify(pathSteps));
  }

  const response = await fetch(
    `/api/analytics-dashboard/path-exploration/?${params.toString()}`,
    { cache: "no-store" },
  );

  const payload = (await response.json()) as PathExplorationResponse & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "Could not load path exploration.");
  }

  return payload;
}

function upsertColumn(
  columns: PathExplorationColumn[],
  stepIndex: number,
  column: PathExplorationColumn,
) {
  const next = columns.slice(0, stepIndex);
  next.push(column);
  return next;
}

export function PathExploration({
  dateRange,
  programId,
  programName,
  isProgramScope,
}: PathExplorationProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [stepCount, setStepCount] = useState(DEFAULT_STEP_COUNT);
  const [columns, setColumns] = useState<PathExplorationColumn[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const loadNextColumn = useCallback(
    async (stepIndex: number, pathSteps: string[]) => {
      if (!dateRange?.from || !dateRange?.to) return;

      setColumns((prev) =>
        upsertColumn(prev, stepIndex, {
          stepIndex,
          nodes: [],
          loading: true,
          selectedPath: null,
        }),
      );

      try {
        const result = await fetchPathData(
          dateRange,
          programId,
          "next",
          pathSteps,
        );
        setUpdatedAt(result.fetchedAt);
        setColumns((prev) =>
          upsertColumn(prev, stepIndex, {
            stepIndex,
            nodes: result.nodes,
            loading: false,
            selectedPath: null,
          }),
        );
      } catch (fetchError) {
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Could not load the next step.",
        );
        setColumns((prev) =>
          upsertColumn(prev, stepIndex, emptyColumn(stepIndex)),
        );
      }
    },
    [dateRange, programId],
  );

  const initialize = useCallback(async () => {
    if (!dateRange?.from || !dateRange?.to) return;

    setInitialLoading(true);
    setError("");
    setStepCount(DEFAULT_STEP_COUNT);
    setColumns([]);

    try {
      const result = await fetchPathData(dateRange, programId, "landings");
      setUpdatedAt(result.fetchedAt);
      setColumns([
        {
          stepIndex: 0,
          nodes: result.nodes,
          loading: false,
          selectedPath: null,
        },
      ]);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Could not load path exploration.",
      );
      setColumns([]);
    } finally {
      setInitialLoading(false);
    }
  }, [dateRange, programId]);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  const handleSelect = useCallback(
    async (stepIndex: number, node: PathExplorationNode) => {
      if (node.isMore) return;

      setError("");
      let pathSteps: string[] = [];

      setColumns((prev) => {
        const next = prev.slice(0, stepIndex + 1).map((column, index) =>
          index === stepIndex
            ? { ...column, selectedPath: node.path }
            : column,
        );
        pathSteps = next
          .map((column) => column.selectedPath)
          .filter((path): path is string => Boolean(path));
        return next;
      });

      const nextStepIndex = stepIndex + 1;
      if (nextStepIndex >= stepCount) return;

      await loadNextColumn(nextStepIndex, pathSteps);

      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({
          left: scrollRef.current.scrollWidth,
          behavior: "smooth",
        });
      });
    },
    [loadNextColumn, stepCount],
  );

  const handleAddStep = useCallback(async () => {
    if (stepCount >= MAX_STEP_COUNT) return;

    const nextCount = stepCount + 1;
    setStepCount(nextCount);

    const previousColumn = columns[columns.length - 1];
    const pathSteps = columns
      .map((column) => column.selectedPath)
      .filter((path): path is string => Boolean(path));

    if (
      pathSteps.length > 0 &&
      columns.length < nextCount &&
      !previousColumn.loading
    ) {
      await loadNextColumn(columns.length, pathSteps);
    } else {
      setColumns((prev) => {
        if (prev.length >= nextCount) return prev;
        return [...prev, emptyColumn(prev.length)];
      });
    }

    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        left: scrollRef.current.scrollWidth,
        behavior: "smooth",
      });
    });
  }, [columns, loadNextColumn, stepCount]);

  const visibleColumns =
    columns.length >= stepCount
      ? columns.slice(0, stepCount)
      : [
          ...columns,
          ...Array.from({ length: stepCount - columns.length }, (_, index) =>
            emptyColumn(columns.length + index),
          ),
        ];

  const selectedTrail = columns
    .filter((column) => column.selectedPath)
    .map((column) => formatPathLabel(column.selectedPath!));

  const scopeLabel = isProgramScope ? programName : "creativewaco.org";

  return (
    <section id="path-exploration" className="scroll-mt-6 min-w-0 max-w-full">
      <Card className="min-w-0 overflow-hidden">
        <CardHeader className="gap-4 space-y-0 pb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-1.5">
              <CardTitle className="flex items-center gap-2 text-base">
                <DataSourceTitle source="ga4">Path exploration</DataSourceTitle>
              </CardTitle>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Pick a session start page, then follow the path step by step.
                Each step shows sessions that continued in order — numbers always
                narrow as you go deeper.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void initialize()}
                disabled={initialLoading}
              >
                {initialLoading ? (
                  <LoaderCircle className="mr-2 size-4 animate-spin" />
                ) : (
                  <GitBranch className="mr-2 size-4" />
                )}
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {selectedTrail.length > 0
                ? `Path: ${selectedTrail.join(" → ")}`
                : `Session starts on ${scopeLabel}`}
            </p>
            {updatedAt && !initialLoading ? (
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                Updated {format(new Date(updatedAt), "h:mm a")}
              </span>
            ) : null}
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="grid min-w-0 grid-cols-1">
            {initialLoading ? (
              <div className="overflow-x-auto overscroll-x-contain">
                <div className="inline-flex w-max min-w-full gap-3">
                  {Array.from({ length: DEFAULT_STEP_COUNT }).map((_, index) => (
                    <div
                      key={index}
                      className="flex w-60 shrink-0 flex-col gap-2 rounded-xl border bg-muted/15 p-3"
                    >
                      <Skeleton className="h-4 w-24" />
                      {Array.from({ length: 4 }).map((__, row) => (
                        <Skeleton key={row} className="h-16 w-full rounded-lg" />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <PathExplorationChart
                ref={scrollRef}
                columns={visibleColumns}
                onSelect={(stepIndex, node) => void handleSelect(stepIndex, node)}
                onAddStep={() => void handleAddStep()}
                canAddStep={stepCount < MAX_STEP_COUNT}
              />
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Scroll horizontally to see more steps. Use Add step to extend the
            path up to {MAX_STEP_COUNT} columns.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
