import { escapeHtml } from "../utils.mjs";

const CARD_STYLES = `
.cw-cards-wrap {
  font-family: "Helvetica Neue", Arial, sans-serif;
}
.cw-cards-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: flex-start;
}
.cw-card {
  display: flex;
  flex-direction: column;
  background: #1a1a1a;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(26, 26, 26, 0.12);
}
.cw-card__media {
  flex: 1 1 auto;
  min-height: 0;
  position: relative;
  background: #2a2a2a;
}
.cw-card__media img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  vertical-align: middle;
}
.cw-card__title {
  flex: 0 0 auto;
  padding: 16px 18px 18px;
  background: #ffffff;
}
.cw-card__title h2 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  line-height: 1.3;
  color: #1a1a1a;
  letter-spacing: -0.01em;
}
`;

function renderCard(item, cardWidth) {
  const height = Math.round((cardWidth * 5) / 4);
  const title = escapeHtml(item.title);

  return `
<article class="cw-card" style="width:${cardWidth}px;height:${height}px;" data-card-title="${title}">
  <div class="cw-card__media">
    <img src="${escapeHtml(item.imageUrl)}" alt="" crossorigin="anonymous" loading="lazy" />
  </div>
  <div class="cw-card__title">
    <h2>${title}</h2>
  </div>
</article>`.trim();
}

export function renderEventCardsHtml(items, { cardWidth = 360 }) {
  const width = Math.min(Math.max(Number(cardWidth) || 360, 240), 600);

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
