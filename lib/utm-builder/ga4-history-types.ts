import type { UtmParams } from "@/lib/utm-builder/build-url";

export type Ga4UtmSuggestion = {
  value: string;
  sessions: number;
};

export type Ga4UtmHistoryEntry = {
  id: string;
  utm: UtmParams;
  landingPage: string;
  referrer: string;
  taggedUrl: string;
  sessions: number;
  activeUsers: number;
  engagementRate?: number;
  bounceRate?: number;
  engagedSessions?: number;
};

export type Ga4UtmHistoryResponse = {
  configured: true;
  startDate: string;
  endDate: string;
  totals: {
    campaigns: number;
    sessions: number;
    activeUsers: number;
  };
  entries: Ga4UtmHistoryEntry[];
  suggestions: {
    sources: Ga4UtmSuggestion[];
    mediums: Ga4UtmSuggestion[];
    campaigns: Ga4UtmSuggestion[];
  };
};

export type Ga4UtmHistoryUnavailable = {
  configured: false;
  message: string;
};

export type Ga4UtmHistoryResult = Ga4UtmHistoryResponse | Ga4UtmHistoryUnavailable;
