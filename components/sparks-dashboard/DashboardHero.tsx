type DashboardHeroProps = {
  lastUpdated: React.ReactNode;
};

export function DashboardHero({ lastUpdated }: DashboardHeroProps) {
  return (
    <header className="dashboard-hero">
      <div className="dashboard-hero__copy">
        <p className="eyebrow">Creative Waco · Membership</p>
        <h1>Creative Spark Dashboard</h1>
        <p className="lede">
          Track membership growth, tier mix, and Spark event momentum at a glance.
        </p>
      </div>
      <div className="dashboard-hero__meta">
        <p id="last-updated" className="last-updated" aria-live="polite">
          {lastUpdated}
        </p>
      </div>
    </header>
  );
}
