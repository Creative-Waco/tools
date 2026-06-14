import type { UtmParams } from "@/lib/utm-builder/build-url";

export const UTM_FIELD_HINTS: Record<keyof UtmParams, string> = {
  utm_source:
    "Where traffic comes from — e.g. instagram, newsletter, google. Identifies the publisher or platform.",
  utm_medium:
    "Marketing channel — e.g. social, email, cpc, qr. Groups traffic by type of link.",
  utm_campaign:
    "Campaign name for this push — e.g. spring-art-walk-2026. Use lowercase and hyphens.",
  utm_term:
    "Paid search keyword (optional). Rarely needed for email or social — use for Google Ads keyword reporting.",
  utm_content:
    "Identifies which link, button, or placement — e.g. hero-cta in an email, story on Instagram. Use to compare versions of the same channel.",
  utm_id:
    "Optional campaign ID for platforms that support utm_id (e.g. Google Ads).",
};

const CONTENT_EXAMPLES: Record<string, string> = {
  "sparks-newsletter": "member-update, event-spotlight, hero-cta",
  newsletter: "hero-cta, event-card, footer-link",
  instagram: "story, feed, reel",
  facebook: "feed-post, story, event-share",
  "google-ads": "search-ad, display-ad",
  "print-qr": "poster, flyer, signage",
  partner: "homepage, events-page, blog-post",
};

export function getUtmFieldPlaceholder(
  fieldKey: "utm_content" | "utm_term",
  presetId?: string,
): string {
  if (fieldKey === "utm_content") {
    const first = CONTENT_EXAMPLES[presetId ?? ""]?.split(",")[0]?.trim();
    return first ?? "hero-cta";
  }
  if (fieldKey === "utm_term" && presetId === "google-ads") {
    return "levitt-tickets";
  }
  return "";
}

export function getUtmFieldExample(
  fieldKey: "utm_content" | "utm_term",
  presetId?: string,
): string {
  if (fieldKey === "utm_content") {
    const examples = CONTENT_EXAMPLES[presetId ?? ""] ?? "hero-cta, story, feed-post";
    if (presetId === "sparks-newsletter") {
      return `e.g. ${examples} — which CTA or section in the Spark member email`;
    }
    if (presetId === "newsletter") {
      return `e.g. ${examples} — which button or block in the general newsletter`;
    }
    if (presetId === "instagram" || presetId === "facebook") {
      return `e.g. ${examples} — which placement in the post`;
    }
    return `e.g. ${examples} — differentiates links that share the same source and medium`;
  }

  if (fieldKey === "utm_term") {
    if (presetId === "google-ads") {
      return "e.g. levitt-tickets — the paid keyword you're bidding on";
    }
    return "Optional — mainly for paid search. Leave blank for email, social, and print";
  }

  return "";
};
