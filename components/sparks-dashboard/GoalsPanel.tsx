import type { Goal } from "./types";
import { formatNumber } from "./utils";

type GoalsPanelProps = {
  goals: Goal[];
  loading?: boolean;
};

function SkeletonGoals() {
  return (
    <>
      {[0, 1].map((i) => (
        <div key={i} className="skeleton-goal" aria-hidden="true">
          <div className="goal__head">
            <span className="skeleton skeleton--text-md" style={{ width: i === 0 ? "38%" : "52%" }} />
            <span className="skeleton skeleton--text-md" style={{ width: "88px" }} />
          </div>
          <span className="skeleton skeleton--bar" style={{ width: "100%" }} />
          <span className="skeleton skeleton--text-sm" style={{ width: "64%" }} />
          {i === 1 ? (
            <div className="pipeline-strip">
              {Array.from({ length: 6 }, (_, j) => (
                <span key={j} className="skeleton skeleton--pill" style={{ width: "52px" }} />
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </>
  );
}

function goalTipRows(goal: Goal, index: number): string {
  if (index === 0) {
    return [
      `swatch--members::Paid::${formatNumber(goal.current)}`,
      `swatch--honorary::Honorary tracked::${formatNumber(goal.honoraryCount ?? 0)}`,
      `swatch--total::Paid to goal::${formatNumber(Math.max(goal.target - goal.current, 0))}`,
    ].join("|");
  }
  return [
    `swatch--events::Scheduled::${formatNumber(goal.current)}`,
    `swatch--members::Target::${formatNumber(goal.target)}`,
    `swatch--total::Still needed::${formatNumber(Math.max(goal.target - goal.current, 0))}`,
  ].join("|");
}

export function GoalsPanel({ goals, loading }: GoalsPanelProps) {
  return (
    <section className="panel goals-panel">
      <div className="panel-header">
        <h2>Goals</h2>
        <p className="panel-sub">90 paid members by 2026 · honorary tracked separately</p>
      </div>
      <div id="membership-goals" className="goals-list">
        {loading ? (
          <SkeletonGoals />
        ) : (
          goals.map((goal, index) => {
            const pct =
              goal.target > 0 ? Math.min((goal.current / goal.target) * 100, 100) : 0;
            const complete = pct >= 100;

            return (
              <div key={goal.label} className={`goal${index === 0 ? " goal--paid" : ""}`}>
                <div className="goal__head">
                  <span className="goal__label">{goal.label}</span>
                  <span className="goal__numbers">
                    {formatNumber(goal.current)} / {formatNumber(goal.target)} {goal.unit}
                  </span>
                </div>
                <div
                  className="goal__bar chart-hit"
                  role="progressbar"
                  tabIndex={0}
                  aria-valuenow={Math.round(pct)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  data-tip-title={goal.label}
                  data-tip-rows={goalTipRows(goal, index)}
                >
                  <div
                    className={`goal__fill${complete ? " is-complete" : ""}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="goal__note">{goal.note}</p>
                {index === 0 && (goal.honoraryCount ?? 0) > 0 ? (
                  <p className="goal__honorary">
                    {formatNumber(goal.honoraryCount ?? 0)} honorary members tracked separately
                  </p>
                ) : null}
                {index === 1 && goal.pipelineByMonth?.length ? (
                  <div className="pipeline-strip">
                    {goal.pipelineByMonth.map((m) => (
                      <span
                        key={m.label}
                        className={`pipeline-month${m.count >= m.target ? " is-met" : ""}`}
                      >
                        {m.label}: {m.count}/{m.target}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
