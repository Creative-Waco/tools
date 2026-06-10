import { enrichItem } from "../enrich-item.mjs";
import { fetchFeed } from "../fetch-feed.mjs";
import { mapWithConcurrency, parseDate } from "../utils.mjs";
import { renderEventCardsHtml } from "./render-cards.mjs";
import { renderSlideshowHtml } from "./render-slideshow.mjs";

function sortItems(items, sort) {
  const copy = [...items];
  switch (sort) {
    case "date-desc":
      return copy.sort((a, b) =>
        (b.sortDate || "").localeCompare(a.sortDate || ""),
      );
    case "title":
      return copy.sort((a, b) => a.title.localeCompare(b.title));
    case "pub-desc":
      return copy;
    case "date-asc":
    default:
      return copy.sort((a, b) =>
        (a.sortDate || "").localeCompare(b.sortDate || ""),
      );
  }
}

function startOfDay(value) {
  const date = parseDate(value);
  if (!date) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(value) {
  const date = parseDate(value);
  if (!date) return null;
  date.setHours(23, 59, 59, 999);
  return date;
}

function todayStart() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function filterItems(items, { upcomingOnly, fromDate, toDate }) {
  const start = fromDate ? startOfDay(fromDate) : upcomingOnly ? todayStart() : null;
  const end = toDate ? endOfDay(toDate) : null;

  if (!start && !end) return items;

  return items.filter((item) => {
    if (!item.sortDate) return true;
    const eventDate = parseDate(item.sortDate);
    if (!eventDate) return true;
    if (start && eventDate < start) return false;
    if (end && eventDate > end) return false;
    return true;
  });
}

export async function generateEventCards(options) {
  const feed = await fetchFeed(options.feedUrl);

  let items = feed.items;
  if (options.enrich) {
    items = await mapWithConcurrency(items, 6, (item) =>
      enrichItem(item, { enabled: true }),
    );
  }

  items = filterItems(items, {
    upcomingOnly: options.upcomingOnly,
    fromDate: options.fromDate,
    toDate: options.toDate,
  });
  items = sortItems(items, options.sort);

  const withImages = items.filter((item) => item.imageUrl);
  const cards = withImages.slice(0, options.limit);
  const skippedNoImage = Math.max(
    0,
    Math.min(items.length, options.limit) - cards.length,
  );

  const format = options.format === "slideshow" ? "slideshow" : "instagram";
  const html =
    format === "slideshow"
      ? renderSlideshowHtml(cards)
      : renderEventCardsHtml(cards);

  return {
    feedTitle: feed.feedTitle,
    itemCount: cards.length,
    skippedNoImage,
    items: cards,
    html,
    format,
  };
}
