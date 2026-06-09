import type { CustomParam, UtmParams } from "@/lib/utm-builder/build-url";

export type RecentCampaign = {
  id: string;
  savedAt: string;
  baseUrl: string;
  utm: UtmParams;
  customParams: CustomParam[];
  label: string;
};

const STORAGE_KEY = "cw-utm-recent-campaigns";
const MAX_RECENT = 10;

function readStorage(): RecentCampaign[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentCampaign[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStorage(entries: RecentCampaign[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_RECENT)));
}

export function loadRecentCampaigns(): RecentCampaign[] {
  return readStorage();
}

export function saveRecentCampaign(input: {
  baseUrl: string;
  utm: UtmParams;
  customParams: CustomParam[];
}) {
  const label = [input.utm.utm_campaign, input.utm.utm_source, input.utm.utm_medium]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" · ");

  if (!label) return;

  const entry: RecentCampaign = {
    id: `${Date.now()}`,
    savedAt: new Date().toISOString(),
    baseUrl: input.baseUrl,
    utm: input.utm,
    customParams: input.customParams,
    label,
  };

  const existing = readStorage().filter(
    (item) =>
      !(
        item.baseUrl === entry.baseUrl &&
        item.utm.utm_source === entry.utm.utm_source &&
        item.utm.utm_medium === entry.utm.utm_medium &&
        item.utm.utm_campaign === entry.utm.utm_campaign
      ),
  );

  writeStorage([entry, ...existing]);
}
