"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageCircle,
  Send,
} from "lucide-react";
import { CARD_STYLES } from "@/lib/event-cards/card-styles";
import { syncTicketDivider } from "@/lib/event-cards/sync-ticket-divider";

const EXPORT_WIDTH = 540;
const EXPORT_PIXEL_RATIO = 2;
const CARD_STYLES_ID = "cw-event-card-styles-v27";

type InstagramCarouselPreviewProps = {
  html: string | null;
  isLoading: boolean;
  previewRef: React.RefObject<HTMLDivElement | null>;
  onSlideClick: (event: React.MouseEvent<HTMLDivElement>) => void;
};

function buildSlideMarkup(sceneHtml: string) {
  return `<div class="ig-carousel-slide">
  <div class="preview-card-wrap ig-carousel-slide-inner">
    ${sceneHtml}
    <button type="button" class="card-download">PNG</button>
  </div>
</div>`;
}

function slidesFromHtml(html: string) {
  const temp = document.createElement("div");
  temp.innerHTML = html;
  const scenes = [...temp.querySelectorAll(".cw-card-scene")];
  return scenes.map((scene) => buildSlideMarkup(scene.outerHTML)).filter(Boolean);
}

export function InstagramCarouselPreview({
  html,
  isLoading,
  previewRef,
  onSlideClick,
}: InstagramCarouselPreviewProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [slideCount, setSlideCount] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  const syncSlideLayout = useCallback((track = trackRef.current) => {
    if (!track) return;
    syncTicketDivider(track);

    const viewport = viewportRef.current;
    const slide = track.children[activeIndex] as HTMLElement | undefined;
    if (viewport && slide) {
      viewport.style.height = `${slide.offsetHeight}px`;
    }
  }, [activeIndex]);

  useEffect(() => {
    let style = document.getElementById(CARD_STYLES_ID);
    if (!style) {
      style = document.createElement("style");
      style.id = CARD_STYLES_ID;
      document.head.appendChild(style);
    }
    style.textContent = CARD_STYLES;
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    if (!html) {
      track.innerHTML = "";
      setSlideCount(0);
      setActiveIndex(0);
      return;
    }

    const slides = slidesFromHtml(html);
    track.innerHTML = slides.join("\n");
    setSlideCount(slides.length);
    setActiveIndex(0);

    const syncInitial = () => {
      syncTicketDivider(track);
      const viewport = viewportRef.current;
      const slide = track.children[0] as HTMLElement | undefined;
      if (viewport && slide) {
        viewport.style.height = `${slide.offsetHeight}px`;
      }
    };
    syncInitial();
    requestAnimationFrame(syncInitial);

    track.querySelectorAll<HTMLImageElement>(".cw-ticket img").forEach((img) => {
      if (img.complete) return;

      img.addEventListener(
        "load",
        () => {
          syncTicketDivider(track);
          syncInitial();
        },
        { once: true },
      );
    });

    const images = track.querySelectorAll("img");
    let pending = images.length;
    if (pending === 0) {
      syncInitial();
    } else {
      images.forEach((img) => {
        if (img.complete) {
          pending -= 1;
          if (pending === 0) syncInitial();
        } else {
          img.addEventListener("load", () => {
            pending -= 1;
            if (pending === 0) syncInitial();
          });
          img.addEventListener("error", () => {
            pending -= 1;
            if (pending === 0) syncInitial();
          });
        }
      });
    }
  }, [html]);

  useEffect(() => {
    const onResize = () => {
      syncTicketDivider(trackRef.current);
      syncSlideLayout();
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [syncSlideLayout]);

  const goTo = useCallback(
    (index: number) => {
      if (slideCount === 0) return;
      setActiveIndex(((index % slideCount) + slideCount) % slideCount);
      requestAnimationFrame(() => syncSlideLayout(trackRef.current));
    },
    [slideCount, syncSlideLayout],
  );

  useEffect(() => {
    syncSlideLayout();
  }, [activeIndex, slideCount, syncSlideLayout]);

  const goPrev = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo]);
  const goNext = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (slideCount === 0) return;
      if (event.key === "ArrowLeft") goPrev();
      if (event.key === "ArrowRight") goNext();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goNext, goPrev, slideCount]);

  const handleTouchStart = (event: React.TouchEvent) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: React.TouchEvent) => {
    const start = touchStartX.current;
    const end = event.changedTouches[0]?.clientX;
    touchStartX.current = null;
    if (start == null || end == null) return;

    const delta = end - start;
    if (Math.abs(delta) < 40) return;
    if (delta > 0) goPrev();
    else goNext();
  };

  const showCarouselUi = slideCount > 1 && !isLoading;

  return (
    <>
      <style>{`
        .ig-preview {
          display: flex;
          justify-content: center;
          padding: 20px 12px 24px;
          background: #f3f4f6;
          border: 1px solid var(--line, #d8d0c4);
          border-radius: 10px;
          min-height: 220px;
        }

        .ig-post {
          width: 100%;
          max-width: 390px;
          background: #ffffff;
          border: 1px solid #dbdbdb;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
        }

        .ig-post-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-bottom: 1px solid #efefef;
        }

        .ig-post-avatar {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, #f58529, #dd2a7b 55%, #8134af);
          color: #ffffff;
          font-size: 11px;
          font-weight: 700;
          line-height: 1;
          letter-spacing: -0.02em;
        }

        .ig-post-username {
          font-size: 14px;
          font-weight: 600;
          color: #262626;
          line-height: 1;
        }

        .ig-carousel-viewport {
          position: relative;
          background: #1e1e24;
          overflow: hidden;
          touch-action: pan-y;
          min-height: 0;
        }

        .ig-carousel-track {
          display: flex;
          align-items: flex-start;
          transition: transform 0.28s ease-out;
          will-change: transform;
        }

        .ig-carousel-slide {
          flex: 0 0 100%;
          min-width: 0;
          align-self: flex-start;
        }

        .ig-carousel-slide-inner {
          display: block;
          width: 100%;
          box-sizing: border-box;
        }

        .ig-carousel-slide-inner .cw-card-scene {
          width: 100% !important;
          max-width: 100%;
          margin: 0;
          box-sizing: border-box;
        }

        .ig-carousel-empty,
        .ig-carousel-loading {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          text-align: center;
          font-size: 14px;
          line-height: 1.45;
          color: rgba(255, 255, 255, 0.72);
          pointer-events: none;
          z-index: 1;
        }

        .ig-carousel-loading {
          background: rgba(0, 0, 0, 0.35);
          color: #ffffff;
          z-index: 4;
        }

        .ig-carousel-nav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          z-index: 3;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          border: 0;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.92);
          color: #262626;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          opacity: 0;
          transition: opacity 0.15s ease;
        }

        .ig-carousel-viewport:hover .ig-carousel-nav,
        .ig-carousel-viewport:focus-within .ig-carousel-nav {
          opacity: 1;
        }

        .ig-carousel-nav--prev {
          left: 10px;
        }

        .ig-carousel-nav--next {
          right: 10px;
        }

        .ig-carousel-dots {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 10px;
          display: flex;
          justify-content: center;
          gap: 5px;
          z-index: 2;
          pointer-events: none;
        }

        .ig-carousel-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.45);
          transition: transform 0.15s ease, background-color 0.15s ease;
        }

        .ig-carousel-dot.is-active {
          background: #0095f6;
          transform: scale(1.15);
        }

        .ig-carousel-counter {
          position: absolute;
          top: 10px;
          right: 10px;
          z-index: 2;
          padding: 4px 8px;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.55);
          color: #ffffff;
          font-size: 12px;
          font-weight: 600;
          line-height: 1;
          pointer-events: none;
        }

        .ig-post-actions {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 10px 12px 4px;
          color: #262626;
        }

        .ig-post-actions svg:last-child {
          margin-left: auto;
        }

        .ig-post-caption {
          padding: 0 12px 12px;
          font-size: 14px;
          line-height: 1.45;
          color: #262626;
        }

        .ig-post-caption strong {
          font-weight: 600;
          margin-right: 6px;
        }

        .preview-card-wrap {
          position: relative;
          display: block;
        }

        .preview-card-wrap .card-download {
          position: absolute;
          top: 8px;
          right: 8px;
          z-index: 2;
          padding: 6px 10px;
          font-size: 12px;
          font-weight: 600;
          border: 0;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.92);
          color: var(--ink, #1a1a1a);
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          opacity: 0;
          transition: opacity 0.15s ease;
        }

        .preview-card-wrap:hover .card-download,
        .preview-card-wrap:focus-within .card-download {
          opacity: 1;
        }
      `}</style>

      <div ref={previewRef} className="ig-preview" onClick={onSlideClick}>
        <article className="ig-post" aria-label="Instagram carousel preview">
          <header className="ig-post-header">
            <div className="ig-post-avatar" aria-hidden="true">
              CW
            </div>
            <span className="ig-post-username">creativewaco</span>
          </header>

          <div
            ref={viewportRef}
            className="ig-carousel-viewport"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {slideCount === 0 && !isLoading ? (
              <div className="ig-carousel-empty">
                Click Generate cards to fill the carousel.
              </div>
            ) : null}

            {isLoading ? (
              <div className="ig-carousel-loading" aria-live="polite">
                Building cards…
              </div>
            ) : null}

            {showCarouselUi ? (
              <>
                <button
                  type="button"
                  className="ig-carousel-nav ig-carousel-nav--prev"
                  aria-label="Previous slide"
                  onClick={(event) => {
                    event.stopPropagation();
                    goPrev();
                  }}
                >
                  <ChevronLeft size={18} strokeWidth={2.25} />
                </button>
                <button
                  type="button"
                  className="ig-carousel-nav ig-carousel-nav--next"
                  aria-label="Next slide"
                  onClick={(event) => {
                    event.stopPropagation();
                    goNext();
                  }}
                >
                  <ChevronRight size={18} strokeWidth={2.25} />
                </button>
                <div className="ig-carousel-counter" aria-hidden="true">
                  {activeIndex + 1}/{slideCount}
                </div>
                <div className="ig-carousel-dots" aria-hidden="true">
                  {Array.from({ length: slideCount }, (_, index) => (
                    <span
                      key={index}
                      className={`ig-carousel-dot${index === activeIndex ? " is-active" : ""}`}
                    />
                  ))}
                </div>
              </>
            ) : null}

            <div
              ref={trackRef}
              className="ig-carousel-track"
              style={{ transform: `translateX(-${activeIndex * 100}%)` }}
            />
          </div>

          <div className="ig-post-actions" aria-hidden="true">
            <Heart size={22} strokeWidth={1.75} />
            <MessageCircle size={22} strokeWidth={1.75} />
            <Send size={22} strokeWidth={1.75} />
            <Bookmark size={22} strokeWidth={1.75} />
          </div>

          <p className="ig-post-caption">
            <strong>creativewaco</strong>
            Upcoming arts &amp; culture events in Waco
          </p>
        </article>
      </div>
    </>
  );
}

export function getCardExportPixelRatio(cardEl: HTMLElement) {
  const width = cardEl.offsetWidth || EXPORT_WIDTH;
  return (EXPORT_WIDTH * EXPORT_PIXEL_RATIO) / width;
}
