import type { Metadata } from "next";

import { GoogleAdsDashboard } from "@/components/google-ads/GoogleAdsDashboard";
import { PageHero } from "@/components/PageHero";
import { ToolPage } from "@/components/cw/ToolPage";

export const metadata: Metadata = {
  title: "Google Ads · Creative Waco Tools",
  description:
    "View Google Ads campaign performance and manage status and daily budgets.",
};

export default function GoogleAdsPage() {
  return (
    <ToolPage wide>
      <PageHero
        eyebrow="Creative Waco tooling"
        title="Google Ads"
        lede="List campaigns with spend and conversion metrics, pause or enable delivery, and adjust daily budgets."
      />
      <GoogleAdsDashboard />
    </ToolPage>
  );
}
