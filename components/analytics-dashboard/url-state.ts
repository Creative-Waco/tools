import {
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  parseISO,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from "date-fns";
import type { DateRange } from "react-day-picker";

import {
  getProgramSeasonLabel,
  getProgramSeasonRange,
  hasProgramSeason,
  PROGRAM_SEASON_SLUG,
  programSeasonMatchesRange,
} from "./program-seasons";
import { PROGRAM_OPTIONS } from "./programs";

export const DASHBOARD_PRESETS = [
  {
    label: "Today",
    slug: "today",
    getValue: () => ({ from: new Date(), to: new Date() }),
  },
  {
    label: "This week",
    slug: "this-week",
    getValue: () => ({
      from: startOfWeek(new Date()),
      to: endOfWeek(new Date()),
    }),
  },
  {
    label: "This month",
    slug: "this-month",
    getValue: () => ({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    }),
  },
  {
    label: "Last 7 days",
    slug: "last-7-days",
    getValue: () => ({ from: subDays(new Date(), 6), to: new Date() }),
  },
  {
    label: "Last 30 days",
    slug: "last-30-days",
    getValue: () => ({ from: subDays(new Date(), 29), to: new Date() }),
  },
  {
    label: "Last 3 months",
    slug: "last-3-months",
    getValue: () => ({ from: subMonths(new Date(), 3), to: new Date() }),
  },
] as const;

export const DEFAULT_PRESET = DASHBOARD_PRESETS[4];

const PROGRAM_IDS = new Set(PROGRAM_OPTIONS.map((program) => program.id));

export type DashboardUrlState = {
  programId: string;
  dateRange: DateRange;
  presetLabel: string;
};

export type DashboardPreset = {
  label: string;
  slug: string;
  getValue: () => DateRange;
};

function parseDateParam(value: string | null) {
  if (!value) return null;
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeProgramId(value: string | null) {
  const id = value?.trim() || "all";
  return PROGRAM_IDS.has(id) ? id : "all";
}

function rangesMatch(a: DateRange, b: DateRange) {
  if (!a.from || !a.to || !b.from || !b.to) return false;
  return isSameDay(a.from, b.from) && isSameDay(a.to, b.to);
}

export function getDatePresetsForProgram(programId: string): DashboardPreset[] {
  const presets: DashboardPreset[] = [...DASHBOARD_PRESETS];

  if (hasProgramSeason(programId)) {
    const label = getProgramSeasonLabel(programId)!;
    presets.push({
      label,
      slug: PROGRAM_SEASON_SLUG,
      getValue: () => getProgramSeasonRange(programId)!,
    });
  }

  return presets;
}

export function presetLabelForRange(
  dateRange: DateRange | undefined,
  programId = "all",
) {
  if (!dateRange?.from || !dateRange?.to) return "Custom";

  for (const preset of DASHBOARD_PRESETS) {
    const value = preset.getValue();
    if (rangesMatch(dateRange, value)) return preset.label;
  }

  if (programSeasonMatchesRange(programId, dateRange)) {
    return getProgramSeasonLabel(programId) ?? "Custom";
  }

  return "Custom";
}

export function presetSlugForLabel(label: string, programId = "all") {
  const globalPreset = DASHBOARD_PRESETS.find((preset) => preset.label === label);
  if (globalPreset) return globalPreset.slug;

  if (
    hasProgramSeason(programId) &&
    label === getProgramSeasonLabel(programId)
  ) {
    return PROGRAM_SEASON_SLUG;
  }

  return null;
}

export function readDashboardUrlState(
  search = typeof window !== "undefined" ? window.location.search : "",
): DashboardUrlState {
  const params = new URLSearchParams(search);
  const programId = normalizeProgramId(params.get("program"));
  const presetSlug = params.get("preset")?.trim() ?? "";

  if (presetSlug === PROGRAM_SEASON_SLUG && hasProgramSeason(programId)) {
    const dateRange = getProgramSeasonRange(programId);
    if (dateRange?.from && dateRange?.to) {
      return {
        programId,
        dateRange,
        presetLabel: getProgramSeasonLabel(programId)!,
      };
    }
  }

  const preset = DASHBOARD_PRESETS.find((item) => item.slug === presetSlug);

  if (preset) {
    return {
      programId,
      dateRange: preset.getValue(),
      presetLabel: preset.label,
    };
  }

  const startDate = parseDateParam(params.get("startDate"));
  const endDate = parseDateParam(params.get("endDate"));

  if (startDate && endDate && startDate <= endDate) {
    const dateRange = { from: startDate, to: endDate };
    return {
      programId,
      dateRange,
      presetLabel: presetLabelForRange(dateRange, programId),
    };
  }

  return {
    programId,
    dateRange: DEFAULT_PRESET.getValue(),
    presetLabel: DEFAULT_PRESET.label,
  };
}

export function buildDashboardSearchParams(
  programId: string,
  dateRange: DateRange | undefined,
  presetLabel: string,
) {
  const params = new URLSearchParams();

  if (programId && programId !== "all") {
    params.set("program", programId);
  }

  const presetSlug = presetSlugForLabel(presetLabel, programId);
  if (presetSlug && presetLabel !== "Custom") {
    params.set("preset", presetSlug);
    return params;
  }

  if (dateRange?.from) {
    params.set("startDate", format(dateRange.from, "yyyy-MM-dd"));
  }
  if (dateRange?.to) {
    params.set("endDate", format(dateRange.to, "yyyy-MM-dd"));
  }

  return params;
}

export function buildDashboardPath(
  programId: string,
  dateRange: DateRange | undefined,
  presetLabel: string,
) {
  const params = buildDashboardSearchParams(programId, dateRange, presetLabel);
  const query = params.toString();
  return query
    ? `/analytics-dashboard/?${query}`
    : "/analytics-dashboard/";
}
