import { toPng } from "html-to-image";
import JSZip from "jszip";
import { syncTicketLayout } from "@/lib/event-cards/sync-ticket-divider";

export type ExportFormat = "instagram" | "slideshow";

type ExportConfig = {
  exportWidth: number;
  exportHeight: number;
};

function dataUrlToBlob(dataUrl: string) {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/png";
  const bytes = atob(base64);
  const buffer = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i += 1) {
    buffer[i] = bytes.charCodeAt(i);
  }
  return new Blob([buffer], { type: mime });
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

export function slugifyExportName(text: string) {
  return (
    String(text || "event-card")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "event-card"
  );
}

export function uniquePngFilenames(titles: string[]) {
  const counts = new Map<string, number>();

  return titles.map((title) => {
    const base = slugifyExportName(title);
    const seen = counts.get(base) ?? 0;
    counts.set(base, seen + 1);
    return seen === 0 ? `${base}.png` : `${base}-${seen + 1}.png`;
  });
}

export type CardItemMeta = {
  title: string;
  imageUrl: string;
};

export function parseCardTitlesFromHtml(html: string, frameSelector: string) {
  return parseCardItemsFromHtml(html, frameSelector).map((item) => item.title);
}

export function parseCardItemsFromHtml(html: string, frameSelector: string) {
  const temp = document.createElement("div");
  temp.innerHTML = html;
  return [...temp.querySelectorAll<HTMLElement>(frameSelector)].map(
    (frame, index) => ({
      title: frame.dataset.cardTitle || `Card ${index + 1}`,
      imageUrl:
        frame.querySelector<HTMLImageElement>(
          ".cw-card__media img, .cw-slideshow-card__media img",
        )?.getAttribute("src") ?? "",
    }),
  );
}

export function formatSelectionSummary(selected: Set<number>, total: number) {
  if (total === 0 || selected.size === 0) return "None";
  if (selected.size === total) return `1–${total}`;

  const sorted = [...selected].sort((a, b) => a - b);
  const contiguous = sorted.every(
    (value, index) => index === 0 || value === sorted[index - 1] + 1,
  );

  if (contiguous) {
    return `${sorted[0] + 1}–${sorted[sorted.length - 1] + 1}`;
  }

  return `${selected.size} selected`;
}

export async function cardElementToPngBlob(
  cardEl: HTMLElement,
  format: ExportFormat,
  config: ExportConfig,
) {
  const previewStyles = {
    position: cardEl.style.position,
    top: cardEl.style.top,
    left: cardEl.style.left,
    transform: cardEl.style.transform,
  };

  try {
    if (format === "instagram") {
      syncTicketLayout(cardEl);
    }
    cardEl.style.position = "relative";
    cardEl.style.top = "0";
    cardEl.style.left = "0";
    cardEl.style.transform = "none";

    const exportHeight =
      format === "slideshow"
        ? Math.max(cardEl.offsetHeight, 1)
        : config.exportHeight;

    const dataUrl = await toPng(cardEl, {
      pixelRatio: 1,
      width: config.exportWidth,
      height: exportHeight,
      cacheBust: true,
      ...(format === "instagram" ? { backgroundColor: "#111318" } : {}),
    });

    return dataUrlToBlob(dataUrl);
  } finally {
    cardEl.style.position = previewStyles.position;
    cardEl.style.top = previewStyles.top;
    cardEl.style.left = previewStyles.left;
    cardEl.style.transform = previewStyles.transform;
  }
}

export async function downloadCardElements(
  cards: HTMLElement[],
  titles: string[],
  format: ExportFormat,
  config: ExportConfig,
  zipBasename: string,
) {
  if (cards.length === 0) {
    throw new Error("No cards selected.");
  }

  const filenames = uniquePngFilenames(titles);
  const blobs = await Promise.all(
    cards.map((card) => cardElementToPngBlob(card, format, config)),
  );

  if (blobs.length === 1) {
    triggerDownload(blobs[0], filenames[0]);
    return { count: 1, mode: "single" as const, filename: filenames[0] };
  }

  const zip = new JSZip();
  blobs.forEach((blob, index) => {
    zip.file(filenames[index], blob);
  });

  const zipBlob = await zip.generateAsync({ type: "blob" });
  const zipName = `${slugifyExportName(zipBasename)}-cards.zip`;
  triggerDownload(zipBlob, zipName);

  return { count: blobs.length, mode: "zip" as const, filename: zipName };
}
