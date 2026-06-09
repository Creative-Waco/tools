export type UtmPreset = {
  id: string;
  label: string;
  description: string;
  utm_source: string;
  utm_medium: string;
  contentSuggestions: string[];
};

export const UTM_PRESETS: UtmPreset[] = [
  {
    id: "instagram",
    label: "Instagram",
    description: "Organic or paid posts and stories",
    utm_source: "instagram",
    utm_medium: "social",
    contentSuggestions: ["story", "feed", "reel", "bio-link"],
  },
  {
    id: "facebook",
    label: "Facebook",
    description: "Page posts, groups, or boosted content",
    utm_source: "facebook",
    utm_medium: "social",
    contentSuggestions: ["feed-post", "story", "event-share"],
  },
  {
    id: "newsletter",
    label: "Newsletter",
    description: "HubSpot or email blast",
    utm_source: "newsletter",
    utm_medium: "email",
    contentSuggestions: ["hero-cta", "event-card", "footer-link"],
  },
  {
    id: "google-ads",
    label: "Google Ads",
    description: "Search or display campaigns",
    utm_source: "google",
    utm_medium: "cpc",
    contentSuggestions: ["search-ad", "display-ad", "responsive-ad"],
  },
  {
    id: "print-qr",
    label: "Print / QR",
    description: "Posters, flyers, or event signage",
    utm_source: "print",
    utm_medium: "qr",
    contentSuggestions: ["poster", "flyer", "signage"],
  },
  {
    id: "partner",
    label: "Partner site",
    description: "Cross-promotion from another organization",
    utm_source: "partner",
    utm_medium: "referral",
    contentSuggestions: ["homepage", "events-page", "blog-post"],
  },
];

export function findPresetById(presetId: string): UtmPreset | undefined {
  return UTM_PRESETS.find((preset) => preset.id === presetId);
}

export function detectPresetId(source: string, medium: string): string {
  const normalizedSource = source.trim().toLowerCase();
  const normalizedMedium = medium.trim().toLowerCase();

  const match = UTM_PRESETS.find(
    (preset) =>
      preset.utm_source === normalizedSource && preset.utm_medium === normalizedMedium,
  );

  return match?.id ?? "";
}
