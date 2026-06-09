"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StatusLine } from "@/components/StatusLine";
import { QrCodePreview } from "@/components/utm-builder/QrCodePreview";
import { UrlBreakdown } from "@/components/utm-builder/UrlBreakdown";
import { UtmField } from "@/components/utm-builder/UtmField";
import {
  buildContentVariantLinks,
  buildUtmUrl,
  formatUrlForCopy,
  getExistingUtmKeys,
  hasRequiredUtm,
  parseUtmUrl,
  urlContainsUtmParams,
  type CustomParam,
  type UrlCopyFormat,
  type UtmParams,
} from "@/lib/utm-builder/build-url";
import { DESTINATION_SHORTCUTS } from "@/lib/utm-builder/destinations";
import {
  buildCampaignSlug,
  getUtmFieldWarnings,
  normalizeUtmField,
} from "@/lib/utm-builder/normalize";
import { detectPresetId, findPresetById, UTM_PRESETS } from "@/lib/utm-builder/presets";
import {
  loadRecentCampaigns,
  saveRecentCampaign,
  type RecentCampaign,
} from "@/lib/utm-builder/recent-campaigns";
import {
  builderPathFromForm,
  DEFAULT_FORM,
  formStateToSearchParams,
  readShareableStateFromLocation,
  type BuilderFormState,
} from "@/lib/utm-builder/url-state";

function emptyCustomParam(): CustomParam {
  return { key: "", value: "" };
}

function updateUtm(current: UtmParams, key: keyof UtmParams, value: string): UtmParams {
  return { ...current, [key]: value };
}

function mergeParsedIntoForm(
  current: BuilderFormState,
  parsed: NonNullable<ReturnType<typeof parseUtmUrl>["data"]>,
): BuilderFormState {
  return {
    ...current,
    baseUrl: parsed.baseUrl,
    utm: parsed.utm,
    customParams: parsed.customParams.length ? parsed.customParams : current.customParams,
    activePresetId: detectPresetId(parsed.utm.utm_source, parsed.utm.utm_medium),
  };
}

