import type { SchemaIssue } from "./types";
import { escapeHtml } from "./utils";

type SyncBannerProps = {
  schemaIssues: SchemaIssue[];
};

export function SyncBanner({ schemaIssues }: SyncBannerProps) {
  if (schemaIssues.length === 0) return null;

  const sources = new Set(schemaIssues.map((i) => i.source));
  const title =
    sources.has("asana") && sources.has("givebutter")
      ? "Dashboard sync needs attention"
      : sources.has("asana")
        ? "Asana sync needs attention"
        : "Givebutter sync needs attention";

  return (
    <div className="sync-banner" aria-live="polite">
      <div className="sync-banner__inner">
        <strong>{title}</strong>
        <ul className="sync-banner__list">
          {schemaIssues.map((issue, index) => (
            <li key={`${issue.source}-${index}`}>{escapeHtml(issue.message)}</li>
          ))}
        </ul>
        <p className="sync-banner__hint">
          Field names or statuses may have changed. Update the mapping in{" "}
          <code>lib/sparks-dashboard/asana-schema.mjs</code> or env alias variables — partial
          data is shown below.
        </p>
      </div>
    </div>
  );
}
