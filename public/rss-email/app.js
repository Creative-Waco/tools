const form = document.getElementById("generator-form");
const statusEl = document.getElementById("status");
const previewEl = document.getElementById("preview");
const htmlOutputEl = document.getElementById("html-output");
const copyBtn = document.getElementById("copy-html");
const generateBtn = document.getElementById("generate-btn");
const colorInput = document.getElementById("primary-color");
const colorSwatches = document.querySelectorAll(".color-swatch");

function setActiveSwatch(color) {
  colorSwatches.forEach((swatch) => {
    swatch.classList.toggle(
      "is-active",
      swatch.dataset.color?.toLowerCase() === color.toLowerCase(),
    );
  });
}

colorSwatches.forEach((swatch) => {
  swatch.addEventListener("click", () => {
    const color = swatch.dataset.color;
    if (!color) return;
    colorInput.value = color;
    setActiveSwatch(color);
  });
});

colorInput.addEventListener("input", () => {
  setActiveSwatch(colorInput.value);
});

function setStatus(message, type = "") {
  statusEl.textContent = message;
  statusEl.className = `status${type ? ` ${type}` : ""}`;
}

function readOptions() {
  const data = new FormData(form);
  return {
    feedUrl: String(data.get("feedUrl") || "").trim(),
    limit: Number(data.get("limit") || 8),
    sort: String(data.get("sort") || "date-asc"),
    layout: String(data.get("layout") || "horizontal-right"),
    upcomingOnly: data.get("upcomingOnly") === "on",
    enrich: data.get("enrich") === "on",
    includeImages: data.get("includeImages") === "on",
    fromDate: String(data.get("fromDate") || ""),
    learnLabel: String(data.get("learnLabel") || "Learn more"),
    websiteLabel: String(data.get("websiteLabel") || "Event website"),
    primaryColor: String(data.get("primaryColor") || "#1a1a1a"),
  };
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const options = readOptions();

  generateBtn.disabled = true;
  copyBtn.disabled = true;
  setStatus("Fetching feed and building HTML…");

  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Generation failed.");
    }

    htmlOutputEl.value = payload.html;
    previewEl.innerHTML = payload.html;
    previewEl.classList.add("preview-card--email");
    previewEl.style.maxWidth = "";
    previewEl.style.width = "100%";
    copyBtn.disabled = false;

    setStatus(
      `Generated ${payload.itemCount} item${payload.itemCount === 1 ? "" : "s"} from ${payload.feedTitle || "feed"}.`,
      "success",
    );
  } catch (error) {
    previewEl.innerHTML =
      '<p class="placeholder">Something went wrong. Check the feed URL and try again.</p>';
    htmlOutputEl.value = "";
    setStatus(error.message, "error");
  } finally {
    generateBtn.disabled = false;
  }
});

copyBtn.addEventListener("click", async () => {
  if (!htmlOutputEl.value) return;
  await navigator.clipboard.writeText(htmlOutputEl.value);
  setStatus("HTML copied to clipboard.", "success");
});
