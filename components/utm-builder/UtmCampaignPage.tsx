"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  readCachedCampaignHistory,
  writeCachedCampaignHistory,
} from "@/components/utm-builder/campaign-cache";
import { CampaignTracker } from "@/components/utm-builder/CampaignTracker";
import { UtmBuilderTool } from "@/components/utm-builder/UtmBuilderTool";
import type {
  Ga4UtmHistoryEntry,
  Ga4UtmHistoryResult,
} from "@/lib/utm-builder/ga4-history-types";

type LoadEntryRequest = {
  entry: Ga4UtmHistoryEntry;
  key: number;
};

export function UtmCampaignPage() {
  const [days, setDays] = useState(90);
  const [ga4History, setGa4History] = useState<Ga4UtmHistoryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadEntryRequest, setLoadEntryRequest] = useState<LoadEntryRequest | null>(null);
  const loadedDaysRef = useRef<number | null>(null);

  const loadHistory = useCallback(async (rangeDays: number, force = false) => {
    const cached = readCachedCampaignHistory(rangeDays);

    if (cached && !force) {
      setGa4History(cached);
      setLoading(false);
      loadedDaysRef.current = rangeDays;
      return;
    }

    if (!cached) {
      setLoading(true);
    }

    try {
      const response = await fetch(`/api/utm-builder/history?days=${rangeDays}&limit=500`);
      const data = (await response.json()) as Ga4UtmHistoryResult;
      setGa4History(data);
      if (data.configured) {
        writeCachedCampaignHistory(rangeDays, data);
      }
      loadedDaysRef.current = rangeDays;
    } catch {
      setGa4History({
        configured: false,
        message: "Could not load campaign data from GA4.",
      });
      loadedDaysRef.current = rangeDays;
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (loadedDaysRef.current === days) return;
    void loadHistory(days);
  }, [days, loadHistory]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadHistory(days, true);
  }

  function handleLoadEntry(entry: Ga4UtmHistoryEntry) {
    setLoadEntryRequest({ entry, key: Date.now() });
    document.getElementById("utm-builder")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="grid gap-5">
      <CampaignTracker
        data={ga4History}
        loading={loading}
        refreshing={refreshing}
        days={days}
        onDaysChange={setDays}
        onRefresh={() => void handleRefresh()}
        onLoadEntry={handleLoadEntry}
      />

      <section id="utm-builder" className="panel">
        <h2 className="m-0 mb-4 text-lg font-semibold">Build a tagged URL</h2>
        <UtmBuilderTool ga4History={ga4History} loadEntryRequest={loadEntryRequest} />
      </section>
    </div>
  );
}
