import { PageHero } from "@/components/PageHero";
import { UtmBuilderTool } from "@/components/utm-builder/UtmBuilderTool";

export default function UtmBuilderPage() {
  return (
    <main className="page">
      <PageHero
        eyebrow="Creative Waco tooling"
        title="UTM URL Builder"
        lede="Build campaign-tagged links for analytics. Set source, medium, and campaign, then copy a ready-to-share URL."
      />
      <UtmBuilderTool />
    </main>
  );
}
