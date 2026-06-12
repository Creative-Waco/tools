import type { Ga4UtmHistoryEntry } from "@/lib/utm-builder/ga4-history-types";
import { landingPageToUrl } from "@/lib/utm-builder/build-url";
import { detectPresetId } from "@/lib/utm-builder/presets";
import type { BuilderFormState } from "@/lib/utm-builder/url-state";

export function ga4EntryToFormState(
  entry: Ga4UtmHistoryEntry,
  current: BuilderFormState,
): BuilderFormState {
  const baseUrl = entry.landingPage
    ? landingPageToUrl(entry.landingPage)
    : entry.taggedUrl
      ? entry.taggedUrl.split("?")[0] ?? current.baseUrl
      : current.baseUrl;

  return {
    baseUrl,
    utm: { ...entry.utm },
    customParams: current.customParams,
    contentVariants: current.contentVariants,
    activePresetId: detectPresetId(entry.utm.utm_source, entry.utm.utm_medium),
  };
}

export function formatGa4EntryLabel(entry: Ga4UtmHistoryEntry): string {
  return [entry.utm.utm_campaign, entry.utm.utm_source, entry.utm.utm_medium]
    .filter(Boolean)
    .join(" · ");
}
