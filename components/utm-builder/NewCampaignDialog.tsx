"use client";

import { useEffect, useState } from "react";

import { buildCampaignSlug } from "@/lib/utm-builder/normalize";

type NewCampaignDialogProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (campaignId: string) => void;
};

export function NewCampaignDialog({ open, onClose, onCreated }: NewCampaignDialogProps) {
  const [name, setName] = useState("");
  const [utmCampaign, setUtmCampaign] = useState("");
  const [landingUrl, setLandingUrl] = useState("https://creativewaco.org/");
  const [benchmarkSessions, setBenchmarkSessions] = useState("");
  const [benchmarkEngagement, setBenchmarkEngagement] = useState("");
  const [benchmarkBounce, setBenchmarkBounce] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
  }, [open]);

  useEffect(() => {
    if (!name.trim() || utmCampaign.trim()) return;
    setUtmCampaign(buildCampaignSlug(name, ""));
  }, [name, utmCampaign]);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/utm-builder/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          utm_campaign: utmCampaign,
          landing_url: landingUrl,
          status: "Active",
          benchmark_sessions: benchmarkSessions ? Number(benchmarkSessions) : null,
          benchmark_engagement_rate: benchmarkEngagement ? Number(benchmarkEngagement) : null,
          benchmark_bounce_rate: benchmarkBounce ? Number(benchmarkBounce) : null,
          notes,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Could not create campaign.");
      }

      onCreated(data.campaign.id);
      setName("");
      setUtmCampaign("");
      setLandingUrl("https://creativewaco.org/");
      setBenchmarkSessions("");
      setBenchmarkEngagement("");
      setBenchmarkBounce("");
      setNotes("");
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Could not create campaign.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="campaign-dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className="campaign-dialog panel"
        role="dialog"
        aria-labelledby="new-campaign-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="new-campaign-title" className="text-lg font-semibold">
          New campaign
        </h2>
        <p className="text-sm text-muted-foreground">
          Set the destination and campaign slug once, then add channel-specific UTM links.
        </p>

        <form className="campaign-dialog-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Campaign name</span>
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Spring newsletter push"
            />
          </label>

          <label className="field">
            <span>utm_campaign</span>
            <input
              required
              value={utmCampaign}
              onChange={(event) => setUtmCampaign(event.target.value)}
              placeholder="spring-newsletter"
            />
          </label>

          <label className="field">
            <span>Destination URL</span>
            <input
              required
              type="url"
              value={landingUrl}
              onChange={(event) => setLandingUrl(event.target.value)}
            />
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
            <textarea
              rows={2}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>

          {error ? <p className="campaign-dialog-error">{error}</p> : null}

          <div className="campaign-dialog-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Creating…" : "Create campaign"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
