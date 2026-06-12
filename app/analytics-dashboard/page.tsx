import type { Metadata } from "next";

import { AnalyticsDashboard } from "@/components/analytics-dashboard/AnalyticsDashboard";
import { PageHero } from "@/components/PageHero";

export const metadata: Metadata = {
  title: "Analytics Dashboard · Creative Waco Tools",
  description:
    "GA4 traffic overview for creativewaco.org — sessions, channels, top pages, path exploration, and referrers.",
};

export default function AnalyticsDashboardPage() {
  return (
    <main className="page min-w-0 max-w-full overflow-x-hidden">
      <PageHero
        eyebrow="Creative Waco tooling"
        title="Analytics Dashboard"
        lede="Live Google Analytics 4 metrics for creativewaco.org — sessions, engagement, traffic channels, and top content."
      />
      <AnalyticsDashboard />
    </main>
  );
}
