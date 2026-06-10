const TZ = "America/Chicago";

export const RANGE_PRESET_OPTIONS = [
  { id: "upcoming", label: "Upcoming from today" },
  { id: "next-1-week", label: "Next 1 week" },
  { id: "next-2-weeks", label: "Next 2 weeks" },
  { id: "next-4-weeks", label: "Next 4 weeks" },
  { id: "next-2-months", label: "Next 2 months" },
  { id: "next-6-months", label: "Next 6 months" },
  { id: "custom", label: "Custom dates…" },
];

export function monthRangeValue(yearMonth) {
  return `month:${yearMonth}`;
}

export function parseRangeSelection(value) {
  if (String(value).startsWith("month:")) {
    return { type: "month", month: String(value).slice(6) };
  }
  if (value === "custom") {
    return { type: "custom" };
  }
  return { type: "preset", preset: value };
}

export function formatShortDateInput(value) {
  const parts = parseDateInput(value);
  if (!parts) return "";
  const date = new Date(parts.year, parts.month - 1, parts.day);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: TZ,
  }).format(date);
}

export function describeRangeSelection({ selection, fromDate, toDate }) {
  const parsed = parseRangeSelection(selection);
  if (parsed.type === "preset" && parsed.preset === "upcoming") {
    return "Events from today onward";
  }
  if (fromDate && toDate) {
    return `${formatShortDateInput(fromDate)} – ${formatShortDateInput(toDate)}`;
  }
  if (fromDate) {
    return `From ${formatShortDateInput(fromDate)}`;
  }
  if (toDate) {
    return `Through ${formatShortDateInput(toDate)}`;
  }
  return "";
}

function datePartsInTz(date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  return {
    year: Number(parts.find((part) => part.type === "year")?.value ?? 0),
    month: Number(parts.find((part) => part.type === "month")?.value ?? 0),
    day: Number(parts.find((part) => part.type === "day")?.value ?? 0),
  };
}

export function todayDateInput() {
  const { year, month, day } = datePartsInTz(new Date());
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function toDateInputValue(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const { year, month, day } = datePartsInTz(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseDateInput(value) {
  const match = String(value ?? "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

export function addDaysToDateInput(value, days) {
  const parts = parseDateInput(value);
  if (!parts) return "";
  const date = new Date(parts.year, parts.month - 1, parts.day + days);
  return toDateInputValue(date);
}

export function addMonthsToDateInput(value, months) {
  const parts = parseDateInput(value);
  if (!parts) return "";
  const date = new Date(parts.year, parts.month - 1 + months, parts.day);
  return toDateInputValue(date);
}

export function lastDayOfMonth(yearMonth) {
  const match = String(yearMonth).match(/^(\d{4})-(\d{2})$/);
  if (!match) return "";
  const year = Number(match[1]);
  const month = Number(match[2]);
  const date = new Date(year, month, 0);
  return toDateInputValue(date);
}

export function monthBounds(yearMonth) {
  const match = String(yearMonth).match(/^(\d{4})-(\d{2})$/);
  if (!match) return { fromDate: "", toDate: "" };
  return {
    fromDate: `${match[1]}-${match[2]}-01`,
    toDate: lastDayOfMonth(yearMonth),
  };
}

export function yearMonthFromDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const { year, month } = datePartsInTz(date);
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function formatMonthLabel(yearMonth) {
  const match = String(yearMonth).match(/^(\d{4})-(\d{2})$/);
  if (!match) return yearMonth;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, 1);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: TZ,
  }).format(date);
}

export function getRangeForPreset(presetId, baseDate = todayDateInput()) {
  switch (presetId) {
    case "upcoming":
      return { fromDate: "", toDate: "", upcomingOnly: true };
    case "next-1-week":
      return {
        fromDate: baseDate,
        toDate: addDaysToDateInput(baseDate, 7),
        upcomingOnly: false,
      };
    case "next-2-weeks":
      return {
        fromDate: baseDate,
        toDate: addDaysToDateInput(baseDate, 14),
        upcomingOnly: false,
      };
    case "next-4-weeks":
      return {
        fromDate: baseDate,
        toDate: addDaysToDateInput(baseDate, 28),
        upcomingOnly: false,
      };
    case "next-2-months":
      return {
        fromDate: baseDate,
        toDate: addMonthsToDateInput(baseDate, 2),
        upcomingOnly: false,
      };
    case "next-6-months":
      return {
        fromDate: baseDate,
        toDate: addMonthsToDateInput(baseDate, 6),
        upcomingOnly: false,
      };
    case "custom":
    default:
      return { fromDate: "", toDate: "", upcomingOnly: false };
  }
}

export function collectFeedMonths(items) {
  const counts = new Map();

  for (const item of items) {
    const raw = item.eventDate || item.sortDate;
    if (!raw) continue;
    const yearMonth = yearMonthFromDate(raw);
    if (!yearMonth) continue;
    counts.set(yearMonth, (counts.get(yearMonth) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([value, eventCount]) => {
      const { fromDate, toDate } = monthBounds(value);
      return {
        value,
        label: formatMonthLabel(value),
        fromDate,
        toDate,
        eventCount,
      };
    });
}
