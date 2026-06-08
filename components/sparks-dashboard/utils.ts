import type { Tier } from "./types";

export const TIERS: Tier[] = ["bronze", "silver", "gold"];

export function escapeHtml(str: unknown): string {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function statusSlugToClass(slug: string): string {
  const map: Record<string, string> = {
    idea: "idea",
    planning: "planning",
    marketing: "marketing",
    operations: "operations",
    ready: "ready",
    "follow-up": "follow-up",
    followup: "follow-up",
    done: "done",
    canceled: "canceled",
    cancelled: "canceled",
  };
  return map[slug] ?? "unknown";
}

export function monthKeyFromIso(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function formatMonthHeading(monthKey: string): string {
  const [year, month] = String(monthKey).split("-");
  if (!year || !month) return monthKey;
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function membershipTypeLabel(type: string): string {
  if (type === "annual") return "Annual";
  if (type === "honorary") return "Honorary";
  return "Monthly";
}

export function memberTierLabel(tier: string): string {
  return `${tier.charAt(0).toUpperCase()}${tier.slice(1)}`;
}

export async function fetchDashboard({
  period,
  membershipType,
  refresh = false,
}: {
  period: string;
  membershipType: string;
  refresh?: boolean;
}): Promise<unknown> {
  const params = new URLSearchParams({ period, membershipType });
  if (refresh) params.set("refresh", "1");
  const res = await fetch(`/api/sparks-dashboard/?${params}`, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`);
  }
  return res.json();
}
