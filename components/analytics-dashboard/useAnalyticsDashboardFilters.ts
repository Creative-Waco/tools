"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DateRange } from "react-day-picker";

import { buildDashboardCacheKey, readCachedDashboard } from "./cache";
import { PROGRAM_SEASON_SLUG } from "./program-seasons";
import { PROGRAM_OPTIONS } from "./programs";
import type { AnalyticsDashboardData } from "./types";
import {
  buildFilteredDashboardPath,
  DEFAULT_PRESET,
  getDatePresetsForProgram,
  presetLabelForRange,
  readDashboardUrlState,
} from "./url-state";
import { fetchAnalyticsDashboard } from "./utils";

type UseAnalyticsDashboardFiltersOptions = {
  pagePath: string;
  buildPath?: (
    programId: string,
    dateRange: DateRange | undefined,
    presetLabel: string,
  ) => string;
};

export function useAnalyticsDashboardFilters({
  pagePath,
  buildPath,
}: UseAnalyticsDashboardFiltersOptions) {
  const skipUrlSync = useRef(true);
  const [urlReady, setUrlReady] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedPreset, setSelectedPreset] = useState("Last 30 days");
  const [programId, setProgramId] = useState("all");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsDashboardData | null>(null);
  const [statusMessage, setStatusMessage] = useState("");

  const isProgramScope = programId !== "all";
  const selectedProgram = PROGRAM_OPTIONS.find((p) => p.id === programId);
  const datePresets = useMemo(
    () => getDatePresetsForProgram(programId),
    [programId],
  );

  useEffect(() => {
    const state = readDashboardUrlState();
    setProgramId(state.programId);
    setDateRange(state.dateRange);
    setSelectedPreset(state.presetLabel);
    setUrlReady(true);
    window.setTimeout(() => {
      skipUrlSync.current = false;
    }, 0);
  }, []);

  useEffect(() => {
    if (skipUrlSync.current || !urlReady) return;

    const nextPath = buildPath
      ? buildPath(programId, dateRange, selectedPreset)
      : buildFilteredDashboardPath(pagePath, programId, dateRange, selectedPreset);
    const currentPath = `${window.location.pathname}${window.location.search}`;

    if (currentPath !== nextPath) {
      window.history.replaceState(null, "", nextPath);
    }
  }, [buildPath, dateRange, pagePath, programId, selectedPreset, urlReady]);

  useEffect(() => {
    const onPopState = () => {
      skipUrlSync.current = true;
      const state = readDashboardUrlState();
      setProgramId(state.programId);
      setDateRange(state.dateRange);
      setSelectedPreset(state.presetLabel);
      window.setTimeout(() => {
        skipUrlSync.current = false;
      }, 0);
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const loadDashboard = useCallback(
    async (force = false) => {
      if (!dateRange?.from || !dateRange?.to) return;

      const cacheKey = buildDashboardCacheKey(programId, dateRange);
      const cached = !force ? readCachedDashboard(cacheKey) : null;

      if (cached) {
        setData(cached);
        setLoading(false);
        setStatusMessage("");
        return;
      }

      setLoading(true);
      setStatusMessage("");

      try {
        const result = await fetchAnalyticsDashboard(dateRange, programId, {
          force,
        });
        setData(result);
      } catch (error) {
        setData(null);
        setStatusMessage(
          error instanceof Error ? error.message : "Could not load analytics.",
        );
      } finally {
        setLoading(false);
      }
    },
    [dateRange, programId],
  );

  useEffect(() => {
    if (!urlReady) return;
    loadDashboard(false);
  }, [urlReady, loadDashboard]);

  const handlePresetChange = (value: string | null) => {
    if (!value) return;
    const preset = datePresets.find((item) => item.label === value);
    if (preset) {
      setDateRange(preset.getValue());
      setSelectedPreset(value);
    }
  };

  const handleProgramChange = (value: string | null) => {
    if (!value) return;
    const nextProgramId = value;
    const nextPresets = getDatePresetsForProgram(nextProgramId);
    const seasonPreset = nextPresets.find(
      (preset) => preset.slug === PROGRAM_SEASON_SLUG,
    );

    setProgramId(nextProgramId);

    if (
      seasonPreset &&
      selectedPreset === seasonPreset.label &&
      nextProgramId !== programId
    ) {
      setDateRange(seasonPreset.getValue());
      setSelectedPreset(seasonPreset.label);
      return;
    }

    if (
      selectedPreset !== "Custom" &&
      !nextPresets.some((preset) => preset.label === selectedPreset)
    ) {
      setDateRange(DEFAULT_PRESET.getValue());
      setSelectedPreset(DEFAULT_PRESET.label);
    }
  };

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range);
    setSelectedPreset(presetLabelForRange(range, programId));
  };

  return {
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
  };
}
