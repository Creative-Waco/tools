"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SLIDESHOW_STYLES } from "@/lib/event-cards/slideshow-styles.mjs";
import {
  SLIDESHOW_EXPORT_HEIGHT,
  SLIDESHOW_EXPORT_WIDTH,
} from "@/lib/event-cards/constants";

const SLIDESHOW_STYLES_ID = "cw-slideshow-styles-v1";

type SlideshowPreviewProps = {
  html: string | null;
  isLoading: boolean;
  previewRef: React.RefObject<HTMLDivElement | null>;
  onSlideClick: (event: React.MouseEvent<HTMLDivElement>) => void;
  activeSlideIndex?: number;
  onActiveSlideIndexChange?: (index: number) => void;
};

function buildSlideMarkup(sceneHtml: string) {
  return `<div class="ss-carousel-slide">
  <div class="preview-card-wrap ss-carousel-slide-inner">
    ${sceneHtml}
    <button type="button" class="card-download">PNG</button>
  </div>
</div>`;
}

function slidesFromHtml(html: string) {
  const temp = document.createElement("div");
  temp.innerHTML = html;
  const frames = [...temp.querySelectorAll(".cw-slideshow-frame")];
  return frames.map((frame) => buildSlideMarkup(frame.outerHTML)).filter(Boolean);
}

function measureCardHeight(frame: HTMLElement, scale: number) {
  const card = frame.querySelector<HTMLElement>(".cw-slideshow-card");
  const source = card ?? frame;
  return source.offsetHeight * scale;
}

type SlideMeasurement = {
  inner: HTMLElement;
  frame: HTMLElement;
  cardHeight: number;
  offsetX: number;
};

function measureSlides(track: HTMLElement) {
  const measurements: SlideMeasurement[] = [];

  track.querySelectorAll<HTMLElement>(".ss-carousel-slide-inner").forEach((inner) => {
    const frame = inner.querySelector<HTMLElement>(".cw-slideshow-frame");
    if (!frame) return;

    const width = inner.clientWidth;
    if (width < 1) return;

    const scale = width / SLIDESHOW_EXPORT_WIDTH;
    const offsetX = (width - SLIDESHOW_EXPORT_WIDTH * scale) / 2;

    frame.style.position = "absolute";
    frame.style.top = "0";
    frame.style.left = `${offsetX}px`;
    frame.style.transform = `scale(${scale})`;
    frame.style.transformOrigin = "top left";

    const cardHeight = measureCardHeight(frame, scale);
    measurements.push({ inner, frame, cardHeight, offsetX });
  });

  return measurements;
}

function applyPreviewScale(track: HTMLElement | null, activeIndex = 0) {
  if (!track) return 280;

  const measurements = measureSlides(track);
  if (!measurements.length) return 280;

  const activeMeasurement = measurements[activeIndex] ?? measurements[0];
  const viewportHeight = Math.max(280, activeMeasurement.cardHeight);

  measurements.forEach(({ inner, frame, cardHeight, offsetX }) => {
    const offsetY = Math.max(0, (viewportHeight - cardHeight) / 2);

    frame.style.left = `${offsetX}px`;
    frame.style.top = `${offsetY}px`;
    inner.style.height = `${viewportHeight}px`;
    inner.style.overflow = "visible";
  });

  return viewportHeight;
}

