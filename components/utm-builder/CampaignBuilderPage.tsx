"use client";

import { useCallback, useEffect, useState } from "react";

import { CampaignList } from "@/components/utm-builder/CampaignList";
import { CampaignWorkspace } from "@/components/utm-builder/CampaignWorkspace";
import { CampaignTracker } from "@/components/utm-builder/CampaignTracker";
import { NewCampaignDialog } from "@/components/utm-builder/NewCampaignDialog";
import {
  readCachedCampaignHistory,
  writeCachedCampaignHistory,
} from "@/components/utm-builder/campaign-cache";
import type { CampaignsApiResponse } from "@/lib/utm-builder/campaign-types";
import type { Ga4UtmHistoryResult } from "@/lib/utm-builder/ga4-history-types";

type TabId = "campaigns" | "all-ga4";

export function CampaignBuilderPage() {
  const [tab, setTab] = useState<TabId>("campaigns");
  const [days, setDays] = useState(90);
  const [data, setData] = useState<CampaignsApiResponse | null>(null);
  const [ga4History, setGa4History] = useState<Ga4UtmHistoryResult | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [configMessage, setConfigMessage] = useState("");

  const loadCampaigns = useCallback(async (force = false) => {
    if (!force) setLoading(true);

    try {
      const response = await fetch(`/api/utm-builder/campaigns?days=${days}`);
      const payload = (await response.json()) as CampaignsApiResponse;
      setData(payload);

      if (!payload.configured) {
        setConfigMessage(payload.message ?? "Airtable is not configured.");
      } else {
        setConfigMessage("");
        setSelectedId((current) => current ?? payload.campaigns[0]?.id ?? null);
      }
    } catch {
      setConfigMessage("Could not load campaigns.");
      setData({ configured: false, campaigns: [] });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [days]);

  const loadGa4History = useCallback(async (force = false) => {
    const cached = readCachedCampaignHistory(days);
    if (cached && !force) {
      setGa4History(cached);
      return;
    }

    try {
      const response = await fetch(`/api/utm-builder/history?days=${days}&limit=500`);
      const payload = (await response.json()) as Ga4UtmHistoryResult;
      setGa4History(payload);
      if (payload.configured) writeCachedCampaignHistory(days, payload);
    } catch {
      setGa4History({ configured: false, message: "Could not load GA4 history." });
    }
  }, [days]);

  useEffect(() => {
    void loadCampaigns();
    void loadGa4History();
  }, [days, loadCampaigns, loadGa4History]);

  const selectedCampaign =
    data?.campaigns.find((campaign) => campaign.id === selectedId) ?? null;

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([loadCampaigns(true), loadGa4History(true)]);
  }

  return (
    <div className="campaign-builder">
      <div className="campaign-builder-tabs">
        <button
          type="button"
          className={`campaign-builder-tab${tab === "campaigns" ? " campaign-builder-tab--active" : ""}`}
          onClick={() => setTab("campaigns")}
        >
          My campaigns
        </button>
        <button
          type="button"
          className={`campaign-builder-tab${tab === "all-ga4" ? " campaign-builder-tab--active" : ""}`}
          onClick={() => setTab("all-ga4")}
        >
          All GA4
        </button>
      </div>

      {configMessage && tab === "campaigns" ? (
        <div className="campaign-builder-banner panel" role="status">
          {configMessage} Add <code>AIRTABLE_API_KEY</code> and <code>AIRTABLE_BASE_ID</code> to
          use the Campaign Builder.
        </div>
      ) : null}

      {tab === "campaigns" ? (
        <div className="campaign-builder-layout">
          <CampaignList
            campaigns={data?.campaigns ?? []}
            selectedId={selectedId}
            loading={loading}
            onSelect={setSelectedId}
            onNewCampaign={() => setDialogOpen(true)}
          />

          <div className="campaign-builder-main">
            {selectedCampaign ? (
              <CampaignWorkspace
                campaign={selectedCampaign}
                days={days}
                onRefresh={handleRefresh}
                refreshing={refreshing}
              />
            ) : (
              <div className="campaign-builder-empty panel">
                <h2 className="text-lg font-semibold">Select a campaign</h2>
                <p className="text-sm text-muted-foreground">
                  Pick a campaign from the list or create a new one to start adding tagged links.
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setDialogOpen(true)}
                >
                  New campaign
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <CampaignTracker
          data={ga4History}
          loading={loading && !ga4History}
          refreshing={refreshing}
          days={days}
          onDaysChange={setDays}
          onRefresh={handleRefresh}
          onLoadEntry={() => {}}
        />
      )}

      <NewCampaignDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={(campaignId) => {
          setSelectedId(campaignId);
          void loadCampaigns(true);
        }}
      />
    </div>
  );
}
