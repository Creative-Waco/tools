"use client";

import { useCallback, useRef, useState } from "react";
import { toPng } from "html-to-image";
import {
  getCardExportPixelRatio,
  InstagramCarouselPreview,
} from "@/components/event-cards/InstagramCarouselPreview";
import { StatusLine } from "@/components/StatusLine";
import { syncTicketDivider } from "@/lib/event-cards/sync-ticket-divider";

type FormOptions = {
  feedUrl: string;
  limit: number;
  sort: string;
  upcomingOnly: boolean;
  enrich: boolean;
};

type GenerateResponse = {
  feedTitle?: string;
  itemCount: number;
  skippedNoImage: number;
  html: string;
  error?: string;
};

type StatusVariant = "" | "success" | "error";

const DEFAULT_FEED_URL = "https://creativewaco.org/event/rss.xml";

function slugify(text: string) {
  return (
    String(text || "event-card")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "event-card"
  );
}

export function EventCardsTool() {
  const previewRef = useRef<HTMLDivElement>(null);
  const lastHtmlRef = useRef("");

  const [feedUrl, setFeedUrl] = useState(DEFAULT_FEED_URL);
  const [limit, setLimit] = useState(8);
  const [sort, setSort] = useState("date-asc");
  const [upcomingOnly, setUpcomingOnly] = useState(true);
  const [enrich, setEnrich] = useState(true);

  const [status, setStatus] = useState("");
  const [statusVariant, setStatusVariant] = useState<StatusVariant>("");
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [hasCards, setHasCards] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);

  const setStatusMessage = useCallback((message: string, variant: StatusVariant = "") => {
    setStatus(message);
    setStatusVariant(variant);
  }, []);

  const readOptions = useCallback(
    (): FormOptions => ({
      feedUrl: feedUrl.trim(),
      limit,
      sort,
      upcomingOnly,
      enrich,
    }),
    [feedUrl, limit, sort, upcomingOnly, enrich],
  );

  const downloadCard = useCallback(
    async (cardEl: HTMLElement) => {
      const title = cardEl.dataset.cardTitle || "event-card";
      setStatusMessage(`Downloading ${title}…`);

      try {
        syncTicketDivider(cardEl);
        const dataUrl = await toPng(cardEl, {
          pixelRatio: getCardExportPixelRatio(cardEl),
          cacheBust: true,
          backgroundColor: "#111111",
        });
        const link = document.createElement("a");
        link.download = `${slugify(title)}.png`;
        link.href = dataUrl;
        link.click();
        setStatusMessage(`Saved ${slugify(title)}.png`, "success");
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

  const downloadAllCards = useCallback(async () => {
    const cards = previewRef.current?.querySelectorAll(".cw-card-scene");
    if (!cards?.length) return;

    setDownloadingAll(true);
    let ok = 0;

    for (const card of cards) {
      try {
        await downloadCard(card as HTMLElement);
        ok += 1;
        await new Promise((resolve) => setTimeout(resolve, 400));
      } catch {
        // downloadCard already sets status
      }
    }

    setDownloadingAll(false);
    if (ok === cards.length) {
      setStatusMessage(`Downloaded ${ok} PNG${ok === 1 ? "" : "s"}.`, "success");
    }
  }, [downloadCard, setStatusMessage]);

  const handlePreviewClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement;
      if (!target.classList.contains("card-download")) return;

      const wrap = target.closest(".preview-card-wrap");
      const card = wrap?.querySelector(".cw-card-scene") as HTMLElement | null;
      if (card) void downloadCard(card);
    },
    [downloadCard],
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const options = readOptions();

    setGenerating(true);
    setStatusMessage("Fetching feed and building cards…");

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

      lastHtmlRef.current = payload.html;
      setPreviewHtml(payload.html);
      setHasCards(payload.itemCount > 0);

      let message = `Generated ${payload.itemCount} card${payload.itemCount === 1 ? "" : "s"} from ${payload.feedTitle || "feed"}.`;
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
    if (!lastHtmlRef.current) return;
    await navigator.clipboard.writeText(lastHtmlRef.current);
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
      `}</style>

      <div className="tool-layout">
        <section className="panel">
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
                <option value="date-asc">Upcoming date (soonest first)</option>
                <option value="date-desc">Date (latest first)</option>
                <option value="title">Title (A–Z)</option>
                <option value="pub-desc">RSS feed order</option>
              </select>
            </label>

            <label className="field checkbox">
              <input
                name="upcomingOnly"
                type="checkbox"
                checked={upcomingOnly}
                onChange={(event) => setUpcomingOnly(event.target.checked)}
              />
              <span>Only upcoming events (from today)</span>
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

            <button className="primary-btn" type="submit" disabled={generating}>
              Generate cards
            </button>
          </form>

          <StatusLine message={status} variant={statusVariant} />
        </section>

        <section className="panel">
          <div className="output-header">
            <h2>Instagram carousel preview</h2>
            <div className="output-actions">
              <button
                type="button"
                className="secondary-btn"
                disabled={!hasCards || downloadingAll}
                onClick={() => void downloadAllCards()}
              >
                Download all PNG
              </button>
              <button
                type="button"
                className="secondary-btn"
                disabled={!hasCards}
                onClick={() => void handleCopyHtml()}
              >
                Copy HTML
              </button>
            </div>
          </div>

          <InstagramCarouselPreview
            html={previewHtml}
            isLoading={generating}
            previewRef={previewRef}
            onSlideClick={handlePreviewClick}
          />
        </section>
      </div>
    </>
  );
}