export function UtmBuilderTool() {
  const skipUrlSync = useRef(true);

  const [form, setForm] = useState<BuilderFormState>(DEFAULT_FORM);
  const [status, setStatus] = useState({ message: "", variant: "" as "" | "success" | "error" });
  const [recentCampaigns, setRecentCampaigns] = useState<RecentCampaign[]>([]);
  const [slugEventName, setSlugEventName] = useState("");
  const [slugDateLabel, setSlugDateLabel] = useState("");
  const [variantInput, setVariantInput] = useState("");

  useEffect(() => {
    const shared = readShareableStateFromLocation();
    if (shared) {
      setForm(shared);
      setStatus({ message: "Loaded shared link settings.", variant: "success" });
    }

    setRecentCampaigns(loadRecentCampaigns());

    const timer = window.setTimeout(() => {
      skipUrlSync.current = false;
    }, 300);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (skipUrlSync.current) return;

    const timer = window.setTimeout(() => {
      const nextPath = builderPathFromForm(form);
      const currentPath = `${window.location.pathname}${window.location.search}`;

      if (currentPath !== nextPath) {
        window.history.replaceState(null, "", nextPath);
      }
    }, 400);

    return () => window.clearTimeout(timer);
  }, [form]);

  const buildResult = useMemo(
    () => buildUtmUrl(form.baseUrl, form.utm, form.customParams),
    [form],
  );

  const builtUrl = buildResult.url;
  const requiredComplete = hasRequiredUtm(form.utm);
  const existingUtmKeys = useMemo(() => getExistingUtmKeys(form.baseUrl), [form.baseUrl]);
  const fieldWarnings = useMemo(() => getUtmFieldWarnings(form.utm), [form.utm]);
  const activePreset = findPresetById(form.activePresetId);

  const contentVariantLinks = useMemo(
    () =>
      buildContentVariantLinks(
        form.baseUrl,
        form.utm,
        form.customParams,
        form.contentVariants,
      ),
    [form],
  );

  const showQr = form.activePresetId === "print-qr" && Boolean(builtUrl && requiredComplete);

  const warningByField = useMemo(() => {
    const map = new Map<keyof UtmParams, string>();
    for (const warning of fieldWarnings) {
      map.set(warning.field, warning.message);
    }
    return map;
  }, [fieldWarnings]);

  const setStatusMessage = useCallback((message: string, variant: "" | "success" | "error" = "") => {
    setStatus({ message, variant });
  }, []);

  function updateForm(updater: (current: BuilderFormState) => BuilderFormState) {
    setForm((current) => updater(current));
  }

  function updateUtmField(key: keyof UtmParams, value: string) {
    updateForm((current) => {
      const utm = updateUtm(current.utm, key, value);
      return {
        ...current,
        utm,
        activePresetId: detectPresetId(utm.utm_source, utm.utm_medium),
      };
    });
  }

  function normalizeUtmOnBlur(key: keyof UtmParams) {
    updateForm((current) => {
      const utm = updateUtm(current.utm, key, normalizeUtmField(key, current.utm[key]));
      return {
        ...current,
        utm,
        activePresetId: detectPresetId(utm.utm_source, utm.utm_medium),
      };
    });
  }

  function handleBaseUrlChange(value: string) {
    if (urlContainsUtmParams(value)) {
      const result = parseUtmUrl(value);
      if (result.data) {
        setForm((current) => mergeParsedIntoForm(current, result.data!));
        setStatusMessage("Detected UTM tags in URL and split them into fields.", "success");
        return;
      }
    }

    updateForm((current) => ({ ...current, baseUrl: value }));
  }

  function handleBaseUrlPaste(event: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData("text");
    if (!urlContainsUtmParams(pasted)) return;

    event.preventDefault();
    const result = parseUtmUrl(pasted);
    if (!result.data) return;

    setForm((current) => mergeParsedIntoForm(current, result.data!));
    setStatusMessage("Pasted tagged URL — parameters loaded.", "success");
  }

  function applyPreset(presetId: string) {
    const preset = findPresetById(presetId);
    if (!preset) return;

    updateForm((current) => ({
      ...current,
      activePresetId: preset.id,
      utm: {
        ...current.utm,
        utm_source: preset.utm_source,
        utm_medium: preset.utm_medium,
      },
      contentVariants: current.contentVariants.length
        ? current.contentVariants
        : preset.contentSuggestions.slice(0, 2),
    }));
    setStatusMessage(`Applied ${preset.label} preset.`, "success");
  }

  function applyDestination(url: string) {
    if (urlContainsUtmParams(url)) {
      const result = parseUtmUrl(url);
      if (result.data) {
        setForm((current) => mergeParsedIntoForm({ ...current, baseUrl: url }, result.data!));
        return;
      }
    }
    updateForm((current) => ({ ...current, baseUrl: url }));
  }

  function applyCampaignSlug() {
    const slug = buildCampaignSlug(slugEventName, slugDateLabel);
    if (!slug) {
      setStatusMessage("Enter an event name or date to build a campaign slug.", "error");
      return;
    }
    updateUtmField("utm_campaign", slug);
    setStatusMessage(`Campaign set to ${slug}.`, "success");
  }

  function addContentVariant(value: string) {
    const trimmed = normalizeUtmField("utm_content", value);
    if (!trimmed) return;

    updateForm((current) => ({
      ...current,
      contentVariants: current.contentVariants.includes(trimmed)
        ? current.contentVariants
        : [...current.contentVariants, trimmed],
    }));
  }

  function addVariantsFromInput() {
    const values = variantInput
      .split(/[,\n]/)
      .map((value) => normalizeUtmField("utm_content", value))
      .filter(Boolean);

    if (values.length === 0) return;

    updateForm((current) => ({
      ...current,
      contentVariants: [...new Set([...current.contentVariants, ...values])],
    }));
    setVariantInput("");
  }

  function removeContentVariant(content: string) {
    updateForm((current) => ({
      ...current,
      contentVariants: current.contentVariants.filter((value) => value !== content),
    }));
  }

  function applyRecentCampaign(campaignId: string) {
    const campaign = recentCampaigns.find((entry) => entry.id === campaignId);
    if (!campaign) return;

    setForm({
      baseUrl: campaign.baseUrl,
      utm: campaign.utm,
      customParams: campaign.customParams.length ? campaign.customParams : [],
      contentVariants: [],
      activePresetId: detectPresetId(campaign.utm.utm_source, campaign.utm.utm_medium),
    });
    setStatusMessage(`Loaded recent campaign: ${campaign.label}.`, "success");
  }

  function addCustomParam() {
    updateForm((current) => ({
      ...current,
      customParams: [...current.customParams, emptyCustomParam()],
    }));
  }

  function updateCustomParam(index: number, field: keyof CustomParam, value: string) {
    updateForm((current) => ({
      ...current,
      customParams: current.customParams.map((param, i) =>
        i === index ? { ...param, [field]: value } : param,
      ),
    }));
  }

  function removeCustomParam(index: number) {
    updateForm((current) => ({
      ...current,
      customParams: current.customParams.filter((_, i) => i !== index),
    }));
  }

  function handleReset() {
    setForm(DEFAULT_FORM);
    setSlugEventName("");
    setSlugDateLabel("");
    setVariantInput("");
    setStatusMessage("Form reset.", "success");
    window.history.replaceState(null, "", "/utm-builder/");
  }

  async function copyText(text: string, successMessage: string) {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setStatusMessage(successMessage, "success");
  }

  async function handleCopy(format: UrlCopyFormat = "full") {
    const formatted = formatUrlForCopy(builtUrl, format);
    if (formatted.error || !formatted.text) {
      setStatusMessage(formatted.error ?? "Nothing to copy.", "error");
      return;
    }

    await copyText(
      formatted.text,
      format === "full"
        ? "Tagged URL copied to clipboard."
        : format === "query"
          ? "Query string copied to clipboard."
          : "Path and query copied for HubSpot/email.",
    );

    if (format === "full" && requiredComplete) {
      saveRecentCampaign({
        baseUrl: form.baseUrl,
        utm: form.utm,
        customParams: form.customParams,
      });
      setRecentCampaigns(loadRecentCampaigns());
    }
  }

  async function handleCopyShareLink() {
    const params = formStateToSearchParams(form);
    const query = params.toString();
    const shareUrl = `${window.location.origin}/utm-builder/${query ? `?${query}` : ""}`;
    await copyText(shareUrl, "Shareable builder link copied.");
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || !event.shiftKey || event.key.toLowerCase() !== "c") {
        return;
      }

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      ) {
        return;
      }

      if (!builtUrl || !requiredComplete) return;
      event.preventDefault();
      void handleCopy("full");
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [builtUrl, requiredComplete, form]);

  const activeParams = [
    { label: "Source", value: form.utm.utm_source, required: true },
    { label: "Medium", value: form.utm.utm_medium, required: true },
    { label: "Campaign", value: form.utm.utm_campaign, required: true },
    { label: "Term", value: form.utm.utm_term, required: false },
    { label: "Content", value: form.utm.utm_content, required: false },
    { label: "ID", value: form.utm.utm_id, required: false },
  ].filter((entry) => entry.value.trim());

  return (
    <>
      <style>{`
        .utm-builder-form {
          display: grid;
          gap: 14px;
        }

        .utm-builder-field-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        @media (max-width: 960px) {
          .utm-builder-field-grid {
            grid-template-columns: 1fr;
          }
        }

        .utm-builder-presets,
        .utm-builder-destinations,
        .utm-builder-slug-helper,
        .utm-builder-variants {
          display: grid;
          gap: 8px;
        }

        .utm-builder-chip-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .utm-builder-preset-btn,
        .utm-builder-destination-btn,
        .utm-builder-suggestion-btn {
          border: 1px solid var(--border, #e5e5e5);
          border-radius: 999px;
          background: var(--background, #fff);
          padding: 6px 12px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }

        .utm-builder-preset-btn:hover,
        .utm-builder-destination-btn:hover,
        .utm-builder-suggestion-btn:hover {
          background: var(--accent, #f5f5f5);
        }

        .utm-builder-preset-btn.is-active {
          border-color: var(--primary, #1a1a1a);
          background: var(--primary, #1a1a1a);
          color: var(--primary-foreground, #fff);
        }

        .utm-builder-custom-params {
          display: grid;
          gap: 10px;
        }

        .utm-builder-custom-row {
          display: grid;
          grid-template-columns: 1fr 1fr auto;
          gap: 8px;
          align-items: end;
        }

        @media (max-width: 640px) {
          .utm-builder-custom-row {
            grid-template-columns: 1fr;
          }
        }

        .utm-builder-output-panel {
          position: sticky;
          top: 16px;
        }

        .utm-builder-output-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }

        .utm-builder-output-header h2 {
          margin: 0;
          font-size: 18px;
        }

        .utm-builder-output-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .utm-builder-url-box {
          min-height: 88px;
          border: 1px solid var(--border, #e5e5e5);
          border-radius: 10px;
          padding: 14px 16px;
          background: #fff;
        }

        .utm-breakdown {
          margin: 0;
          word-break: break-all;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 13px;
          line-height: 1.6;
        }

        .utm-breakdown-origin { color: #1d4e89; }
        .utm-breakdown-path { color: #1a1a1a; }
        .utm-breakdown-query { color: #6b2d5c; font-weight: 700; }
        .utm-breakdown-key { color: #2d6a4f; }
        .utm-breakdown-value { color: #c45c26; }
        .utm-breakdown-sep { color: #888; }

        .utm-builder-param-list,
        .utm-builder-variant-list {
          display: grid;
          gap: 8px;
          margin: 0;
          padding: 0;
          list-style: none;
        }

        .utm-builder-param-item,
        .utm-builder-variant-item {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          border-bottom: 1px solid var(--border, #e5e5e5);
          padding-bottom: 8px;
          font-size: 13px;
        }

        .utm-builder-variant-item {
          align-items: flex-start;
        }

        .utm-builder-param-item:last-child,
        .utm-builder-variant-item:last-child {
          border-bottom: 0;
          padding-bottom: 0;
        }

        .utm-builder-param-label {
          color: var(--muted-foreground, #666);
          font-weight: 600;
          flex-shrink: 0;
        }

        .utm-builder-param-value,
        .utm-builder-variant-url {
          text-align: right;
          word-break: break-word;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 12px;
        }

        .utm-builder-variant-url {
          text-align: left;
          flex: 1;
        }

        .utm-builder-hint {
          margin: 0;
          font-size: 12px;
          color: var(--muted-foreground, #666);
        }

        .utm-builder-banner {
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 13px;
        }

        .utm-builder-banner--warning {
          border: 1px solid #f0c36d;
          background: #fff8e8;
          color: #7a4d00;
        }

        .utm-builder-advanced summary {
          cursor: pointer;
          font-weight: 600;
        }

        .utm-builder-advanced-body {
          display: grid;
          gap: 12px;
          margin-top: 12px;
        }

        .utm-field-label {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .utm-field-help-trigger {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 0;
          background: transparent;
          color: var(--muted-foreground, #666);
          cursor: help;
          padding: 0;
        }

        .utm-field-warning {
          font-size: 12px;
          color: #9a6700;
        }

        .utm-builder-variant-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 1px solid var(--border, #e5e5e5);
          border-radius: 999px;
          padding: 4px 10px;
          font-size: 12px;
          font-weight: 600;
        }

        .utm-builder-variant-chip button {
          border: 0;
          background: transparent;
          cursor: pointer;
          font-size: 14px;
          line-height: 1;
          padding: 0;
        }

        .utm-qr-preview {
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid var(--border, #e5e5e5);
        }

        .utm-qr-image {
          width: 220px;
          height: 220px;
          border: 1px solid var(--border, #e5e5e5);
          border-radius: 10px;
          background: #fff;
        }

        .utm-builder-recent select {
          width: 100%;
          border-radius: 8px;
          border: 1px solid var(--input, #e5e5e5);
          padding: 8px 10px;
          font-size: 14px;
          background: #fff;
        }
      `}</style>

      <div className="tool-layout">
        <section className="panel">
          <form className="utm-builder-form" onSubmit={(event) => event.preventDefault()}>
            {recentCampaigns.length > 0 ? (
              <div className="utm-builder-recent">
                <label className="field">
                  <span>Recent campaigns</span>
                  <select
                    defaultValue=""
                    onChange={(event) => {
                      if (event.target.value) applyRecentCampaign(event.target.value);
                      event.target.value = "";
                    }}
                  >
                    <option value="">Load a recent campaign…</option>
                    {recentCampaigns.map((campaign) => (
                      <option key={campaign.id} value={campaign.id}>
                        {campaign.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}

            <label className="field">
              <span>Destination URL</span>
              <input
                name="baseUrl"
                type="url"
                required
                placeholder="https://creativewaco.org/events/example"
                value={form.baseUrl}
                onChange={(event) => handleBaseUrlChange(event.target.value)}
                onPaste={handleBaseUrlPaste}
              />
              <span className="utm-builder-hint">
                Paste a full tagged URL here — UTM parameters are detected and split automatically.
              </span>
            </label>

            {existingUtmKeys.length > 0 ? (
              <div className="utm-builder-banner utm-builder-banner--warning" role="status">
                This destination already includes {existingUtmKeys.join(", ")}. Building will replace
                those tags with your current values.
              </div>
            ) : null}

            <div className="utm-builder-destinations">
              <span className="text-sm font-semibold">Destination shortcuts</span>
              <div className="utm-builder-chip-list">
                {DESTINATION_SHORTCUTS.map((shortcut) => (
                  <button
                    key={shortcut.id}
                    type="button"
                    className="utm-builder-destination-btn"
                    onClick={() => applyDestination(shortcut.url)}
                  >
                    {shortcut.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="utm-builder-presets">
              <span className="text-sm font-semibold">Channel presets</span>
              <div className="utm-builder-chip-list">
                {UTM_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={[
                      "utm-builder-preset-btn",
                      form.activePresetId === preset.id ? "is-active" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    title={preset.description}
                    onClick={() => applyPreset(preset.id)}
                  >
                    {preset.label}
                  </button>
                ))}
                {form.activePresetId === "" &&
                (form.utm.utm_source.trim() || form.utm.utm_medium.trim()) ? (
                  <span className="utm-builder-hint self-center">Custom channel</span>
                ) : null}
              </div>
            </div>

            <div className="utm-builder-field-grid">
              <UtmField
                fieldKey="utm_source"
                label="Campaign source"
                required
                placeholder="instagram"
                value={form.utm.utm_source}
                warning={warningByField.get("utm_source")}
                onChange={(value) => updateUtmField("utm_source", value)}
                onBlur={() => normalizeUtmOnBlur("utm_source")}
              />
              <UtmField
                fieldKey="utm_medium"
                label="Campaign medium"
                required
                placeholder="social"
                value={form.utm.utm_medium}
                warning={warningByField.get("utm_medium")}
                onChange={(value) => updateUtmField("utm_medium", value)}
                onBlur={() => normalizeUtmOnBlur("utm_medium")}
              />
            </div>

            <UtmField
              fieldKey="utm_campaign"
              label="Campaign name"
              required
              placeholder="spring-art-walk-2026"
              value={form.utm.utm_campaign}
              warning={warningByField.get("utm_campaign")}
              onChange={(value) => updateUtmField("utm_campaign", value)}
              onBlur={() => normalizeUtmOnBlur("utm_campaign")}
            />

            <div className="utm-builder-slug-helper">
              <span className="text-sm font-semibold">Campaign name helper</span>
              <div className="utm-builder-field-grid">
                <label className="field">
                  <span>Event name</span>
                  <input
                    type="text"
                    placeholder="Art Walk"
                    value={slugEventName}
                    onChange={(event) => setSlugEventName(event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Date label</span>
                  <input
                    type="text"
                    placeholder="Jun 2026"
                    value={slugDateLabel}
                    onChange={(event) => setSlugDateLabel(event.target.value)}
                  />
                </label>
              </div>
              <button type="button" className="secondary-btn w-fit" onClick={applyCampaignSlug}>
                Apply slug to campaign
              </button>
            </div>

            <details className="utm-builder-advanced">
              <summary>Advanced parameters</summary>
              <div className="utm-builder-advanced-body">
                <div className="utm-builder-field-grid">
                  <UtmField
                    fieldKey="utm_term"
                    label="Campaign term"
                    placeholder="paid keyword (optional)"
                    value={form.utm.utm_term}
                    warning={warningByField.get("utm_term")}
                    onChange={(value) => updateUtmField("utm_term", value)}
                    onBlur={() => normalizeUtmOnBlur("utm_term")}
                  />
                  <UtmField
                    fieldKey="utm_content"
                    label="Campaign content"
                    placeholder="story-slide-1 (optional)"
                    value={form.utm.utm_content}
                    warning={warningByField.get("utm_content")}
                    onChange={(value) => updateUtmField("utm_content", value)}
                    onBlur={() => normalizeUtmOnBlur("utm_content")}
                  />
                </div>

                <UtmField
                  fieldKey="utm_id"
                  label="Campaign ID"
                  placeholder="Optional tracking ID"
                  value={form.utm.utm_id}
                  warning={warningByField.get("utm_id")}
                  onChange={(value) => updateUtmField("utm_id", value)}
                  onBlur={() => normalizeUtmOnBlur("utm_id")}
                />

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold">Custom parameters</span>
                    <button type="button" className="secondary-btn" onClick={addCustomParam}>
                      Add param
                    </button>
                  </div>

                  {form.customParams.length > 0 ? (
                    <div className="utm-builder-custom-params">
                      {form.customParams.map((param, index) => (
                        <div key={`custom-${index}`} className="utm-builder-custom-row">
                          <label className="field">
                            <span>Key</span>
                            <input
                              type="text"
                              placeholder="ref"
                              value={param.key}
                              onChange={(event) =>
                                updateCustomParam(index, "key", event.target.value)
                              }
                            />
                          </label>
                          <label className="field">
                            <span>Value</span>
                            <input
                              type="text"
                              placeholder="partner-name"
                              value={param.value}
                              onChange={(event) =>
                                updateCustomParam(index, "value", event.target.value)
                              }
                            />
                          </label>
                          <button
                            type="button"
                            className="secondary-btn"
                            onClick={() => removeCustomParam(index)}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="utm-builder-hint">
                      Optional non-UTM query params (e.g. ref, fbclid).
                    </p>
                  )}
                </div>
              </div>
            </details>

            <div className="utm-builder-variants">
              <span className="text-sm font-semibold">Content variants</span>
              <p className="utm-builder-hint">
                Generate multiple links with different utm_content values for carousels, A/B posts,
                or email placements.
              </p>

              {activePreset ? (
                <div className="utm-builder-chip-list">
                  {activePreset.contentSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className="utm-builder-suggestion-btn"
                      onClick={() => addContentVariant(suggestion)}
                    >
                      + {suggestion}
                    </button>
                  ))}
                </div>
              ) : null}

              <label className="field">
                <span>Add variants (comma or line separated)</span>
                <textarea
                  rows={2}
                  placeholder="story-1, story-2, feed-post"
                  value={variantInput}
                  onChange={(event) => setVariantInput(event.target.value)}
                />
              </label>
              <button type="button" className="secondary-btn w-fit" onClick={addVariantsFromInput}>
                Add variants
              </button>

              {form.contentVariants.length > 0 ? (
                <div className="utm-builder-chip-list">
                  {form.contentVariants.map((variant) => (
                    <span key={variant} className="utm-builder-variant-chip">
                      {variant}
                      <button
                        type="button"
                        aria-label={`Remove ${variant}`}
                        onClick={() => removeContentVariant(variant)}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="button" className="secondary-btn" onClick={handleReset}>
                Reset
              </button>
              <button type="button" className="secondary-btn" onClick={() => void handleCopyShareLink()}>
                Copy share link
              </button>
            </div>

            <StatusLine message={status.message} variant={status.variant} />
          </form>
        </section>

        <section className="panel utm-builder-output-panel">
          <div className="utm-builder-output-header">
            <h2>Tagged URL</h2>
            <div className="utm-builder-output-actions">
              <button
                type="button"
                className="primary-btn"
                disabled={!builtUrl || !requiredComplete}
                onClick={() => void handleCopy("full")}
                title="⌘⇧C / Ctrl+Shift+C"
              >
                Copy URL
              </button>
              <button
                type="button"
                className="secondary-btn"
                disabled={!builtUrl || !requiredComplete}
                onClick={() => void handleCopy("query")}
              >
                Copy ?params
              </button>
              <button
                type="button"
                className="secondary-btn"
                disabled={!builtUrl || !requiredComplete}
                onClick={() => void handleCopy("path-query")}
              >
                Copy path
              </button>
              {builtUrl && requiredComplete ? (
                <a
                  href={builtUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="secondary-btn no-underline"
                >
                  Open
                </a>
              ) : null}
            </div>
          </div>

          <div className="utm-builder-url-box" aria-live="polite">
            {buildResult.error ? (
              <span className="text-red-700">{buildResult.error}</span>
            ) : builtUrl && requiredComplete ? (
              <UrlBreakdown url={builtUrl} />
            ) : (
              <span className="text-muted-foreground">
                Fill destination URL, source, medium, and campaign to preview the tagged link.
              </span>
            )}
          </div>

          {activeParams.length > 0 ? (
            <div className="mt-5">
              <h3 className="mb-3 text-sm font-semibold">Parameter summary</h3>
              <ul className="utm-builder-param-list">
                {activeParams.map((entry) => (
                  <li key={entry.label} className="utm-builder-param-item">
                    <span className="utm-builder-param-label">
                      {entry.label}
                      {entry.required ? " *" : ""}
                    </span>
                    <span className="utm-builder-param-value">{entry.value}</span>
                  </li>
                ))}
                {form.customParams
                  .filter((param) => param.key.trim() && param.value.trim())
                  .map((param) => (
                    <li key={`summary-${param.key}`} className="utm-builder-param-item">
                      <span className="utm-builder-param-label">{param.key}</span>
                      <span className="utm-builder-param-value">{param.value}</span>
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}

          {contentVariantLinks.length > 0 && requiredComplete ? (
            <div className="mt-5">
              <h3 className="mb-3 text-sm font-semibold">Content variant links</h3>
              <ul className="utm-builder-variant-list">
                {contentVariantLinks.map((variant) => (
                  <li key={variant.content} className="utm-builder-variant-item">
                    <span className="utm-builder-param-label">{variant.content}</span>
                    <span className="utm-builder-variant-url">{variant.url}</span>
                    <button
                      type="button"
                      className="secondary-btn shrink-0"
                      onClick={() =>
                        void copyText(variant.url, `Copied ${variant.content} link.`)
                      }
                    >
                      Copy
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {showQr ? <QrCodePreview url={builtUrl} /> : null}
        </section>
      </div>
    </>
  );
}
