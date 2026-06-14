"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CardDownloadPicker } from "@/components/event-cards/CardDownloadPicker";
import { ToolLayout } from "@/components/cw/ToolLayout";
import { ToolPanel } from "@/components/cw/ToolPanel";
import {
  InstagramCarouselPreview,
} from "@/components/event-cards/InstagramCarouselPreview";
import { SlideshowPreview } from "@/components/event-cards/SlideshowPreview";
import {
  INSTAGRAM_EXPORT_HEIGHT,
  INSTAGRAM_EXPORT_WIDTH,
  SLIDESHOW_EXPORT_HEIGHT,
  SLIDESHOW_EXPORT_WIDTH,
} from "@/lib/event-cards/constants";
import {
  describeRangeSelection,
  getRangeForPreset,
  monthRangeValue,
  parseRangeSelection,
  RANGE_PRESET_OPTIONS,
} from "@/lib/event-cards/date-range.mjs";
import {
  type CardItemMeta,
  cardElementToPngBlob,
  downloadCardElements,
  parseCardItemsFromHtml,
  slugifyExportName,
  uniquePngFilenames,
} from "@/lib/event-cards/export-png";
import { StatusLine } from "@/components/StatusLine";

type OutputFormat = "instagram" | "slideshow";

type FormOptions = {
  feedUrl: string;
  limit: number;
  sort: string;
  upcomingOnly: boolean;
  fromDate: string;
  toDate: string;
  enrich: boolean;
  format: OutputFormat;
};

const FORMAT_CONFIG = {
  instagram: {
    frameSelector: ".cw-export-frame",
    exportWidth: INSTAGRAM_EXPORT_WIDTH,
    exportHeight: INSTAGRAM_EXPORT_HEIGHT,
    label: "Instagram carousel",
    previewTitle: "Instagram carousel preview",
    generateNoun: "cards",
    dimensionLabel: "Instagram • 1080 × 1350px",
  },
  slideshow: {
    frameSelector: ".cw-slideshow-frame",
    exportWidth: SLIDESHOW_EXPORT_WIDTH,
    exportHeight: SLIDESHOW_EXPORT_HEIGHT,
    label: "Display slideshow",
    previewTitle: "Display slideshow preview",
    generateNoun: "slides",
    dimensionLabel: "Display • 1920px wide",
  },
} as const;

type GenerateResponse = {
  feedTitle?: string;
  itemCount: number;
  skippedNoImage: number;
  html: string;
  error?: string;
};

type StatusVariant = "" | "success" | "error";

type FeedMonthOption = {
  value: string;
  label: string;
  fromDate: string;
  toDate: string;
  eventCount: number;
};

type FeedMonthsResponse = {
  feedTitle?: string;
  months: FeedMonthOption[];
  error?: string;
};

const DEFAULT_FEED_URL = "https://creativewaco.org/event/rss.xml";

const EMPTY_SELECTION: Record<OutputFormat, Set<number>> = {
  instagram: new Set(),
  slideshow: new Set(),
};

const EMPTY_ITEMS: Record<OutputFormat, CardItemMeta[]> = {
  instagram: [],
  slideshow: [],
};

const EMPTY_ACTIVE_INDEX: Record<OutputFormat, number> = {
  instagram: 0,
  slideshow: 0,
};

