"use client";

import { Megaphone, Pause, Play, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { MetricCard } from "@/components/cw/MetricCard";
import { StatusPill } from "@/components/cw/StatusPill";
import { ToolPanel } from "@/components/cw/ToolPanel";
import { ToolSection } from "@/components/cw/ToolSection";
import { StatusLine } from "@/components/StatusLine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

import type {
  GoogleAdsCampaign,
  GoogleAdsDashboardData,
  GoogleAdsRange,
  GoogleAdsStatusFilter,
} from "./types";

const RANGE_OPTIONS: { value: GoogleAdsRange; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];

const STATUS_OPTIONS: { value: GoogleAdsStatusFilter; label: string }[] = [
  { value: "all", label: "All active" },
  { value: "enabled", label: "Enabled only" },
  { value: "paused", label: "Paused only" },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function statusVariant(status: string) {
  if (status === "ENABLED") return "success" as const;
  if (status === "PAUSED") return "warning" as const;
  return "muted" as const;
}

function SetupPanel({ missing }: { missing: string[] }) {
  return (
    <ToolPanel className="space-y-4">
      <div className="flex items-start gap-3">
        <Megaphone className="mt-0.5 size-5 text-spark-muted" aria-hidden />
        <div className="space-y-2">
          <h2 className="text-lg font-semibold tracking-tight">
            Connect Google Ads
          </h2>
          <p className="m-0 text-sm text-muted-foreground">
            Add OAuth credentials and your Google Ads customer ID to env vars
            (see README). This page lists campaigns, shows spend metrics, and
            lets you pause or enable campaigns and adjust daily budgets.
          </p>
          <p className="m-0 text-sm text-muted-foreground">
            Missing:{" "}
            <code className="text-xs">{missing.join(", ")}</code>
          </p>
        </div>
      </div>
    </ToolPanel>
  );
}

function CampaignRow({
  campaign,
  onUpdated,
}: {
  campaign: GoogleAdsCampaign;
  onUpdated: (message: string, variant?: "success" | "error") => void;
}) {
  const [budgetDraft, setBudgetDraft] = useState(
    campaign.dailyBudget > 0 ? String(campaign.dailyBudget) : "",
  );
  const [busy, setBusy] = useState<"status" | "budget" | null>(null);

  useEffect(() => {
    setBudgetDraft(
      campaign.dailyBudget > 0 ? String(campaign.dailyBudget) : "",
    );
  }, [campaign.dailyBudget]);

  const canToggle = campaign.status === "ENABLED" || campaign.status === "PAUSED";
  const nextStatus = campaign.status === "ENABLED" ? "PAUSED" : "ENABLED";

  async function patchCampaign(body: Record<string, unknown>) {
    const response = await fetch(`/api/google-ads/campaigns/${campaign.id}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error ?? "Update failed.");
    }
    return payload;
  }

  async function handleToggle() {
    if (!canToggle) return;
    setBusy("status");
    try {
      await patchCampaign({ status: nextStatus });
      onUpdated(
        `${campaign.name} is now ${nextStatus === "ENABLED" ? "enabled" : "paused"}.`,
        "success",
      );
    } catch (error) {
      onUpdated(
        error instanceof Error ? error.message : "Could not update campaign.",
        "error",
      );
    } finally {
      setBusy(null);
    }
  }

  async function handleBudgetSave() {
    if (!campaign.budgetResourceName) {
      onUpdated("This campaign has no editable budget resource.", "error");
      return;
    }

    const amount = Number(budgetDraft);
    if (!Number.isFinite(amount) || amount <= 0) {
      onUpdated("Enter a positive daily budget.", "error");
      return;
    }

    setBusy("budget");
    try {
      await patchCampaign({
        dailyBudget: amount,
        budgetResourceName: campaign.budgetResourceName,
      });
      onUpdated(`Daily budget updated to ${formatCurrency(amount)}.`, "success");
    } catch (error) {
      onUpdated(
        error instanceof Error ? error.message : "Could not update budget.",
        "error",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <tr className="border-b border-line last:border-b-0">
      <td className="px-3 py-3 align-top">
        <div className="font-medium">{campaign.name}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          {campaign.channelType} · ID {campaign.id}
        </div>
      </td>
      <td className="px-3 py-3 align-top">
        <StatusPill variant={statusVariant(campaign.status)}>
          {campaign.status}
        </StatusPill>
      </td>
      <td className="px-3 py-3 align-top tabular-nums">
        {formatCurrency(campaign.spend)}
      </td>
      <td className="px-3 py-3 align-top tabular-nums">
        {formatNumber(campaign.clicks)}
      </td>
      <td className="px-3 py-3 align-top tabular-nums">
        {formatNumber(campaign.impressions)}
      </td>
      <td className="px-3 py-3 align-top tabular-nums">
        {formatNumber(campaign.conversions)}
      </td>
      <td className="px-3 py-3 align-top">
        <div className="flex min-w-[9rem] items-center gap-2">
          <Input
            type="number"
            min="1"
            step="0.01"
            value={budgetDraft}
            onChange={(event) => setBudgetDraft(event.target.value)}
            className="h-8 bg-card"
            aria-label={`Daily budget for ${campaign.name}`}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy !== null}
            onClick={handleBudgetSave}
          >
            Save
          </Button>
        </div>
      </td>
      <td className="px-3 py-3 align-top">
        <Button
          type="button"
          size="sm"
          variant={campaign.status === "ENABLED" ? "outline" : "default"}
          disabled={!canToggle || busy !== null}
          onClick={handleToggle}
        >
          {campaign.status === "ENABLED" ? (
            <>
              <Pause className="size-3.5" aria-hidden />
              Pause
            </>
          ) : (
            <>
              <Play className="size-3.5" aria-hidden />
              Enable
            </>
          )}
        </Button>
      </td>
    </tr>
  );
}

export function GoogleAdsDashboard() {
  const [range, setRange] = useState<GoogleAdsRange>("30d");
  const [statusFilter, setStatusFilter] = useState<GoogleAdsStatusFilter>("all");
  const [data, setData] = useState<GoogleAdsDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusVariant, setStatusVariant] = useState<"" | "success" | "error">(
    "",
  );

  const load = useCallback(async () => {
    setLoading(true);
    setStatusMessage("");
    setStatusVariant("");

    try {
      const params = new URLSearchParams({ range, status: statusFilter });
      const response = await fetch(`/api/google-ads/?${params.toString()}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as GoogleAdsDashboardData;

      if (!response.ok && payload.error) {
        setData({ configured: true, error: payload.error });
        setStatusMessage(payload.error);
        setStatusVariant("error");
        return;
      }

      setData(payload);
      if (payload.error) {
        setStatusMessage(payload.error);
        setStatusVariant("error");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not load Google Ads.";
      setData({ configured: true, error: message });
      setStatusMessage(message);
      setStatusVariant("error");
    } finally {
      setLoading(false);
    }
  }, [range, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = data?.summary;
  const campaigns = data?.campaigns ?? [];

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      <Select
        value={range}
        onValueChange={(value) => setRange(value as GoogleAdsRange)}
      >
        <SelectTrigger className="w-full bg-card sm:w-[10rem]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {RANGE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={statusFilter}
        onValueChange={(value) =>
          setStatusFilter(value as GoogleAdsStatusFilter)
        }
      >
        <SelectTrigger className="w-full bg-card sm:w-[10rem]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button type="button" variant="outline" onClick={() => void load()}>
        <RefreshCw className={cn("size-4", loading && "animate-spin")} />
        Refresh
      </Button>

      {data?.customerId ? (
        <span className="text-xs text-muted-foreground">
          Account {data.customerId}
        </span>
      ) : null}
    </div>
  );

  const handleRowUpdated = useCallback(
    (message: string, variant: "success" | "error" = "success") => {
      setStatusMessage(message);
      setStatusVariant(variant);
      void load();
    },
    [load],
  );

  const metricCards = useMemo(() => {
    if (!summary) return null;

    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Spend"
          value={formatCurrency(summary.spend)}
          footnote={RANGE_OPTIONS.find((option) => option.value === range)?.label}
          accent
        />
        <MetricCard
          label="Clicks"
          value={formatNumber(summary.clicks)}
          footnote={`${summary.enabledCount} enabled · ${summary.pausedCount} paused`}
        />
        <MetricCard
          label="Impressions"
          value={formatNumber(summary.impressions)}
        />
        <MetricCard
          label="Conversions"
          value={formatNumber(summary.conversions)}
        />
      </div>
    );
  }, [range, summary]);

  if (!loading && data && !data.configured) {
    return <SetupPanel missing={data.missing ?? []} />;
  }

  return (
    <div className="space-y-6">
      <ToolSection title="Filters">{toolbar}</ToolSection>

      {statusMessage ? (
        <StatusLine message={statusMessage} variant={statusVariant} />
      ) : null}

      {loading && !summary ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-panel" />
          ))}
        </div>
      ) : (
        metricCards
      )}

      <ToolPanel className="overflow-x-auto p-0">
        <table className="w-full min-w-[960px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-widest text-muted-foreground">
              <th className="px-3 py-3 font-medium">Campaign</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3 font-medium">Spend</th>
              <th className="px-3 py-3 font-medium">Clicks</th>
              <th className="px-3 py-3 font-medium">Impressions</th>
              <th className="px-3 py-3 font-medium">Conv.</th>
              <th className="px-3 py-3 font-medium">Daily budget</th>
              <th className="px-3 py-3 font-medium">Controls</th>
            </tr>
          </thead>
          <tbody>
            {loading && campaigns.length === 0
              ? Array.from({ length: 4 }).map((_, index) => (
                  <tr key={index} className="border-b border-line">
                    <td className="px-3 py-4" colSpan={8}>
                      <Skeleton className="h-5 w-full" />
                    </td>
                  </tr>
                ))
              : null}

            {!loading && campaigns.length === 0 ? (
              <tr>
                <td
                  className="px-3 py-8 text-center text-muted-foreground"
                  colSpan={8}
                >
                  No campaigns match these filters.
                </td>
              </tr>
            ) : null}

            {campaigns.map((campaign) => (
              <CampaignRow
                key={campaign.id}
                campaign={campaign}
                onUpdated={handleRowUpdated}
              />
            ))}
          </tbody>
        </table>
      </ToolPanel>
    </div>
  );
}
