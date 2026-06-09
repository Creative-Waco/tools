import { INSTAGRAM_EXPORT_HEIGHT } from "./constants.mjs";

const SCENE_PADDING_DEFAULT = 122;
const SCENE_PADDING_TIGHT = 108;
const SCENE_PADDING_COMPACT = 94;
const CARD_WIDTH_DEFAULT = 920;
const CARD_WIDTH_MIN = 860;
const CARD_WIDTH_STEP = 40;

function ticketMaxHeight(scenePaddingY) {
  return INSTAGRAM_EXPORT_HEIGHT - scenePaddingY;
}

function resetFrameFit(frame, card, ticket) {
  frame.classList.remove("cw-export-frame--tight-scene", "cw-export-frame--compact-scene");
  card.style.width = `min(100%, ${CARD_WIDTH_DEFAULT}px)`;
  ticket.classList.remove("cw-ticket--compact", "cw-ticket--tight");
}

function updateDivider(ticket) {
  const main = ticket.querySelector(".cw-ticket__main");
  if (main) {
    ticket.style.setProperty("--ticket-divider-y", `${main.offsetHeight}px`);
  }
}

/** Position side-notch mask cutouts at the perforation divider. */
export function syncTicketDivider(root) {
  if (!root) return;

  root.querySelectorAll(".cw-ticket").forEach((ticket) => {
    const main = ticket.querySelector(".cw-ticket__main");
    if (!main) return;

    ticket.style.setProperty("--ticket-divider-y", `${main.offsetHeight}px`);
  });
}

/** Fit tall tickets inside the 4:5 frame without cropping the event image. */
export function syncTicketFit(root) {
  if (!root) return;

  root.querySelectorAll(".cw-export-frame").forEach((frame) => {
    const card = frame.querySelector(".cw-card");
    const ticket = frame.querySelector(".cw-ticket");
    if (!card || !ticket) return;

    resetFrameFit(frame, card, ticket);

    let scenePaddingY = SCENE_PADDING_DEFAULT;
    let cardWidth = CARD_WIDTH_DEFAULT;
    let guard = 0;

    while (guard < 20) {
      const contentHeight = card.offsetHeight;
      if (contentHeight <= ticketMaxHeight(scenePaddingY)) break;

      guard += 1;

      if (!frame.classList.contains("cw-export-frame--tight-scene")) {
        frame.classList.add("cw-export-frame--tight-scene");
        scenePaddingY = SCENE_PADDING_TIGHT;
      } else if (!frame.classList.contains("cw-export-frame--compact-scene")) {
        frame.classList.add("cw-export-frame--compact-scene");
        scenePaddingY = SCENE_PADDING_COMPACT;
      } else if (cardWidth > CARD_WIDTH_MIN) {
        cardWidth -= CARD_WIDTH_STEP;
        card.style.width = `min(100%, ${cardWidth}px)`;
      } else if (!ticket.classList.contains("cw-ticket--compact")) {
        ticket.classList.add("cw-ticket--compact");
      } else if (!ticket.classList.contains("cw-ticket--tight")) {
        ticket.classList.add("cw-ticket--tight");
      } else {
        break;
      }

      updateDivider(ticket);
    }
  });
}

/** Measure divider alignment and fit ticket inside the export frame. */
export function syncTicketLayout(root) {
  syncTicketFit(root);
  syncTicketDivider(root);
}
