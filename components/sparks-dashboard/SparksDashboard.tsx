"use client";

import { useCallback, useEffect, useState } from "react";
import { ChartTooltip } from "./ChartTooltip";
import { EventsPanel } from "./EventsPanel";
import { GoalsPanel } from "./GoalsPanel";
import { GrowthChart } from "./GrowthChart";
import { GrowthMonthModal } from "./GrowthMonthModal";
import { KpiGrid } from "./KpiGrid";
import { MembersTables } from "./MembersTables";
import { SyncBanner } from "./SyncBanner";
import { TierPanel } from "./TierPanel";
import { Toolbar } from "./Toolbar";
import { buildDashboardCacheKey, readCachedDashboard } from "./cache";
import type { DashboardData, MembershipTypeFilter, Period, TierMix } from "./types";
import { fetchDashboard } from "./utils";
import { useChartInteractions } from "./useChartInteractions";

const EMPTY_TIER_MIX: TierMix = { bronze: 0, silver: 0, gold: 0 };

export function SparksDashboard() {
  const [period, setPeriod] = useState<Period>("fy");
  const [membershipType, setMembershipType] = useState<MembershipTypeFilter>("all");
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshDisabled, setRefreshDisabled] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState<"" | "is-success">("");
  const [growthModalMonth, setGrowthModalMonth] = useState<string | null>(null);

  const { tooltip, tooltipRef, hideChartTooltip } = useChartInteractions(growthModalMonth !== null);

  const loadDashboard = useCallback(async (force = false) => {
    const cacheKey = buildDashboardCacheKey(period, membershipType);
    const cached = !force ? readCachedDashboard(cacheKey) : null;

    if (cached) {
      setData(cached);
      setLoading(false);
      setStatusMessage(cached.warnings?.length ? cached.warnings.map((w) => w.message).join(" ") : "");
      setStatusType("");
      return;
    }

    setRefreshDisabled(true);
    setLoading(true);
    setStatusMessage("");
    setStatusType("");

    try {
      const result = await fetchDashboard({
        period,
        membershipType,
        refresh: force,
      });

      setData(result);

      if (result.warnings?.length) {
        setStatusMessage(result.warnings.map((w) => w.message).join(" "));
        setStatusType("");
      }
    } catch (error) {
      setData(null);
      setStatusMessage(error instanceof Error ? error.message : "Could not load dashboard.");
      setStatusType("");
    } finally {
      setLoading(false);
      setRefreshDisabled(false);
    }
  }, [period, membershipType]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    void loadDashboard(false);
  }, [loadDashboard, mounted]);

  function handleMonthClick(monthKey: string) {
    hideChartTooltip();
    setGrowthModalMonth(monthKey);
  }

  const schemaIssues = data?.syncHealth?.schemaIssues ?? [];
  const showLoading = !mounted || loading;

  return (
    <>
      <div
        className={`dashboard-page${showLoading ? " is-loading" : ""}`}
        id="dashboard-page"
        aria-busy={showLoading}
      >
        {!showLoading && schemaIssues.length > 0 ? (
          <SyncBanner schemaIssues={schemaIssues} />
        ) : (
          <div id="sync-banner" className="sync-banner is-collapsed" aria-hidden="true" />
        )}

        <Toolbar
          period={period}
          membershipType={membershipType}
          refreshDisabled={refreshDisabled}
          onPeriodChange={setPeriod}
          onMembershipTypeChange={setMembershipType}
          onRefresh={() => void loadDashboard(true)}
        />

        <KpiGrid kpis={data?.kpis ?? []} loading={showLoading} />

        <div className="dashboard-grid">
          <GoalsPanel goals={data?.goals ?? []} loading={showLoading} />

          <TierPanel
            tierMixPaid={data?.tierMixPaid ?? EMPTY_TIER_MIX}
            tierMixHonorary={data?.tierMixHonorary ?? EMPTY_TIER_MIX}
            total={data?.totalMemberCount ?? 0}
            honoraryCount={data?.honoraryCount ?? 0}
            paidCount={data?.paidCount ?? 0}
            loading={showLoading}
          />

          <GrowthChart
            monthly={data?.monthly ?? []}
            loading={showLoading}
            onMonthClick={handleMonthClick}
          />

          <EventsPanel
            events={data?.events ?? []}
            undatedPipelineCount={data?.undatedPipelineCount ?? 0}
            loading={showLoading}
          />

          <MembersTables members={data?.members ?? []} loading={showLoading} />
        </div>

        <p
          id="status"
          className={statusType ? `status ${statusType}` : "status"}
          aria-live="polite"
        >
          {statusMessage}
        </p>

        <ChartTooltip
          ref={tooltipRef}
          visible={tooltip.visible}
          left={tooltip.left}
          top={tooltip.top}
        >
          {tooltip.content}
        </ChartTooltip>

        <GrowthMonthModal
          monthKey={growthModalMonth}
          members={data?.members ?? []}
          events={data?.events ?? []}
          onClose={() => setGrowthModalMonth(null)}
        />
      </div>
    </>
  );
}
