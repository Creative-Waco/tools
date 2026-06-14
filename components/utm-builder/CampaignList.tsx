"use client";

import { useMemo, useState } from "react";

import type { CampaignRecord } from "@/lib/utm-builder/campaign-types";

type CampaignListProps = {
  campaigns: CampaignRecord[];
  selectedId: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
  onNewCampaign: () => void;
};

function statusClass(status?: string) {
  if (status === "on_track") return "campaign-status campaign-status--ok";
  if (status === "below_target") return "campaign-status campaign-status--warn";
  if (status === "no_traffic") return "campaign-status campaign-status--muted";
  return "campaign-status";
}

export function CampaignList({
  campaigns,
  selectedId,
  loading,
  onSelect,
  onNewCampaign,
}: CampaignListProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return campaigns;
    return campaigns.filter((campaign) => {
      const haystack = [
        campaign.name,
        campaign.utm_campaign,
        campaign.landing_url,
        campaign.status,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [campaigns, search]);

  return (
    <aside className="campaign-list panel">
      <div className="campaign-list-header">
        <h2 className="text-sm font-semibold">Campaigns</h2>
        <button type="button" className="btn btn-primary btn-sm" onClick={onNewCampaign}>
          New campaign
        </button>
      </div>

      <input
        type="search"
        className="campaign-list-search"
        placeholder="Search campaigns…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      {loading ? <p className="campaign-list-empty">Loading campaigns…</p> : null}

      {!loading && filtered.length === 0 ? (
        <p className="campaign-list-empty">
          {campaigns.length === 0
            ? "No campaigns yet. Create one to start building tagged links."
            : "No campaigns match your search."}
        </p>
      ) : null}

      <ul className="campaign-list-items">
        {filtered.map((campaign) => (
          <li key={campaign.id}>
            <button
              type="button"
              className={`campaign-list-item${selectedId === campaign.id ? " campaign-list-item--active" : ""}`}
              onClick={() => onSelect(campaign.id)}
            >
              <span className="campaign-list-item-title">{campaign.name}</span>
              <span className="campaign-list-item-meta">
                {campaign.links.length} link{campaign.links.length === 1 ? "" : "s"}
                {campaign.performance?.sessions
                  ? ` · ${campaign.performance.sessions} sessions`
                  : ""}
              </span>
              <span className={statusClass(campaign.benchmark?.status)}>
                {campaign.benchmark?.status === "on_track"
                  ? "On track"
                  : campaign.benchmark?.status === "below_target"
                    ? "Below target"
                    : campaign.benchmark?.status === "no_traffic"
                      ? "No traffic"
                      : campaign.status}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
