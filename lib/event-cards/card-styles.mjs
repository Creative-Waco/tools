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
.cw-card-scene {
  position: relative;
  box-sizing: border-box;
  padding: 28px 22px 32px;
  overflow: hidden;
  isolation: isolate;
}
.cw-card-backdrop {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}
.cw-card-backdrop img {
  position: absolute;
  inset: -12%;
  width: 124%;
  height: 124%;
  object-fit: cover;
  filter: blur(40px) saturate(1.15);
}
.cw-card-backdrop::after {
  content: "";
  position: absolute;
  inset: 0;
  background: rgba(8, 10, 18, 0.22);
}
.cw-card {
  position: relative;
  z-index: 1;
  width: 100%;
  box-sizing: border-box;
}
.cw-ticket {
  --ticket-radius: 32px;
  --ticket-notch-radius: 24px;
  --ticket-divider-y: 0px;

  position: relative;
  box-sizing: border-box;
  width: 100%;
  background: #ffffff;
  border-radius: var(--ticket-radius);
  overflow: hidden;
  filter:
    drop-shadow(0 24px 60px rgba(15, 23, 42, 0.22))
    drop-shadow(0 6px 16px rgba(15, 23, 42, 0.12));

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
  padding: 28px 28px 22px;
}
.cw-ticket__divider {
  position: relative;
  height: 0;
  margin: 0 var(--ticket-notch-radius);
  border-top: 1.5px dashed rgba(15, 23, 42, 0.18);
  z-index: 2;
}
.cw-ticket__stub {
  position: relative;
  padding: 16px 28px 28px;
}
.cw-card__media {
  position: relative;
  border-radius: 22px;
  overflow: hidden;
  box-shadow:
    0 14px 32px rgba(15, 23, 42, 0.2),
    0 0 0 4px rgba(255, 255, 255, 0.88);
  background: #f2f2f7;
}
.cw-card__media img {
  display: block;
  width: 100%;
  height: auto;
  vertical-align: top;
}
.cw-card__body {
  display: flex;
  flex-direction: column;
  margin-top: 24px;
  padding-top: 4px;
}
.cw-card__category {
  margin: 0 0 10px;
  font-size: 12px;
  line-height: 1.2;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #8e8e93;
}
.cw-card__title {
  margin: 0 0 14px;
  font-size: 23px;
  line-height: 1.22;
  font-weight: 700;
  letter-spacing: -0.025em;
  color: #111111;
}
.cw-card__datetime {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 14px;
  line-height: 1.3;
  font-weight: 600;
  color: #007aff;
}
.cw-card__datetime svg {
  flex: 0 0 auto;
  width: 15px;
  height: 15px;
}
.cw-card__venue {
  display: flex;
  align-items: center;
  gap: 14px;
}
.cw-card__venue-thumb {
  flex: 0 0 auto;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  overflow: hidden;
  background: #f2f2f7;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.9);
}
.cw-card__venue-thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.cw-card__venue-text {
  min-width: 0;
}
.cw-card__venue-label {
  margin: 0 0 4px;
  font-size: 12px;
  line-height: 1.2;
  color: #8e8e93;
}
.cw-card__venue-name {
  margin: 0;
  font-size: 16px;
  line-height: 1.3;
  font-weight: 700;
  color: #111111;
}
`;
