import { isSameDay, startOfDay } from "date-fns";
import type { DateRange } from "react-day-picker";

export const PROGRAM_SEASON_SLUG = "last-season";

type CalendarYearSeason = {
  label: string;
  type: "calendar-year";
};

type FixedSeason = {
  label: string;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
  crossesYear?: boolean;
};

export type ProgramSeasonConfig = CalendarYearSeason | FixedSeason;

export const PROGRAM_SEASONS: Record<string, ProgramSeasonConfig> = {
  "creative-spark": {
    label: "Previous calendar year",
    type: "calendar-year",
  },
  events: {
    label: "Previous calendar year",
    type: "calendar-year",
  },
  "dia-de-los-muertos": {
    label: "Last Día de los Muertos season",
    startMonth: 10,
    startDay: 1,
    endMonth: 11,
    endDay: 15,
  },
  levitt: {
    label: "Last concert season",
    startMonth: 5,
    startDay: 1,
    endMonth: 9,
    endDay: 30,
  },
  artprenticeship: {
    label: "Last program year",
    startMonth: 8,
    startDay: 1,
    endMonth: 5,
    endDay: 31,
    crossesYear: true,
  },
  "waco-wonderland": {
    label: "Last parade season",
    startMonth: 11,
    startDay: 15,
    endMonth: 12,
    endDay: 31,
  },
  sponsorship: {
    label: "Previous calendar year",
    type: "calendar-year",
  },
};

function buildSeasonWindow(config: FixedSeason, anchorYear: number) {
  const from = startOfDay(
    new Date(anchorYear, config.startMonth - 1, config.startDay),
  );
  const endYear = config.crossesYear ? anchorYear + 1 : anchorYear;
  const to = startOfDay(
    new Date(endYear, config.endMonth - 1, config.endDay),
  );
  return { from, to };
}

export function getProgramSeasonLabel(programId: string) {
  return PROGRAM_SEASONS[programId]?.label ?? null;
}

export function hasProgramSeason(programId: string) {
  return programId !== "all" && programId in PROGRAM_SEASONS;
}

export function getProgramSeasonRange(
  programId: string,
  ref = new Date(),
): DateRange | null {
  const config = PROGRAM_SEASONS[programId];
  if (!config) return null;

  if ("type" in config) {
    const year = ref.getFullYear() - 1;
    return {
      from: startOfDay(new Date(year, 0, 1)),
      to: startOfDay(new Date(year, 11, 31)),
    };
  }

  return resolveFixedSeasonRange(config, ref);
}

function resolveFixedSeasonRange(config: FixedSeason, ref: Date): DateRange {
  const years = [ref.getFullYear() - 1, ref.getFullYear(), ref.getFullYear() + 1];
  const windows = years.map((year) => buildSeasonWindow(config, year));

  const active = windows.find((window) => ref >= window.from && ref <= window.to);
  if (active) {
    return { from: active.from, to: startOfDay(ref) };
  }

  const completed = windows
    .filter((window) => window.to < ref)
    .sort((a, b) => b.to.getTime() - a.to.getTime())[0];
  if (completed) return completed;

  return windows[windows.length - 1];
}

export function programSeasonMatchesRange(
  programId: string,
  dateRange: DateRange | undefined,
  ref = new Date(),
) {
  if (!dateRange?.from || !dateRange?.to || !hasProgramSeason(programId)) {
    return false;
  }

  const seasonRange = getProgramSeasonRange(programId, ref);
  if (!seasonRange?.from || !seasonRange?.to) return false;

  return (
    isSameDay(dateRange.from, seasonRange.from) &&
    isSameDay(dateRange.to, seasonRange.to)
  );
}
