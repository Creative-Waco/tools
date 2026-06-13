"use client";

import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import {
  buildInsightDetailModel,
  type InsightDetailRow,
  type InsightDetailSection,
} from "./insight-detail-data";
import {
  buildInsightRationale,
  type InsightRationaleContext,
} from "./insight-rationale";
import { QueryTrendSparkline } from "./QueryTrendSparkline";
import type { UnifiedInsight } from "./unified-insights";

type InsightDetailModalProps = {
  row: UnifiedInsight | null;
  context: InsightRationaleContext;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function ListTable({ rows }: { rows: InsightDetailRow[] }) {
  return (
    <dl className="divide-y rounded-xl border bg-background text-sm">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-start justify-between gap-6 px-4 py-3"
        >
          <dt className="text-muted-foreground">{row.label}</dt>
          <dd className="text-right font-medium tabular-nums">{row.value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

function ComparisonTable({
  rows,
  previousLabel = "Prior period",
}: {
  rows: InsightDetailRow[];
  previousLabel?: string;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-background">
      <table className="w-full min-w-[18rem] text-sm">
        <thead>
          <tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
            <th className="px-4 py-3 font-medium">Metric</th>
            <th className="px-4 py-3 text-right font-medium">This period</th>
            <th className="px-4 py-3 text-right font-medium">{previousLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b last:border-0">
              <td className="px-4 py-3 text-muted-foreground">{row.label}</td>
              <td className="px-4 py-3 text-right font-medium tabular-nums">
                {row.current ?? "—"}
              </td>
              <td className="px-4 py-3 text-right font-medium tabular-nums">
                {row.previous ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SectionBlock({ section }: { section: InsightDetailSection }) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {section.title}
      </h3>
      {section.layout === "list" ? (
        <ListTable rows={section.rows} />
      ) : (
        <ComparisonTable
          rows={section.rows}
          previousLabel={section.previousLabel}
        />
      )}
    </section>
  );
}

export function InsightDetailModal({
  row,
  context,
  open,
  onOpenChange,
}: InsightDetailModalProps) {
  const detail = buildInsightDetailModel(row, context);
  const rationale = row ? buildInsightRationale(row, context) : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
      >
        {detail && row ? (
          <>
            <SheetHeader className="shrink-0 space-y-3 border-b px-6 py-6 pr-14">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={detail.source === "search" ? "secondary" : "outline"}
                >
                  {detail.source === "search" ? "Search Console" : "GA4"}
                </Badge>
                {detail.subtitle ? (
                  <Badge variant="outline">{detail.subtitle}</Badge>
                ) : null}
                <Badge variant="outline">Priority {row.impactScore}</Badge>
              </div>
              <SheetTitle className="text-left text-xl leading-snug">
                {detail.title}
              </SheetTitle>
              <SheetDescription className="text-left text-sm leading-relaxed text-foreground/90">
                {detail.recommendation}
              </SheetDescription>
              {rationale?.periodLabel ? (
                <p className="text-xs text-muted-foreground">
                  {rationale.periodLabel}
                </p>
              ) : null}
            </SheetHeader>

            <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto px-6 py-6">
              {rationale ? (
                <div className="rounded-xl border bg-muted/30 px-4 py-4 text-sm leading-relaxed">
                  <p className="font-medium text-foreground">Why this fired</p>
                  <p className="mt-2 text-muted-foreground">{rationale.why}</p>
                  {rationale.caveat ? (
                    <p className="mt-2 text-xs italic text-muted-foreground">
                      {rationale.caveat}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {detail.sections.map((section) => (
                <SectionBlock key={section.title} section={section} />
              ))}

              {detail.trend && detail.trend.length >= 2 ? (
                <section className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Click trend
                  </h3>
                  <div className="rounded-xl border bg-background px-4 py-4">
                    <QueryTrendSparkline
                      trend={detail.trend}
                      width={320}
                      height={56}
                    />
                    <div className="mt-4 max-h-48 overflow-y-auto rounded-lg border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/30 text-muted-foreground">
                            <th className="px-3 py-2 text-left font-medium">Date</th>
                            <th className="px-3 py-2 text-right font-medium">Clicks</th>
                            <th className="px-3 py-2 text-right font-medium">Imp</th>
                            <th className="px-3 py-2 text-right font-medium">Pos</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.trend.map((point) => (
                            <tr key={point.date} className="border-b last:border-0">
                              <td className="px-3 py-2 tabular-nums">
                                {format(new Date(`${point.date}T12:00:00`), "MMM d")}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums">
                                {point.clicks}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums">
                                {point.impressions}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums">
                                {point.position}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              ) : null}

              <details className="rounded-xl border px-4 py-3 text-sm">
                <summary className="cursor-pointer font-medium text-muted-foreground">
                  Technical details
                </summary>
                <div className="mt-3">
                  <ListTable rows={detail.meta} />
                </div>
              </details>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
