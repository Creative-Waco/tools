import type { Metadata } from "next";

import { PageHero } from "@/components/PageHero";
import { SparksDashboardClient } from "@/components/sparks-dashboard/SparksDashboardClient";

import "./dashboard.css";

export const metadata: Metadata = {
  title: "Creative Spark Dashboard · Creative Waco Tools",
  description:
    "Track Creative Spark membership growth, tier mix, and member event momentum.",
};

export default function SparksDashboardPage() {
  return (
    <main className="page">
      <PageHero
        eyebrow="Creative Waco tooling"
        title="Creative Spark Dashboard"
        lede="Track Creative Spark membership growth, tier mix, and member event momentum."
      />
      <SparksDashboardClient />
    </main>
  );
}
