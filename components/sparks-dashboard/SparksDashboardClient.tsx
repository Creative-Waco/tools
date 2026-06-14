"use client";

import dynamic from "next/dynamic";

export const SparksDashboardClient = dynamic(
  () => import("./SparksDashboard").then((m) => m.SparksDashboard),
  {
    ssr: false,
    loading: () => (
      <div className="dashboard-page is-loading" id="dashboard-page" aria-busy="true">
        <div className="panel">
          <p className="panel-sub">Loading dashboard…</p>
        </div>
      </div>
    ),
  },
);
