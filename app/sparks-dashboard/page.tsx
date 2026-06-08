import type { Metadata } from "next";
import { SparksDashboard } from "@/components/sparks-dashboard/SparksDashboard";
import "./dashboard.css";

export const metadata: Metadata = {
  title: "Creative Spark Dashboard · Creative Waco Tools",
  description:
    "Track Creative Spark membership growth, tier mix, and member event momentum.",
};

export default function SparksDashboardPage() {
  return <SparksDashboard />;
}
