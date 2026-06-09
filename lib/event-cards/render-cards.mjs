import { escapeHtml, formatCardDateLabel, shortLocationLabel } from "../utils.mjs";
import { CARD_STYLES } from "./card-styles.mjs";
import {
  CREATIVE_WACO_LOGO_URL,
  CULTURALYST_LOGO_URL,
} from "./constants.mjs";

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

function renderOrganizationOrVenue(item) {
  const name = item.organizer || item.venueName;
  const location =
    item.venueLabel ||
    shortLocationLabel(item.venueName || "") ||
    "Waco, TX";
  const logoUrl = item.venueImageUrl || "";
  const culturalystUrl = escapeHtml(CULTURALYST_LOGO_URL);

  const logoHtml = logoUrl
    ? `<div class="cw-ticket__org-logo-wrap">
  <img class="cw-ticket__org-logo" src="${escapeHtml(logoUrl)}" alt="" crossorigin="anonymous" loading="lazy" />
</div>`
    : "";

  const orgMainClass = logoUrl
    ? "cw-ticket__org-main"
    : "cw-ticket__org-main cw-ticket__org-main--no-logo";

  const orgMainHtml =
    name || location
      ? `<div class="${orgMainClass}">
  ${logoHtml}
  <div class="cw-ticket__org-text">
    <p class="cw-ticket__org-location">${escapeHtml(location)}</p>
    <h3 class="cw-ticket__org-name">${escapeHtml(name || location)}</h3>
  </div>
</div>`
      : "";

  const orgClass =
    name || location
      ? "cw-ticket__org"
      : "cw-ticket__org cw-ticket__org--no-org";

  return `<div class="${orgClass}">
  ${orgMainHtml}
  <img class="cw-ticket__culturalyst-logo" src="${culturalystUrl}" alt="Culturalyst" crossorigin="anonymous" loading="lazy" />
</div>`;
}

function renderCard(item) {
  const title = escapeHtml(item.title);
  const category = escapeHtml(item.eventCategory || "Event");
  const imageUrl = escapeHtml(item.imageUrl);
  const cwLogoUrl = escapeHtml(CREATIVE_WACO_LOGO_URL);

  return `
<div class="cw-export-frame" data-card-title="${title}">
  <div class="cw-card-scene">
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
          ${renderOrganizationOrVenue(item)}
        </div>
      </div>
      <div class="cw-card__post-branding">
        <img class="cw-card__creative-waco-logo" src="${cwLogoUrl}" alt="Creative Waco" crossorigin="anonymous" loading="lazy" />
      </div>
    </article>
  </div>
</div>`.trim();
}

export function renderEventCardsHtml(items) {
  if (!items.length) {
    return `<style>${CARD_STYLES}</style><p class="cw-cards-empty">No events with images found.</p>`;
  }

  const cards = items.map((item) => renderCard(item)).join("\n");

  return `<style>${CARD_STYLES}</style>
<div class="cw-cards-wrap">
  <div class="cw-cards-grid">
${cards}
  </div>
</div>`;
}
