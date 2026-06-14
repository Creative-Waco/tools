const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
];

function slugifyUtmValue(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeUtmField(key, value) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (UTM_KEYS.includes(key)) return slugifyUtmValue(trimmed);
  return trimmed;
}

function normalizeBaseUrl(input) {
  const trimmed = input.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function normalizeUtmParams(utm) {
  const normalized = { ...utm };
  for (const key of UTM_KEYS) {
    normalized[key] = normalizeUtmField(key, utm[key] ?? "");
  }
  return normalized;
}

export function buildUtmUrl(baseUrl, utm, customParams = []) {
  const normalized = normalizeBaseUrl(baseUrl);
  if (!normalized) return { url: "", error: "Enter a destination URL." };

  let parsed;
  try {
    parsed = new URL(normalized);
  } catch {
    return { url: "", error: "Destination URL is not valid." };
  }

  const utmValues = normalizeUtmParams(utm);
  for (const key of UTM_KEYS) parsed.searchParams.delete(key);
  for (const key of UTM_KEYS) {
    const value = utmValues[key]?.trim();
    if (value) parsed.searchParams.set(key, value);
  }

  for (const { key, value } of customParams) {
    const paramKey = key?.trim();
    const paramValue = value?.trim();
    if (!paramKey || !paramValue) continue;
    if (paramKey.toLowerCase().startsWith("utm_")) continue;
    parsed.searchParams.set(paramKey, paramValue);
  }

  return { url: parsed.toString() };
}

export function buildLinkLabel(utm, channelPreset, presetLabels) {
  const presetLabel = channelPreset ? presetLabels[channelPreset] : null;
  const channel = presetLabel ?? utm.utm_source;
  const detail = utm.utm_content || utm.utm_medium;
  return detail ? `${channel} · ${detail}` : channel;
}
