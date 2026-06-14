"use client";

import { useState } from "react";

import { AddLinkPanel } from "@/components/utm-builder/AddLinkPanel";
import { CampaignEditForm } from "@/components/utm-builder/CampaignEditForm";
import type { CampaignRecord } from "@/lib/utm-builder/campaign-types";

type CampaignWorkspaceProps = {
  campaign: CampaignRecord;
  days: number;
  onRefresh: () => void;
  refreshing: boolean;
};

function formatPct(value: number | null | undefined) {
  if (value == null) return "—";
  return `${value}%`;
}

async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
}

export function CampaignWorkspace({
  campaign,
  days,
  onRefresh,
  refreshing,
}: CampaignWorkspaceProps) {
  const [copyMessage, setCopyMessage] = useState("");
  const [editing, setEditing] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const perf = campaign.performance;
  const benchmark = campaign.benchmark;

  return (
    <article className="campaign-workspace panel">
      <header className="campaign-workspace-header">
        {editing ? (
          <div className="campaign-workspace-edit">
            <h2 className="text-lg font-semibold">Edit campaign</h2>
            <CampaignEditForm
              campaign={campaign}
              onCancel={() => setEditing(false)}
              onSaved={(linksRebuilt) => {
                setEditing(false);
                onRefresh();
                if (linksRebuilt > 0) {
                  setSaveMessage(`Saved — rebuilt ${linksRebuilt} tagged link${linksRebuilt === 1 ? "" : "s"}.`);
                } else {
                  setSaveMessage("Campaign saved.");
                }
                setTimeout(() => setSaveMessage(""), 4000);
              }}
            />
          </div>
        ) : (
          <>
            <div>
              <h2 className="text-xl font-semibold">{campaign.name}</h2>
              <p className="text-sm text-muted-foreground">
                <code>{campaign.utm_campaign}</code> ·{" "}
                <a href={campaign.landing_url} target="_blank" rel="noreferrer">
                  {campaign.landing_url}
                </a>
              </p>
              {saveMessage ? <p className="campaign-dialog-success">{saveMessage}</p> : null}
            </div>
            <div className="campaign-workspace-actions">
              <span className="text-sm text-muted-foreground">Last {days} days</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setEditing(true)}
              >
                Edit
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={onRefresh}
                disabled={refreshing}
              >
                {refreshing ? "Refreshing…" : "Refresh"}
              </button>
            </div>
          </>
        )}
      </header>

      <section className="campaign-workspace-section">
        <h3 className="text-sm font-semibold">Performance</h3>
        <div className="campaign-performance-grid">
          <div className="campaign-metric">
            <span className="campaign-metric-label">Sessions</span>
            <span className="campaign-metric-value">{perf?.sessions ?? 0}</span>
            {benchmark?.targets.sessions != null ? (
              <span className="campaign-metric-target">target {benchmark.targets.sessions}</span>
            ) : null}
          </div>
          <div className="campaign-metric">
            <span className="campaign-metric-label">Engagement</span>
            <span className="campaign-metric-value">{formatPct(perf?.engagementRate)}</span>
            <span className="campaign-metric-target">
              {benchmark?.targetSource.engagementRate === "airtable" ? "target" : "site avg"}{" "}
              {formatPct(benchmark?.targets.engagementRate)}
            </span>
          </div>
          <div className="campaign-metric">
            <span className="campaign-metric-label">Bounce</span>
            <span className="campaign-metric-value">{formatPct(perf?.bounceRate)}</span>
            <span className="campaign-metric-target">
              {benchmark?.targetSource.bounceRate === "airtable" ? "target" : "site avg"}{" "}
              {formatPct(benchmark?.targets.bounceRate)}
            </span>
          </div>
          <div className="campaign-metric">
            <span className="campaign-metric-label">Status</span>
            <span className={`campaign-status campaign-status--${benchmark?.status ?? "muted"}`}>
              {benchmark?.status === "on_track"
                ? "On track"
                : benchmark?.status === "below_target"
                  ? "Below target"
                  : benchmark?.status === "no_traffic"
                    ? "No traffic yet"
                    : "—"}
            </span>
          </div>
        </div>
      </section>

      <section className="campaign-workspace-section">
        <h3 className="text-sm font-semibold">Tagged links</h3>
        {campaign.links.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No links yet. Add a channel-specific UTM link below.
          </p>
        ) : (
          <div className="campaign-links-table-wrap">
            <table className="campaign-links-table">
              <thead>
                <tr>
                  <th>Link</th>
                  <th>Source / medium</th>
                  <th>Sessions</th>
                  <th>Engagement</th>
                  <th>Bounce</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {campaign.links.map((link) => (
                  <tr key={link.id}>
                    <td>
                      <strong>{link.name}</strong>
                      <div className="campaign-link-url">{link.tagged_url}</div>
                    </td>
                    <td>
                      {link.utm.utm_source} / {link.utm.utm_medium}
                      {link.utm.utm_content ? ` · ${link.utm.utm_content}` : ""}
                    </td>
                    <td>{link.performance?.sessions ?? 0}</td>
                    <td>{formatPct(link.performance?.engagementRate)}</td>
                    <td>{formatPct(link.performance?.bounceRate)}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={async () => {
                          await copyText(link.tagged_url);
                          setCopyMessage(`Copied ${link.name}`);
                          setTimeout(() => setCopyMessage(""), 2000);
                        }}
                      >
                        Copy
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {copyMessage ? <p className="campaign-dialog-success">{copyMessage}</p> : null}
      </section>

      <AddLinkPanel campaign={campaign} onLinkSaved={onRefresh} />
    </article>
  );
}
