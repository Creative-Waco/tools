"use client";

import Link from "next/link";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { DateRange } from "react-day-picker";

import { StatusLine } from "@/components/StatusLine";
import { DashboardFiltersBar } from "./DashboardFiltersBar";
import {
  buildDashboardPath,
  buildInsightsPath,
} from "./url-state";
import { UnifiedInsightsView } from "./UnifiedInsightsView";
import {
  DEFAULT_UNIFIED_FILTERS,
  readUnifiedInsightsFilters,
  type UnifiedInsightsFilters,
} from "./unified-insights";
import { useAnalyticsDashboardFilters } from "./useAnalyticsDashboardFilters";

export function InsightsDashboard() {
  const [filters, setFilters] = useState<UnifiedInsightsFilters>(
    DEFAULT_UNIFIED_FILTERS,
  );

  useEffect(() => {
    setFilters(readUnifiedInsightsFilters());
  }, []);

  const buildPath = useCallback(
    (id: string, range: DateRange | undefined, preset: string) =>
      buildInsightsPath(id, range, preset, filters),
    [filters],
  );

  const {
    dateRange,
    selectedPreset,
    programId,
    loading,
    data,
    statusMessage,
    isProgramScope,
    selectedProgram,
    datePresets,
    loadDashboard,
    handlePresetChange,
    handleProgramChange,
    handleDateRangeSelect,
  } = useAnalyticsDashboardFilters({
    pagePath: "/insights/",
    buildPath,
  });

  useEffect(() => {
    const onPopState = () => {
      setFilters(readUnifiedInsightsFilters());
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const nextPath = buildInsightsPath(
      programId,
      dateRange,
      selectedPreset,
      filters,
    );
    const currentPath = `${window.location.pathname}${window.location.search}`;

    if (currentPath !== nextPath) {
      window.history.replaceState(null, "", nextPath);
    }
  }, [dateRange, filters, programId, selectedPreset]);

  const handleFiltersChange = useCallback((next: UnifiedInsightsFilters) => {
    setFilters(next);
  }, []);

  const scopeLabel = isProgramScope
    ? `${data?.program.name ?? selectedProgram?.name ?? "Program"} pages`
    : "all creativewaco.org pages";

  const analyticsHref = buildDashboardPath(programId, dateRange, selectedPreset);

  return (
    <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden">
      <DashboardFiltersBar
        programId={programId}
        onProgramChange={handleProgramChange}
        selectedPreset={selectedPreset}
        onPresetChange={handlePresetChange}
        datePresets={datePresets}
        dateRange={dateRange}
        onDateRangeSelect={handleDateRangeSelect}
        onRefresh={() => loadDashboard(true)}
        loading={loading}
        trailing={
          <Link
            href={analyticsHref}
            className="inline-flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium hover:bg-muted"
          >
            <BarChart3 className="size-4" />
            Analytics
          </Link>
        }
      />

      {isProgramScope && selectedProgram ? (
        <p className="text-sm text-muted-foreground">
          {selectedProgram.description}
        </p>
      ) : null}

      {statusMessage ? <StatusLine message={statusMessage} /> : null}

      <UnifiedInsightsView
        data={data}
        loading={loading}
        scopeLabel={scopeLabel}
        filters={filters}
        onFiltersChange={handleFiltersChange}
      />

      <div className="pt-2">
        <Link
          href={analyticsHref}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted"
        >
          <ArrowLeft className="size-4" />
          Back to Analytics Dashboard
        </Link>
      </div>
    </div>
  );
}
