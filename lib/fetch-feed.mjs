import { XMLParser } from "fast-xml-parser";
import {
  cleanTitle,
  decodeEntities,
  organizerFromTitle,
  parseDate,
  stripHtml,
} from "./utils.mjs";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  removeNSPrefix: true,
});

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function mediaImage(item) {
  const content = item?.content;
  if (!content) return "";
  const entries = asArray(content);
  const image = entries.find((entry) => entry?.medium === "image");
  return image?.url ?? entries[0]?.url ?? "";
}

export async function fetchFeed(feedUrl) {
  const response = await fetch(feedUrl, {
    headers: {
      "User-Agent": "CreativeWaco-RSS-Email-Generator/1.0",
      Accept: "application/rss+xml, application/xml, text/xml, */*",
    },
  });

  if (!response.ok) {
    throw new Error(`Feed request failed (${response.status})`);
  }

  const xml = await response.text();
  const parsed = parser.parse(xml);
  const channel = parsed?.rss?.channel ?? parsed?.feed;
  if (!channel) {
    throw new Error("Could not find RSS channel in feed response");
  }

  const items = asArray(channel.item ?? channel.entry).map((item) => {
    const link =
      item.link?.href ??
      item.link ??
      item.guid ??
      item.id ??
      "";
    const title = decodeEntities(item.title?.["#text"] ?? item.title ?? "");
    const description = stripHtml(
      decodeEntities(item.description ?? item.summary?.["#text"] ?? item.summary ?? ""),
    );
    const pubDate = item.pubDate ?? item.published ?? item.updated ?? "";

    return {
      title: cleanTitle(title) || title,
      rawTitle: title,
      organizer: organizerFromTitle(title),
      description,
      learnUrl: String(link).trim(),
      pubDate,
      sortDate: parseDate(pubDate)?.toISOString() ?? "",
      eventDate: "",
      eventDateLabel: pubDate ? "" : "",
      eventCategory: "",
      venueName: "",
      venueLabel: "",
      venueImageUrl: "",
      websiteUrl: "",
      imageUrl: mediaImage(item),
    };
  });

  return {
    feedTitle: decodeEntities(channel.title ?? ""),
    feedDescription: stripHtml(decodeEntities(channel.description ?? "")),
    items,
  };
}
