import {
  EMPTY_UTM,
  type CustomParam,
  type UtmParams,
} from "@/lib/utm-builder/build-url";

export type BuilderFormState = {
  baseUrl: string;
  utm: UtmParams;
  customParams: CustomParam[];
  contentVariants: string[];
  activePresetId: string;
};

export const DEFAULT_BASE_URL = "https://creativewaco.org/";

export const DEFAULT_FORM: BuilderFormState = {
  baseUrl: DEFAULT_BASE_URL,
  utm: { ...EMPTY_UTM },
  customParams: [],
  contentVariants: [],
  activePresetId: "",
};

const UTM_PARAM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
] as const;

export function formStateToSearchParams(state: BuilderFormState): URLSearchParams {
  const params = new URLSearchParams();

  if (state.baseUrl && state.baseUrl !== DEFAULT_BASE_URL) {
    params.set("url", state.baseUrl);
  }

  for (const key of UTM_PARAM_KEYS) {
    const value = state.utm[key].trim();
    if (value) params.set(key, value);
  }

  const custom = state.customParams.filter(
    (param) => param.key.trim() && param.value.trim(),
  );
  if (custom.length > 0) {
    params.set("custom", JSON.stringify(custom));
  }

  const variants = state.contentVariants.map((value) => value.trim()).filter(Boolean);
  if (variants.length > 0) {
    params.set("variants", variants.join(","));
  }

  if (state.activePresetId) {
    params.set("preset", state.activePresetId);
  }

  return params;
}

export function searchParamsToFormState(
  searchParams: URLSearchParams,
): BuilderFormState {
  const utm: UtmParams = { ...EMPTY_UTM };

  for (const key of UTM_PARAM_KEYS) {
    const value = searchParams.get(key);
    if (value) utm[key] = value;
  }

  let customParams: CustomParam[] = [];
  const customRaw = searchParams.get("custom");
  if (customRaw) {
    try {
      const parsed = JSON.parse(customRaw) as CustomParam[];
      if (Array.isArray(parsed)) {
        customParams = parsed.filter(
          (param) => param && typeof param.key === "string" && typeof param.value === "string",
        );
      }
    } catch {
      customParams = [];
    }
  }

  const variantsRaw = searchParams.get("variants");
  const contentVariants = variantsRaw
    ? variantsRaw.split(",").map((value) => value.trim()).filter(Boolean)
    : [];

  return {
    baseUrl: searchParams.get("url") ?? DEFAULT_BASE_URL,
    utm,
    customParams,
    contentVariants,
    activePresetId: searchParams.get("preset") ?? "",
  };
}

export function hasShareableState(searchParams: URLSearchParams): boolean {
  return (
    searchParams.has("url") ||
    UTM_PARAM_KEYS.some((key) => searchParams.has(key)) ||
    searchParams.has("custom") ||
    searchParams.has("variants") ||
    searchParams.has("preset")
  );
}

export function readShareableStateFromLocation(): BuilderFormState | null {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);
  if (!hasShareableState(params)) return null;
  return searchParamsToFormState(params);
}

export function builderPathFromForm(state: BuilderFormState): string {
  const params = formStateToSearchParams(state);
  const query = params.toString();
  return query ? `/utm-builder/?${query}` : "/utm-builder/";
}
