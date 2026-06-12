import { PageHero } from "@/components/PageHero";
import { UtmCampaignPage } from "@/components/utm-builder/UtmCampaignPage";

export default function UtmBuilderPage() {
  return (
    <main className="page">
      <PageHero
        eyebrow="Creative Waco tooling"
        title="Campaign Tracker"
        lede="See tagged campaigns from GA4 — sessions, users, and unique URLs. Build or edit links in the URL builder below."
      />
      <UtmCampaignPage />
    </main>
  );
}
