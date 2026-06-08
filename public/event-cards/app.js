import { toPng } from "https://esm.sh/html-to-image@1.11.13";

const form = document.getElementById("cards-form");
const statusEl = document.getElementById("status");
const previewEl = document.getElementById("preview");
const copyBtn = document.getElementById("copy-html");
const downloadAllBtn = document.getElementById("download-all");
const generateBtn = document.getElementById("generate-btn");

let lastHtml = "";

function setStatus(message, type = "") {
  statusEl.textContent = message;
  statusEl.className = `status${type ? ` ${type}` : ""}`;
}

function slugify(text) {
  return (
    String(text || "event-card")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "event-card"
  );
}

function readOptions() {
  const data = new FormData(form);
  return {
    feedUrl: String(data.get("feedUrl") || "").trim(),
    limit: Number(data.get("limit") || 8),
    sort: String(data.get("sort") || "date-asc"),
    cardWidth: Number(data.get("cardWidth") || 360),
    upcomingOnly: data.get("upcomingOnly") === "on",
    enrich: data.get("enrich") === "on",
  };
}

function wrapCardsForPreview(html) {
  const temp = document.createElement("div");
  temp.innerHTML = html;
  const cards = temp.querySelectorAll(".cw-card");

  cards.forEach((card) => {
    const wrap = document.createElement("div");
    wrap.className = "preview-card-wrap";
    card.parentNode.insertBefore(wrap, card);
    wrap.appendChild(card);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "card-download";
    btn.textContent = "PNG";
    btn.addEventListener("click", () => downloadCard(card));
    wrap.appendChild(btn);
  });

  return temp.innerHTML;
}

async function downloadCard(cardEl) {
  const title = cardEl.dataset.cardTitle || "event-card";
  setStatus(`Downloading ${title}…`);

  try {
    const dataUrl = await toPng(cardEl, {
      pixelRatio: 2,
      cacheBust: true,
    });
    const link = document.createElement("a");
    link.download = `${slugify(title)}.png`;
    link.href = dataUrl;
    link.click();
    setStatus(`Saved ${slugify(title)}.png`, "success");
  } catch (error) {
    setStatus(
      `PNG export failed (image CORS may block this browser). Try a screenshot or copy HTML. ${error.message}`,
      "error",
    );
  }
}

async function downloadAllCards() {
  const cards = previewEl.querySelectorAll(".cw-card");
  if (!cards.length) return;

  downloadAllBtn.disabled = true;
  let ok = 0;

  for (const card of cards) {
    try {
      await downloadCard(card);
      ok += 1;
      await new Promise((r) => setTimeout(r, 400));
    } catch {
      // downloadCard already sets status
    }
  }

  downloadAllBtn.disabled = false;
  if (ok === cards.length) {
    setStatus(`Downloaded ${ok} PNG${ok === 1 ? "" : "s"}.`, "success");
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const options = readOptions();

  generateBtn.disabled = true;
  copyBtn.disabled = true;
  downloadAllBtn.disabled = true;
  setStatus("Fetching feed and building cards…");

  try {
    const response = await fetch("/api/event-cards/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Generation failed.");
    }

    lastHtml = payload.html;
    previewEl.innerHTML = wrapCardsForPreview(payload.html);
    copyBtn.disabled = !payload.itemCount;
    downloadAllBtn.disabled = !payload.itemCount;

    let message = `Generated ${payload.itemCount} card${payload.itemCount === 1 ? "" : "s"} from ${payload.feedTitle || "feed"}.`;
    if (payload.skippedNoImage > 0) {
      message += ` Skipped ${payload.skippedNoImage} without an image.`;
    }
    setStatus(message, "success");
  } catch (error) {
    previewEl.innerHTML =
      '<p class="placeholder">Something went wrong. Check the feed URL and try again.</p>';
    lastHtml = "";
    setStatus(error.message, "error");
  } finally {
    generateBtn.disabled = false;
  }
});

copyBtn.addEventListener("click", async () => {
  if (!lastHtml) return;
  await navigator.clipboard.writeText(lastHtml);
  setStatus("HTML copied to clipboard.", "success");
});

downloadAllBtn.addEventListener("click", downloadAllCards);
