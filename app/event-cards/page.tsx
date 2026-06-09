import { PageHero } from "@/components/PageHero";
import { EventCardsTool } from "@/components/event-cards/EventCardsTool";

export default function EventCardsPage() {
  return (
    <main className="page">
      <PageHero
        eyebrow="Creative Waco tooling"
        title="Event Card Graphics"
        lede="Build ticket-style Instagram cards (1080×1350, 4:5) from the events RSS feed — photo, category, date, venue, and organization. Preview as a carousel, then download PNGs ready to post."
      />
      <EventCardsTool />
    </main>
  );
}
