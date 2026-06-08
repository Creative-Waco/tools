import { PageHero } from "@/components/PageHero";
import { RssEmailTool } from "@/components/rss-email/RssEmailTool";

export default function RssEmailPage() {
  return (
    <main className="page">
      <PageHero
        eyebrow="Creative Waco tooling"
        title="RSS Email HTML Generator"
        lede="Paste any RSS feed, pull upcoming items, and copy HubSpot-ready HTML with dates and buttons."
      />
      <RssEmailTool />
    </main>
  );
}
