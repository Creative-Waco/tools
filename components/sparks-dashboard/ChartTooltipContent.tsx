import type { ReactNode } from "react";
import { escapeHtml, formatNumber } from "./utils";

export function ChartTooltipRow({
  swatchClass,
  label,
  value,
}: {
  swatchClass: string;
  label: string;
  value: string;
}) {
  return (
    <div className="chart-tooltip__row">
      <i className={`swatch ${swatchClass}`} aria-hidden="true" />
      <span className="chart-tooltip__label">{escapeHtml(label)}</span>
      <strong className="chart-tooltip__value">{escapeHtml(value)}</strong>
    </div>
  );
}

export function ChartTooltipBody({
  title,
  rows,
}: {
  title: string;
  rows: React.ReactNode;
}) {
  return (
    <>
      <p className="chart-tooltip__title">{escapeHtml(title)}</p>
      <div className="chart-tooltip__rows">{rows}</div>
    </>
  );
}

export function growthMonthTooltipContent(el: HTMLElement) {
  const paid = Number(el.dataset.tipPaid ?? 0);
  const honorary = Number(el.dataset.tipHonorary ?? 0);
  const events = Number(el.dataset.tipEvents ?? 0);
  const label = el.dataset.tipTitle ?? "Month";

  return (
    <ChartTooltipBody
      title={label}
      rows={
        <>
          <ChartTooltipRow swatchClass="swatch--members" label="New paid" value={formatNumber(paid)} />
          <ChartTooltipRow
            swatchClass="swatch--honorary"
            label="New honorary"
            value={formatNumber(honorary)}
          />
          <ChartTooltipRow
            swatchClass="swatch--events"
            label="Events held"
            value={formatNumber(events)}
          />
        </>
      }
    />
  );
}

export function tierLegendTooltipContent(el: HTMLElement) {
  const tier = el.dataset.tipTier ?? "";
  const paid = Number(el.dataset.tipPaid ?? 0);
  const honorary = Number(el.dataset.tipHonorary ?? 0);
  const pct = el.dataset.tipPct ?? "0";

  return (
    <ChartTooltipBody
      title={tier.charAt(0).toUpperCase() + tier.slice(1)}
      rows={
        <>
          <ChartTooltipRow
            swatchClass={`tier-swatch tier-swatch--${tier}`}
            label="Paid"
            value={formatNumber(paid)}
          />
          {honorary > 0 ? (
            <ChartTooltipRow
              swatchClass="swatch--honorary"
              label="Honorary"
              value={formatNumber(honorary)}
            />
          ) : null}
          <ChartTooltipRow swatchClass="swatch--total" label="Share of total" value={`${pct}%`} />
        </>
      }
    />
  );
}

export function tierDonutTooltipContent(el: HTMLElement) {
  return (
    <ChartTooltipBody
      title="Membership mix"
      rows={
        <>
          <ChartTooltipRow
            swatchClass="swatch--members"
            label="Paid"
            value={formatNumber(Number(el.dataset.tipPaid ?? 0))}
          />
          <ChartTooltipRow
            swatchClass="swatch--honorary"
            label="Honorary"
            value={formatNumber(Number(el.dataset.tipHonorary ?? 0))}
          />
          <ChartTooltipRow
            swatchClass="swatch--total"
            label="Total members"
            value={formatNumber(Number(el.dataset.tipTotal ?? 0))}
          />
        </>
      }
    />
  );
}

export function goalTooltipContent(el: HTMLElement) {
  const title = el.dataset.tipTitle ?? "Goal";
  const rows = (el.dataset.tipRows ?? "")
    .split("|")
    .filter(Boolean)
    .map((row) => {
      const [swatch, label, value] = row.split("::");
      return { swatch, label, value };
    });

  return (
    <ChartTooltipBody
      title={title}
      rows={
        <>
          {rows.map((row) => (
            <ChartTooltipRow
              key={`${row.swatch}-${row.label}`}
              swatchClass={row.swatch}
              label={row.label}
              value={row.value}
            />
          ))}
        </>
      }
    />
  );
}

export function resolveChartTooltipContent(hit: HTMLElement): ReactNode | null {
  if (hit.classList.contains("growth-month")) return growthMonthTooltipContent(hit);
  if (hit.classList.contains("tier-legend__item")) return tierLegendTooltipContent(hit);
  if (hit.classList.contains("tier-donut")) return tierDonutTooltipContent(hit);
  if (hit.classList.contains("goal__bar")) return goalTooltipContent(hit);
  return null;
}
