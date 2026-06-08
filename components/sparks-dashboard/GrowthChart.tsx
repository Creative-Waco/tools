import type { MonthlyRow } from "./types";
import { escapeHtml, formatMonthHeading } from "./utils";

type GrowthChartProps = {
  monthly: MonthlyRow[];
  loading?: boolean;
  onMonthClick: (monthKey: string) => void;
};

function SkeletonGrowthChart() {
  return (
    <>
      {Array.from({ length: 12 }, (_, i) => (
        <div key={i} className="skeleton-growth-month" aria-hidden="true">
          <div className="skeleton-growth-bars">
            <span className="skeleton" style={{ height: `${35 + (i % 4) * 14}%` }} />
            <span className="skeleton" style={{ height: `${20 + (i % 3) * 18}%` }} />
          </div>
          <span className="skeleton skeleton--text-sm" style={{ width: "28px" }} />
        </div>
      ))}
    </>
  );
}

export function GrowthChart({ monthly, loading, onMonthClick }: GrowthChartProps) {
  const max = Math.max(
    ...(monthly ?? []).flatMap((m) => [
      (m.membersPaid ?? 0) + (m.membersHonorary ?? 0),
      m.events ?? 0,
    ]),
    1,
  );

  function handleKeyDown(event: React.KeyboardEvent, monthKey: string) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onMonthClick(monthKey);
  }

  return (
    <section className="panel chart-panel chart-panel--wide">
      <div className="panel-header">
        <h2>Growth over time</h2>
        <p className="panel-sub">New members and Spark events per month · click a month for details</p>
      </div>
      <div id="growth-chart" className="growth-chart" aria-label="Monthly growth chart">
        {loading ? (
          <SkeletonGrowthChart />
        ) : (
          (monthly ?? []).map((row) => {
            const membersPaid = row.membersPaid ?? 0;
            const membersHonorary = row.membersHonorary ?? 0;
            const paidH = Math.round((membersPaid / max) * 100);
            const honoraryH = Math.round((membersHonorary / max) * 100);
            const eventH = Math.round(((row.events ?? 0) / max) * 100);
            const monthLabel = row.month ?? row.key;

            return (
              <div
                key={row.key}
                className="growth-month chart-hit growth-month--interactive"
                tabIndex={0}
                role="button"
                aria-label={`View details for ${formatMonthHeading(row.key)}`}
                data-month-key={row.key}
                data-tip-title={monthLabel}
                data-tip-paid={membersPaid}
                data-tip-honorary={membersHonorary}
                data-tip-events={row.events ?? 0}
                onClick={() => onMonthClick(row.key)}
                onKeyDown={(e) => handleKeyDown(e, row.key)}
              >
                <div className="growth-bars">
                  <div className="growth-bar-stack">
                    <div
                      className="growth-bar growth-bar--honorary"
                      style={{ height: `${honoraryH}%` }}
                    />
                    <div
                      className="growth-bar growth-bar--members"
                      style={{ height: `${paidH}%` }}
                    />
                  </div>
                  <div className="growth-bar growth-bar--events" style={{ height: `${eventH}%` }} />
                </div>
                <span className="growth-month__label">{escapeHtml(row.month)}</span>
              </div>
            );
          })
        )}
      </div>
      <div className="chart-legend">
        <span className="chart-legend__item">
          <i className="swatch swatch--members" /> New paid
        </span>
        <span className="chart-legend__item">
          <i className="swatch swatch--honorary" /> New honorary
        </span>
        <span className="chart-legend__item">
          <i className="swatch swatch--events" /> Spark events held
        </span>
      </div>
    </section>
  );
}
