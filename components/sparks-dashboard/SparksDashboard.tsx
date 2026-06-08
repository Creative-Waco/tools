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
import type { DashboardData, MembershipTypeFilter, Period, TierMix } from "./types";
import { fetchDashboard } from "./utils";
import { useChartInteractions } from "./useChartInteractions";

const EMPTY_TIER_MIX: TierMix = { bronze: 0, silver: 0, gold: 0 };

export function SparksDashboard() {
  const [period, setPeriod] = useState<Period>("fy");
  const [membershipType, setMembershipType] = useState<MembershipTypeFilter>("all");
  const [loading, setLoading] = useState(true);
  const [refreshDisabled, setRefreshDisabled] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState<"" | "is-success">("");
  const [growthModalMonth, setGrowthModalMonth] = useState<string | null>(null);

  const { tooltip, tooltipRef, hideChartTooltip } = useChartInteractions(growthModalMonth !== null);

  const loadDashboard = useCallback(async () => {
    setRefreshDisabled(true);
    setLoading(true);
    setStatusMessage("");
    setStatusType("");

    try {
      const result = (await fetchDashboard({
        period,
        membershipType,
        refresh: true,
      })) as DashboardData;

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
    loadDashboard();
  }, [loadDashboard]);

  function handleExportSnapshot() {
    fetchDashboard({ period, membershipType })
      .then((result) => {
        const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `creative-spark-dashboard-${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);
        setStatusMessage("Snapshot downloaded.");
        setStatusType("is-success");
      })
      .catch((error) => {
        setStatusMessage(error instanceof Error ? error.message : "Export failed.");
        setStatusType("");
      });
  }

  function handleMonthClick(monthKey: string) {
    hideChartTooltip();
    setGrowthModalMonth(monthKey);
  }

  const schemaIssues = data?.syncHealth?.schemaIssues ?? [];

  return (
    <>
      <div
        className={`dashboard-page${loading ? " is-loading" : ""}`}
        id="dashboard-page"
        aria-busy={loading}
      >
        {!loading && schemaIssues.length > 0 ? (
          <SyncBanner schemaIssues={schemaIssues} />
        ) : (
          <div id="sync-banner" className="sync-banner" hidden />
        )}

        <Toolbar
          period={period}
          membershipType={membershipType}
          refreshDisabled={refreshDisabled}
          onPeriodChange={setPeriod}
          onMembershipTypeChange={setMembershipType}
          onRefresh={loadDashboard}
          onExport={handleExportSnapshot}
        />

        <KpiGrid kpis={data?.kpis ?? []} loading={loading} />

        <div className="dashboard-grid">
          <GoalsPanel goals={data?.goals ?? []} loading={loading} />

          <TierPanel
            tierMixPaid={data?.tierMixPaid ?? EMPTY_TIER_MIX}
            tierMixHonorary={data?.tierMixHonorary ?? EMPTY_TIER_MIX}
            total={data?.totalMemberCount ?? 0}
            honoraryCount={data?.honoraryCount ?? 0}
            paidCount={data?.paidCount ?? 0}
            loading={loading}
          />

          <GrowthChart
            monthly={data?.monthly ?? []}
            loading={loading}
            onMonthClick={handleMonthClick}
          />

          <EventsPanel
            events={data?.events ?? []}
            undatedPipelineCount={data?.undatedPipelineCount ?? 0}
            loading={loading}
          />

          <MembersTables members={data?.members ?? []} loading={loading} />
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
