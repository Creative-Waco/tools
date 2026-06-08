"use client";

import { useState } from "react";
import type { DashboardEvent } from "./types";
import { escapeHtml, formatDate, formatNumber, statusSlugToClass } from "./utils";

type EventsPanelProps = {
  events: DashboardEvent[];
  undatedPipelineCount: number;
  loading?: boolean;
};

function EventRow({ event }: { event: DashboardEvent }) {
  const slug = statusSlugToClass(event.status);
  const label = event.statusLabel ?? event.status ?? "—";

  return (
    <tr>
      <td>
        {event.asanaUrl ? (
          <a href={event.asanaUrl} target="_blank" rel="noopener">
            {escapeHtml(event.title)}
          </a>
        ) : (
          escapeHtml(event.title)
        )}
      </td>
      <td>{formatDate(event.date)}</td>
      <td>
        <span className={`status-badge status-badge--${slug}`}>{escapeHtml(label)}</span>
      </td>
    </tr>
  );
}

function skeletonTableRows(count: number, rowClass: string, colCount: number) {
  return Array.from({ length: count }, (_, i) => (
    <tr key={i} className={`skeleton-table-row ${rowClass}`}>
      {Array.from({ length: colCount }, (_, j) => (
        <td key={j}>
          <span className="skeleton skeleton--text-md" />
        </td>
      ))}
    </tr>
  ));
}

export function EventsPanel({ events, undatedPipelineCount, loading }: EventsPanelProps) {
  const [doneExpanded, setDoneExpanded] = useState(false);

  const list = events ?? [];
  const active = list.filter(
    (e) => e.status !== "done" && e.status !== "canceled" && e.status !== "cancelled",
  );
  const done = list.filter((e) => e.status === "done");
  const upcomingCount = active.filter((e) => e.status !== "idea").length;
  const ideaCount = active.filter((e) => e.status === "idea").length;

  const eventsSummary =
    ideaCount > 0
      ? `${upcomingCount} upcoming · ${ideaCount} ideas`
      : `${upcomingCount} upcoming`;

  const collapsedLabel = `Show completed events (${done.length})`;

  function toggleCompletedEvents() {
    setDoneExpanded((prev) => !prev);
  }

  return (
    <section className="panel events-panel">
      <div className="panel-header panel-header--row">
        <div>
          <h2>Spark events</h2>
          <p className="panel-sub">From Creative Sparks Asana board</p>
        </div>
        <span id="events-summary" className="pill">
          {loading ? (
            <span className="skeleton skeleton--pill" style={{ width: "112px" }} />
          ) : (
            eventsSummary
          )}
        </span>
      </div>

      {!loading && undatedPipelineCount > 0 ? (
        <p id="pipeline-callout" className="pipeline-callout">
          {formatNumber(undatedPipelineCount)} pipeline event(s) lack a due date in Asana.{" "}
          <a
            href="https://app.asana.com/1/1211307037171881/project/1213968849649812"
            target="_blank"
            rel="noopener"
          >
            Add dates in Creative Sparks
          </a>{" "}
          for accurate pipeline tracking.
        </p>
      ) : null}

      <div className="table-wrap table-wrap--scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Event</th>
              <th scope="col">Date</th>
              <th scope="col">Event status</th>
            </tr>
          </thead>
          <tbody id="events-body">
            {loading
              ? skeletonTableRows(6, "", 3)
              : active.map((event) => <EventRow key={`${event.title}-${event.date}`} event={event} />)}
          </tbody>
        </table>
      </div>

      {!loading && done.length > 0 ? (
        <div id="events-done-wrap" className="events-done">
          <button
            type="button"
            id="events-done-toggle"
            className="events-done__toggle"
            aria-expanded={doneExpanded}
            onClick={toggleCompletedEvents}
          >
            {doneExpanded ? "Hide completed events" : collapsedLabel}
          </button>
          <div className="table-wrap table-wrap--scroll table-wrap--compact">
            <table className="data-table data-table--muted">
              <tbody id="events-done-body" hidden={!doneExpanded}>
                {done.map((event) => (
                  <EventRow key={`done-${event.title}-${event.date}`} event={event} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
