import { enrichItem } from "../enrich-item.mjs";
import { fetchFeed } from "../fetch-feed.mjs";
import { mapWithConcurrency } from "../utils.mjs";
import { collectFeedMonths } from "./date-range.mjs";

export async function getFeedMonths({ feedUrl, enrich }) {
  const feed = await fetchFeed(feedUrl);

  let items = feed.items;
  if (enrich) {
    items = await mapWithConcurrency(items, 6, (item) =>
      enrichItem(item, { enabled: true }),
    );
  }

  return {
    feedTitle: feed.feedTitle,
    months: collectFeedMonths(items),
  };
}
