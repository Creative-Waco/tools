# Creative Waco Tools

Internal tools for Creative Waco. The RSS Email HTML Generator turns a feed (like `https://creativewaco.org/event/rss.xml`) into HubSpot-ready email HTML.

**Production:** https://tools.creativewaco.org

## What it does

1. Fetches the RSS feed you provide
2. Optionally loads each event page to get the real event date and ticket/organizer website link
3. Filters to upcoming events, sorts, and limits the count
4. Renders list, **2-column**, or **3-column grid** layouts (grids stack to one column on narrow screens)
5. Shows a live preview and copyable HTML

Optional **Include event images** adds thumbnails (list: left of title; grid: card header image).

Grid output includes a `<style>` block with a `@media` query so columns stack on mobile in HubSpot and most email clients.

## Run it

```bash
cd "Workspace/website/rss-email-generator"
npm install
npm start
```

Open [http://localhost:3847](http://localhost:3847).

## Notes

- **Enrich from event pages** is recommended for Creative Waco events. It reads JSON-LD dates and finds ticket links (OvationTix, PACC, Levitt, etc.).
- Without enrichment, the tool falls back to RSS publish dates and only includes a Learn more button.
- Re-run Generate any time you need fresh HTML for a newsletter send.
