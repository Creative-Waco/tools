"use client";

import { Plus } from "lucide-react";
import { forwardRef } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

import { formatPathLabel, pathLabelSubtitle } from "./path-labels";
import type {
  PathExplorationColumn,
  PathExplorationNode,
} from "./path-exploration-types";

type PathExplorationChartProps = {
  columns: PathExplorationColumn[];
  onSelect: (stepIndex: number, node: PathExplorationNode) => void;
  onAddStep?: () => void;
  canAddStep?: boolean;
  className?: string;
};

function stepTitle(stepIndex: number) {
  return stepIndex === 0 ? "Session start" : `Step ${stepIndex + 1}`;
}

function PathNode({
  node,
  maxValue,
  selected,
  onSelect,
}: {
  node: PathExplorationNode;
  maxValue: number;
  selected: boolean;
  onSelect?: () => void;
}) {
  const label = node.isMore
    ? "More pages"
    : node.label || formatPathLabel(node.path);
  const subtitle = node.isMore ? null : pathLabelSubtitle(node.path);
  const share = maxValue > 0 ? (node.value / maxValue) * 100 : 0;
  const clickable = Boolean(onSelect) && !node.isMore;

  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium leading-tight">{label}</p>
          {subtitle ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {subtitle}
            </p>
          ) : null}
        </div>
        <Badge
          variant="secondary"
          className="shrink-0 tabular-nums"
          title="Sessions in this path"
        >
          {node.value.toLocaleString()}
        </Badge>
      </div>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            node.isMore ? "bg-muted-foreground/35" : "bg-primary/75",
          )}
          style={{ width: `${Math.max(node.isMore ? 12 : 10, share)}%` }}
        />
      </div>
    </>
  );

  if (!clickable) {
    return (
      <div
        className={cn(
          "rounded-lg border bg-background px-3 py-2.5",
          node.isMore && "border-dashed bg-muted/20",
        )}
      >
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-lg border px-3 py-2.5 text-left transition-colors",
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
          : "border-border bg-background hover:border-primary/35 hover:bg-muted/35",
      )}
    >
      {body}
    </button>
  );
}

function ColumnSkeleton() {
  return (
    <div className="flex w-60 shrink-0 flex-col gap-2">
      <Skeleton className="h-4 w-24" />
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-16 w-full rounded-lg" />
      ))}
    </div>
  );
}

export const PathExplorationChart = forwardRef<
  HTMLDivElement,
  PathExplorationChartProps
>(function PathExplorationChart(
  { columns, onSelect, onAddStep, canAddStep, className },
  ref,
) {
  if (!columns.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Not enough path data in this date range yet.
      </p>
    );
  }

  return (
    <div
      ref={ref}
      className={cn(
        "max-w-full overflow-x-auto overscroll-x-contain",
        className,
      )}
    >
      <div className="inline-flex w-max min-w-full items-stretch gap-3">
          {columns.map((column, index) => {
            const maxValue = Math.max(
              ...column.nodes.map((node) => node.value),
              1,
            );

            return (
              <div
                key={`column-${index}`}
                className="flex w-60 shrink-0 flex-col rounded-xl border bg-muted/15 p-3"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {stepTitle(column.stepIndex)}
                  </p>
                  {column.loading ? (
                    <span className="text-[11px] text-muted-foreground">
                      Loading…
                    </span>
                  ) : (
                    <span className="text-[11px] tabular-nums text-muted-foreground">
                      {column.nodes.length}{" "}
                      {column.nodes.length === 1 ? "page" : "pages"}
                    </span>
                  )}
                </div>

                {column.loading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <Skeleton key={index} className="h-16 w-full rounded-lg" />
                    ))}
                  </div>
                ) : column.nodes.length > 0 ? (
                  <div className="space-y-2">
                    {column.nodes.map((node) => (
                      <PathNode
                        key={node.id}
                        node={node}
                        maxValue={maxValue}
                        selected={
                          column.selectedPath !== null &&
                          column.selectedPath.replace(/\/$/, "") ===
                            node.path.replace(/\/$/, "")
                        }
                        onSelect={
                          node.isMore
                            ? undefined
                            : () => onSelect(index, node)
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <p className="py-8 text-center text-xs text-muted-foreground">
                    {column.stepIndex === 0
                      ? "No landing pages in this range."
                      : "Select a page in the previous step."}
                  </p>
                )}
              </div>
            );
          })}

          {canAddStep && onAddStep ? (
            <div className="flex w-40 shrink-0 items-center justify-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-auto flex-col gap-1.5 px-4 py-6"
                onClick={onAddStep}
              >
                <Plus className="size-4" />
                Add step
              </Button>
            </div>
          ) : null}
      </div>
    </div>
  );
});


export { ColumnSkeleton };
