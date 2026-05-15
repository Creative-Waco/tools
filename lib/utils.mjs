const TZ = "America/Chicago";

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function stripHtml(value) {
  return String(value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function decodeEntities(value) {
  return String(value ?? "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCharCode(parseInt(code, 16)),
    )
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

export function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatEventDate(value) {
  const date = parseDate(value);
  if (!date) return "";

  const weekday = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: TZ,
  }).format(date);
  const monthDay = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: TZ,
  }).format(date);
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: TZ,
  }).format(date);

  return `${weekday}, ${monthDay} · ${time}`;
}

export function cleanTitle(title) {
  const decoded = decodeEntities(title);
  const parts = decoded.split(/\s*[-–|]\s*/);
  if (parts.length < 2) return decoded.trim();
  return parts[0].trim();
}

export function organizerFromTitle(title) {
  const decoded = decodeEntities(title);
  const parts = decoded.split(/\s*[-–|]\s*/);
  if (parts.length < 2) return "";
  return parts[parts.length - 1].trim();
}

export async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let index = 0;

  async function run() {
    while (index < items.length) {
      const current = index++;
      results[current] = await worker(items[current], current);
    }
  }

  const runners = Array.from({ length: Math.min(limit, items.length) }, () =>
    run(),
  );
  await Promise.all(runners);
  return results;
}

function urlHost(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function hostMatches(url, suffix) {
  const host = urlHost(url);
  return host === suffix || host.endsWith(`.${suffix}`);
}

export function isBlockedExternalUrl(url, learnUrl) {
  if (!url || url === "#" || url === learnUrl) return true;

  let path = "";
  try {
    path = new URL(url).pathname.toLowerCase();
  } catch {
    return true;
  }

  const blockedHosts = [
    "website-files.com",
    "google.com",
    "googleapis.com",
    "gstatic.com",
    "cloudfront.net",
    "culturalyst.com",
    "waco.culturalyst.com",
    "facebook.com",
    "instagram.com",
    "linkedin.com",
    "youtube.com",
    "x.com",
    "twitter.com",
    "givebutter.com",
    "hubspot.com",
    "jsdelivr.net",
    "githubusercontent.com",
    "googletagmanager.com",
    "webflow.com",
    "hs-scripts.com",
  ];

  if (blockedHosts.some((host) => hostMatches(url, host))) return true;

  if (hostMatches(url, "creativewaco.org") && path.includes("/event/event-")) {
    return true;
  }

  return false;
}

/** Reads the href on the page's "Event Website" CTA (most reliable source). */
export function extractEventWebsiteFromPage(html, learnUrl) {
  const idx = html.indexOf("Event Website");
  if (idx === -1) return "";

  const before = html.slice(Math.max(0, idx - 800), idx);
  const hrefs = [...before.matchAll(/href="([^"]+)"/gi)].map((match) => match[1]);
  const href = hrefs.at(-1) ?? "";
  if (!href || href === "#") return "";

  try {
    const absolute = new URL(href, learnUrl).href;
    if (absolute.replace(/\/$/, "") === learnUrl.replace(/\/$/, "")) return "";
    return absolute;
  } catch {
    return "";
  }
}

const TICKET_HOSTS = [
  "ovationtix.com",
  "paccwaco.com",
  "eventbrite.com",
  "etix.com",
  "ticketmaster.com",
  "showclix.com",
  "seatgeek.com",
];

export function isLevittEvent(item) {
  const haystack = `${item?.title ?? ""} ${item?.rawTitle ?? ""} ${item?.organizer ?? ""}`.toLowerCase();
  return haystack.includes("levitt");
}

export function pickWebsiteUrl(links, learnUrl, item = {}) {
  const unique = [...new Set(links.filter(Boolean))];

  for (const host of TICKET_HOSTS) {
    const match = unique.find(
      (url) => hostMatches(url, host) && !isBlockedExternalUrl(url, learnUrl),
    );
    if (match) return match;
  }

  if (isLevittEvent(item)) {
    const levitt = unique.find(
      (url) =>
        hostMatches(url, "creativewaco.org") &&
        url.toLowerCase().includes("/levitt"),
    );
    if (levitt && !isBlockedExternalUrl(levitt, learnUrl)) return levitt;
  }

  return "";
}

export function resolveWebsiteUrl(html, learnUrl, item, links = []) {
  const fromButton = extractEventWebsiteFromPage(html, learnUrl);
  if (hasEventWebsite(fromButton, learnUrl, item)) return fromButton;

  const fromLinks = pickWebsiteUrl(links, learnUrl, item);
  if (hasEventWebsite(fromLinks, learnUrl, item)) return fromLinks;

  return "";
}

export function hasEventWebsite(url, learnUrl, item = {}) {
  const value = String(url ?? "").trim();
  if (!value || value === "#" || value === learnUrl) return false;
  if (isBlockedExternalUrl(value, learnUrl)) return false;
  if (
    hostMatches(value, "creativewaco.org") &&
    value.toLowerCase().includes("/levitt") &&
    !isLevittEvent(item)
  ) {
    return false;
  }
  return true;
}
