import type { UtmParams } from "@/lib/utm-builder/build-url";

export const UTM_FIELD_HINTS: Record<keyof UtmParams, string> = {
  utm_source:
    "Where traffic comes from — e.g. instagram, newsletter, google. Identifies the publisher or platform.",
  utm_medium:
    "Marketing channel — e.g. social, email, cpc, qr. Groups traffic by type of link.",
  utm_campaign:
    "Campaign name for this push — e.g. spring-art-walk-2026. Use lowercase and hyphens.",
  utm_term:
    "Paid search keyword (optional). Useful for Google Ads keyword reporting.",
  utm_content:
    "Differentiates similar links — e.g. story, hero-cta, feed-post. Use for A/B or placement tests.",
  utm_id:
    "Optional campaign ID for platforms that support utm_id (e.g. Google Ads).",
};
