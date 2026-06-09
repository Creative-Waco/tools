import { PageHero } from "@/components/PageHero";
import { EventCardsTool } from "@/components/event-cards/EventCardsTool";

export default function EventCardsPage() {
  return (
    <main className="page">
      <PageHero
        eyebrow="Creative Waco tooling"
        title="Event Card Graphics"
        lede="Build ticket-style Instagram cards (1080px wide) from the events RSS feed — photo, category, date, and venue. Preview as a carousel, then download PNGs ready to post."
      />
      <EventCardsTool />
    </main>
  );
}
