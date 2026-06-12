"use client";

import { useEffect, useMemo, useState } from "react";

import type {
  Ga4UtmHistoryEntry,
  Ga4UtmHistoryResult,
} from "@/lib/utm-builder/ga4-history-types";
import {
  formatLanding,
  formatMedium,
  formatReferrer,
  formatSource,
  formatValuesSummary,
  groupEntriesByCampaign,
  type CampaignGroup,
  type ChannelGroup,
} from "@/lib/utm-builder/campaign-groups";

type CampaignTrackerProps = {
  data: Ga4UtmHistoryResult | null;
  loading: boolean;
  refreshing?: boolean;
  days: number;
  onDaysChange: (days: number) => void;
  onRefresh: () => void;
  onLoadEntry: (entry: Ga4UtmHistoryEntry) => void;
};

type SortKey = "sessions" | "activeUsers" | "campaign";
type ViewMode = "grouped" | "flat";

const DAY_OPTIONS = [
  { value: 90, label: "Last 90 days" },
  { value: 180, label: "Last 180 days" },
  { value: 365, label: "Last 12 months" },
];

const PAGE_SIZE = 25;

function matchesSearch(entry: Ga4UtmHistoryEntry, query: string): boolean {
  if (!query) return true;
  const haystack = [
    entry.utm.utm_campaign,
    entry.utm.utm_source,
    entry.utm.utm_medium,
    entry.utm.utm_term,
    entry.utm.utm_content,
    entry.referrer,
    formatReferrer(entry),
    entry.landingPage,
    entry.taggedUrl,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function sortIndicator(active: boolean, dir: "asc" | "desc"): string {
  if (!active) return "↕";
  return dir === "asc" ? "↑" : "↓";
}

function compareGroups(
  a: CampaignGroup,
  b: CampaignGroup,
  sortKey: SortKey,
  sortDir: "asc" | "desc",
): number {
  let cmp = 0;
  if (sortKey === "campaign") {
    cmp = a.campaign.localeCompare(b.campaign);
  } else if (sortKey === "activeUsers") {
    cmp = a.activeUsers - b.activeUsers;
  } else {
    cmp = a.sessions - b.sessions;
  }
  return sortDir === "asc" ? cmp : -cmp;
}

function compareEntries(
  a: Ga4UtmHistoryEntry,
  b: Ga4UtmHistoryEntry,
  sortKey: SortKey,
  sortDir: "asc" | "desc",
): number {
  let cmp = 0;
  if (sortKey === "campaign") {
    cmp = a.utm.utm_campaign.localeCompare(b.utm.utm_campaign);
  } else if (sortKey === "activeUsers") {
    cmp = a.activeUsers - b.activeUsers;
  } else {
    cmp = a.sessions - b.sessions;
  }
  return sortDir === "asc" ? cmp : -cmp;
}

export function CampaignTracker({
  data,
  loading,
  refreshing = false,
  days,
  onDaysChange,
  onRefresh,
  onLoadEntry,
}: CampaignTrackerProps) {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grouped");
  const [sortKey, setSortKey] = useState<SortKey>("sessions");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedChannels, setExpandedChannels] = useState<Set<string>>(new Set());

  const filteredEntries = useMemo(() => {
    if (!data?.configured) return [];
    return data.entries.filter((entry) => matchesSearch(entry, search.trim()));
  }, [data, search]);

  const groups = useMemo(() => {
    const grouped = groupEntriesByCampaign(filteredEntries);
    return grouped.sort((a, b) => compareGroups(a, b, sortKey, sortDir));
  }, [filteredEntries, sortKey, sortDir]);

  const sortedEntries = useMemo(() => {
    const sorted = [...filteredEntries];
    sorted.sort((a, b) => compareEntries(a, b, sortKey, sortDir));
    return sorted;
  }, [filteredEntries, sortKey, sortDir]);

  const totalItems = viewMode === "grouped" ? groups.length : sortedEntries.length;
  const pageCount = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pagedGroups = groups.slice(pageStart, pageStart + PAGE_SIZE);
  const pagedEntries = sortedEntries.slice(pageStart, pageStart + PAGE_SIZE);

  useEffect(() => {
    setPage(1);
    setExpandedGroups(new Set());
    setExpandedChannels(new Set());
  }, [search, sortKey, sortDir, days, viewMode]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "campaign" ? "asc" : "desc");
  }

  function channelKey(campaignId: string, channelId: string): string {
    return `${campaignId}::${channelId}`;
  }

  function toggleGroup(groupId: string) {
    setExpandedGroups((current) => {
      const isExpanded = current.has(groupId);
      if (isExpanded) {
        setExpandedChannels((channels) => {
          const trimmed = new Set<string>();
          for (const key of channels) {
            if (!key.startsWith(`${groupId}::`)) trimmed.add(key);
          }
          return trimmed;
        });
      }

      const next = new Set(current);
      if (isExpanded) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  function toggleChannel(campaignId: string, channelId: string) {
    const key = channelKey(campaignId, channelId);
    setExpandedChannels((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleGroupRowClick(group: CampaignGroup) {
    if (group.entries.length === 1) {
      onLoadEntry(group.entries[0]);
      return;
    }
    toggleGroup(group.id);
  }

  function handleChannelRowClick(group: CampaignGroup, channel: ChannelGroup) {
    if (channel.entries.length === 1) {
      onLoadEntry(channel.entries[0]);
      return;
    }
    toggleChannel(group.id, channel.id);
  }

  function renderLinkRow(entry: Ga4UtmHistoryEntry) {
    return (
      <tr
        key={entry.id}
        className="campaign-tracker-variant-row campaign-tracker-link-row"
        title={entry.taggedUrl}
        onClick={() => onLoadEntry(entry)}
      >
        <td className="campaign-tracker-variant-label">
          <span className="campaign-tracker-variant-indent" aria-hidden />
          {entry.utm.utm_term || entry.utm.utm_content ? (
            <span className="campaign-tracker-meta">
              {entry.utm.utm_term ? `term: ${entry.utm.utm_term}` : null}
              {entry.utm.utm_term && entry.utm.utm_content ? " · " : null}
              {entry.utm.utm_content ? `content: ${entry.utm.utm_content}` : null}
            </span>
          ) : (
            <span className="campaign-tracker-meta">Link</span>
          )}
        </td>
        <td className="campaign-tracker-source" />
        <td className="campaign-tracker-medium" />
        <td className="campaign-tracker-referrer" title={entry.referrer || "Direct"}>
          {formatReferrer(entry)}
        </td>
        <td className="campaign-tracker-landing" title={entry.taggedUrl}>
          {formatLanding(entry)}
        </td>
        <td className="campaign-tracker-number">{entry.sessions.toLocaleString()}</td>
        <td className="campaign-tracker-number">{entry.activeUsers.toLocaleString()}</td>
      </tr>
    );
  }

  function renderChannelRows(group: CampaignGroup, channel: ChannelGroup) {
    const key = channelKey(group.id, channel.id);
    const isExpanded = expandedChannels.has(key);
    const hasVariants = channel.entries.length > 1;
    const rows = [
      <tr
        key={key}
        className={[
          "campaign-tracker-channel-row",
          isExpanded ? "is-expanded" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={() => handleChannelRowClick(group, channel)}
      >
        <td className="campaign-tracker-variant-label">
          <div className="campaign-tracker-campaign-cell">
            {hasVariants ? (
              <button
                type="button"
                className="campaign-tracker-expand-btn"
                aria-expanded={isExpanded}
                aria-label={
                  isExpanded
                    ? `Collapse ${channel.source} / ${channel.medium}`
                    : `Expand ${channel.source} / ${channel.medium}`
                }
                onClick={(event) => {
                  event.stopPropagation();
                  toggleChannel(group.id, channel.id);
                }}
              >
                {isExpanded ? "▾" : "▸"}
              </button>
            ) : (
              <span className="campaign-tracker-expand-spacer" aria-hidden />
            )}
          </div>
        </td>
        <td className="campaign-tracker-source" title={channel.source}>
          {channel.source}
        </td>
        <td className="campaign-tracker-medium" title={channel.medium}>
          {channel.medium}
        </td>
        <td
          className="campaign-tracker-referrer"
          title={channel.referrers.join(", ")}
        >
          {formatValuesSummary(channel.referrers)}
        </td>
        <td className="campaign-tracker-landing">
          {hasVariants ? `${channel.entries.length} links` : formatLanding(channel.entries[0])}
        </td>
        <td className="campaign-tracker-number">{channel.sessions.toLocaleString()}</td>
        <td className="campaign-tracker-number">{channel.activeUsers.toLocaleString()}</td>
      </tr>,
    ];

    if (isExpanded && hasVariants) {
      rows.push(...channel.entries.map((entry) => renderLinkRow(entry)));
    }

    return rows;
  }

  return (
    <>
      <style>{`
        .campaign-tracker {
          display: grid;
          gap: 16px;
        }

        .campaign-tracker-toolbar {
          display: flex;
          flex-wrap: wrap;
          align-items: end;
          justify-content: space-between;
          gap: 12px;
        }

        .campaign-tracker-controls {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: end;
        }

        .campaign-tracker-summary {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        @media (max-width: 720px) {
          .campaign-tracker-summary {
            grid-template-columns: 1fr;
          }
        }

        .campaign-tracker-stat {
          border: 1px solid var(--border, #e5e5e5);
          border-radius: 10px;
          padding: 14px 16px;
          background: #fff;
        }

        .campaign-tracker-stat-label {
          margin: 0 0 4px;
          font-size: 12px;
          color: var(--muted-foreground, #666);
        }

        .campaign-tracker-stat-value {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          line-height: 1.1;
        }

        .campaign-tracker-table-wrap {
          overflow: auto;
          max-height: min(560px, 70vh);
          border: 1px solid var(--border, #e5e5e5);
          border-radius: 10px;
          background: #fff;
        }

        .campaign-tracker-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        .campaign-tracker-table th,
        .campaign-tracker-table td {
          padding: 8px 12px;
          text-align: left;
          border-bottom: 1px solid var(--border, #e5e5e5);
          vertical-align: middle;
        }

        .campaign-tracker-table th {
          position: sticky;
          top: 0;
          z-index: 1;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: var(--muted-foreground, #666);
          background: var(--accent, #fafafa);
          white-space: nowrap;
        }

        .campaign-tracker-sort-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          border: 0;
          background: transparent;
          padding: 0;
          font: inherit;
          color: inherit;
          cursor: pointer;
          text-transform: inherit;
          letter-spacing: inherit;
        }

        .campaign-tracker-sort-btn:hover {
          color: var(--foreground, #1a1a1a);
        }

        .campaign-tracker-table tbody tr:last-child td {
          border-bottom: 0;
        }

        .campaign-tracker-group-row,
        .campaign-tracker-channel-row,
        .campaign-tracker-variant-row,
        .campaign-tracker-flat-row {
          cursor: pointer;
        }

        .campaign-tracker-group-row:hover,
        .campaign-tracker-channel-row:hover,
        .campaign-tracker-variant-row:hover,
        .campaign-tracker-flat-row:hover {
          background: color-mix(in srgb, var(--accent, #fafafa) 70%, transparent);
        }

        .campaign-tracker-group-row.is-expanded,
        .campaign-tracker-channel-row.is-expanded {
          background: color-mix(in srgb, var(--accent, #fafafa) 45%, transparent);
        }

        .campaign-tracker-campaign-cell {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          min-width: 0;
        }

        .campaign-tracker-expand-btn {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          border: 1px solid var(--border, #e5e5e5);
          border-radius: 6px;
          background: #fff;
          color: var(--foreground, #1a1a1a);
          cursor: pointer;
          font-size: 10px;
          line-height: 1;
          padding: 0;
        }

        .campaign-tracker-expand-btn:hover {
          background: var(--accent, #f5f5f5);
        }

        .campaign-tracker-expand-spacer {
          flex-shrink: 0;
          width: 22px;
        }

        .campaign-tracker-campaign {
          font-weight: 600;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          line-height: 1.35;
          min-width: 0;
        }

        .campaign-tracker-meta {
          margin-top: 3px;
          font-size: 11px;
          color: var(--muted-foreground, #666);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .campaign-tracker-source,
        .campaign-tracker-medium,
        .campaign-tracker-referrer,
        .campaign-tracker-landing {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 130px;
        }

        .campaign-tracker-landing {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 12px;
        }

        .campaign-tracker-number {
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
          text-align: right;
        }

        .campaign-tracker-table th.campaign-tracker-number,
        .campaign-tracker-table td.campaign-tracker-number {
          text-align: right;
        }

        .campaign-tracker-variant-row td {
          background: color-mix(in srgb, var(--accent, #fafafa) 35%, transparent);
          border-bottom-color: color-mix(in srgb, var(--border, #e5e5e5) 70%, transparent);
        }

        .campaign-tracker-channel-row td {
          background: color-mix(in srgb, var(--accent, #fafafa) 25%, transparent);
        }

        .campaign-tracker-variant-label {
          padding-left: 28px;
        }

        .campaign-tracker-link-row .campaign-tracker-variant-label {
          padding-left: 44px;
        }

        .campaign-tracker-variant-indent {
          display: inline-block;
          width: 14px;
        }

        .campaign-tracker-footer {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .campaign-tracker-pagination {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .campaign-tracker-page-label {
          font-size: 12px;
          color: var(--muted-foreground, #666);
          white-space: nowrap;
        }

        .campaign-tracker .utm-builder-hint {
          margin: 0;
          font-size: 12px;
          color: var(--muted-foreground, #666);
        }
      `}</style>

      <section className="panel campaign-tracker">
        <div className="campaign-tracker-toolbar">
          <div>
            <h2 className="m-0 text-lg font-semibold">Campaign tracker</h2>
            <p className="utm-builder-hint mt-1">
              {viewMode === "grouped"
                ? "Grouped by campaign — expand for source/medium breakdown and landing-page links."
                : "All tagged links — click a row to load it in the URL builder below."}
            </p>
          </div>
          <div className="campaign-tracker-controls">
            <label className="field">
              <span>Search</span>
              <input
                type="search"
                placeholder="Campaign, source, referrer…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <label className="field">
              <span>View</span>
              <select
                value={viewMode}
                onChange={(event) => setViewMode(event.target.value as ViewMode)}
              >
                <option value="grouped">By campaign</option>
                <option value="flat">All links</option>
              </select>
            </label>
            <label className="field">
              <span>Date range</span>
              <select value={days} onChange={(event) => onDaysChange(Number(event.target.value))}>
                {DAY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="secondary-btn"
              disabled={Boolean(loading || refreshing)}
              onClick={onRefresh}
            >
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        {loading && !data ? (
          <p className="utm-builder-hint">Loading campaigns from GA4…</p>
        ) : !data || !data.configured ? (
          <p className="utm-builder-hint">
            {data?.message ??
              "GA4 is not configured. Add credentials to see campaign history (same setup as Analytics Dashboard)."}
          </p>
        ) : (
          <>
            <div className="campaign-tracker-summary">
              <div className="campaign-tracker-stat">
                <p className="campaign-tracker-stat-label">Campaigns</p>
                <p className="campaign-tracker-stat-value">{groups.length}</p>
              </div>
              <div className="campaign-tracker-stat">
                <p className="campaign-tracker-stat-label">Sessions</p>
                <p className="campaign-tracker-stat-value">
                  {data.totals.sessions.toLocaleString()}
                </p>
              </div>
              <div className="campaign-tracker-stat">
                <p className="campaign-tracker-stat-label">Active users</p>
                <p className="campaign-tracker-stat-value">
                  {data.totals.activeUsers.toLocaleString()}
                </p>
              </div>
            </div>

            <p className="utm-builder-hint">
              {data.startDate} – {data.endDate}
              {refreshing ? " · Refreshing…" : ""}
              {search.trim()
                ? ` · ${filteredEntries.length} of ${data.entries.length} links match`
                : ` · ${groups.length} campaigns · ${data.entries.length} links`}
            </p>

            {filteredEntries.length === 0 ? (
              <p className="utm-builder-hint">No campaigns match your search.</p>
            ) : (
              <>
                <div className="campaign-tracker-table-wrap">
                  <table className="campaign-tracker-table">
                    <thead>
                      <tr>
                        <th>
                          <button
                            type="button"
                            className="campaign-tracker-sort-btn"
                            onClick={() => toggleSort("campaign")}
                          >
                            Campaign {sortIndicator(sortKey === "campaign", sortDir)}
                          </button>
                        </th>
                        <th>Source</th>
                        <th>Medium</th>
                        <th>Referrer</th>
                        <th>Landing</th>
                        <th className="campaign-tracker-number">
                          <button
                            type="button"
                            className="campaign-tracker-sort-btn"
                            onClick={() => toggleSort("sessions")}
                          >
                            Sessions {sortIndicator(sortKey === "sessions", sortDir)}
                          </button>
                        </th>
                        <th className="campaign-tracker-number">
                          <button
                            type="button"
                            className="campaign-tracker-sort-btn"
                            onClick={() => toggleSort("activeUsers")}
                          >
                            Users {sortIndicator(sortKey === "activeUsers", sortDir)}
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewMode === "grouped"
                        ? pagedGroups.flatMap((group) => {
                            const isExpanded = expandedGroups.has(group.id);
                            const hasVariants = group.entries.length > 1;
                            const rows = [
                              <tr
                                key={group.id}
                                className={[
                                  "campaign-tracker-group-row",
                                  isExpanded ? "is-expanded" : "",
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                                onClick={() => handleGroupRowClick(group)}
                              >
                                <td title={group.campaign}>
                                  <div className="campaign-tracker-campaign-cell">
                                    {hasVariants ? (
                                      <button
                                        type="button"
                                        className="campaign-tracker-expand-btn"
                                        aria-expanded={isExpanded}
                                        aria-label={
                                          isExpanded
                                            ? `Collapse ${group.campaign}`
                                            : `Expand ${group.campaign}`
                                        }
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          toggleGroup(group.id);
                                        }}
                                      >
                                        {isExpanded ? "▾" : "▸"}
                                      </button>
                                    ) : (
                                      <span className="campaign-tracker-expand-spacer" aria-hidden />
                                    )}
                                    <div>
                                      <div className="campaign-tracker-campaign">{group.campaign}</div>
                                      {hasVariants ? (
                                        <div className="campaign-tracker-meta">
                                          {group.channelGroups.length} channels · {group.entries.length}{" "}
                                          links
                                        </div>
                                      ) : null}
                                    </div>
                                  </div>
                                </td>
                                <td
                                  className="campaign-tracker-source"
                                  title={group.sources.join(", ")}
                                >
                                  {formatValuesSummary(group.sources)}
                                </td>
                                <td
                                  className="campaign-tracker-medium"
                                  title={group.mediums.join(", ")}
                                >
                                  {formatValuesSummary(group.mediums)}
                                </td>
                                <td
                                  className="campaign-tracker-referrer"
                                  title={group.referrers.join(", ")}
                                >
                                  {formatValuesSummary(group.referrers)}
                                </td>
                                <td className="campaign-tracker-landing">
                                  {hasVariants
                                    ? `${group.entries.length} links`
                                    : formatLanding(group.entries[0])}
                                </td>
                                <td className="campaign-tracker-number">
                                  {group.sessions.toLocaleString()}
                                </td>
                                <td className="campaign-tracker-number">
                                  {group.activeUsers.toLocaleString()}
                                </td>
                              </tr>,
                            ];

                            if (isExpanded && hasVariants) {
                              rows.push(
                                ...group.channelGroups.flatMap((channel) =>
                                  renderChannelRows(group, channel),
                                ),
                              );
                            }

                            return rows;
                          })
                        : pagedEntries.map((entry) => (
                            <tr
                              key={entry.id}
                              className="campaign-tracker-flat-row"
                              title={entry.taggedUrl}
                              onClick={() => onLoadEntry(entry)}
                            >
                              <td title={entry.utm.utm_campaign}>
                                <div className="campaign-tracker-campaign">{entry.utm.utm_campaign}</div>
                                {(entry.utm.utm_term || entry.utm.utm_content) && (
                                  <div className="campaign-tracker-meta">
                                    {entry.utm.utm_term ? `term: ${entry.utm.utm_term}` : null}
                                    {entry.utm.utm_term && entry.utm.utm_content ? " · " : null}
                                    {entry.utm.utm_content
                                      ? `content: ${entry.utm.utm_content}`
                                      : null}
                                  </div>
                                )}
                              </td>
                              <td className="campaign-tracker-source" title={formatSource(entry)}>
                                {formatSource(entry)}
                              </td>
                              <td className="campaign-tracker-medium" title={formatMedium(entry)}>
                                {formatMedium(entry)}
                              </td>
                              <td className="campaign-tracker-referrer" title={entry.referrer || "Direct"}>
                                {formatReferrer(entry)}
                              </td>
                              <td className="campaign-tracker-landing" title={entry.taggedUrl}>
                                {formatLanding(entry)}
                              </td>
                              <td className="campaign-tracker-number">
                                {entry.sessions.toLocaleString()}
                              </td>
                              <td className="campaign-tracker-number">
                                {entry.activeUsers.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                    </tbody>
                  </table>
                </div>

                <div className="campaign-tracker-footer">
                  <p className="campaign-tracker-page-label">
                    Showing {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, totalItems)} of{" "}
                    {totalItems}
                    {viewMode === "grouped" ? " campaigns" : " links"}
                  </p>
                  <div className="campaign-tracker-pagination">
                    <button
                      type="button"
                      className="secondary-btn"
                      disabled={currentPage <= 1}
                      onClick={() => setPage((value) => Math.max(1, value - 1))}
                    >
                      Previous
                    </button>
                    <span className="campaign-tracker-page-label">
                      Page {currentPage} of {pageCount}
                    </span>
                    <button
                      type="button"
                      className="secondary-btn"
                      disabled={currentPage >= pageCount}
                      onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </section>
    </>
  );
}
