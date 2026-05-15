import { enrichItem } from "./enrich-item.mjs";
import { fetchFeed } from "./fetch-feed.mjs";
import { renderEmailHtml } from "./render-html.mjs";
import { mapWithConcurrency, parseDate } from "./utils.mjs";

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

function filterItems(items, { upcomingOnly, fromDate }) {
  const cutoff = fromDate ? parseDate(fromDate) : new Date();
  cutoff.setHours(0, 0, 0, 0);

  return items.filter((item) => {
    if (!upcomingOnly) return true;
    if (!item.sortDate) return true;
    return parseDate(item.sortDate) >= cutoff;
  });
}

export async function generateEmail(options) {
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
  });
  items = sortItems(items, options.sort);
  items = items.slice(0, options.limit);

  const html = renderEmailHtml(items, {
    layout: options.layout,
    learnLabel: options.learnLabel,
    websiteLabel: options.websiteLabel,
    primaryColor: options.primaryColor,
    includeImages: options.includeImages === true,
  });

  return {
    feedTitle: feed.feedTitle,
    itemCount: items.length,
    items,
    html,
  };
}
