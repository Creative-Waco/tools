"use client";

import { useMemo, useState } from "react";

import { UrlBreakdown } from "@/components/utm-builder/UrlBreakdown";
import { QrCodePreview } from "@/components/utm-builder/QrCodePreview";
import {
  buildContentVariantLinks,
  buildUtmUrl,
  hasRequiredUtm,
  type CustomParam,
  type UtmParams,
} from "@/lib/utm-builder/build-url";
import { normalizeUtmField } from "@/lib/utm-builder/normalize";
import { detectPresetId, findPresetById, UTM_PRESETS } from "@/lib/utm-builder/presets";
import type { CampaignRecord } from "@/lib/utm-builder/campaign-types";

type AddLinkPanelProps = {
  campaign: CampaignRecord;
  onLinkSaved: () => void;
};

const EMPTY_UTM: UtmParams = {
  utm_source: "",
  utm_medium: "",
  utm_campaign: "",
  utm_term: "",
  utm_content: "",
  utm_id: "",
};

export function AddLinkPanel({ campaign, onLinkSaved }: AddLinkPanelProps) {
  const [utm, setUtm] = useState<UtmParams>({ ...EMPTY_UTM });
  const [customParams, setCustomParams] = useState<CustomParam[]>([]);
  const [contentVariants, setContentVariants] = useState<string[]>([]);
  const [variantInput, setVariantInput] = useState("");
  const [activePresetId, setActivePresetId] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fullUtm = useMemo(
    () => ({ ...utm, utm_campaign: campaign.utm_campaign }),
    [utm, campaign.utm_campaign],
  );

  const built = useMemo(
    () => buildUtmUrl(campaign.landing_url, fullUtm, customParams),
    [campaign.landing_url, fullUtm, customParams],
  );

  const variantLinks = useMemo(
    () =>
      buildContentVariantLinks(
        campaign.landing_url,
        fullUtm,
        customParams,
        contentVariants,
      ),
    [campaign.landing_url, fullUtm, customParams, contentVariants],
  );

  function applyPreset(presetId: string) {
    const preset = findPresetById(presetId);
    if (!preset) return;
    setActivePresetId(presetId);
    setUtm((current) => ({
      ...current,
      utm_source: preset.utm_source,
      utm_medium: preset.utm_medium,
    }));
    if (preset.contentSuggestions.length && !contentVariants.length) {
      setContentVariants(preset.contentSuggestions.slice(0, 1));
    }
  }

  function updateUtmField(key: keyof UtmParams, value: string) {
    setUtm((current) => ({ ...current, [key]: value }));
    if (key === "utm_source" || key === "utm_medium") {
      setActivePresetId(detectPresetId(
        key === "utm_source" ? value : utm.utm_source,
        key === "utm_medium" ? value : utm.utm_medium,
      ));
    }
  }

  function addVariant() {
    const trimmed = variantInput.trim();
    if (!trimmed) return;
    setContentVariants((current) =>
      current.includes(trimmed) ? current : [...current, trimmed],
    );
    setVariantInput("");
  }

  async function handleSave() {
    if (!hasRequiredUtm(fullUtm)) {
      setError("Source, medium, and campaign are required.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/utm-builder/campaigns/${campaign.id}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          utm: fullUtm,
          channel_preset: activePresetId,
          customParams,
          contentVariants,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Could not save link.");
      }

      const count = data.links?.length ?? 1;
      setMessage(`Saved ${count} link${count === 1 ? "" : "s"} to campaign.`);
      setUtm({ ...EMPTY_UTM });
      setCustomParams([]);
      setContentVariants([]);
      setActivePresetId("");
      onLinkSaved();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save link.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="campaign-workspace-section campaign-add-link">
      <h3 className="text-sm font-semibold">Add UTM link</h3>
      <p className="text-sm text-muted-foreground">
        Campaign slug <code>{campaign.utm_campaign}</code> is locked for all links in this
        campaign.
      </p>

      <div className="campaign-add-link-channels">
        {UTM_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={`utm-builder-chip${activePresetId === preset.id ? " utm-builder-chip--active" : ""}`}
            onClick={() => applyPreset(preset.id)}
            title={preset.description}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="campaign-add-link-grid">
        <label className="field">
          <span>utm_source</span>
          <input
            value={utm.utm_source}
            onChange={(event) => updateUtmField("utm_source", event.target.value)}
            onBlur={() =>
              updateUtmField("utm_source", normalizeUtmField("utm_source", utm.utm_source))
            }
          />
        </label>
        <label className="field">
          <span>utm_medium</span>
          <input
            value={utm.utm_medium}
            onChange={(event) => updateUtmField("utm_medium", event.target.value)}
            onBlur={() =>
              updateUtmField("utm_medium", normalizeUtmField("utm_medium", utm.utm_medium))
            }
          />
        </label>
        <label className="field">
          <span>utm_content</span>
          <input
            value={utm.utm_content}
            onChange={(event) => updateUtmField("utm_content", event.target.value)}
          />
        </label>
        <label className="field">
          <span>utm_term</span>
          <input
            value={utm.utm_term}
            onChange={(event) => updateUtmField("utm_term", event.target.value)}
          />
        </label>
      </div>

      <div className="campaign-add-link-variants">
        <label className="field">
          <span>Content variants (optional batch)</span>
          <div className="campaign-add-link-variant-row">
            <input
              value={variantInput}
              onChange={(event) => setVariantInput(event.target.value)}
              placeholder="story, feed, reel…"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addVariant();
                }
              }}
            />
            <button type="button" className="btn btn-secondary btn-sm" onClick={addVariant}>
              Add
            </button>
          </div>
        </label>
        {contentVariants.length > 0 ? (
          <div className="campaign-add-link-variant-list">
            {contentVariants.map((variant) => (
              <button
                key={variant}
                type="button"
                className="utm-builder-chip utm-builder-chip--active"
                onClick={() =>
                  setContentVariants((current) => current.filter((v) => v !== variant))
                }
              >
                {variant} ×
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {built.url ? (
        <div className="campaign-add-link-preview">
          <UrlBreakdown url={built.url} />
          {activePresetId === "print-qr" ? <QrCodePreview url={built.url} /> : null}
        </div>
      ) : null}

      {variantLinks.length > 1 ? (
        <ul className="campaign-add-link-variant-preview">
          {variantLinks.map((link) => (
            <li key={link.content}>
              <strong>{link.content}</strong> — <code>{link.url}</code>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? <p className="campaign-dialog-error">{error}</p> : null}
      {message ? <p className="campaign-dialog-success">{message}</p> : null}

      <button
        type="button"
        className="btn btn-primary"
        onClick={handleSave}
        disabled={saving || !hasRequiredUtm(fullUtm)}
      >
        {saving ? "Saving…" : contentVariants.length > 1 ? "Save links" : "Save link"}
      </button>
    </section>
  );
}
