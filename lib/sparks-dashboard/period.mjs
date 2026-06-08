/** Calendar-year period ranges for dashboard filters. */

export function getPeriodRange(period, now = new Date()) {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const year = now.getFullYear();
  const month = now.getMonth();

  if (period === "month") {
    const start = new Date(year, month, 1);
    const prevEnd = new Date(start);
    prevEnd.setMilliseconds(-1);
    const prevStart = new Date(year, month - 1, 1);
    return { start, end, prevStart, prevEnd };
  }

  if (period === "quarter") {
    const qStartMonth = Math.floor(month / 3) * 3;
    const start = new Date(year, qStartMonth, 1);
    const prevEnd = new Date(start);
    prevEnd.setMilliseconds(-1);
    const prevStart = new Date(year, qStartMonth - 3, 1);
    return { start, end, prevStart, prevEnd };
  }

  if (period === "year") {
    const start = new Date(year - 1, month, now.getDate());
    start.setHours(0, 0, 0, 0);
    const prevEnd = new Date(start);
    prevEnd.setMilliseconds(-1);
    const prevStart = new Date(start);
    prevStart.setFullYear(prevStart.getFullYear() - 1);
    return { start, end, prevStart, prevEnd };
  }

  // fy — calendar year to date
  const start = new Date(year, 0, 1);
  const prevStart = new Date(year - 1, 0, 1);
  const prevEnd = new Date(year - 1, month, now.getDate());
  prevEnd.setHours(23, 59, 59, 999);
  return { start, end, prevStart, prevEnd };
}

export function isInRange(iso, range) {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return d >= range.start && d <= range.end;
}

export function monthKey(date) {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function last12MonthLabels(now = new Date()) {
  const labels = [];
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push({
      key: monthKey(d),
      label: d.toLocaleDateString("en-US", { month: "short" }),
    });
  }
  return labels;
}

export function addYears(iso, years) {
  const d = new Date(iso);
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}
