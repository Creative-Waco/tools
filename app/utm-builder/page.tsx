import { PageHero } from "@/components/PageHero";
import { CampaignBuilderPage } from "@/components/utm-builder/CampaignBuilderPage";

export default function UtmBuilderPage() {
  return (
    <main className="page">
      <PageHero
        eyebrow="Creative Waco tooling"
        title="Campaign Builder"
        lede="Create campaigns, add channel-specific UTM links, and track sessions and engagement against benchmarks."
      />
      <CampaignBuilderPage />
    </main>
  );
}
