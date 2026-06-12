import type { Ga4UtmHistoryEntry } from "@/lib/utm-builder/ga4-history-types";

export type ChannelGroup = {
  id: string;
  source: string;
  medium: string;
  sessions: number;
  activeUsers: number;
  referrers: string[];
  entries: Ga4UtmHistoryEntry[];
};

export type CampaignGroup = {
  id: string;
  campaign: string;
  sessions: number;
  activeUsers: number;
  sources: string[];
  mediums: string[];
  referrers: string[];
  channelGroups: ChannelGroup[];
  entries: Ga4UtmHistoryEntry[];
};

export function formatSource(entry: Ga4UtmHistoryEntry): string {
  return entry.utm.utm_source?.trim() || "—";
}

export function formatMedium(entry: Ga4UtmHistoryEntry): string {
  return entry.utm.utm_medium?.trim() || "—";
}

export function formatChannel(entry: Ga4UtmHistoryEntry): string {
  const parts = [entry.utm.utm_source, entry.utm.utm_medium].filter(Boolean);
  return parts.length ? parts.join(" / ") : "—";
}

export function formatReferrer(entry: Ga4UtmHistoryEntry): string {
  return formatReferrerValue(entry.referrer);
}

export function formatReferrerValue(referrer: string | undefined): string {
  const raw = referrer?.trim();
  if (!raw) return "Direct";

  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./i, "");
    if (!host) return "Direct";

    const path = url.pathname.replace(/\/$/, "");
    if (path && path !== "/") {
      const shortPath = path.length > 28 ? `${path.slice(0, 28)}…` : path;
      return `${host}${shortPath}`;
    }

    return host;
  } catch {
    return raw.length > 48 ? `${raw.slice(0, 48)}…` : raw;
  }
}

export function formatLanding(entry: Ga4UtmHistoryEntry): string {
  if (entry.landingPage) return entry.landingPage;
  try {
    return new URL(entry.taggedUrl).pathname || "/";
  } catch {
    return "—";
  }
}

export function formatValuesSummary(values: string[]): string {
  const unique = [...new Set(values.filter(Boolean))].sort();
  if (unique.length === 0) return "—";
  if (unique.length === 1) return unique[0];
  if (unique.length === 2) return unique.join(", ");
  return `${unique[0]} +${unique.length - 1}`;
}

/** @deprecated Use formatValuesSummary for sources/mediums */
export function formatChannelsSummary(channels: string[]): string {
  return formatValuesSummary(channels);
}

export function groupEntriesByChannel(entries: Ga4UtmHistoryEntry[]): ChannelGroup[] {
  const map = new Map<string, ChannelGroup>();

  for (const entry of entries) {
    const source = entry.utm.utm_source?.trim() || "";
    const medium = entry.utm.utm_medium?.trim() || "";
    const id = `${source}|${medium}`;
    let group = map.get(id);

    if (!group) {
      group = {
        id,
        source: source || "—",
        medium: medium || "—",
        sessions: 0,
        activeUsers: 0,
        referrers: [],
        entries: [],
      };
      map.set(id, group);
    }

    group.sessions += entry.sessions;
    group.activeUsers += entry.activeUsers;
    group.entries.push(entry);
  }

  return [...map.values()]
    .map((group) => {
      const referrers = [
        ...new Set(group.entries.map((entry) => formatReferrer(entry)).filter(Boolean)),
      ].sort();
      return {
        ...group,
        referrers,
        entries: [...group.entries].sort((a, b) => b.sessions - a.sessions),
      };
    })
    .sort((a, b) => b.sessions - a.sessions);
}

export function groupEntriesByCampaign(entries: Ga4UtmHistoryEntry[]): CampaignGroup[] {
  const map = new Map<string, CampaignGroup>();

  for (const entry of entries) {
    const campaign = entry.utm.utm_campaign;
    let group = map.get(campaign);

    if (!group) {
      group = {
        id: campaign,
        campaign,
        sessions: 0,
        activeUsers: 0,
        sources: [],
        mediums: [],
        referrers: [],
        channelGroups: [],
        entries: [],
      };
      map.set(campaign, group);
    }

    group.sessions += entry.sessions;
    group.activeUsers += entry.activeUsers;
    group.entries.push(entry);
  }

  return [...map.values()].map((group) => {
    const sortedEntries = [...group.entries].sort((a, b) => b.sessions - a.sessions);
    const channelGroups = groupEntriesByChannel(sortedEntries);
    const sources = [...new Set(sortedEntries.map((entry) => formatSource(entry)).filter((v) => v !== "—"))].sort();
    const mediums = [...new Set(sortedEntries.map((entry) => formatMedium(entry)).filter((v) => v !== "—"))].sort();
    const referrers = [
      ...new Set(sortedEntries.map((entry) => formatReferrer(entry)).filter(Boolean)),
    ].sort();

    return {
      ...group,
      sources,
      mediums,
      referrers,
      channelGroups,
      entries: sortedEntries,
    };
  });
}
