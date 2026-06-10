import { escapeHtml, formatCardDateLabel, shortLocationLabel } from "../utils.mjs";
import { CULTURALYST_LOGO_URL } from "./constants.mjs";
import { SLIDESHOW_STYLES } from "./slideshow-styles.mjs";

const CLOCK_ICON = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"></circle>
  <path d="M12 7v5l3 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
</svg>`;

function renderDateTime(item) {
  const label =
    formatCardDateLabel(item.eventDate || item.sortDate) ||
    item.eventDateLabel;
  if (!label) return "";

  return `<p class="cw-slideshow-card__datetime">${CLOCK_ICON}<span>${escapeHtml(label)}</span></p>`;
}

function renderOrganizationOrVenue(item) {
  const name = item.organizer || item.venueName;
  const location =
    item.venueLabel ||
    shortLocationLabel(item.venueName || "") ||
    "Waco, TX";
  const logoUrl = item.venueImageUrl || "";
  const culturalystUrl = escapeHtml(CULTURALYST_LOGO_URL);

  const logoHtml = logoUrl
    ? `<div class="cw-slideshow-card__org-logo-wrap">
  <img class="cw-slideshow-card__org-logo" src="${escapeHtml(logoUrl)}" alt="" crossorigin="anonymous" loading="lazy" />
</div>`
    : "";

  const orgMainClass = logoUrl
    ? "cw-slideshow-card__org-main"
    : "cw-slideshow-card__org-main cw-slideshow-card__org-main--no-logo";

  const orgMainHtml =
    name || location
      ? `<div class="${orgMainClass}">
  ${logoHtml}
  <div class="cw-slideshow-card__org-text">
    <p class="cw-slideshow-card__org-location">${escapeHtml(location)}</p>
    <h3 class="cw-slideshow-card__org-name">${escapeHtml(name || location)}</h3>
  </div>
</div>`
      : "";

  const orgClass =
    name || location
      ? "cw-slideshow-card__org"
      : "cw-slideshow-card__org cw-slideshow-card__org--no-org";

  return `<div class="${orgClass}">
  ${orgMainHtml}
  <img class="cw-slideshow-card__culturalyst-logo" src="${culturalystUrl}" alt="Culturalyst" crossorigin="anonymous" loading="lazy" />
</div>`;
}

function renderSlideshowCard(item) {
  const title = escapeHtml(item.title);
  const category = escapeHtml(item.eventCategory || "Event");
  const imageUrl = escapeHtml(item.imageUrl);

  return `
<div class="cw-slideshow-frame" data-card-title="${title}">
  <article class="cw-slideshow-card">
    <div class="cw-slideshow-card__media">
      <img src="${imageUrl}" alt="" crossorigin="anonymous" loading="lazy" />
    </div>
    <div class="cw-slideshow-card__content">
      <div class="cw-slideshow-card__main">
        <p class="cw-slideshow-card__category">${category}</p>
        <h2 class="cw-slideshow-card__title">${title}</h2>
        ${renderDateTime(item)}
      </div>
      <div class="cw-slideshow-card__divider" aria-hidden="true"></div>
      <div class="cw-slideshow-card__stub">
        ${renderOrganizationOrVenue(item)}
      </div>
    </div>
  </article>
</div>`.trim();
}

export function renderSlideshowHtml(items) {
  if (!items.length) {
    return `<style>${SLIDESHOW_STYLES}</style><p class="cw-cards-empty">No events with images found.</p>`;
  }

  const cards = items.map((item) => renderSlideshowCard(item)).join("\n");

  return `<style>${SLIDESHOW_STYLES}</style>
<div class="cw-slideshow-wrap">
  <div class="cw-slideshow-grid">
${cards}
  </div>
</div>`;
}
