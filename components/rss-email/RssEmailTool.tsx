"use client";

import { FormEvent, useState } from "react";
import { StatusLine } from "@/components/StatusLine";

const COLOR_SWATCHES = [
  { color: "#1a1a1a", label: "Black" },
  { color: "#c45c26", label: "Orange" },
  { color: "#2d6a4f", label: "Green" },
  { color: "#1d4e89", label: "Blue" },
  { color: "#6b2d5c", label: "Plum" },
] as const;

type FormState = {
  feedUrl: string;
  limit: number;
  sort: string;
  layout: string;
  upcomingOnly: boolean;
  enrich: boolean;
  includeImages: boolean;
  fromDate: string;
  learnLabel: string;
  websiteLabel: string;
  primaryColor: string;
};

const DEFAULT_FORM: FormState = {
  feedUrl: "https://creativewaco.org/event/rss.xml",
  limit: 8,
  sort: "date-asc",
  layout: "horizontal-right",
  upcomingOnly: true,
  enrich: true,
  includeImages: false,
  fromDate: "",
  learnLabel: "Learn more",
  websiteLabel: "Event website",
  primaryColor: "#1a1a1a",
};

type GenerateResponse = {
  html?: string;
  itemCount?: number;
  feedTitle?: string;
  error?: string;
};

function readOptions(form: FormState) {
  return {
    feedUrl: form.feedUrl.trim(),
    limit: Number(form.limit) || 8,
    sort: form.sort || "date-asc",
    layout: form.layout || "horizontal-right",
    upcomingOnly: form.upcomingOnly,
    enrich: form.enrich,
    includeImages: form.includeImages,
    fromDate: form.fromDate || "",
    learnLabel: form.learnLabel || "Learn more",
    websiteLabel: form.websiteLabel || "Event website",
    primaryColor: form.primaryColor || "#1a1a1a",
  };
}

function isSwatchActive(swatchColor: string, currentColor: string) {
  return swatchColor.toLowerCase() === currentColor.toLowerCase();
}

