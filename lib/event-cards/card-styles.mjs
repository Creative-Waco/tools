export const CARD_STYLES = `
.cw-cards-wrap {
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
}
.cw-cards-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 28px;
  align-items: flex-start;
}
.cw-export-frame {
  width: 1080px;
  height: 1350px;
  position: relative;
  overflow: hidden;
  background: #111318;
  box-sizing: border-box;
}
.cw-card-scene {
  position: relative;
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  box-sizing: border-box;
  padding: 46px 50px 76px;
  overflow: hidden;
  isolation: isolate;
}
.cw-export-frame--tight-scene .cw-card-scene {
  padding: 40px 46px 68px;
}
.cw-export-frame--compact-scene .cw-card-scene {
  padding: 34px 42px 60px;
}
.cw-card-backdrop {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
  background: #111318;
}
.cw-card-backdrop img {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 140%;
  height: 140%;
  max-width: none;
  max-height: none;
  object-fit: cover;
  filter: blur(48px) saturate(1.18);
  transform: translate(-50%, -50%) scale(1.08);
  transform-origin: center;
}
.cw-card-backdrop::after {
  content: "";
  position: absolute;
  inset: -2px;
  background: rgba(12, 16, 26, 0.34);
  pointer-events: none;
}
.cw-card {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: min(100%, 920px);
  margin: 0 auto;
  box-sizing: border-box;
}
.cw-ticket {
  --ticket-radius: 32px;
  --ticket-notch-radius: 23px;
  --ticket-divider-y: 0px;

  position: relative;
  box-sizing: border-box;
  width: 100%;
  align-self: stretch;
  margin: 0 auto;
  background: linear-gradient(180deg, #ffffff 0%, #ffffff 66%, #fbfbfc 100%);
  border-radius: var(--ticket-radius);
  overflow: hidden;
  filter:
    drop-shadow(0 30px 70px rgba(15, 23, 42, 0.25))
    drop-shadow(0 10px 26px rgba(15, 23, 42, 0.14));

  -webkit-mask:
    radial-gradient(
      circle var(--ticket-notch-radius) at left var(--ticket-divider-y),
      transparent 98%,
      #000 100%
    ),
    radial-gradient(
      circle var(--ticket-notch-radius) at right var(--ticket-divider-y),
      transparent 98%,
      #000 100%
    ),
    linear-gradient(#000 0 0);

  -webkit-mask-composite: xor;

  mask:
    radial-gradient(
      circle var(--ticket-notch-radius) at left var(--ticket-divider-y),
      transparent 98%,
      #000 100%
    ),
    radial-gradient(
      circle var(--ticket-notch-radius) at right var(--ticket-divider-y),
      transparent 98%,
      #000 100%
    ),
    linear-gradient(#000 0 0);

  mask-composite: exclude;
}
.cw-ticket__main {
  position: relative;
  padding: 38px 42px 34px;
}
.cw-card__media {
  width: 100%;
  overflow: hidden;
  border-radius: 22px;
  background: #e5e7eb;
  box-shadow:
    0 18px 42px rgba(15, 23, 42, 0.10),
    0 1px 0 rgba(15, 23, 42, 0.06);
}
.cw-card__media img {
  display: block;
  width: 100%;
  height: auto;
  object-fit: contain;
}
.cw-card__body {
  padding-top: 36px;
}
.cw-card__category {
  margin: 0 0 18px;
  color: rgba(15, 23, 42, 0.48);
  font-size: 18px;
  line-height: 1.15;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.cw-card__title {
  margin: 0 0 26px;
  color: #0f1219;
  font-size: clamp(58px, 7.2vw, 76px);
  line-height: 1.08;
  font-weight: 900;
  letter-spacing: -0.02em;
  overflow: visible;
  word-break: break-word;
}
.cw-card__datetime {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  width: fit-content;
  max-width: 100%;
  margin: 0;
  color: rgba(15, 23, 42, 0.78);
  background: rgba(15, 23, 42, 0.055);
  border-radius: 999px;
  padding: 10px 14px;
  font-size: 25px;
  line-height: 1.15;
  font-weight: 800;
  white-space: normal;
  overflow: visible;
  text-overflow: unset;
}
.cw-card__datetime svg {
  width: 20px;
  height: 20px;
  color: rgba(15, 23, 42, 0.5);
  stroke: currentColor;
  flex: 0 0 auto;
}
.cw-card__datetime span {
  min-width: 0;
  overflow: visible;
  text-overflow: unset;
  word-break: break-word;
}
.cw-ticket__divider {
  position: relative;
  height: 0;
  margin: 0 var(--ticket-notch-radius);
  border-top: 1.5px dashed rgba(15, 23, 42, 0.12);
  z-index: 2;
}
.cw-ticket__stub {
  position: relative;
  padding: 30px 42px 34px;
  background: transparent;
}
.cw-ticket__org {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 28px;
  align-items: center;
}
.cw-ticket__org--no-org {
  grid-template-columns: 1fr;
  justify-items: end;
}
.cw-ticket__org-main {
  display: grid;
  grid-template-columns: 78px 1fr;
  gap: 20px;
  align-items: center;
  min-width: 0;
}
.cw-ticket__org-main--no-logo {
  grid-template-columns: 1fr;
}
.cw-ticket__org-logo-wrap {
  width: 78px;
  height: 78px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(15, 23, 42, 0.06);
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.08);
}
.cw-ticket__org-logo {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.cw-ticket__org-location {
  margin: 0 0 7px;
  color: rgba(15, 23, 42, 0.44);
  font-size: 22px;
  line-height: 1.15;
  font-weight: 600;
  overflow: visible;
  word-break: break-word;
}
.cw-ticket__org-name {
  margin: 0;
  color: #111318;
  font-size: 34px;
  line-height: 1.08;
  font-weight: 800;
  letter-spacing: -0.04em;
  overflow: visible;
  word-break: break-word;
}
.cw-ticket__culturalyst-logo {
  justify-self: end;
  display: block;
  width: 150px;
  max-width: 150px;
  max-height: 68px;
  object-fit: contain;
  object-position: right center;
  margin: 0;
  padding: 0;
  opacity: 0.72;
  filter: grayscale(1) brightness(0.5);
}
.cw-card__post-branding {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  padding: 22px 0 0;
  background: transparent;
}
.cw-card__creative-waco-logo {
  display: block;
  width: 200px;
  max-width: 200px;
  height: 64px;
  object-fit: contain;
  object-position: center;
  margin: 0 auto;
  padding: 0;
}
.cw-ticket--compact .cw-ticket__main {
  padding: 34px 38px 30px;
}
.cw-ticket--compact .cw-card__body {
  padding-top: 32px;
}
.cw-ticket--compact .cw-card__title {
  margin-bottom: 24px;
  font-size: clamp(52px, 6.6vw, 68px);
  letter-spacing: -0.025em;
}
.cw-ticket--compact .cw-ticket__stub {
  padding: 26px 38px 30px;
}
.cw-ticket--tight .cw-ticket__main {
  padding: 30px 34px 26px;
}
.cw-ticket--compact .cw-card__category,
.cw-ticket--tight .cw-card__category {
  font-size: 17px;
}
.cw-ticket--tight .cw-card__body {
  padding-top: 28px;
}
.cw-ticket--tight .cw-card__title {
  margin-bottom: 22px;
  font-size: clamp(48px, 6vw, 62px);
  letter-spacing: -0.03em;
}
.cw-ticket--tight .cw-card__datetime {
  font-size: 23px;
  padding: 9px 13px;
}
.cw-ticket--tight .cw-ticket__stub {
  padding: 24px 34px 28px;
}
.cw-ticket--tight .cw-ticket__org-name {
  font-size: 30px;
}
.cw-ticket--tight .cw-ticket__org-logo-wrap {
  width: 70px;
  height: 70px;
}
.cw-ticket--tight .cw-ticket__org-main {
  grid-template-columns: 70px 1fr;
}
`;
