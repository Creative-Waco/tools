"use client";

import { useEffect, useState } from "react";

import type { CampaignRecord } from "@/lib/utm-builder/campaign-types";

function toEditPercent(value: number | null) {
  if (value == null) return "";
  const num = Number(value);
  if (!Number.isFinite(num)) return "";
  return num <= 1 ? String(Math.round(num * 1000) / 10) : String(num);
}

type CampaignEditFormProps = {
  campaign: CampaignRecord;
  onSaved: (linksRebuilt: number) => void;
  onCancel: () => void;
};

export function CampaignEditForm({ campaign, onSaved, onCancel }: CampaignEditFormProps) {
  const [name, setName] = useState(campaign.name);
  const [utmCampaign, setUtmCampaign] = useState(campaign.utm_campaign);
  const [landingUrl, setLandingUrl] = useState(campaign.landing_url);
  const [benchmarkSessions, setBenchmarkSessions] = useState(
    campaign.benchmark_sessions != null ? String(campaign.benchmark_sessions) : "",
  );
  const [benchmarkEngagement, setBenchmarkEngagement] = useState(
    toEditPercent(campaign.benchmark_engagement_rate),
  );
  const [benchmarkBounce, setBenchmarkBounce] = useState(
    toEditPercent(campaign.benchmark_bounce_rate),
  );
  const [notes, setNotes] = useState(campaign.notes);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setName(campaign.name);
    setUtmCampaign(campaign.utm_campaign);
    setLandingUrl(campaign.landing_url);
    setBenchmarkSessions(
      campaign.benchmark_sessions != null ? String(campaign.benchmark_sessions) : "",
    );
    setBenchmarkEngagement(toEditPercent(campaign.benchmark_engagement_rate));
    setBenchmarkBounce(toEditPercent(campaign.benchmark_bounce_rate));
    setNotes(campaign.notes);
    setError("");
  }, [campaign]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/utm-builder/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          utm_campaign: utmCampaign,
          landing_url: landingUrl,
          benchmark_sessions: benchmarkSessions ? Number(benchmarkSessions) : null,
          benchmark_engagement_rate: benchmarkEngagement ? Number(benchmarkEngagement) : null,
          benchmark_bounce_rate: benchmarkBounce ? Number(benchmarkBounce) : null,
          notes,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Could not update campaign.");
      }

      onSaved(data.linksRebuilt ?? 0);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Could not update campaign.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="campaign-dialog-form campaign-edit-form" onSubmit={handleSubmit}>
      <label className="field">
        <span>Campaign name</span>
        <input
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>

      <label className="field">
        <span>utm_campaign</span>
        <input
          required
          value={utmCampaign}
          onChange={(event) => setUtmCampaign(event.target.value)}
        />
        <span className="text-xs text-muted-foreground">
          Changing the slug rebuilds all tagged links on this campaign.
        </span>
      </label>

      <label className="field">
        <span>Destination URL</span>
        <input
          required
          type="url"
          value={landingUrl}
          onChange={(event) => setLandingUrl(event.target.value)}
        />
        <span className="text-xs text-muted-foreground">
          Changing the destination rebuilds all tagged links on this campaign.
        </span>
      </label>

      <div className="campaign-dialog-benchmarks">
        <span className="text-sm font-semibold">Benchmark targets (optional)</span>
        <div className="campaign-dialog-benchmark-grid">
          <label className="field">
            <span>Sessions</span>
            <input
              type="number"
              min={0}
              value={benchmarkSessions}
              onChange={(event) => setBenchmarkSessions(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Engagement %</span>
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={benchmarkEngagement}
              onChange={(event) => setBenchmarkEngagement(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Bounce %</span>
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={benchmarkBounce}
              onChange={(event) => setBenchmarkBounce(event.target.value)}
            />
          </label>
        </div>
      </div>

      <label className="field">
        <span>Notes</span>
        <textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} />
      </label>

      {error ? <p className="campaign-dialog-error">{error}</p> : null}

      <div className="campaign-dialog-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