export function RssEmailTool() {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [status, setStatus] = useState({ message: "", variant: "" as "" | "success" | "error" });
  const [htmlOutput, setHtmlOutput] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewState, setPreviewState] = useState<"empty" | "html" | "error">("empty");
  const [generating, setGenerating] = useState(false);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function setPrimaryColor(color: string) {
    updateField("primaryColor", color);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const options = readOptions(form);

    setGenerating(true);
    setStatus({ message: "Fetching feed and building HTML…", variant: "" });

    try {
      const response = await fetch("/api/generate/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options),
      });

      const payload = (await response.json()) as GenerateResponse;
      if (!response.ok) {
        throw new Error(payload.error || "Generation failed.");
      }

      setHtmlOutput(payload.html ?? "");
      setPreviewHtml(payload.html ?? "");
      setPreviewState("html");

      const itemCount = payload.itemCount ?? 0;
      setStatus({
        message: `Generated ${itemCount} item${itemCount === 1 ? "" : "s"} from ${payload.feedTitle || "feed"}.`,
        variant: "success",
      });
    } catch (error) {
      setPreviewHtml("");
      setHtmlOutput("");
      setPreviewState("error");
      setStatus({
        message: error instanceof Error ? error.message : "Generation failed.",
        variant: "error",
      });
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopy() {
    if (!htmlOutput) return;
    await navigator.clipboard.writeText(htmlOutput);
    setStatus({ message: "HTML copied to clipboard.", variant: "success" });
  }

  return (
    <>
      <style>{`
        .rss-email-form {
          display: grid;
          gap: 14px;
        }

        .rss-email-field-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        @media (max-width: 960px) {
          .rss-email-field-grid {
            grid-template-columns: 1fr;
          }
        }

        .rss-email-advanced summary {
          cursor: pointer;
          font-weight: 600;
        }

        .rss-email-advanced-body {
          display: grid;
          gap: 12px;
          margin-top: 12px;
        }

        .rss-email-color-picker {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .rss-email-color-swatches {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .rss-email-color-swatch {
          width: 36px;
          height: 36px;
          padding: 0;
          border: 2px solid transparent;
          border-radius: 8px;
          cursor: pointer;
          box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.12);
        }

        .rss-email-color-swatch:hover {
          transform: scale(1.05);
        }

        .rss-email-color-swatch.is-active {
          border-color: var(--ink, #1a1a1a);
          outline: 2px solid #fff;
          outline-offset: 1px;
          box-shadow: 0 0 0 2px var(--ink, #1a1a1a);
        }

        .rss-email-field input[type="color"] {
          width: 48px;
          height: 40px;
          min-width: 48px;
          padding: 4px;
          border: 1px solid var(--line, #d8d0c4);
          border-radius: 8px;
          background: #fff;
          cursor: pointer;
        }

        .rss-email-field input[type="color"]::-webkit-color-swatch-wrapper {
          padding: 2px;
        }

        .rss-email-field input[type="color"]::-webkit-color-swatch {
          border: none;
          border-radius: 4px;
        }

        .rss-email-field input[type="color"]::-moz-color-swatch {
          border: none;
          border-radius: 4px;
        }

        .rss-email-output-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }

        .rss-email-output-header h2 {
          margin: 0;
          font-size: 18px;
        }

        .rss-email-preview-card {
          min-height: 220px;
          border: 1px solid var(--line, #d8d0c4);
          border-radius: 10px;
          padding: 16px;
          background: #fff;
          overflow: auto;
        }

        .rss-email-preview-card--email {
          width: 100%;
        }

        .rss-email-placeholder {
          margin: 0;
          color: var(--muted-foreground, #666666);
        }
      `}</style>

      <div className="tool-layout">
        <section className="panel">
          <form className="rss-email-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>RSS feed URL</span>
              <input
                name="feedUrl"
                type="url"
                required
                value={form.feedUrl}
                onChange={(event) => updateField("feedUrl", event.target.value)}
              />
            </label>

            <div className="rss-email-field-grid">
              <label className="field">
                <span>How many items</span>
                <input
                  name="limit"
                  type="number"
                  min={1}
                  max={30}
                  value={form.limit}
                  onChange={(event) => updateField("limit", Number(event.target.value))}
                />
              </label>

              <label className="field">
                <span>Sort by</span>
                <select
                  name="sort"
                  value={form.sort}
                  onChange={(event) => updateField("sort", event.target.value)}
                >
                  <option value="date-asc">Upcoming date (soonest first)</option>
                  <option value="date-desc">Date (latest first)</option>
                  <option value="title">Title (A–Z)</option>
                  <option value="pub-desc">RSS feed order</option>
                </select>
              </label>
            </div>

            <label className="field">
              <span>Layout</span>
              <select
                name="layout"
                value={form.layout}
                onChange={(event) => updateField("layout", event.target.value)}
              >
                <option value="horizontal-right">Title left, stacked buttons right</option>
                <option value="buttons-inline">Title left, side-by-side buttons right</option>
                <option value="grid-2">2-column grid (stacks on mobile)</option>
                <option value="grid-3">3-column grid (stacks on mobile)</option>
                <option value="minimal">Title + date only (no buttons)</option>
              </select>
            </label>

            <label className="field checkbox">
              <input
                name="upcomingOnly"
                type="checkbox"
                checked={form.upcomingOnly}
                onChange={(event) => updateField("upcomingOnly", event.target.checked)}
              />
              <span>Only upcoming events (from today)</span>
            </label>

            <label className="field checkbox">
              <input
                name="enrich"
                type="checkbox"
                checked={form.enrich}
                onChange={(event) => updateField("enrich", event.target.checked)}
              />
              <span>Enrich from event pages (dates + ticket/organizer links)</span>
            </label>

            <label className="field checkbox">
              <input
                name="includeImages"
                type="checkbox"
                checked={form.includeImages}
                onChange={(event) => updateField("includeImages", event.target.checked)}
              />
              <span>Include event images (from RSS or event page)</span>
            </label>

            <label className="field">
              <span>Start date filter (optional)</span>
              <input
                name="fromDate"
                type="date"
                value={form.fromDate}
                onChange={(event) => updateField("fromDate", event.target.value)}
              />
            </label>

            <details className="rss-email-advanced">
              <summary>Button labels &amp; styling</summary>
              <div className="rss-email-advanced-body">
                <label className="field">
                  <span>Learn more label</span>
                  <input
                    name="learnLabel"
                    type="text"
                    value={form.learnLabel}
                    onChange={(event) => updateField("learnLabel", event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Event website label</span>
                  <input
                    name="websiteLabel"
                    type="text"
                    value={form.websiteLabel}
                    onChange={(event) => updateField("websiteLabel", event.target.value)}
                  />
                </label>
                <div className="field rss-email-field">
                  <span>Button color</span>
                  <div className="rss-email-color-picker" role="group" aria-label="Button color">
                    <div className="rss-email-color-swatches">
                      {COLOR_SWATCHES.map((swatch) => (
                        <button
                          key={swatch.color}
                          type="button"
                          className={`rss-email-color-swatch${isSwatchActive(swatch.color, form.primaryColor) ? " is-active" : ""}`}
                          aria-label={swatch.label}
                          style={{ backgroundColor: swatch.color }}
                          onClick={() => setPrimaryColor(swatch.color)}
                        />
                      ))}
                    </div>
                    <input
                      name="primaryColor"
                      type="color"
                      value={form.primaryColor}
                      aria-label="Custom button color"
                      onChange={(event) => setPrimaryColor(event.target.value)}
                    />
                  </div>
                </div>
              </div>
            </details>

            <button className="primary-btn" type="submit" disabled={generating}>
              Generate HTML
            </button>
          </form>

          {status.message ? (
            <StatusLine message={status.message} variant={status.variant} />
          ) : null}
        </section>

        <section className="panel">
          <div className="rss-email-output-header">
            <h2>Preview</h2>
            <button
              type="button"
              className="secondary-btn"
              disabled={!htmlOutput}
              onClick={handleCopy}
            >
              Copy HTML
            </button>
          </div>

          <div
            className={`rss-email-preview-card${previewState === "html" ? " rss-email-preview-card--email" : ""}`}
          >
            {previewState === "html" ? (
              <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
            ) : previewState === "error" ? (
              <p className="rss-email-placeholder">
                Something went wrong. Check the feed URL and try again.
              </p>
            ) : (
              <p className="rss-email-placeholder">Generated HTML will appear here.</p>
            )}
          </div>

          <label className="field mt-3.5">
            <span>HTML output</span>
            <textarea
              rows={14}
              readOnly
              placeholder="HTML output"
              value={htmlOutput}
            />
          </label>
        </section>
      </div>
    </>
  );
}
