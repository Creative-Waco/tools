import type { UtmParams } from "@/lib/utm-builder/build-url";

const SLUG_FIELDS: (keyof UtmParams)[] = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
];

export function slugifyUtmValue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeUtmField(key: keyof UtmParams, value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (SLUG_FIELDS.includes(key)) {
    return slugifyUtmValue(trimmed);
  }
  return trimmed;
}

export function buildCampaignSlug(eventName: string, dateLabel: string): string {
  const parts = [slugifyUtmValue(eventName), slugifyUtmValue(dateLabel)].filter(Boolean);
  return parts.join("-");
}

export type UtmFieldWarning = {
  field: keyof UtmParams;
  message: string;
};

export function getUtmFieldWarnings(utm: UtmParams): UtmFieldWarning[] {
  const warnings: UtmFieldWarning[] = [];

  for (const key of SLUG_FIELDS) {
    const value = utm[key];
    if (!value.trim()) continue;

    if (/\s/.test(value)) {
      warnings.push({
        field: key,
        message: "Spaces will be converted to hyphens when normalized.",
      });
    } else if (/[A-Z]/.test(value)) {
      warnings.push({
        field: key,
        message: "Uppercase letters will be lowercased for consistent reporting.",
      });
    } else if (/[^a-z0-9._-]/.test(value)) {
      warnings.push({
        field: key,
        message: "Special characters will be removed when normalized.",
      });
    }
  }

  return warnings;
}
