"use client";

import type {
  Ga4UtmHistoryEntry,
  Ga4UtmHistoryResult,
} from "@/lib/utm-builder/ga4-history-types";

type Ga4UtmHistoryPanelProps = {
  data: Ga4UtmHistoryResult | null;
  loading: boolean;
  onLoad: (entry: Ga4UtmHistoryEntry) => void;
};

function formatEntryLabel(entry: Ga4UtmHistoryEntry): string {
  return [
    entry.utm.utm_source,
    entry.utm.utm_medium,
    entry.utm.utm_campaign,
  ]
    .filter(Boolean)
    .join(" · ");
}

function formatEntryMeta(entry: Ga4UtmHistoryEntry): string {
  const parts = [];
  if (entry.utm.utm_term) parts.push(`term: ${entry.utm.utm_term}`);
  if (entry.utm.utm_content) parts.push(`content: ${entry.utm.utm_content}`);
  if (entry.landingPage) parts.push(`landing: ${entry.landingPage}`);
  return parts.join(" · ");
}

export function Ga4UtmHistoryPanel({ data, loading, onLoad }: Ga4UtmHistoryPanelProps) {
  if (loading) {
    return (
      <details className="utm-builder-ga4-history">
        <summary>From analytics</summary>
        <p className="utm-builder-hint utm-builder-ga4-history-body">Loading GA4 campaign history…</p>
      </details>
    );
  }

  if (!data || !data.configured) {
    return (
      <details className="utm-builder-ga4-history">
        <summary>From analytics</summary>
        <p className="utm-builder-hint utm-builder-ga4-history-body">
          {data?.message ??
            "GA4 is not configured. Use the same credentials as Analytics Dashboard to load past UTM combinations."}
        </p>
      </details>
    );
  }

  if (data.entries.length === 0) {
    return (
      <details className="utm-builder-ga4-history">
        <summary>From analytics</summary>
        <p className="utm-builder-hint utm-builder-ga4-history-body">
          No tagged sessions found for {data.startDate} to {data.endDate}.
        </p>
      </details>
    );
  }

  return (
    <details className="utm-builder-ga4-history">
      <summary>
        From analytics ({data.startDate} – {data.endDate})
      </summary>
      <div className="utm-builder-ga4-history-body">
        <p className="utm-builder-hint">
          Top UTM combinations from GA4 by session count. Load one to fill the builder.
        </p>
        <ul className="utm-builder-ga4-history-list">
          {data.entries.map((entry) => (
            <li key={entry.id} className="utm-builder-ga4-history-item">
              <div className="utm-builder-ga4-history-copy">
                <span className="utm-builder-ga4-history-label">
                  {formatEntryLabel(entry) || "Untagged session"}
                </span>
                {formatEntryMeta(entry) ? (
                  <span className="utm-builder-ga4-history-meta">{formatEntryMeta(entry)}</span>
                ) : null}
              </div>
              <div className="utm-builder-ga4-history-actions">
                <span className="utm-builder-ga4-history-sessions">
                  {entry.sessions.toLocaleString()} sessions
                </span>
                <button type="button" className="secondary-btn" onClick={() => onLoad(entry)}>
                  Load
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
