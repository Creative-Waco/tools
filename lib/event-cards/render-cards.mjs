import { escapeHtml, formatCardDateLabel } from "../utils.mjs";
import { CARD_STYLES } from "./card-styles.mjs";
import { INSTAGRAM_CARD_WIDTH } from "./constants.mjs";

const CLOCK_ICON = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"></circle>
  <path d="M12 7v5l3 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
</svg>`;

function renderDateTime(item) {
  const label =
    formatCardDateLabel(item.eventDate || item.sortDate) ||
    item.eventDateLabel;
  if (!label) return "";

  return `<p class="cw-card__datetime">${CLOCK_ICON}<span>${escapeHtml(label)}</span></p>`;
}

function renderVenue(item) {
  const name = item.venueName || item.organizer;
  const label = item.venueLabel || "Waco, TX";
  const thumb = item.venueImageUrl || item.imageUrl;

  if (!name && !label) return "";

  const thumbHtml = thumb
    ? `<img src="${escapeHtml(thumb)}" alt="" crossorigin="anonymous" loading="lazy" />`
    : "";

  return `<div class="cw-card__venue">
  <div class="cw-card__venue-thumb">${thumbHtml}</div>
  <div class="cw-card__venue-text">
    <p class="cw-card__venue-label">${escapeHtml(label)}</p>
    <p class="cw-card__venue-name">${escapeHtml(name)}</p>
  </div>
</div>`;
}

function renderCard(item, cardWidth) {
  const title = escapeHtml(item.title);
  const category = escapeHtml(item.eventCategory || "Event");
  const imageUrl = escapeHtml(item.imageUrl);

  return `
<div class="cw-card-scene" style="width:${cardWidth}px;" data-card-title="${title}">
  <div class="cw-card-backdrop" aria-hidden="true">
    <img src="${imageUrl}" alt="" crossorigin="anonymous" loading="lazy" />
  </div>
  <article class="cw-card">
    <div class="cw-ticket">
      <div class="cw-ticket__main">
        <div class="cw-card__media">
          <img src="${imageUrl}" alt="" crossorigin="anonymous" loading="lazy" />
        </div>
        <div class="cw-card__body">
          <p class="cw-card__category">${category}</p>
          <h2 class="cw-card__title">${title}</h2>
          ${renderDateTime(item)}
        </div>
      </div>
      <div class="cw-ticket__divider" aria-hidden="true"></div>
      <div class="cw-ticket__stub">
        ${renderVenue(item)}
      </div>
    </div>
  </article>
</div>`.trim();
}

export function renderEventCardsHtml(items) {
  const width = INSTAGRAM_CARD_WIDTH;

  if (!items.length) {
    return `<style>${CARD_STYLES}</style><p class="cw-cards-empty">No events with images found.</p>`;
  }

  const cards = items.map((item) => renderCard(item, width)).join("\n");

  return `<style>${CARD_STYLES}</style>
<div class="cw-cards-wrap">
  <div class="cw-cards-grid">
${cards}
  </div>
</div>`;
}
