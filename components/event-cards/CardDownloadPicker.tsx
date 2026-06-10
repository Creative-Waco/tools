"use client";

import { useEffect, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import type { CardItemMeta } from "@/lib/event-cards/export-png";
import { formatSelectionSummary } from "@/lib/event-cards/export-png";

type CardDownloadPickerProps = {
  items: CardItemMeta[];
  selected: Set<number>;
  activeIndex: number;
  dimensionLabel: string;
  downloading: boolean;
  onPresetChange: (preset: "all" | "current") => void;
  onToggle: (index: number) => void;
  onToggleSelectAll: () => void;
  onSelectCard: (index: number) => void;
  onDone: () => void;
};

export function CardDownloadPicker({
  items,
  selected,
  activeIndex,
  dimensionLabel,
  downloading,
  onPresetChange,
  onToggle,
  onToggleSelectAll,
  onSelectCard,
  onDone,
}: CardDownloadPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const total = items.length;
  const selectedCount = selected.size;
  const allSelected = total > 0 && selectedCount === total;
  const summary = formatSelectionSummary(selected, total);
  const currentLabel = `Card ${activeIndex + 1}`;
  const currentOnlySelected =
    selectedCount === 1 && selected.has(activeIndex);
  const rangeValue = allSelected ? "all" : currentOnlySelected ? "current" : "custom";

  useEffect(() => {
    setIsOpen(false);
  }, [total]);

  const handleDone = () => {
    onDone();
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <>
        <style>{`
          .card-picker-trigger-wrap {
            margin-top: 16px;
          }

          .card-picker-trigger {
            width: 100%;
          }
        `}</style>
        <div className="card-picker-trigger-wrap">
          <button
            type="button"
            className="primary-btn card-picker-trigger"
            onClick={() => setIsOpen(true)}
          >
            Download cards…
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{`
        .card-picker {
          display: grid;
          gap: 0;
          margin-top: 16px;
          border: 1px solid var(--border, #e5e5e5);
          border-radius: 12px;
          background: var(--background, #fff);
          overflow: hidden;
        }

        .card-picker-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          padding: 16px 16px 12px;
          border-bottom: 1px solid var(--border, #e5e5e5);
        }

        .card-picker-header-main {
          flex: 1;
          min-width: 0;
        }

        .card-picker-title {
          margin: 0 0 12px;
          font-size: 18px;
          font-weight: 700;
          color: var(--foreground, #1a1a1a);
        }

        .card-picker-close {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border: 1px solid var(--border, #e5e5e5);
          border-radius: 8px;
          background: var(--background, #fff);
          color: var(--muted-foreground, #666666);
          cursor: pointer;
          flex-shrink: 0;
        }

        .card-picker-close:hover {
          background: var(--accent, #f5f5f5);
          color: var(--foreground, #1a1a1a);
        }

        .card-picker-range {
          position: relative;
        }

        .card-picker-range select {
          width: 100%;
          appearance: none;
          border: 1px solid var(--border, #e5e5e5);
          border-radius: 10px;
          padding: 10px 36px 10px 12px;
          font-size: 14px;
          font-weight: 600;
          background: var(--background, #fff);
          color: var(--foreground, #1a1a1a);
        }

        .card-picker-range-icon {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          color: var(--muted-foreground, #666666);
        }

        .card-picker-presets {
          display: grid;
          gap: 0;
          border-bottom: 1px solid var(--border, #e5e5e5);
        }

        .card-picker-preset,
        .card-picker-master {
          display: grid;
          grid-template-columns: auto 1fr;
          align-items: center;
          gap: 12px;
          width: 100%;
          border: 0;
          background: transparent;
          text-align: left;
          cursor: pointer;
          padding: 12px 16px;
        }

        .card-picker-preset:hover,
        .card-picker-master:hover,
        .card-picker-row:hover {
          background: var(--accent, #f5f5f5);
        }

        .card-picker-preset span,
        .card-picker-master span {
          font-size: 14px;
          font-weight: 600;
          color: var(--foreground, #1a1a1a);
        }

        .card-picker-list {
          display: grid;
          gap: 0;
          margin: 0;
          padding: 0;
          list-style: none;
          max-height: 320px;
          overflow: auto;
        }

        .card-picker-row {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 12px 16px;
          border-top: 1px solid var(--border, #e5e5e5);
        }

        .card-picker-toggle {
          border: 0;
          background: transparent;
          padding: 0;
          cursor: pointer;
          flex-shrink: 0;
        }

        .card-picker-row-main {
          display: grid;
          grid-template-columns: 56px 1fr;
          gap: 12px;
          align-items: center;
          flex: 1;
          min-width: 0;
          border: 0;
          background: transparent;
          padding: 0;
          text-align: left;
          cursor: pointer;
        }

        .card-picker-row.is-active {
          background: var(--accent, #f5f5f5);
        }

        .card-picker-check {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          border: 1.5px solid var(--border, #d0d0d0);
          border-radius: 4px;
          background: var(--background, #fff);
          flex-shrink: 0;
        }

        .card-picker-check.is-checked {
          border-color: var(--foreground, #1a1a1a);
          background: var(--foreground, #1a1a1a);
        }

        .card-picker-check.is-checked::after {
          content: "";
          width: 5px;
          height: 9px;
          margin-top: -1px;
          border: solid var(--background, #fff);
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }

        .card-picker-thumb {
          width: 56px;
          height: 56px;
          border-radius: 8px;
          object-fit: cover;
          background: #eef0f3;
          flex-shrink: 0;
        }

        .card-picker-thumb--empty {
          display: block;
        }

        .card-picker-meta {
          min-width: 0;
        }

        .card-picker-meta strong,
        .card-picker-meta span {
          display: block;
        }

        .card-picker-meta strong {
          font-size: 14px;
          font-weight: 700;
          color: var(--foreground, #1a1a1a);
          line-height: 1.3;
        }

        .card-picker-meta span {
          margin-top: 4px;
          font-size: 12px;
          color: var(--muted-foreground, #666666);
          line-height: 1.35;
        }

        .card-picker-meta .card-picker-event-title {
          font-weight: 500;
          color: var(--muted-foreground, #666666);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .card-picker-footer {
          padding: 16px;
          border-top: 1px solid var(--border, #e5e5e5);
        }

        .card-picker-done {
          width: 100%;
          border: 0;
          border-radius: 10px;
          padding: 12px 16px;
          font-size: 15px;
          font-weight: 700;
          background: var(--foreground, #1a1a1a);
          color: var(--background, #fff);
          cursor: pointer;
        }

        .card-picker-done:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
      `}</style>

      <div className="card-picker">
        <div className="card-picker-header">
          <div className="card-picker-header-main">
            <h3 className="card-picker-title">Select cards</h3>
            <div className="card-picker-range">
              <select
                aria-label="Selection range"
                value={rangeValue}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === "all") onPresetChange("all");
                  if (value === "current") onPresetChange("current");
                }}
              >
                {rangeValue === "custom" ? (
                  <option value="custom">{summary}</option>
                ) : null}
                <option value="all">All cards (1–{total})</option>
                <option value="current">Current card ({currentLabel})</option>
              </select>
              <ChevronDown className="card-picker-range-icon" size={16} strokeWidth={2} />
            </div>
          </div>
          <button
            type="button"
            className="card-picker-close"
            aria-label="Close download panel"
            onClick={() => setIsOpen(false)}
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <div className="card-picker-presets">
          <button
            type="button"
            className="card-picker-preset"
            onClick={() => onPresetChange("current")}
          >
            <span
              className={`card-picker-check${currentOnlySelected ? " is-checked" : ""}`}
              aria-hidden="true"
            />
            <span>Current card ({currentLabel})</span>
          </button>
          <button type="button" className="card-picker-master" onClick={onToggleSelectAll}>
            <span
              className={`card-picker-check${allSelected ? " is-checked" : ""}`}
              aria-hidden="true"
            />
            <span>Select all</span>
          </button>
        </div>

        <ul className="card-picker-list">
          {items.map((item, index) => {
            const checked = selected.has(index);
            return (
              <li key={`${item.title}-${index}`}>
                <div
                  className={`card-picker-row${index === activeIndex ? " is-active" : ""}`}
                >
                  <button
                    type="button"
                    className="card-picker-toggle"
                    aria-label={`${checked ? "Deselect" : "Select"} card ${index + 1}`}
                    onClick={() => onToggle(index)}
                  >
                    <span
                      className={`card-picker-check${checked ? " is-checked" : ""}`}
                      aria-hidden="true"
                    />
                  </button>
                  <button
                    type="button"
                    className="card-picker-row-main"
                    onClick={() => onSelectCard(index)}
                  >
                    {item.imageUrl ? (
                      <img
                        className="card-picker-thumb"
                        src={item.imageUrl}
                        alt=""
                        loading="lazy"
                      />
                    ) : (
                      <span className="card-picker-thumb card-picker-thumb--empty" />
                    )}
                    <div className="card-picker-meta">
                      <strong>Card {index + 1}</strong>
                      <span className="card-picker-event-title">{item.title}</span>
                      <span>{dimensionLabel}</span>
                    </div>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="card-picker-footer">
          <button
            type="button"
            className="card-picker-done"
            disabled={downloading || selectedCount === 0}
            onClick={handleDone}
          >
            {downloading
              ? "Preparing download…"
              : selectedCount === 1
                ? "Done — download PNG"
                : `Done — download ZIP (${selectedCount})`}
          </button>
        </div>
      </div>
    </>
  );
}
