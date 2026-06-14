import type { TierMix } from "./types";
import { TIERS, formatNumber } from "./utils";
import {
  HONORARY_TIER_COLORS,
  PAID_TIER_COLORS,
} from "@/lib/cw-design-tokens";

type TierPanelProps = {
  tierMixPaid: TierMix;
  tierMixHonorary: TierMix;
  total: number;
  honoraryCount: number;
  paidCount: number;
  loading?: boolean;
};

const PAID_COLORS = PAID_TIER_COLORS;
const HONORARY_COLORS = HONORARY_TIER_COLORS;

function buildDonutGradient(tierMixPaid: TierMix, tierMixHonorary: TierMix): string {
  const slices: { count: number; color: string }[] = [];

  for (const tier of TIERS) {
    const paid = tierMixPaid[tier] || 0;
    if (paid > 0) slices.push({ count: paid, color: PAID_COLORS[tier] });
  }
  for (const tier of TIERS) {
    const honorary = tierMixHonorary[tier] || 0;
    if (honorary > 0) slices.push({ count: honorary, color: HONORARY_COLORS[tier] });
  }

  const sum = slices.reduce((acc, slice) => acc + slice.count, 0) || 1;
  let cursor = 0;
  const stops = slices
    .map((slice) => {
      const width = (slice.count / sum) * 100;
      const start = cursor;
      cursor += width;
      return `${slice.color} ${start}% ${cursor}%`;
    })
    .join(", ");

  return sum > 0 ? `conic-gradient(${stops})` : "#efe9df";
}

function SkeletonTier() {
  return (
    <>
      <p id="tier-summary" className="tier-summary">
        <span className="skeleton skeleton--text-sm" style={{ width: "120px" }} />
      </p>
      <div className="tier-layout">
        <div id="tier-donut" className="tier-donut" role="img" aria-label="Membership tier breakdown">
          <span className="skeleton skeleton--donut" aria-hidden="true" />
        </div>
        <ul id="tier-legend" className="tier-legend">
          {TIERS.map((tier) => (
            <li key={tier} className="skeleton-tier-legend__row" aria-hidden="true">
              <span className="skeleton skeleton--text-md" style={{ width: "72px" }} />
              <span className="skeleton skeleton--text-md" style={{ width: "48px" }} />
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

export function TierPanel({
  tierMixPaid,
  tierMixHonorary,
  total,
  honoraryCount,
  paidCount,
  loading,
}: TierPanelProps) {
  if (loading) {
    return (
      <section className="panel tier-panel">
        <div className="panel-header">
          <h2>Tier mix</h2>
          <p className="panel-sub">Paid tiers (warm) · Honorary stewardship (plum)</p>
        </div>
        <SkeletonTier />
      </section>
    );
  }

  const slices = TIERS.flatMap((tier) => [
    tierMixPaid[tier] || 0,
    tierMixHonorary[tier] || 0,
  ]);
  const sum = slices.reduce((acc, n) => acc + n, 0) || 1;
  const donutBackground = buildDonutGradient(tierMixPaid, tierMixHonorary);

  return (
    <section className="panel tier-panel">
      <div className="panel-header">
        <h2>Tier mix</h2>
        <p className="panel-sub">Paid tiers (warm) · Honorary stewardship (plum)</p>
      </div>
      <p id="tier-summary" className="tier-summary">
        {total > 0 ? (
          <>
            <span className="tier-summary__paid">{formatNumber(paidCount)} paid</span>
            <span className="tier-summary__sep">·</span>
            <span className="tier-summary__honorary">{formatNumber(honoraryCount)} honorary</span>
            <span className="tier-summary__sep">·</span>
            <span className="muted">{formatNumber(total)} total</span>
          </>
        ) : null}
      </p>
      <div className="tier-layout">
        <div
          id="tier-donut"
          className="tier-donut chart-hit"
          role="img"
          aria-label="Membership tier breakdown"
          tabIndex={0}
          style={{ background: donutBackground }}
          data-total={formatNumber(total)}
          data-tip-paid={String(paidCount)}
          data-tip-honorary={String(honoraryCount)}
          data-tip-total={String(total)}
        />
        <ul id="tier-legend" className="tier-legend">
          {TIERS.map((tier) => {
            const paid = tierMixPaid[tier] || 0;
            const honorary = tierMixHonorary[tier] || 0;
            const tierTotal = paid + honorary;
            const pct = Math.round((tierTotal / sum) * 100);

            return (
              <li
                key={tier}
                className="tier-legend__item chart-hit"
                tabIndex={0}
                data-tip-tier={tier}
                data-tip-paid={paid}
                data-tip-honorary={honorary}
                data-tip-pct={pct}
              >
                <span className="tier-legend__label">
                  <i className={`tier-swatch tier-swatch--${tier}`} aria-hidden="true" />
                  {tier.charAt(0).toUpperCase() + tier.slice(1)}
                </span>
                <span className="tier-legend__counts">
                  <span className="tier-legend__paid">{formatNumber(paid)} paid</span>
                  {honorary > 0 ? (
                    <span className="tier-legend__honorary">
                      + {formatNumber(honorary)} honorary
                    </span>
                  ) : null}
                  <span className="muted">({pct}%)</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
