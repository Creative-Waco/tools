export const SLIDESHOW_STYLES = `
.cw-slideshow-wrap {
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
}
.cw-slideshow-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 28px;
  align-items: flex-start;
}
.cw-slideshow-frame {
  width: 1920px;
  height: auto;
  position: relative;
  overflow: visible;
  background: transparent;
  box-sizing: border-box;
}
.cw-slideshow-card {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  width: 100%;
  background: linear-gradient(180deg, #ffffff 0%, #ffffff 72%, #fbfbfc 100%);
  border-radius: 28px;
  overflow: hidden;
}
.cw-slideshow-card__media {
  flex: 0 0 42%;
  max-width: 42%;
  min-width: 42%;
  display: flex;
  align-items: center;
  justify-content: center;
  align-self: stretch;
  padding: 32px;
  background: #ffffff;
  box-sizing: border-box;
}
.cw-slideshow-card__media img {
  display: block;
  width: 100%;
  max-width: 100%;
  height: auto;
  border-radius: 24px;
}
.cw-slideshow-card__content {
  flex: 1 1 58%;
  display: flex;
  flex-direction: column;
  min-width: 0;
  justify-content: center;
}
.cw-slideshow-card__main {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 56px 60px 44px;
  min-width: 0;
}
.cw-slideshow-card__category {
  margin: 0 0 20px;
  color: rgba(15, 23, 42, 0.48);
  font-size: 36px;
  line-height: 1.15;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.cw-slideshow-card__title {
  margin: 0 0 32px;
  color: #0f1219;
  font-size: 88px;
  line-height: 1.04;
  font-weight: 900;
  letter-spacing: -0.02em;
  overflow: visible;
  word-break: break-word;
}
.cw-slideshow-card__datetime {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  width: fit-content;
  max-width: 100%;
  margin: 0;
  color: rgba(15, 23, 42, 0.78);
  background: rgba(15, 23, 42, 0.055);
  border-radius: 999px;
  padding: 18px 28px;
  font-size: 48px;
  line-height: 1.15;
  font-weight: 800;
  white-space: normal;
}
.cw-slideshow-card__datetime svg {
  width: 36px;
  height: 36px;
  color: rgba(15, 23, 42, 0.5);
  stroke: currentColor;
  flex: 0 0 auto;
}
.cw-slideshow-card__datetime span {
  min-width: 0;
  word-break: break-word;
}
.cw-slideshow-card__divider {
  height: 0;
  margin: 0 40px;
  border-top: 1.5px dashed rgba(15, 23, 42, 0.12);
  flex-shrink: 0;
}
.cw-slideshow-card__stub {
  padding: 36px 60px 44px;
  flex-shrink: 0;
}
.cw-slideshow-card__org {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 28px;
  align-items: center;
}
.cw-slideshow-card__org--no-org {
  grid-template-columns: 1fr;
  justify-items: end;
}
.cw-slideshow-card__org-main {
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: 22px;
  align-items: center;
  min-width: 0;
}
.cw-slideshow-card__org-main--no-logo {
  grid-template-columns: 1fr;
}
.cw-slideshow-card__org-logo-wrap {
  width: 96px;
  height: 96px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(15, 23, 42, 0.06);
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.08);
}
.cw-slideshow-card__org-logo {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.cw-slideshow-card__org-location {
  margin: 0 0 8px;
  color: rgba(15, 23, 42, 0.44);
  font-size: 32px;
  line-height: 1.15;
  font-weight: 600;
  word-break: break-word;
}
.cw-slideshow-card__org-name {
  margin: 0;
  color: #111318;
  font-size: 52px;
  line-height: 1.08;
  font-weight: 800;
  letter-spacing: -0.04em;
  word-break: break-word;
}
.cw-slideshow-card__culturalyst-logo {
  justify-self: end;
  display: block;
  width: 180px;
  max-width: 180px;
  max-height: 76px;
  object-fit: contain;
  object-position: right center;
  opacity: 0.72;
  filter: grayscale(1) brightness(0.5);
}
`;