export function SlideshowPreview({
  html,
  isLoading,
  previewRef,
  onSlideClick,
  activeSlideIndex,
  onActiveSlideIndexChange,
}: SlideshowPreviewProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [slideCount, setSlideCount] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  const syncPreview = useCallback(
    (track = trackRef.current) => {
      if (!track) return;

      const updateViewportHeight = () => {
        const viewportHeight = applyPreviewScale(track, activeIndex);
        const viewport = viewportRef.current;
        if (viewport) {
          viewport.style.height = `${viewportHeight}px`;
        }
      };

      updateViewportHeight();
      requestAnimationFrame(() => {
        updateViewportHeight();
        requestAnimationFrame(updateViewportHeight);
      });
    },
    [activeIndex],
  );

  useEffect(() => {
    let style = document.getElementById(SLIDESHOW_STYLES_ID);
    if (!style) {
      style = document.createElement("style");
      style.id = SLIDESHOW_STYLES_ID;
      document.head.appendChild(style);
    }
    style.textContent = SLIDESHOW_STYLES;
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
      const viewportHeight = applyPreviewScale(track, 0);
      const viewport = viewportRef.current;
      if (viewport) {
        viewport.style.height = `${viewportHeight}px`;
      }
    };
    syncInitial();
    requestAnimationFrame(syncInitial);

    const resizeObserver = new ResizeObserver(() => {
      syncInitial();
    });
    track.querySelectorAll(".ss-carousel-slide-inner").forEach((inner) => {
      resizeObserver.observe(inner);
    });

    track.querySelectorAll("img").forEach((img) => {
      img.loading = "eager";
      if (img.complete) return;
      img.addEventListener("load", syncInitial, { once: true });
      img.addEventListener("error", syncInitial, { once: true });
    });

    return () => {
      resizeObserver.disconnect();
    };
  }, [html]);

  useEffect(() => {
    const onResize = () => syncPreview();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [syncPreview]);

  useEffect(() => {
    syncPreview();
  }, [activeIndex, slideCount, syncPreview]);

  const goTo = useCallback(
    (index: number) => {
      if (slideCount === 0) return;
      const nextIndex = ((index % slideCount) + slideCount) % slideCount;
      setActiveIndex(nextIndex);
      onActiveSlideIndexChange?.(nextIndex);
      requestAnimationFrame(() => syncPreview(trackRef.current));
    },
    [slideCount, syncPreview, onActiveSlideIndexChange],
  );

  useEffect(() => {
    if (activeSlideIndex === undefined || slideCount === 0) return;
    if (activeSlideIndex !== activeIndex) {
      setActiveIndex(((activeSlideIndex % slideCount) + slideCount) % slideCount);
      requestAnimationFrame(() => syncPreview(trackRef.current));
    }
  }, [activeSlideIndex, slideCount, activeIndex, syncPreview]);

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
        .ss-preview {
          display: flex;
          justify-content: center;
          padding: 20px 12px 24px;
          background: #1a1d24;
          border: 1px solid var(--line, #d8d0c4);
          border-radius: 10px;
          min-height: 220px;
        }

        .ss-display {
          width: 100%;
          max-width: 960px;
        }

        .ss-display-label {
          margin: 0 0 10px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.55);
        }

        .ss-carousel-viewport {
          position: relative;
          display: flex;
          background: transparent;
          border-radius: 8px;
          overflow: hidden;
          touch-action: pan-y;
          min-height: 0;
          transition: height 0.2s ease;
        }

        .ss-carousel-viewport.is-empty {
          background: #eef0f3;
          min-height: 220px;
        }

        .ss-carousel-track {
          display: flex;
          align-items: stretch;
          width: 100%;
          min-height: 100%;
          transition: transform 0.28s ease-out;
          will-change: transform;
        }

        .ss-carousel-slide {
          flex: 0 0 100%;
          min-width: 0;
          align-self: stretch;
        }

        .ss-carousel-slide-inner {
          position: relative;
          width: 100%;
          box-sizing: border-box;
          overflow: visible;
        }

        .ss-carousel-slide-inner .cw-slideshow-frame {
          width: 1920px;
          height: auto;
          margin: 0;
          box-sizing: border-box;
          transform-origin: top left;
        }

        .ss-carousel-empty,
        .ss-carousel-loading {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          text-align: center;
          font-size: 15px;
          line-height: 1.45;
          font-weight: 600;
          pointer-events: none;
          z-index: 1;
        }

        .ss-carousel-empty {
          color: #3d4654;
        }

        .ss-carousel-loading {
          background: rgba(0, 0, 0, 0.35);
          color: #ffffff;
          z-index: 4;
        }

        .ss-carousel-nav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          z-index: 3;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border: 0;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.92);
          color: #262626;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          opacity: 0;
          transition: opacity 0.15s ease;
        }

        .ss-carousel-viewport:hover .ss-carousel-nav,
        .ss-carousel-viewport:focus-within .ss-carousel-nav {
          opacity: 1;
        }

        .ss-carousel-nav--prev {
          left: 12px;
        }

        .ss-carousel-nav--next {
          right: 12px;
        }

        .ss-carousel-dots {
          display: flex;
          justify-content: center;
          gap: 6px;
          margin-top: 12px;
          pointer-events: none;
        }

        .ss-carousel-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.35);
          transition: transform 0.15s ease, background-color 0.15s ease;
        }

        .ss-carousel-dot.is-active {
          background: rgba(255, 255, 255, 0.9);
          transform: scale(1.15);
        }

        .ss-carousel-counter {
          position: absolute;
          top: 12px;
          right: 12px;
          z-index: 2;
          padding: 5px 10px;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.55);
          color: #ffffff;
          font-size: 12px;
          font-weight: 600;
          line-height: 1;
          pointer-events: none;
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

        .ss-carousel-viewport.has-carousel-ui .preview-card-wrap .card-download {
          top: auto;
          bottom: 8px;
        }
      `}</style>

      <div ref={previewRef} className="ss-preview" onClick={onSlideClick}>
        <div className="ss-display" aria-label="Display slideshow preview">
          <p className="ss-display-label">Landscape card preview</p>

          <div
            ref={viewportRef}
            className={`ss-carousel-viewport${slideCount === 0 ? " is-empty" : ""}${showCarouselUi ? " has-carousel-ui" : ""}`}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {slideCount === 0 && !isLoading ? (
              <div className="ss-carousel-empty">
                Click Generate cards to fill the slideshow.
              </div>
            ) : null}

            {isLoading ? (
              <div className="ss-carousel-loading" aria-live="polite">
                Building slides…
              </div>
            ) : null}

            {showCarouselUi ? (
              <>
                <button
                  type="button"
                  className="ss-carousel-nav ss-carousel-nav--prev"
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
                  className="ss-carousel-nav ss-carousel-nav--next"
                  aria-label="Next slide"
                  onClick={(event) => {
                    event.stopPropagation();
                    goNext();
                  }}
                >
                  <ChevronRight size={18} strokeWidth={2.25} />
                </button>
                <div className="ss-carousel-counter" aria-hidden="true">
                  {activeIndex + 1}/{slideCount}
                </div>
              </>
            ) : null}

            <div
              ref={trackRef}
              className="ss-carousel-track"
              style={{ transform: `translateX(-${activeIndex * 100}%)` }}
            />
          </div>

          {showCarouselUi ? (
            <div className="ss-carousel-dots" aria-hidden="true">
              {Array.from({ length: slideCount }, (_, index) => (
                <span
                  key={index}
                  className={`ss-carousel-dot${index === activeIndex ? " is-active" : ""}`}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
