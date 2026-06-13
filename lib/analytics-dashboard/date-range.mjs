import { differenceInDays, subDays } from "date-fns";

/**
 * Prior period of equal length immediately before startDate (matches GA4 KPI comparison).
 * @param {Date} startDate
 * @param {Date} endDate
 */
export function comparisonRange(startDate, endDate) {
  const days = differenceInDays(endDate, startDate) + 1;
  const compEnd = subDays(startDate, 1);
  const compStart = subDays(compEnd, days - 1);
  return { startDate: compStart, endDate: compEnd };
}

export function pctChange(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}
