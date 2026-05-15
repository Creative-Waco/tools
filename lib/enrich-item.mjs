import {
  formatEventDate,
  organizerFromTitle,
  parseDate,
  resolveWebsiteUrl,
} from "./utils.mjs";

const PAGE_HEADERS = {
  "User-Agent": "CreativeWaco-RSS-Email-Generator/1.0",
  Accept: "text/html,application/xhtml+xml",
};

function isEventNode(node) {
  return node?.["@type"] === "Event" || node?.startDate;
}

function extractJsonLdEvent(html) {
  const scripts = [
    ...html.matchAll(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ];
  for (const match of scripts) {
    try {
      const data = JSON.parse(match[1]);
      const nodes = Array.isArray(data) ? data : [data];
      for (const node of nodes) {
        if (isEventNode(node)) {
          return node;
        }
        if (Array.isArray(node?.["@graph"])) {
          const event = node["@graph"].find((entry) => isEventNode(entry));
          if (event) return event;
        }
      }
    } catch {
      // ignore invalid JSON-LD blocks
    }
  }
  return null;
}

function extractJsonLdDates(html) {
  const event = extractJsonLdEvent(html);
  return {
    startDate: event?.startDate ?? "",
    endDate: event?.endDate ?? "",
  };
}

function extractPageImage(html) {
  const event = extractJsonLdEvent(html);
  const jsonLdImage = event?.image;
  if (typeof jsonLdImage === "string" && jsonLdImage) return jsonLdImage;
  if (Array.isArray(jsonLdImage) && jsonLdImage[0]) {
    return typeof jsonLdImage[0] === "string" ? jsonLdImage[0] : jsonLdImage[0]?.url ?? "";
  }
  if (jsonLdImage?.url) return jsonLdImage.url;

  const ogMatch =
    html.match(/property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ??
    html.match(/content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
  return ogMatch?.[1]?.trim() ?? "";
}

function extractVisibleDate(html) {
  const match = html.match(
    /event-item-header6_metatag-item[\s\S]*?class="text-size-small">([^<]+)<\/div>/i,
  );
  return match?.[1]?.trim() ?? "";
}

function extractOrganizer(html) {
  const match = html.match(
    /class="organizer-wrapper"[\s\S]*?<p>([^<]+)<\/p>/i,
  );
  return match?.[1]?.trim() ?? "";
}

function extractLinks(html) {
  return [...html.matchAll(/href="(https?:\/\/[^"#]+)"/gi)].map(
    (match) => match[1],
  );
}

export async function enrichItem(item, { enabled }) {
  if (!enabled || !item.learnUrl) {
    return {
      ...item,
      sortDate: item.sortDate || parseDate(item.pubDate)?.toISOString() || "",
      eventDateLabel: item.eventDateLabel || "",
    };
  }

  try {
    const response = await fetch(item.learnUrl, { headers: PAGE_HEADERS });
    if (!response.ok) return item;

    const html = await response.text();
    const { startDate } = extractJsonLdDates(html);
    const visibleDate = extractVisibleDate(html);
    const organizer = extractOrganizer(html) || item.organizer;
    const websiteUrl = resolveWebsiteUrl(
      html,
      item.learnUrl,
      item,
      extractLinks(html),
    );
    const imageUrl = item.imageUrl || extractPageImage(html);
    const sortDate =
      parseDate(startDate)?.toISOString() ??
      parseDate(item.pubDate)?.toISOString() ??
      "";

    return {
      ...item,
      organizer: organizer || organizerFromTitle(item.rawTitle),
      eventDate: startDate,
      eventDateLabel:
        (startDate ? formatEventDate(startDate) : "") || visibleDate,
      sortDate,
      websiteUrl,
      imageUrl,
    };
  } catch {
    return item;
  }
}
