import type { Metadata } from "next";

import { PageHero } from "@/components/PageHero";
import { ToolPage } from "@/components/cw/ToolPage";
import { SparksDashboardClient } from "@/components/sparks-dashboard/SparksDashboardClient";

import "./dashboard.css";

export const metadata: Metadata = {
  title: "Creative Spark Dashboard · Creative Waco Tools",
  description:
    "Track Creative Spark membership growth, tier mix, and member event momentum.",
};

export default function SparksDashboardPage() {
  return (
    <ToolPage wide>
      <PageHero
        eyebrow="Creative Waco tooling"
        title="Creative Spark Dashboard"
        lede="Track Creative Spark membership growth, tier mix, and member event momentum."
      />
      <SparksDashboardClient />
    </ToolPage>
  );
}
