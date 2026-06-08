import { PageHero } from "@/components/PageHero";
import { ToolNav } from "@/components/ToolNav";
import { EventCardsTool } from "@/components/event-cards/EventCardsTool";

export default function EventCardsPage() {
  return (
    <main className="page">
      <ToolNav />
      <PageHero
        eyebrow="Creative Waco tooling"
        title="Event Card Graphics"
        lede="Build clean 4:5 portrait cards from the events RSS feed — event photo and title only. Download PNGs for social posts."
      />
      <EventCardsTool />
    </main>
  );
}