export function EventCardsTool() {
  const instagramPreviewRef = useRef<HTMLDivElement>(null);
  const slideshowPreviewRef = useRef<HTMLDivElement>(null);
  const lastHtmlRef = useRef<Record<OutputFormat, string>>({
    instagram: "",
    slideshow: "",
  });

  const [outputFormat, setOutputFormat] = useState<OutputFormat>("instagram");
  const [feedUrl, setFeedUrl] = useState(DEFAULT_FEED_URL);
  const [limit, setLimit] = useState(8);
  const [sort, setSort] = useState("date-asc");
  const [rangeSelection, setRangeSelection] = useState("upcoming");
  const [upcomingOnly, setUpcomingOnly] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [enrich, setEnrich] = useState(true);
  const [feedMonths, setFeedMonths] = useState<FeedMonthOption[]>([]);
  const [loadingMonths, setLoadingMonths] = useState(false);

  const [status, setStatus] = useState("");
  const [statusVariant, setStatusVariant] = useState<StatusVariant>("");
  const [instagramHtml, setInstagramHtml] = useState<string | null>(null);
  const [slideshowHtml, setSlideshowHtml] = useState<string | null>(null);
  const [hasInstagramCards, setHasInstagramCards] = useState(false);
  const [hasSlideshowCards, setHasSlideshowCards] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [downloadingSelected, setDownloadingSelected] = useState(false);
  const [cardItemsByFormat, setCardItemsByFormat] =
    useState<Record<OutputFormat, CardItemMeta[]>>(EMPTY_ITEMS);
  const [selectedByFormat, setSelectedByFormat] =
    useState<Record<OutputFormat, Set<number>>>(EMPTY_SELECTION);
  const [activeSlideIndexByFormat, setActiveSlideIndexByFormat] =
    useState<Record<OutputFormat, number>>(EMPTY_ACTIVE_INDEX);
  const [zipBasenameByFormat, setZipBasenameByFormat] = useState<
    Record<OutputFormat, string>
  >({
    instagram: "event-cards",
    slideshow: "event-slides",
  });

  const activeConfig = FORMAT_CONFIG[outputFormat];
  const activeCardItems = cardItemsByFormat[outputFormat];
  const activeSelected = selectedByFormat[outputFormat];
  const activeSlideIndex = activeSlideIndexByFormat[outputFormat];
  const activePreviewHtml =
    outputFormat === "slideshow" ? slideshowHtml : instagramHtml;
  const hasActiveCards =
    outputFormat === "slideshow" ? hasSlideshowCards : hasInstagramCards;

  const isCustomRange = rangeSelection === "custom";
  const rangeSummary = useMemo(
    () =>
      isCustomRange
        ? ""
        : describeRangeSelection({ selection: rangeSelection, fromDate, toDate }),
    [isCustomRange, rangeSelection, fromDate, toDate],
  );

  const setStatusMessage = useCallback((message: string, variant: StatusVariant = "") => {
    setStatus(message);
    setStatusVariant(variant);
  }, []);

  const applyRangeSelection = useCallback(
    (value: string, months: FeedMonthOption[] = feedMonths) => {
      setRangeSelection(value);
      const parsed = parseRangeSelection(value);

      if (parsed.type === "custom") {
        setUpcomingOnly(false);
        return;
      }

      if (parsed.type === "month") {
        const month = months.find((entry) => entry.value === parsed.month);
        if (!month) return;
        setFromDate(month.fromDate);
        setToDate(month.toDate);
        setUpcomingOnly(false);
        return;
      }

      const range = getRangeForPreset(parsed.preset);
      setFromDate(range.fromDate);
      setToDate(range.toDate);
      setUpcomingOnly(range.upcomingOnly);
    },
    [feedMonths],
  );

  const handleFromDateChange = useCallback((value: string) => {
    setFromDate(value);
    setRangeSelection("custom");
    setUpcomingOnly(false);
  }, []);

  const handleToDateChange = useCallback((value: string) => {
    setToDate(value);
    setRangeSelection("custom");
    setUpcomingOnly(false);
  }, []);

  useEffect(() => {
    const feed = feedUrl.trim();
    if (!feed) {
      setFeedMonths([]);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoadingMonths(true);

      void fetch("/api/event-cards/months/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedUrl: feed, enrich }),
        signal: controller.signal,
      })
        .then(async (response) => {
          const contentType = response.headers.get("content-type") ?? "";
          if (!contentType.includes("application/json")) {
            throw new Error("Could not load months from feed.");
          }
          const payload = (await response.json()) as FeedMonthsResponse;
          if (!response.ok) {
            throw new Error(payload.error || "Could not load months from feed.");
          }

          const months = payload.months ?? [];
          setFeedMonths(months);

          setRangeSelection((current) => {
            const parsed = parseRangeSelection(current);
            if (
              parsed.type === "month" &&
              !months.some((month) => month.value === parsed.month)
            ) {
              const range = getRangeForPreset("upcoming");
              setFromDate(range.fromDate);
              setToDate(range.toDate);
              setUpcomingOnly(range.upcomingOnly);
              return "upcoming";
            }
            return current;
          });
        })
        .catch((error) => {
          if (error instanceof Error && error.name === "AbortError") return;
          setFeedMonths([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setLoadingMonths(false);
          }
        });
    }, 500);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [feedUrl, enrich]);

  const readOptions = useCallback(
    (): FormOptions => ({
      feedUrl: feedUrl.trim(),
      limit,
      sort,
      upcomingOnly,
      fromDate,
      toDate,
      enrich,
      format: outputFormat,
    }),
    [feedUrl, limit, sort, upcomingOnly, fromDate, toDate, enrich, outputFormat],
  );

  const syncSelectionForFormat = useCallback(
    (format: OutputFormat, html: string, feedTitle?: string) => {
      const config = FORMAT_CONFIG[format];
      const items = parseCardItemsFromHtml(html, config.frameSelector);
      setCardItemsByFormat((current) => ({ ...current, [format]: items }));
      setSelectedByFormat((current) => ({
        ...current,
        [format]: new Set(items.map((_, index) => index)),
      }));
      setActiveSlideIndexByFormat((current) => ({ ...current, [format]: 0 }));
      if (feedTitle) {
        setZipBasenameByFormat((current) => ({
          ...current,
          [format]: slugifyExportName(feedTitle),
        }));
      }
    },
    [],
  );

  const getPreviewCards = useCallback((format: OutputFormat) => {
    const config = FORMAT_CONFIG[format];
    const previewRoot =
      format === "slideshow"
        ? slideshowPreviewRef.current
        : instagramPreviewRef.current;
    return [...(previewRoot?.querySelectorAll(config.frameSelector) ?? [])] as HTMLElement[];
  }, []);

  const toggleCardSelection = useCallback((index: number) => {
    setSelectedByFormat((current) => {
      const next = new Set(current[outputFormat]);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return { ...current, [outputFormat]: next };
    });
  }, [outputFormat]);

  const selectAllCards = useCallback(() => {
    setSelectedByFormat((current) => ({
      ...current,
      [outputFormat]: new Set(activeCardItems.map((_, index) => index)),
    }));
  }, [activeCardItems, outputFormat]);

  const toggleSelectAll = useCallback(() => {
    setSelectedByFormat((current) => {
      const selected = current[outputFormat];
      const everyCardSelected =
        activeCardItems.length > 0 && selected.size === activeCardItems.length;
      return {
        ...current,
        [outputFormat]: everyCardSelected
          ? new Set<number>()
          : new Set(activeCardItems.map((_, index) => index)),
      };
    });
  }, [activeCardItems, outputFormat]);

  const selectCurrentCard = useCallback(() => {
    setSelectedByFormat((current) => ({
      ...current,
      [outputFormat]: new Set([activeSlideIndex]),
    }));
  }, [activeSlideIndex, outputFormat]);

  const handlePresetChange = useCallback(
    (preset: "all" | "current") => {
      if (preset === "all") selectAllCards();
      else selectCurrentCard();
    },
    [selectAllCards, selectCurrentCard],
  );

  const handleSelectCard = useCallback(
    (index: number) => {
      setActiveSlideIndexByFormat((current) => ({
        ...current,
        [outputFormat]: index,
      }));
    },
    [outputFormat],
  );

  const handleActiveSlideIndexChange = useCallback(
    (index: number) => {
      setActiveSlideIndexByFormat((current) => ({
        ...current,
        [outputFormat]: index,
      }));
    },
    [outputFormat],
  );

  const downloadCard = useCallback(
    async (cardEl: HTMLElement, format: OutputFormat, title: string) => {
      const config = FORMAT_CONFIG[format];
      setStatusMessage(`Downloading ${title}…`);

      try {
        const blob = await cardElementToPngBlob(cardEl, format, config);
        const filename = uniquePngFilenames([title])[0];
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = filename;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        setStatusMessage(`Saved ${filename}`, "success");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        setStatusMessage(
          `PNG export failed (image CORS may block this browser). Try a screenshot or copy HTML. ${message}`,
          "error",
        );
      }
    },
    [setStatusMessage],
  );

  const downloadSelectedCards = useCallback(async () => {
    const config = FORMAT_CONFIG[outputFormat];
    const cards = getPreviewCards(outputFormat);
    const indices = [...activeSelected].sort((a, b) => a - b);
    const selectedCards = indices
      .map((index) => cards[index])
      .filter((card): card is HTMLElement => Boolean(card));
    const selectedTitles = indices
      .map((index) => activeCardItems[index]?.title)
      .filter(Boolean);

    if (!selectedCards.length) {
      setStatusMessage("Select at least one card to download.", "error");
      return;
    }

    setDownloadingSelected(true);
    setStatusMessage(
      `Preparing ${selectedCards.length} ${selectedCards.length === 1 ? "PNG" : "PNGs"}…`,
    );

    try {
      const result = await downloadCardElements(
        selectedCards,
        selectedTitles,
        outputFormat,
        config,
        zipBasenameByFormat[outputFormat],
      );

      if (result.mode === "single") {
        setStatusMessage(`Saved ${result.filename}`, "success");
      } else {
        setStatusMessage(
          `Saved ${result.count} cards to ${result.filename}`,
          "success",
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setStatusMessage(
        `PNG export failed (image CORS may block this browser). Try a screenshot or copy HTML. ${message}`,
        "error",
      );
    } finally {
      setDownloadingSelected(false);
    }
  }, [
    activeCardItems,
    activeSelected,
    getPreviewCards,
    outputFormat,
    setStatusMessage,
    zipBasenameByFormat,
  ]);

  const handlePreviewClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement;
      if (!target.classList.contains("card-download")) return;

      const config = FORMAT_CONFIG[outputFormat];
      const wrap = target.closest(".preview-card-wrap");
      const card = wrap?.querySelector(config.frameSelector) as HTMLElement | null;
      const title = card?.dataset.cardTitle || "event-card";
      if (card) void downloadCard(card, outputFormat, title);
    },
    [downloadCard, outputFormat],
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const options = readOptions();

    if (options.fromDate && options.toDate && options.fromDate > options.toDate) {
      setStatusMessage("End date must be on or after the start date.", "error");
      return;
    }

    setGenerating(true);
    setStatusMessage(
      `Fetching feed and building ${FORMAT_CONFIG[outputFormat].generateNoun}…`,
    );

    try {
      const response = await fetch("/api/event-cards/generate/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options),
      });

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        throw new Error(
          "Unexpected server response. Refresh the page and sign in again.",
        );
      }

      const payload = (await response.json()) as GenerateResponse;
      if (!response.ok) {
        throw new Error(payload.error || "Generation failed.");
      }

      lastHtmlRef.current[outputFormat] = payload.html;
      syncSelectionForFormat(outputFormat, payload.html, payload.feedTitle);
      if (outputFormat === "slideshow") {
        setSlideshowHtml(payload.html);
        setHasSlideshowCards(payload.itemCount > 0);
      } else {
        setInstagramHtml(payload.html);
        setHasInstagramCards(payload.itemCount > 0);
      }

      const noun =
        outputFormat === "slideshow"
          ? `slide${payload.itemCount === 1 ? "" : "s"}`
          : `card${payload.itemCount === 1 ? "" : "s"}`;
      let message = `Generated ${payload.itemCount} ${noun} from ${payload.feedTitle || "feed"}.`;
      if (payload.skippedNoImage > 0) {
        message += ` Skipped ${payload.skippedNoImage} without an image.`;
      }
      setStatusMessage(message, "success");
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Check the feed URL and try again.",
        "error",
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyHtml = async () => {
    const html = lastHtmlRef.current[outputFormat];
    if (!html) return;
    await navigator.clipboard.writeText(html);
    setStatusMessage("HTML copied to clipboard.", "success");
  };

  return (
    <>
      <style>{`
        .output-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }

        .output-header h2 {
          margin: 0;
          font-size: 18px;
        }

        .output-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .event-cards-field-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        @media (max-width: 520px) {
          .event-cards-field-grid {
            grid-template-columns: 1fr;
          }
        }

        .event-cards-range-hint {
          margin: -4px 0 0;
          font-size: 12px;
          color: var(--muted-foreground, #666666);
        }

        .event-cards-format-tabs {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .event-cards-format-tab {
          border: 1px solid var(--border, #e5e5e5);
          border-radius: 999px;
          background: var(--background, #fff);
          padding: 8px 14px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }

        .event-cards-format-tab:hover {
          background: var(--accent, #f5f5f5);
        }

        .event-cards-format-tab.is-active {
          border-color: var(--primary, #1a1a1a);
          background: var(--primary, #1a1a1a);
          color: var(--primary-foreground, #fff);
        }

      `}</style>

      <ToolLayout>
        <ToolPanel>
          <form className="grid gap-3.5" onSubmit={handleSubmit}>
            <label className="field">
              <span>RSS feed URL</span>
              <input
                name="feedUrl"
                type="url"
                required
                value={feedUrl}
                onChange={(event) => setFeedUrl(event.target.value)}
              />
            </label>

            <label className="field checkbox">
              <input
                name="enrich"
                type="checkbox"
                checked={enrich}
                onChange={(event) => setEnrich(event.target.checked)}
              />
              <span>Enrich from event pages (better images &amp; dates)</span>
            </label>

            <label className="field">
              <span>Date range</span>
              <select
                name="rangeSelection"
                value={rangeSelection}
                onChange={(event) => applyRangeSelection(event.target.value)}
              >
                <optgroup label="General">
                  <option value="upcoming">Upcoming from today</option>
                </optgroup>
                <optgroup label="Quick ranges">
                  {RANGE_PRESET_OPTIONS.filter(
                    (option) => !["upcoming", "custom"].includes(option.id),
                  ).map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </optgroup>
                {feedMonths.length > 0 ? (
                  <optgroup label="Months in feed">
                    {feedMonths.map((month) => (
                      <option key={month.value} value={monthRangeValue(month.value)}>
                        {month.label} ({month.eventCount} event
                        {month.eventCount === 1 ? "" : "s"})
                      </option>
                    ))}
                  </optgroup>
                ) : null}
                <optgroup label="Advanced">
                  <option value="custom">Custom dates…</option>
                </optgroup>
              </select>
              {loadingMonths ? (
                <p className="event-cards-range-hint">Loading months from feed…</p>
              ) : rangeSummary ? (
                <p className="event-cards-range-hint">{rangeSummary}</p>
              ) : null}
            </label>

            {isCustomRange ? (
              <div className="event-cards-field-grid">
                <label className="field">
                  <span>Start date</span>
                  <input
                    name="fromDate"
                    type="date"
                    value={fromDate}
                    onChange={(event) => handleFromDateChange(event.target.value)}
                  />
                </label>

                <label className="field">
                  <span>End date</span>
                  <input
                    name="toDate"
                    type="date"
                    value={toDate}
                    onChange={(event) => handleToDateChange(event.target.value)}
                  />
                </label>
              </div>
            ) : null}

            <div className="event-cards-field-grid">
              <label className="field">
                <span>How many cards</span>
                <input
                  name="limit"
                  type="number"
                  min={1}
                  max={30}
                  value={limit}
                  onChange={(event) => setLimit(Number(event.target.value))}
                />
              </label>

              <label className="field">
                <span>Sort by</span>
                <select name="sort" value={sort} onChange={(event) => setSort(event.target.value)}>
                  <option value="date-asc">Event date (soonest first)</option>
                  <option value="date-desc">Event date (latest first)</option>
                  <option value="title">Title (A–Z)</option>
                  <option value="pub-desc">RSS feed order</option>
                </select>
              </label>
            </div>

            <div className="event-cards-format-tabs" role="tablist" aria-label="Output format">
              {(Object.keys(FORMAT_CONFIG) as OutputFormat[]).map((format) => (
                <button
                  key={format}
                  type="button"
                  role="tab"
                  aria-selected={outputFormat === format}
                  className={[
                    "event-cards-format-tab",
                    outputFormat === format ? "is-active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => setOutputFormat(format)}
                >
                  {FORMAT_CONFIG[format].label}
                </button>
              ))}
            </div>

            <button className="primary-btn" type="submit" disabled={generating}>
              Generate cards
            </button>
          </form>

          <StatusLine message={status} variant={statusVariant} />
        </ToolPanel>

        <ToolPanel>
          <div className="output-header">
            <h2>{activeConfig.previewTitle}</h2>
            <div className="output-actions">
              <button
                type="button"
                className="secondary-btn"
                disabled={!hasActiveCards}
                onClick={() => void handleCopyHtml()}
              >
                Copy HTML
              </button>
            </div>
          </div>

          {outputFormat === "instagram" ? (
            <InstagramCarouselPreview
              html={activePreviewHtml}
              isLoading={generating && outputFormat === "instagram"}
              previewRef={instagramPreviewRef}
              onSlideClick={handlePreviewClick}
              activeSlideIndex={activeSlideIndex}
              onActiveSlideIndexChange={handleActiveSlideIndexChange}
            />
          ) : (
            <SlideshowPreview
              html={activePreviewHtml}
              isLoading={generating && outputFormat === "slideshow"}
              previewRef={slideshowPreviewRef}
              onSlideClick={handlePreviewClick}
              activeSlideIndex={activeSlideIndex}
              onActiveSlideIndexChange={handleActiveSlideIndexChange}
            />
          )}

          {activeCardItems.length > 0 ? (
            <CardDownloadPicker
              items={activeCardItems}
              selected={activeSelected}
              activeIndex={activeSlideIndex}
              dimensionLabel={activeConfig.dimensionLabel}
              downloading={downloadingSelected}
              onPresetChange={handlePresetChange}
              onToggle={toggleCardSelection}
              onToggleSelectAll={toggleSelectAll}
              onSelectCard={handleSelectCard}
              onDone={() => void downloadSelectedCards()}
            />
          ) : null}
        </ToolPanel>
      </ToolLayout>
    </>
  );
}
