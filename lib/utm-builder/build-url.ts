import { normalizeUtmField } from "@/lib/utm-builder/normalize";

export type UtmParams = {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term: string;
  utm_content: string;
  utm_id: string;
};

export type CustomParam = {
  key: string;
  value: string;
};

export const EMPTY_UTM: UtmParams = {
  utm_source: "",
  utm_medium: "",
  utm_campaign: "",
  utm_term: "",
  utm_content: "",
  utm_id: "",
};

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
] as const;

function normalizeBaseUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function normalizeUtmParams(utm: UtmParams): UtmParams {
  const normalized = { ...utm };
  for (const key of UTM_KEYS) {
    normalized[key] = normalizeUtmField(key, utm[key]);
  }
  return normalized;
}

export function urlContainsUtmParams(input: string): boolean {
  const normalized = normalizeBaseUrl(input);
  if (!normalized) return false;

  try {
    const parsed = new URL(normalized);
    return UTM_KEYS.some((key) => parsed.searchParams.has(key));
  } catch {
    return false;
  }
}

export function buildUtmUrl(
  baseUrl: string,
  utm: UtmParams,
  customParams: CustomParam[] = [],
  options: { normalize?: boolean } = { normalize: true },
): { url: string; error?: string } {
  const normalized = normalizeBaseUrl(baseUrl);
  if (!normalized) {
    return { url: "", error: "Enter a destination URL." };
  }

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return { url: "", error: "Destination URL is not valid." };
  }

  const utmValues = options.normalize ? normalizeUtmParams(utm) : utm;

  for (const key of UTM_KEYS) {
    parsed.searchParams.delete(key);
  }

  for (const key of UTM_KEYS) {
    const value = utmValues[key].trim();
    if (value) parsed.searchParams.set(key, value);
  }

  for (const { key, value } of customParams) {
    const paramKey = key.trim();
    const paramValue = value.trim();
    if (!paramKey || !paramValue) continue;
    if (paramKey.toLowerCase().startsWith("utm_")) continue;
    parsed.searchParams.set(paramKey, paramValue);
  }

  return { url: parsed.toString() };
}

export type ParsedUtmUrl = {
  baseUrl: string;
  utm: UtmParams;
  customParams: CustomParam[];
};

export function parseUtmUrl(input: string): { data?: ParsedUtmUrl; error?: string } {
  const normalized = normalizeBaseUrl(input);
  if (!normalized) {
    return { error: "Paste a URL to parse." };
  }

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return { error: "URL is not valid." };
  }

  const utm: UtmParams = { ...EMPTY_UTM };
  const customParams: CustomParam[] = [];

  for (const [key, value] of parsed.searchParams.entries()) {
    if (UTM_KEYS.includes(key as (typeof UTM_KEYS)[number])) {
      utm[key as keyof UtmParams] = value;
      parsed.searchParams.delete(key);
    } else {
      customParams.push({ key, value });
      parsed.searchParams.delete(key);
    }
  }

  parsed.search = parsed.searchParams.toString();
  const baseUrl = parsed.toString();

  return {
    data: {
      baseUrl,
      utm,
      customParams,
    },
  };
}

export function hasRequiredUtm(utm: UtmParams): boolean {
  return Boolean(
    utm.utm_source.trim() && utm.utm_medium.trim() && utm.utm_campaign.trim(),
  );
}

export function getExistingUtmKeys(baseUrl: string): string[] {
  const normalized = normalizeBaseUrl(baseUrl);
  if (!normalized) return [];

  try {
    const parsed = new URL(normalized);
    return UTM_KEYS.filter((key) => parsed.searchParams.has(key));
  } catch {
    return [];
  }
}

export type UrlCopyFormat = "full" | "query" | "path-query";

export function formatUrlForCopy(
  builtUrl: string,
  format: UrlCopyFormat,
): { text: string; error?: string } {
  if (!builtUrl) {
    return { text: "", error: "No URL to copy." };
  }

  try {
    const parsed = new URL(builtUrl);

    if (format === "full") {
      return { text: parsed.toString() };
    }

    const query = parsed.searchParams.toString();
    const queryString = query ? `?${query}` : "";

    if (format === "query") {
      return { text: queryString };
    }

    return { text: `${parsed.pathname}${queryString}` };
  } catch {
    return { text: "", error: "URL is not valid." };
  }
}

export type ContentVariantLink = {
  content: string;
  url: string;
};

export function buildContentVariantLinks(
  baseUrl: string,
  utm: UtmParams,
  customParams: CustomParam[],
  variants: string[],
): ContentVariantLink[] {
  return variants
    .map((content) => content.trim())
    .filter(Boolean)
    .map((content) => {
      const result = buildUtmUrl(
        baseUrl,
        { ...utm, utm_content: content },
        customParams,
      );
      return { content, url: result.url };
    })
    .filter((entry) => entry.url);
}

export type UrlBreakdownPart = {
  text: string;
  kind: "origin" | "path" | "query-start" | "param-key" | "param-value" | "separator";
};

export function breakdownUrl(builtUrl: string): UrlBreakdownPart[] {
  if (!builtUrl) return [];

  try {
    const parsed = new URL(builtUrl);
    const parts: UrlBreakdownPart[] = [
      { text: parsed.origin, kind: "origin" },
      { text: parsed.pathname, kind: "path" },
    ];

    const entries = [...parsed.searchParams.entries()];
    if (entries.length === 0) return parts;

    parts.push({ text: "?", kind: "query-start" });

    entries.forEach(([key, value], index) => {
      if (index > 0) {
        parts.push({ text: "&", kind: "separator" });
      }
      parts.push({ text: key, kind: "param-key" });
      parts.push({ text: "=", kind: "separator" });
      parts.push({ text: value, kind: "param-value" });
    });

    return parts;
  } catch {
    return [{ text: builtUrl, kind: "path" }];
  }
}
