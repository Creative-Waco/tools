import { PageHero } from "@/components/PageHero";
import { EventCardsTool } from "@/components/event-cards/EventCardsTool";

export default function EventCardsPage() {
  return (
    <main className="page">
      <PageHero
        eyebrow="Creative Waco tooling"
        title="Event Card Graphics"
        lede="Build event graphics from the RSS feed in two formats: Instagram carousel cards (1080×1350, 4:5) or landscape display slideshow cards (1920px wide) for TVs and venue screens. Preview, then download PNGs ready to post."
      />
      <EventCardsTool />
    </main>
  );
}
