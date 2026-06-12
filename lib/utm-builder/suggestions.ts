import { normalizeUtmField } from "@/lib/utm-builder/normalize";
import type { UtmParams } from "@/lib/utm-builder/build-url";

export type UtmSuggestion = {
  id: string;
  label: string;
  value: string;
};

export const SOURCE_SUGGESTIONS: UtmSuggestion[] = [
  { id: "instagram", label: "Instagram", value: "instagram" },
  { id: "facebook", label: "Facebook", value: "facebook" },
  { id: "newsletter", label: "Newsletter", value: "newsletter" },
  { id: "google", label: "Google", value: "google" },
  { id: "print", label: "Print", value: "print" },
  { id: "partner", label: "Partner", value: "partner" },
];

export const MEDIUM_SUGGESTIONS: UtmSuggestion[] = [
  { id: "social", label: "Social", value: "social" },
  { id: "email", label: "Email", value: "email" },
  { id: "cpc", label: "CPC", value: "cpc" },
  { id: "qr", label: "QR", value: "qr" },
  { id: "referral", label: "Referral", value: "referral" },
  { id: "organic", label: "Organic", value: "organic" },
];

export const CAMPAIGN_SUGGESTIONS: UtmSuggestion[] = [
  { id: "creative-spark", label: "Creative Spark", value: "creative-spark" },
  { id: "events", label: "Events", value: "events" },
  { id: "levitt", label: "Levitt", value: "levitt" },
  { id: "dia-de-los-muertos", label: "Día de los Muertos", value: "dia-de-los-muertos" },
  { id: "artprenticeship", label: "Artprenticeship", value: "artprenticeship" },
  { id: "waco-wonderland", label: "Waco Wonderland", value: "waco-wonderland" },
  { id: "sponsorship", label: "Sponsorship", value: "sponsorship" },
];

export function detectSuggestionId(
  field: keyof UtmParams,
  currentValue: string,
  suggestions: UtmSuggestion[],
): string {
  const normalized = normalizeUtmField(field, currentValue);
  if (!normalized) return "";

  const match = suggestions.find((suggestion) => suggestion.value === normalized);
  return match?.id ?? "";
}

export function mergeGa4Suggestions(
  staticSuggestions: UtmSuggestion[],
  ga4Suggestions: { value: string; sessions: number }[],
): UtmSuggestion[] {
  const existing = new Set(staticSuggestions.map((suggestion) => suggestion.value));
  const extra = ga4Suggestions
    .filter((suggestion) => suggestion.value && !existing.has(suggestion.value))
    .map((suggestion) => ({
      id: `ga4-${suggestion.value}`,
      label: suggestion.value,
      value: suggestion.value,
    }));

  return [...staticSuggestions, ...extra];
}
