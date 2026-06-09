import type { Kpi } from "./types";
import { escapeHtml } from "./utils";

type KpiGridProps = {
  kpis: Kpi[];
  loading?: boolean;
};

function SkeletonKpiGrid() {
  return (
    <>
      {Array.from({ length: 4 }, (_, i) => (
        <article
          key={i}
          className={`kpi-card${i === 0 ? " kpi-card--accent" : ""} skeleton-kpi`}
          aria-hidden="true"
        >
          <span className="skeleton skeleton--text-sm" style={{ width: "58%" }} />
          <span
            className="skeleton skeleton--text-xl"
            style={{ width: i === 0 ? "42%" : "28%" }}
          />
          {i === 0 ? (
            <span className="skeleton skeleton--text-sm" style={{ width: "76%" }} />
          ) : null}
        </article>
      ))}
    </>
  );
}

export function KpiGrid({ kpis, loading }: KpiGridProps) {
  return (
    <section className="kpi-grid" id="kpi-grid" aria-label="Key metrics">
      {loading ? (
        <SkeletonKpiGrid />
      ) : (
        kpis.map((kpi) => (
          <article
            key={kpi.id}
            className={`kpi-card${kpi.accent ? " kpi-card--accent" : ""}${kpi.degraded ? " kpi-card--degraded" : ""}`}
            title={kpi.degraded ? "Data unavailable or mapping issue" : undefined}
          >
            <p className="kpi-card__label">{escapeHtml(kpi.label)}</p>
            <p className="kpi-card__value">{escapeHtml(kpi.value)}</p>
            {kpi.footnote ? (
              <p
                className={`kpi-card__footnote${kpi.footnote.includes("honorary") ? " is-honorary" : ""}`}
              >
                {escapeHtml(kpi.footnote)}
              </p>
            ) : null}
          </article>
        ))
      )}
    </section>
  );
}
