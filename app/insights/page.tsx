import type { Metadata } from "next";

import { InsightsDashboard } from "@/components/analytics-dashboard/InsightsDashboard";
import { PageHero } from "@/components/PageHero";

export const metadata: Metadata = {
  title: "Insights · Creative Waco Tools",
  description:
    "Search Console and GA4 insights for creativewaco.org — keyword opportunities, traffic patterns, and audience signals.",
};

export default function InsightsPage() {
  return (
    <main className="page min-w-0 max-w-full overflow-x-hidden">
      <PageHero
        eyebrow="Creative Waco tooling"
        title="Insights"
        lede="Search and traffic opportunities ranked by impact — one list, highest priority first."
      />
      <InsightsDashboard />
    </main>
  );
}
